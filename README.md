# ezEx

AI-assisted form filling for Microsoft Teams, Microsoft Forms and Google Forms.

Supports Gemini, OpenAI, Claude, OpenRouter, Groq, DeepSeek, Mistral, Together AI, Fireworks, Cerebras, SambaNova, Ollama and compatible APIs (including local Ollama).

## Install (Chrome, Edge, Brave, Vivaldi, Opera)

**No Node.js or terminal required.**

1. Open [Releases](https://github.com/nhslo/ezEx/releases) and download the latest `ezEx-*-Chromium.zip`. (If no release is published yet, the maintainer must publish one first.)
2. Extract the ZIP into a permanent folder. Keep the extracted files there after installation.
3. Open `chrome://extensions` (Edge: `edge://extensions`), enable **Developer mode**, then select **Load unpacked**.
4. Choose the extracted folder containing `manifest.json`.

> For now updates are manual: download the new archive, replace the extracted files, and click Reload on the extensions page.

## Firefox

Firefox requires a **Mozilla-signed** add-on for regular installation. The `Firefox-unsigned.zip` release archive is for testing or submitting to [addons.mozilla.org](https://addons.mozilla.org/developers/), **not** a one-click install package.

For temporary testing: unzip the Firefox archive, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select the extracted `manifest.json`. Temporary add-ons are removed when Firefox restarts.

## Configure

Open ezEx settings, select your AI provider and model, and enter its API key. Ollama runs locally without an API key. Other providers may charge for API usage.

## Build from source (developers)

Requires Node.js and npm.

```sh
npm ci
npm run check
npm test
npm run build
```

Build folders are `dist/chrome` and `dist/firefox`; distributable ZIPs are in `dist/releases`.

## Releases (maintainers)

Push a tag matching the version in `package.json`, e.g. `v2.5.0`. GitHub Actions validates the project, builds packages and attaches two ZIPs to a GitHub Release. You can also trigger the workflow manually to download build artifacts without publishing a release.
