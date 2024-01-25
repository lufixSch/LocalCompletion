import {
  ConfigurationTarget,
  InputBox,
  QuickPick,
  QuickPickItem,
  window,
  workspace,
} from 'vscode';
import { LLMCompletionProvider } from '../completion_provider';

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

  /** Build Quick Pick UI for selecting an endpoint */
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

  /** Build input box for adding a new endpoint */
  buildInputBox() {
    const inputBox = window.createInputBox();
    inputBox.title = 'Add API Endpoint';
    inputBox.prompt = 'Enter the URL of a new API Endpoint';

    return inputBox;
  }

  /** Callback - Select an endpoint from the quick pick */
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
    this.completionProvider.updateSettings();
  }

  /** Callback - Add a new endpoint to the list */
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
    this.completionProvider.updateSettings();
  }

  /** Show the endpoint picker */
  show() {
    this.quickPick.show();
  }
}
