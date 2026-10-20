# ezEx

Browser extension for AI-assisted form filling in Microsoft Teams, Microsoft Forms, and Google Forms.

## Features

- Supports Gemini, OpenAI, Claude, OpenRouter, Groq, DeepSeek, Mistral, Together AI, Fireworks, Cerebras, SambaNova, Ollama, and compatible APIs.
- Loads models available to your provider account and handles long forms in batches.
- Saves answers for reuse and supports Russian and English with light and dark themes.

## Install

1. Run `npm ci` and `npm run build`.
2. In Chrome or Edge, open the extensions page, enable Developer mode, and load this folder as an unpacked extension.
3. For Firefox, open `about:debugging`, choose **This Firefox**, and load `dist/firefox/manifest.json` as a temporary add-on.

## Configure

Open ezEx settings, choose a provider, add its API key, and select a model. Ollama runs locally and does not require an API key. API usage may be billed by the provider.

## Development

```sh
npm run check
npm test
npm run build
```
