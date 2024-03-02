import {
  window,
  workspace,
  commands as vscommands,
  ConfigurationTarget,
} from 'vscode';
import { LLMCompletionProvider } from './completion_provider';
import { EndpointPicker } from './ui/quick_actions';
import { ContextSelectionView } from './ui/context_view';

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

function refreshContextView() {
  ContextSelectionView.instance().refresh();
}

function applyContextGitignore() {
  workspace
    .getConfiguration('localcompletion')
    .update('context_gitignore', true, ConfigurationTarget.Global)
    .then(() =>
      vscommands.executeCommand('localcompletion.refresh_context_view')
    );
  vscommands.executeCommand(
    'setContext',
    'localcompletion:useContextGitignore',
    true
  );
}

function disableContextGitignore() {
  workspace
    .getConfiguration('localcompletion')
    .update('context_gitignore', false, ConfigurationTarget.Global)
    .then(() =>
      vscommands.executeCommand('localcompletion.refresh_context_view')
    );
  vscommands.executeCommand(
    'setContext',
    'localcompletion:useContextGitignore',
    false
  );
}

export const commands = [
  vscommands.registerCommand('localcompletion.select_endpoint', setEndpoint),
  vscommands.registerCommand('localcompletion.toggle', toggle),
  vscommands.registerCommand('localcompletion.regenerate', regenerate),
  vscommands.registerCommand(
    'localcompletion.refresh_context_view',
    refreshContextView
  ),
  vscommands.registerCommand(
    'localcompletion.apply_context_gitignore',
    applyContextGitignore
  ),
  vscommands.registerCommand(
    'localcompletion.disable_context_gitignore',
    disableContextGitignore
  ),
];
