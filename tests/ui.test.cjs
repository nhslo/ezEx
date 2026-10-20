const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
async function ready(predicate) {
  for (let i = 0; i < 60; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("UI did not settle");
}
function page(file) {
  const dom = new JSDOM(read(file + ".html"), {
    url: "http://localhost/" + file + ".html",
    runScripts: "outside-only",
  });
  for (const script of [
    "tests/preview-api.js",
    "shared.js",
    "locale.js",
    "theme.js",
    "ui.js",
    file + ".js",
  ])
    dom.window.eval(read(script));
  return dom;
}
test("popup loads dropdown, saves model, shows persisted progress and schema without false answers", async (t) => {
  const dom = page("popup");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(
    () =>
      $("model").options.length > 5 &&
      $("connection").textContent === "Форма найдена",
  );
  assert.equal($("questionCount").textContent, "61");
  $("model").value = "gemini-3.8-flash";
  $("model").dispatchEvent(new w.Event("change"));
  await ready(() => $("status").textContent.includes("Модель сохранена"));
  $("btnRun").click();
  await ready(() => $("btnRun").disabled);
  await ready(() => !$("btnRun").disabled);
  assert.equal($("requestCount").textContent, "3");
  assert.equal($("answersCount").textContent, "61");
  assert.ok($("resultDetail").textContent.includes("Вставлено: 61"));
  $("btnApply").click();
  await ready(() => $("btnApply").disabled);
  await ready(() => !$("btnApply").disabled);
  assert.equal($("requestCount").textContent, "0");
  $("btnSchema").click();
  await ready(() => $("status").textContent.includes("Найдено вопросов"));
  assert.equal($("answersCount").textContent, "0");
});
test("indicator and recorded hotkeys save immediately, duplicates keep the previous binding", async (t) => {
  const dom = page("options");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("shortcutRun").dataset.shortcut);
  $("shortcutRun").dispatchEvent(
    new w.KeyboardEvent("keydown", {
      code: "KeyK",
      key: "л",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    }),
  );
  await ready(() => $("status").textContent.includes("индикатор сохранены"));
  assert.equal(
    (await w.EzEx.request("GET_SETTINGS")).shortcuts.run,
    "Ctrl+Shift+KeyK",
  );
  const previous = $("shortcutSettings").dataset.shortcut;
  $("shortcutSettings").dispatchEvent(
    new w.KeyboardEvent("keydown", {
      code: "KeyK",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    }),
  );
  assert.equal($("shortcutSettings").dataset.shortcut, previous);
  assert.ok($("status").textContent.includes("уже назначено"));
  $("indicatorMode").value = "off";
  $("indicatorMode").dispatchEvent(new w.Event("change"));
  await ready(() => $("status").textContent.includes("индикатор сохранены"));
  assert.equal((await w.EzEx.request("GET_SETTINGS")).indicatorMode, "off");
});

test("popup pause stays available and disables actions until resumed", async (t) => {
  const dom = page("popup");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("connection").textContent === "Форма найдена");
  $("btnPause").click();
  await ready(() => $("btnPause").textContent === "Продолжить");
  assert.equal($("btnRun").disabled, true);
  assert.equal($("btnPause").disabled, false);
  $("btnPause").click();
  await ready(() => $("btnPause").textContent === "Пауза");
  assert.equal($("btnRun").disabled, false);
});

test("options search, custom model and batch settings save correctly", async (t) => {
  const dom = page("options");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("model").options.length > 5 && $("apiKey").value);
  $("modelSearch").value = "3.8";
  $("modelSearch").dispatchEvent(new w.Event("input"));
  assert.ok($("model").options.length < 6);
  assert.equal(
    [...$("model").options].find((option) => option.value.includes("tts"))
      .disabled,
    true,
  );
  $("customModel").value = "gemini-flash-latest";
  $("batchSize").value = "20";
  $("settingsForm").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await ready(() => $("status").textContent.includes("сохранены"));
  const saved = await w.EzEx.request("GET_SETTINGS");
  assert.equal(saved.geminiModel, "gemini-flash-latest");
  assert.equal(saved.batchSize, 20);
  $("showKey").click();
  assert.equal($("apiKey").type, "text");
  $("showKey").click();
  assert.equal($("apiKey").type, "password");
});

