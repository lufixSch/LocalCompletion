import { window, workspace, commands as vscommands } from 'vscode';
import { LLMCompletionProvider } from './completion_provider';

function addEndpoint() {
  const completionProvider = LLMCompletionProvider.instance();

  const endpoints = workspace
    .getConfiguration('localcompletion')
    .get('endpoints', [completionProvider.apiEndpoint]);

  const inputBox = window.showInputBox({
    title: 'Add API Endpoint',
    prompt: 'Enter the URL of a new API Endpoint',
  });

  inputBox.then((val) => {
    switch (val) {
      case undefined:
        break;
      case '':
        break;
      default:
        endpoints.push(val);
        workspace
          .getConfiguration('localcompletion')
          .update('endpoints', endpoints);
        workspace
          .getConfiguration('localcompletion')
          .update('active_endpoint', val);

        completionProvider.updateSettings();
        console.debug(`New API Endpoint added: ${val}`);
    }
  });
}

function setEndpoint() {
  const completionProvider = LLMCompletionProvider.instance();

  const addNewTxt = '+ Add new API Endpoint';
  const endpoints = workspace
    .getConfiguration('localcompletion')
    .get('endpoints', [completionProvider.apiEndpoint]);
  endpoints.push(addNewTxt);

  const quickPick = window.showQuickPick(endpoints, {
    canPickMany: false,
    title: 'Choose API Endpoint',
    ignoreFocusOut: true,
  });
  quickPick.then((val) => {
    switch (val) {
      case undefined:
        break;
      case addNewTxt:
        addEndpoint();
        break;
      default:
        workspace
          .getConfiguration('localcompletion')
          .update('active_endpoint', val);

        completionProvider.updateSettings();
        console.debug(`New API Endpoint selected: ${val}`);
    }
  });
}

function toggle() {
  const enabled = workspace
    .getConfiguration('editor')
    .get('inlineSuggest.enabled', true);

  workspace
    .getConfiguration('editor')
    .update('inlineSuggest.enabled', !enabled);

  LLMCompletionProvider.instance().updateSettings();

  if (!enabled) {
    LLMCompletionProvider.instance().statusBarItem.setInactive();
  } else {
    LLMCompletionProvider.instance().statusBarItem.setOff();
  }

  window.showInformationMessage(
    `LocalCompletion ${!enabled ? 'enabled' : 'disabled'}!`
  );
  console.debug("Toggled 'inlineSuggest.enabled'");
}

function regenerate() {
  vscommands.executeCommand('editor.action.inlineSuggest.trigger');
}

export const commands = [
  vscommands.registerCommand('localcompletion.select_endpoint', setEndpoint),
  vscommands.registerCommand('localcompletion.toggle', toggle),
  vscommands.registerCommand('localcompletion.regenerate', regenerate),
];
