# Change Log

## 0.1.4

- Add status bar item with feed back when completion is ongoing or deactivated
- Add visible files to completion context (can be disabled in settings)

## 0.1.2

- Add maximum number of lines for completion
- Fix leading space in completion (this time for real)

## 0.1.1

- Fix race condition error which crashed the extension
- Fix extra space at the start of single line completion

## 0.1.0

- Publish to Visual Studio Marketplace

## 0.0.5

- Increase time between keystrokes before requesting a new completion
- Show inline completion even if autocomplet widget is active (can be disabled)
- Fix bug where sometimes a running completion would not be stopped if a new completion is triggered

## 0.0.4

- Distinguish between single line and multiline completion by checking text after the cursor
- Add '\n' to stop token for single line
- Reduce repetition of already existing symbols (like '}' or ';') at the end of a completion
- Remove completion from history for new line (most predictions where totally wrong)

## 0.0.3

- Rework handling of old responses
- Only call new completion if input deviates from previous completion
- Add new Command: **Regenerate**
- Custom stop sequences
- Optionally reduce API calls (enabled by default)

## 0.0.2

- Reduce unnecessary requests

## 0.0.1

- Add basic completion
- Save `10` old responses to reduce LLM requests
- Add some settings to configure the extension
