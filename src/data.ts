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