test("options save Ollama settings without requiring an API key", async (t) => {
  const dom = page("options");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("model").options.length > 5);
  $("provider").value = "ollama";
  $("provider").dispatchEvent(new w.Event("change"));
  await ready(() => $("modelStatus").textContent.includes("моделей готовы"));
  $("settingsForm").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await ready(() => $("status").textContent.includes("сохранены"));
  const saved = await w.EzEx.request("GET_SETTINGS");
  assert.equal(saved.provider, "ollama");
  assert.equal(saved.providerApiKeys.ollama, "");
});

test("options provider changes load and persist only that provider's models", async (t) => {
  const dom = page("options");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("model").options.length > 5);
  $("provider").value = "openai";
  $("provider").dispatchEvent(new w.Event("change"));
  await ready(() =>
    [...$("model").options].some((option) => option.value.startsWith("gpt-")),
  );
  assert.equal(
    [...$("model").options].some((option) =>
      option.value.startsWith("gemini-"),
    ),
    false,
  );
  const model = [...$("model").options].find(
    (option) => option.value === "gpt-5-mini",
  );
  assert.ok(model);
  $("model").value = model.value;
  $("model").dispatchEvent(new w.Event("change"));
  await ready(() => $("status").textContent.includes("синхронизирована"));
  const saved = await w.EzEx.request("GET_SETTINGS");
  assert.equal(saved.provider, "openai");
  assert.equal(saved.providerModels.openai, "gpt-5-mini");
  $("provider").value = "gemini";
  $("provider").dispatchEvent(new w.Event("change"));
  await ready(() => $("model").value === "gemini-3.5-flash-lite");
  $("provider").value = "openai";
  $("provider").dispatchEvent(new w.Event("change"));
  await ready(() => $("model").value === "gpt-5-mini");
});

test("popup refreshes its models when settings switch provider", async (t) => {
  const dom = page("popup");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("model").options.length > 5);
  await w.EzEx.request("SAVE_CONFIG", {
    provider: "openai",
    providerModels: { openai: "gpt-5-mini" },
  });
  await ready(() => $("providerName").textContent.includes("OpenAI"));
  await ready(() => $("model").value === "gpt-5-mini");
  assert.equal(
    [...$("model").options].some((option) =>
      option.value.startsWith("gemini-"),
    ),
    false,
  );
});

test("a late catalog response cannot restore models from the previous provider", async (t) => {
  const dom = page("popup");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("model").options.length > 5);
  const original = w.chrome.runtime.sendMessage.bind(w.chrome.runtime);
  let release;
  w.chrome.runtime.sendMessage = async (message) => {
    if (
      message.type === "LIST_MODELS" &&
      message.payload?.provider === "gemini"
    )
      return new Promise((resolve) => {
        release = async () => resolve(await original(message));
      });
    return original(message);
  };
  $("btnModels").click();
  await ready(() => release);
  await w.EzEx.request("SAVE_CONFIG", {
    provider: "openai",
    providerModels: { openai: "gpt-5-mini" },
  });
  await ready(() => $("model").dataset.provider === "openai");
  await release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal($("model").value, "gpt-5-mini");
  assert.equal(
    [...$("model").options].some((option) =>
      option.value.startsWith("gemini-"),
    ),
    false,
  );
});
test("catalog failures leave usable fallback models and release the loading controls", async (t) => {
  const dom = page("options");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("model").options.length > 5);
  const original = w.chrome.runtime.sendMessage.bind(w.chrome.runtime);
  w.chrome.runtime.sendMessage = async (message) => {
    if (message.type === "LIST_MODELS") throw new Error("Network unavailable");
    return original(message);
  };
  $("refreshModels").click();
  await ready(() => $("modelStatus").dataset.kind === "error");
  assert.ok($("model").options.length > 5);
  assert.equal($("refreshModels").disabled, false);
});
test("provider drafts survive switching and revealed keys are hidden again", async (t) => {
  const dom = page("options");
  const w = dom.window;
  t.after(() => w.close());
  const $ = (id) => w.document.getElementById(id);
  await ready(() => $("model").options.length > 5);
  $("apiKey").value = "draft-gemini-key";
  $("apiKey").dispatchEvent(new w.Event("input"));
  $("showKey").click();
  assert.equal($("apiKey").type, "text");
  $("provider").value = "openai";
  $("provider").dispatchEvent(new w.Event("change"));
  await ready(
    () => $("model").options.length > 0 && $("model").value.startsWith("gpt"),
  );
  assert.equal($("apiKey").type, "password");
  $("provider").value = "gemini";
  $("provider").dispatchEvent(new w.Event("change"));
  await ready(() => $("model").value.startsWith("gemini"));
  assert.equal($("apiKey").value, "draft-gemini-key");
});
