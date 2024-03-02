import { Position, Range, TextDocument, Uri, window, workspace } from 'vscode';
import { getContextFiles, removeContextFile } from './utility';

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
  public get(prompt: string): string[] | null {
    if (this.completions.length <= 0) {
      return null;
    }

    if (this.lastLine(prompt).trim() === '') {
      return null;
    }

    const lastPrediciton = this.completions[0];
    const lastCompletePrediction = lastPrediciton[0] + lastPrediciton[1];
    let completePrediction = null;
    if (
      lastCompletePrediction.includes(prompt) &&
      !lastCompletePrediction.endsWith(prompt)
    ) {
      completePrediction = this.lastLine(lastPrediciton[0]) + lastPrediciton[1];
      console.debug('Found complete prediciton', completePrediction);
    }

    let predictions = this.completions
      .map((completion) => this.lastLine(completion[0]) + completion[1])
      .filter(
        (prediction) =>
          prediction.includes(this.lastLine(prompt)) &&
          !prediction.endsWith(this.lastLine(prompt))
      );

    if (completePrediction) {
      predictions = [completePrediction, ...predictions];
    }

    if (predictions.length === 0) {
      return null;
    }

    console.debug('Found partial predictions');

    return predictions;
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

export class PromptBuilder {
  private fileSeperatorTemplate = '---------- ${path} ----------';

  private activeFile: string;
  private activeFilePath: string;
  private lineEnding: string | null;
  private isSingleLineCompletions: boolean;

  constructor(document: TextDocument, position: Position) {
    this.activeFile = document.getText(
      new Range(0, 0, position.line, position.character)
    );
    this.activeFilePath = document.uri.fsPath;
    const lineInfo = this.createLineEnding(document, position);
    this.lineEnding = lineInfo.lineEnding;
    this.isSingleLineCompletions = lineInfo.isSingleLineCompletion;
  }

  private createLineEnding(document: TextDocument, position: Position) {
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

    return {
      lineEnding: lineEnding === '' ? null : lineEnding,
      isSingleLineCompletion,
    };
  }

  private getVisibleFiles() {
    const visibleFiles = [];

    for (const editor of window.visibleTextEditors) {
      if (editor.document.uri.fsPath === this.activeFilePath) {
        continue;
      }

      visibleFiles.push({
        content: editor.document.getText(),
        path: editor.document.uri.fsPath,
      });
    }

    return visibleFiles;
  }

  private async getSelectedFiles() {
    const contextFiles: string[] = getContextFiles();

    return (
      await Promise.all(
        contextFiles.map(async (path) => {
          try {
            return {
              path,
              content: await workspace.fs.readFile(Uri.file(path)),
            };
          } catch (e) {
            removeContextFile(path);
            return { path, content: '' };
          }
        })
      )
    ).filter((x) => x.content);
  }

  getFileInfo() {
    return {
      activeFile: this.activeFile,
      lineEnding: this.lineEnding,
      isSingleLineCompletion: this.isSingleLineCompletions,
    };
  }

  async getPrompt() {
    const visibleFiles = this.getVisibleFiles();
    const selectedFiles = await this.getSelectedFiles();

    const files = [...selectedFiles, ...visibleFiles];
    files.push({ content: this.activeFile, path: this.activeFilePath });

    return files
      .map(
        ({ path, content }) =>
          `${this.fileSeperatorTemplate.replace('${path}', path)}\n${content}`
      )
      .join('\n\n');
  }
}
