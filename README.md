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
- Add other files to the completion context to improve the output

### Roadmap

- Improve (optional) features to reduce LLM requests
  - Add option (possible regex) to specify after which characters the LLM should be/not be triggered
- Increase context
  - Add content after cursor to prompt
  - Workspace specific Context selection view
    - Add token count
    - Add clear all button
    - Check directory checkbox if all files are selected
- Return multiple completions (add suggestions from history)
- Improve detection of already existing symbols at the end of a completion
  - Reduce chance of repeating already existing symbols
  - Reduce completion stopping because of false detection of already existing symbols
- Custom completion stopping
  - Detect bracket/brace/parenthesis imbalance and stop/don't stop
    - Missing closing bracket -> don't stop
    - Improve detection of already existing symbols at the end of a completion based on this
- First line preview
  - Preview the first line (and maybe more) of the completion while completion is still ongoing
- Enable/Disable llm completion for specific filetypes

## Extension Settings

- `localcompletion.active_endpoint`: The URL of the API which is used for generating the code completion
- `localcompletion.endpoints`: List of URL endpoints
- `localcompletion.temperature`: Temperature of the LLM
- `localcompletion.max_tokens`: Maximum number of tokens in the response
- `localcompletion.stop_sequences`: Additional stop sequences (max. 2)
- `localcompletion.reduce_calls`: Reduce API calls with various strategies (e.g. skip completion if last symbol was a letter)
- `localcompletion.skip_autocomplete_widget`: Skip completion if autocomplete widget is active
- `localcompletion.completion_timeout`: Minimum time between keystrokes (in ms) before sending a completion request (Reduces API calls, which are closed immediately after)
- `localcompletion.max_lines`: Maximum number of lines in the response (empty lines are ignored)
- `localcompletion.add_visible_files`: Add all visible files to completion context

## Known Issues

The extension does not yet support a custom API key. This means it only works for APIs which do not need a key.

Model switching is not supported at the moment as most local tools don't support that property either.
