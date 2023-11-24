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
) {
  const stack = [];

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (charPairs.isOpen(char)) {
      stack.push(char);
    } else if (charPairs.isClose(char)) {
      if (stack.length <= 0) {
        return false;
      }

      const openChar = stack.pop();
      if (charPairs.getOpen(char) !== openChar) {
        return false;
      }
    }
  }

  if (stack.length > 0) {
    return false;
  }

  return true;
}

/** Count number of lines */
export function countLines(code: string) {
  const lines = code.split('\n');
  return lines.length;
}
