import {
  window,
  workspace,
  commands as vscommands,
  ConfigurationTarget,
} from 'vscode';
import { LLMCompletionProvider } from './completion_provider';
import { EndpointPicker } from './ui/quick_actions';

function setEndpoint() {
  const endpointPicker = new EndpointPicker();
  endpointPicker.show();
}

function toggle() {
  const enabled = workspace
    .getConfiguration('editor')
    .get('inlineSuggest.enabled', true);

  workspace
    .getConfiguration('editor')
    .update('inlineSuggest.enabled', !enabled, ConfigurationTarget.Global);

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
