import {
  InlineCompletionContext,
  InlineCompletionItem,
  InlineCompletionItemProvider,
  InlineCompletionList,
  TextDocument,
  Position,
  CancellationToken,
  ProviderResult,
  Range,
  workspace,
  InlineCompletionTriggerKind,
} from 'vscode';

import { OpenAI } from 'openai';
import { Stream } from 'openai/streaming';

export class CodeCompletions {
  completions: [string, string][] = [];
  maxCompletions = 10;

  constructor(maxCompletions: number = 10) {
    this.maxCompletions = maxCompletions;
  }

  private lastLine(text: string) {
    return text.split('\n').at(-1) || '';
  }

  /** Add new completion to history.
   *  Remove items from history if `maxCompletions` is exceeded
   */
  public add(input: string, completion: string) {
    this.completions.unshift([input, completion]);

    if (this.completions.length > this.maxCompletions) {
      this.completions.pop();
    }
  }

  /** Get prediction from history based on the prompt
   *
   * *Includes the complete line! It does not start from the cursor position*
   */
  public get(prompt: string): string | null {
    if (this.completions.length <= 0) {
      return null;
    }

    const lastPrediciton = this.completions[0];
    if ((lastPrediciton[0] + lastPrediciton[1]).includes(prompt)) {
      console.debug('Found complete prediciton', lastPrediciton);

      return this.lastLine(lastPrediciton[0]) + lastPrediciton[1];
    }

    const prediction = this.completions
      .map((completion) => this.lastLine(completion[0]) + completion[1])
      .find((prediction) => prediction.includes(this.lastLine(prompt)));

    if (prediction === undefined) {
      return null;
    }

    console.debug('Found partial prediction', prediction);

    return prediction;
  }

  /** Return complete completion history (input and completion combined) */
  public getAll(): string[] {
    return this.completions.map((prediction) => prediction[0] + prediction[1]);
  }

  /** Clear history */
  public clear() {
    this.completions = [];
  }
}

export class LLMCompletionProvider implements InlineCompletionItemProvider {
  apiEndpoint = 'http://localhost:5001/v1';
  enabled = true;

  //@ts-ignore
  client: OpenAI;
  onGoingStream: Stream<OpenAI.Completions.Completion> | undefined;

  lastResponses: CodeCompletions;

  private static _instance: LLMCompletionProvider;
  static instance() {
    if (!LLMCompletionProvider._instance) {
      LLMCompletionProvider._instance = new LLMCompletionProvider();
    }

    return LLMCompletionProvider._instance;
  }

  constructor() {
    this.updateSettings();
    this.lastResponses = new CodeCompletions();
  }

  /** Update variables which depend on extension settings. Should be called if the settings are changed */
  updateSettings() {
    this.enabled = workspace
      .getConfiguration('editor')
      .get('inlineSuggest.enabled', true);
    this.apiEndpoint = workspace
      .getConfiguration('localcompletion')
      .get('active_endpoint', this.apiEndpoint);

    this.client = new OpenAI({
      apiKey: 'NONE',
      baseURL: this.apiEndpoint,
    });
  }

  /** Execute completion */
  private async getCompletion(prompt: string, stop: string[] = []) {
    return await this.client.completions.create({
      model: 'NONE',
      prompt,
      stream: true,
      temperature: workspace
        .getConfiguration('localcompletion')
        .get('temperature'),
      max_tokens: workspace
        .getConfiguration('localcompletion')
        .get('max_tokens'),
      stop: [
        '\n\n\n',
        ...stop,
        ...workspace
          .getConfiguration('localcompletion')
          .get('stop_sequences', []),
      ],
    });
  }

  /** Check if inline completion should be skipped */
  private shouldSkip(
    prompt: string,
    context: InlineCompletionContext,
    reduceCalls: boolean
  ) {
    // Skip if autocomplete widget is visible
    if (context.selectedCompletionInfo !== undefined) {
      console.debug('Skip completion because Autocomplete widget is visible');
      return true;
    }

    // Only start autocompletion on specific symbols for reduced calls
    if (reduceCalls) {
      const regex = new RegExp('[a-zA-Z]');
      if (regex.test(prompt.at(-1) || '')) {
        console.debug('Skip completion to reduce calls');
        return true;
      }
    }
  }

  async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    context: InlineCompletionContext,
    token: CancellationToken
    //@ts-ignore
    // because ASYNC and PROMISE
  ): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
    const reduceCalls = workspace
      .getConfiguration('localcompletion')
      .get('reduce_calls', true);

    const prompt = document.getText(
      new Range(0, 0, position.line, position.character)
    );

    if (context.triggerKind === InlineCompletionTriggerKind.Automatic) {
      // Skip if inline suggestions are disabled
      if (
        !workspace.getConfiguration('editor').get('inlineSuggest.enabled', true)
      ) {
        return null;
      }

      // Check previous completions
      const previousResponse = this.lastResponses.get(prompt);
      if (previousResponse) {
        return [
          new InlineCompletionItem(
            previousResponse,
            new Range(position.line, 0, position.line, position.character)
          ),
        ];
      }

      if (this.shouldSkip(prompt, context, reduceCalls)) {
        return null;
      }
    }

    if (this.onGoingStream) {
      console.debug('Stopping ongoing completion before starting new');
      this.onGoingStream.controller.abort();
    }

    if (token?.isCancellationRequested) {
      console.log('Completion request canceled');
      return null;
    }

    this.onGoingStream = await this.getCompletion(prompt);

    if (token?.isCancellationRequested) {
      console.log('Completion request canceled');
      return null;
    }

    token.onCancellationRequested(() => {
      console.log('Stopping ongoing completion because it was canceled');
      this.onGoingStream?.controller.abort();
    });

    let completion = '';
    for await (const part of this.onGoingStream) {
      completion += part.choices[0]?.text || '';
    }

    this.onGoingStream = undefined;

    const completionHistory = this.lastResponses
      .getAll()
      .map(
        (prediction) =>
          new InlineCompletionItem(
            prediction,
            new Range(0, 0, position.line, position.character)
          )
      );

    this.lastResponses.add(prompt, completion);

    return [
      new InlineCompletionItem(
        prompt + completion,
        new Range(0, 0, position.line, position.character)
      ),
    ];
  }
}
