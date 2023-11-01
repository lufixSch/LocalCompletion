# LocalCompletion

Local LLM based code completion like Copilot.

> This extension does not come with a built in backend for running LLMs. Instead you are able to use any existing tool that supports the OpenAI API format. Like the [Oobabooga WebUI](https://github.com/oobabooga/text-generation-webui) and many other

## Features

- Inline (multi line) code completion
- Works with any OpenAI compatible API
- Save multiple API Endpoints and switch easily between them
- Reducing requests to LLMs by saving previous responses

### Roadmap

- Improve (optional) features to reduce LLM requests
  - Increase time between keystrokes before requesting a new completion
  - Add option (possible regex) to specify after which characters the LLM should be/not be triggered
- Increase context
  - Add content after cursor to prompt
  - Add content of other files

## Extension Settings

* `localcompletion.active_endpoint`: The URL of the API which is used for generating the code completion
* `localcompletion.endpoints`: List of URL endpoints
* `localcompletion.temperature`: Temperature of the LLM
* `localcompletion.max_tokens`: Maximum number of tokens in the response
* `localcompletion.stop_sequences`: Additional stop sequences (max. 2)
* `localcompletion.reduce_calls`: Reduce API calls with various strategies (e.g. skip completion if last symbol was a letter)

## Known Issues

The extension does not yet support a custom API key. This means it only works for APIs which do not need a key.

Model switching is not supported at the moment as most local tools don't support that property either.

## Release Notes

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
