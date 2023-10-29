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
} from 'vscode';

import { OpenAI } from 'openai';
import { Stream } from 'openai/streaming';

export class CodeCompletions {
  inputs: string[] = [];
  completions: string[] = [];
  maxCompletions = 10;

  constructor(maxCompletions: number = 10) {
    this.maxCompletions = maxCompletions;
  }

  public add(input: string, completion: string) {
    this.inputs.push(input);
    this.completions.push(completion);

    if (this.completions.length > this.maxCompletions) {
      this.inputs = this.inputs.slice(1, this.inputs.length);
      this.completions = this.completions.slice(1, this.completions.length);
    }
  }

  public get(query: string): string | null {
    const i = this.inputs.findIndex((val) => val === query);
    return this.completions[i];
  }

  public clear() {
    this.inputs = [];
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

  async getCompletion(prompt: string) {
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
    });
  }

  async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    context: InlineCompletionContext,
    token: CancellationToken
    //@ts-ignore
    // because ASYNC and PROMISE
  ): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
    if (!this.enabled) {
      return null;
    }

    if (context.selectedCompletionInfo !== undefined) {
      console.debug('Skip completion because Autocomplet widget is visible');
      return null;
    }

    const prompt = document.getText(
      new Range(0, 0, position.line, position.character)
    );

    // check saved responses
    const promptKey = prompt.split('\n').at(-1)?.trim() || '';

    const previousResponse = this.lastResponses.get(promptKey);
    if (previousResponse) {
      return [new InlineCompletionItem(previousResponse)];
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

    if (promptKey !== '') {
      this.lastResponses.add(promptKey, completion);
    }

    return [new InlineCompletionItem(completion)];
  }
}
