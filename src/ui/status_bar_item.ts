import { StatusBarAlignment, StatusBarItem, ThemeColor, window } from 'vscode';

export class CompletionStatusBarItem {
  private statusBarItem: StatusBarItem;
  private baseText = 'LocalCompletion';

  constructor() {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);
    this.statusBarItem.text = `$(copilot) ${this.baseText}`;
    this.statusBarItem.command = 'localcompletion.regenerate';
    this.statusBarItem.show();
  }

  /** Change style to represent, that a completion process is running */
  setActive() {
    this.statusBarItem.text = `$(sync) ${this.baseText}`;
    this.statusBarItem.backgroundColor = new ThemeColor(
      'statusBarItem.warningBackground'
    );
  }

  /** Change style back to inactive state */
  setInactive() {
    this.statusBarItem.text = `$(copilot) ${this.baseText}`;
    this.statusBarItem.backgroundColor = undefined;
  }

  /** Change style to represent, that inline suggestions are deactivated */
  setOff() {
    this.statusBarItem.text = `$(close) ${this.baseText}`;
    this.statusBarItem.backgroundColor = undefined;
  }
}
