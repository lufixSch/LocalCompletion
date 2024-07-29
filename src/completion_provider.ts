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
  window,
} from 'vscode';

import { OpenAI } from 'openai';
import { Stream } from 'openai/streaming';
import { CodeCompletions, PromptBuilder } from './data';
import { trimLines, countLines, trimSpacesEnd } from './utility';
import { CompletionStatusBarItem } from './ui/status_bar_item';

export class LLMCompletionProvider implements InlineCompletionItemProvider {
  apiEndpoint = 'http://localhost:5001/v1';
  enabled = true;

  //@ts-ignore
  client: OpenAI;
  onGoingStream: Stream<OpenAI.Completions.Completion> | undefined;
  hasOnGoingStream = false;

  lastResponses: CodeCompletions;
  statusBarItem: CompletionStatusBarItem;

  private static _instance: LLMCompletionProvider;

  /** Get singleton instance of this class */
  static instance() {
    if (!LLMCompletionProvider._instance) {
      //LLMCompletionProvider._instance = new LLMCompletionProvider();
      throw Error(
        'Tried to access LLMCompletionProvider Instance before building'
      );
    }

    return LLMCompletionProvider._instance;
  }

  /** Build a new instance of this class */
  static build() {
    LLMCompletionProvider._instance = new LLMCompletionProvider();
    return LLMCompletionProvider._instance;
  }

  constructor() {
    this.updateSettings();
    this.lastResponses = new CodeCompletions();
    this.statusBarItem = new CompletionStatusBarItem();
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
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

  /** Check if inline completion should be stopped */
  private shouldStop(
    response: string,
    maxLines: number
  ): { shouldStop: boolean; trimmedResponse: string } {
    if (countLines(response, true) <= maxLines) {
      return { shouldStop: false, trimmedResponse: '' };
    }

    const trimmedResponse = trimLines(response, maxLines);
    return { shouldStop: true, trimmedResponse };
  }

  /** Stop running LLM completion */
  private stopOngoingStream() {
    if (!this.onGoingStream?.controller.signal.aborted) {
      console.debug('Completion request canceled');
      // console.trace('Completion request canceled!', this.onGoingStream);
      this.hasOnGoingStream = false;
      this.onGoingStream?.controller.abort();
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
    let lineEnding: string | null = document.getText(
      new Range(position.line, position.character, position.line, Infinity)
    );

    // Check line ending for only '' or '\n' to trigger inline completion
    const isSingleLineCompletion = lineEnding.trim() !== '';

    if (!isSingleLineCompletion) {
      lineEnding = document.getText(
        new Range(position.line + 1, 0, position.line + 1, Infinity)
      );
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

    const promptBuilder = new PromptBuilder(document, position);
    const { activeFile, lineEnding, isSingleLineCompletion } =
      promptBuilder.getFileInfo();

    if (context.triggerKind === InlineCompletionTriggerKind.Automatic) {
      // Skip if inline suggestions are disabled
      if (
        !workspace.getConfiguration('editor').get('inlineSuggest.enabled', true)
      ) {
        return null;
      }

      // Check previous completions
      const previousResponses = this.lastResponses.get(activeFile);
      if (previousResponses && !isSingleLineCompletion) {
        return new InlineCompletionList(
          previousResponses.map(
            (res) =>
              new InlineCompletionItem(
                res,
                new Range(position.line, 0, position.line, position.character)
              )
          )
        );
      }

      if (this.shouldSkip(activeFile, context, reduceCalls)) {
        return null;
      }
    }

    // Get prompt depending on the configuration
    const prompt = workspace
      .getConfiguration('localcompletion')
      .get('add_visible_files', false)
      ? await promptBuilder.getPrompt()
      : activeFile;

    // Trim spaces (Improves performance on some models)
    const { trimmed, whitespace } = trimSpacesEnd(prompt);
    const trimmedPrompt = trimmed;

    await this.completionTimeout();
    if (token?.isCancellationRequested) {
      return null;
    }

    this.statusBarItem.setActive();

    this.stopOngoingStream();
    this.hasOnGoingStream = true;
    this.onGoingStream = await this.getCompletion(trimmedPrompt, [
      ...(isSingleLineCompletion ? ['\n'] : []),
      ...(lineEnding ? [lineEnding] : []),
    ]);

    // Needs to be called that way. Otherwise `this` is sometimes `undefined`
    token.onCancellationRequested(() => this.stopOngoingStream());

    if (token?.isCancellationRequested) {
      this.stopOngoingStream();
      return null;
    }

    let completion = '';
    const maxLines = workspace
      .getConfiguration('localcompletion')
      .get('max_lines', 5);

    for await (const part of this.onGoingStream) {
      completion +=
        part.choices?.[0]?.text ||
        //(part as unknown as { content: string }).content ||
        '';

      const { shouldStop, trimmedResponse } = this.shouldStop(
        completion,
        maxLines
      );
      if (shouldStop) {
        // Stop completion
        this.stopOngoingStream();

        completion = trimmedResponse;
        break;
      }
    }
    this.hasOnGoingStream = false;

    // Compare/Remove whitespaces from completion start
    if (whitespace !== '' && completion.startsWith(whitespace)) {
      completion = completion.slice(whitespace.length, completion.length);
    }

    this.lastResponses.add(activeFile, completion);
    this.statusBarItem.setInactive();

    return new InlineCompletionList([
      new InlineCompletionItem(
        activeFile + completion,
        new Range(0, 0, position.line, position.character)
      ),
    ]);
  }
}
