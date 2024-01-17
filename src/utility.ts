export class CharPairMap {
  private openMapping: { [key: string]: number };
  private closeMapping: { [key: string]: number };
  private charsOpen: string[];
  private charsClose: string[];

  constructor(
    charsOpen: string[] = ['(', '[', '{', '<'],
    charsClose: string[] = [')', ']', '}', '>']
  ) {
    this.openMapping = {};
    this.closeMapping = {};
    this.charsOpen = charsOpen;
    this.charsClose = charsClose;

    this.charsOpen.forEach(
      (bracket, index) => (this.openMapping[bracket] = index)
    );
    this.charsClose.forEach(
      (bracket, index) => (this.closeMapping[bracket] = index)
    );
  }

  /** Create CharPairMap from a key-value array */
  public static fromKeyValuePairs(charPairs: { [key: string]: string }) {
    const charsOpen = Object.keys(charPairs);
    const charsClose = Object.values(charPairs);

    return new CharPairMap(charsOpen, charsClose);
  }

  public isOpen(char: string) {
    return this.openMapping[char] !== undefined;
  }

  public isClose(char: string) {
    return this.closeMapping[char] !== undefined;
  }

  public getOpen(char: string) {
    return this.charsClose[this.openMapping[char]];
  }

  public getClose(char: string) {
    return this.charsOpen[this.closeMapping[char]];
  }
}

/** Check if brackets in code are balanced */
export function checkBalance(
  code: string,
  charPairs: CharPairMap = new CharPairMap()
): { balanced: boolean; balancedCode: string } {
  const stack: { char: string; index: number }[] = [];

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (charPairs.isOpen(char)) {
      stack.push({ char, index: i });
    } else if (charPairs.isClose(char)) {
      if (stack.length <= 0) {
        return { balanced: false, balancedCode: code.slice(0, i) };
      }

      const { char: openChar } = stack.pop() as {
        char: string;
        index: number;
      };

      if (charPairs.getOpen(char) !== openChar) {
        const { index: balancedIndex } = stack[0];
        return { balanced: false, balancedCode: code.slice(0, balancedIndex) };
      }
    }
  }

  if (stack.length > 0) {
    const { index: openIndex } = stack.pop() as {
      char: string;
      index: number;
    };

    return { balanced: false, balancedCode: code.slice(0, openIndex) };
  }

  return { balanced: true, balancedCode: code };
}

/** Count number of lines */
export function countLines(code: string, skipEmpty: boolean = false): number {
  let lines = code.split('\n');

  if (skipEmpty) {
    lines = lines.filter((val) => val.trim() !== '');
  }

  return lines.length;
}

/** Trim text to maxiumum number of lines */
export function trimLines(code: string, maxLines: number) {
  const lines = code.split('\n');

  if (lines.length <= maxLines) {
    return code;
  }

  return lines.slice(0, maxLines).join('\n');
}
