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

    if (this.lastLine(prompt).trim() === '') {
      return null;
    }

    const lastPrediciton = this.completions[0];
    if ((lastPrediciton[0] + lastPrediciton[1]).includes(prompt)) {
      const prediciton = this.lastLine(lastPrediciton[0]) + lastPrediciton[1];
      console.debug('Found complete prediciton', prediciton);

      return prediciton;
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

  /** Async sleep */
  async completionTimeout(): Promise<unknown> {
    const ms = workspace
      .getConfiguration('localcompletion')
      .get('completion_timeout', 0);

    if (ms <= 0) {
      return 0;
    }

    return await new Promise((resolve) => setTimeout(resolve, ms));
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
    if (
      context.selectedCompletionInfo !== undefined &&
      workspace
        .getConfiguration('localcompletion')
        .get('skip_autocomplete_widget')
    ) {
      console.debug('Skip completion because Autocomplete widget is visible');
      console.debug(
        workspace
          .getConfiguration('localcompletion')
          .get('skip_autocomplete_widget')
      );
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

  /** Stop running LLM completion */
  private stopOngoingStream() {
    if (!this.onGoingStream?.controller.signal.aborted) {
      console.debug('Completion request canceled');
      this.onGoingStream?.controller.abort();
      //this.onGoingStream = undefined;
    }
  }

  /**
   * Analyze document and generate promt, lineEnding (as stop sequence) and check if single line completion should be used
   */
  analyzeDocument(
    document: TextDocument,
    position: Position
  ): [string, string | null, boolean] {
    const prompt = document.getText(
      new Range(0, 0, position.line, position.character)
    );
    let lineEnding: string | null = document
      .getText(
        new Range(position.line, position.character, position.line, Infinity)
      )
      .trim();

    // Check line ending for only '' or '\n' to trigger inline completion
    const isSingleLineCompletion = lineEnding !== '' && lineEnding !== '}';

    if (!isSingleLineCompletion) {
      lineEnding = document
        .getText(new Range(position.line + 1, 0, position.line + 1, Infinity))
        .trim();
    }

    lineEnding = lineEnding === '' ? null : lineEnding;

    return [prompt, lineEnding, isSingleLineCompletion];
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

    const [prompt, lineEnding, isInlineCompletion] = this.analyzeDocument(
      document,
      position
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
      if (previousResponse && !isInlineCompletion) {
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

    await this.completionTimeout();
    if (token?.isCancellationRequested) {
      return null;
    }

    this.stopOngoingStream();

    this.onGoingStream = await this.getCompletion(prompt, [
      ...(lineEnding ? [lineEnding] : []),
      ...(isInlineCompletion ? ['\n'] : []),
    ]);

    token.onCancellationRequested(this.stopOngoingStream);

    if (token?.isCancellationRequested) {
      this.stopOngoingStream();
      return null;
    }

    let completion = '';
    for await (const part of this.onGoingStream) {
      completion += part.choices[0]?.text || '';
    }

    this.lastResponses.add(prompt, completion);

    console.debug('Displaying completion!');

    return [
      new InlineCompletionItem(
        prompt + completion,
        new Range(0, 0, position.line, position.character)
      ),
    ];
  }
}
