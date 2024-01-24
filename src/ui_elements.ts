import {
  ConfigurationTarget,
  InputBox,
  QuickPick,
  QuickPickItem,
  StatusBarAlignment,
  StatusBarItem,
  ThemeColor,
  window,
  workspace,
} from 'vscode';
import { LLMCompletionProvider } from './completion_provider';

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

export class EndpointPicker {
  private addNewTxt = '+ Add new API Endpoint';
  private endpoints: string[] = [];
  private completionProvider: LLMCompletionProvider;
  private quickPick: QuickPick<QuickPickItem>;
  private inputBox: InputBox;

  private newEndpoint = '';

  constructor() {
    this.completionProvider = LLMCompletionProvider.instance();
    this.endpoints = workspace
      .getConfiguration('localcompletion')
      .get('endpoints', [this.completionProvider.apiEndpoint]);
    const activeEndpoint = workspace
      .getConfiguration('localcompletion')
      .get('active_endpoint', this.completionProvider.apiEndpoint);

    this.quickPick = this.buildQuickPick(this.endpoints, activeEndpoint);
    this.quickPick.onDidChangeSelection((items) => this.selectItem(items[0]));

    this.inputBox = this.buildInputBox();
    this.inputBox.onDidChangeValue((value) => (this.newEndpoint = value));
    this.inputBox.onDidAccept(() => this.addEndpoint(this.newEndpoint));
  }

  buildQuickPick(endpoints: string[], activeEndpoint: string) {
    const items = endpoints.map((endpoint) => {
      return {
        label: endpoint === activeEndpoint ? `${endpoint} [active]` : endpoint,
        value: endpoint,
      };
    });
    items.push({ label: this.addNewTxt, value: this.addNewTxt });

    const quickPick = window.createQuickPick();
    quickPick.canSelectMany = false;
    quickPick.items = items;

    return quickPick;
  }

  buildInputBox() {
    const inputBox = window.createInputBox();
    inputBox.title = 'Add API Endpoint';
    inputBox.prompt = 'Enter the URL of a new API Endpoint';

    return inputBox;
  }

  selectItem(item: QuickPickItem) {
    this.quickPick.hide();

    if (item.label === this.addNewTxt) {
      this.inputBox.show();
      return;
    }

    const activeEndpoint = (item as QuickPickItem & { value: string }).value;
    workspace
      .getConfiguration('localcompletion')
      .update('active_endpoint', activeEndpoint, ConfigurationTarget.Global);
  }

  addEndpoint(endpoint: string) {
    this.inputBox.hide();

    if (!this.endpoints.includes(endpoint)) {
      this.endpoints.push(endpoint);
    } else {
      window.showInformationMessage('Endpoint already exists');
    }

    workspace
      .getConfiguration('localcompletion')
      .update('endpoints', this.endpoints, ConfigurationTarget.Global);
    workspace
      .getConfiguration('localcompletion')
      .update('active_endpoint', endpoint, ConfigurationTarget.Global);
  }

  show() {
    this.quickPick.show();
  }
}
