# LocalCompletion

Local LLM based code completion like Copilot.

> This extension does not come with a built in backend for running LLMs. Instead you are able to use any existing tool that supports the OpenAI API format. Like the [Oobabooga WebUI](https://github.com/oobabooga/text-generation-webui) and many other

## Features

- Inline (multi line) code completion
- Works with any OpenAI compatible API
- Save multiple API Endpoints and switch easily between them
- Reducing requests to LLMs by
  - saving previous responses
  - skiping completion depending on the last symbol
  - only posting request if no input was given for some time (can be specified in the settings)
- Dynamically detect multi line or single line completion

### Roadmap

- Improve (optional) features to reduce LLM requests
  - Add option (possible regex) to specify after which characters the LLM should be/not be triggered
- Increase context
  - Add content after cursor to prompt
  - Add content of other files
- Return multiple completions (add suggestions from history)
- Improve detection of already existing symbols at the end of a completion
  - Reduce chance of repeating already existing symbols
  - Reduce completion stopping because of false detection of already existing symbols
- Custom completion stopping
  - Stop completion after n lines
  - Detect bracket/brace/parenthesis imbalance and stop/don't stop
    - Missing closing bracket -> don't stop
    - Improve detection of already existing symbols at the end of a completion based on this

## Extension Settings

- `localcompletion.active_endpoint`: The URL of the API which is used for generating the code completion
- `localcompletion.endpoints`: List of URL endpoints
- `localcompletion.temperature`: Temperature of the LLM
- `localcompletion.max_tokens`: Maximum number of tokens in the response
- `localcompletion.stop_sequences`: Additional stop sequences (max. 2)
- `localcompletion.reduce_calls`: Reduce API calls with various strategies (e.g. skip completion if last symbol was a letter)
- `localcompletion.skip_autocomplete_widget`: Skip completion if autocomplete widget is active
- `localcompletion.completion_timeout`: Minimum time between keystrokes (in ms) before sending a completion request (Reduces API calls, which are closed immedietly after)

## Known Issues

The extension does not yet support a custom API key. This means it only works for APIs which do not need a key.

Model switching is not supported at the moment as most local tools don't support that property either.

## Release Notes

### 0.1.1

- Fix race condition error which crashed the extension
- Fix extra space at the start of single line completion

### 0.1.0

- Publish to Visual Studio Marketplace

### 0.0.5

- Increase time between keystrokes before requesting a new completion
- Show inline completion even if autocomplet widget is active (can be disabled)
- Fix bug where sometimes a running completion would not be stopped if a new completion is triggered

### 0.0.4

- Distinguish between single line and multiline completion by checking text after the cursor
- Add '\n' to stop token for single line
- Reduce repetition of already existing symbols (like '}' or ';') at the end of a completion
- Remove completion from history for new line (most predictions where totally wrong)

### 0.0.3

- Rework handling of old responses
- Only call new completion if input deviates from previous completion
- Add new Command: **Regenerate**
- Custom stop sequences
- Optionally reduce API calls (enabled by default)

### 0.0.2

- Reduce unnecessary requests

### 0.0.1

- Add basic completion
- Save `10` old responses to reduce LLM requests
- Add some settings to configure the extension

---
