const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function fixture(
  url = "chrome-extension://test/options.html",
  savedTheme = "auto",
) {
  const dom = new JSDOM(
    `<html lang="ru"><head><title>Настройки · ezEx</title></head><body>
    <label id="label">  Язык интерфейса  </label>
    <div><input id="key" title="Показать API-ключ" placeholder="Вставь ключ выбранного сервиса" value="ModelShowPause" /></div>
    <select><optgroup id="group" label="Модели для ответов"><option data-no-i18n>Show-Model</option></optgroup></select>
    <div id="user" data-no-i18n>Модель Show Pause</div><textarea id="instruction">Модель Show Pause</textarea>
    <script id="script">const value = "Модель";</script><p id="status"></p>
  </body></html>`,
    { url, runScripts: "outside-only" },
  );
  const w = dom.window;
  let language = "en-US";
  const mediaListeners = [];
  const storageListeners = [];
  const media = {
    matches: false,
    addEventListener(type, listener) {
      mediaListeners.push(listener);
    },
  };
  w.matchMedia = () => media;
  w.chrome = {
    i18n: { getUILanguage: () => language },
    storage: {
      local: { get: async () => ({ uiTheme: savedTheme }) },
      onChanged: {
        addListener(fn) {
          storageListeners.push(fn);
        },
      },
    },
  };
  w.eval(read("locale.js"));
  w.eval(read("theme.js"));
  return {
    dom,
    w,
    $: (id) => w.document.getElementById(id),
    systemDark(value) {
      media.matches = value;
      for (const listener of mediaListeners) listener({ matches: value });
    },
    language(value) {
      language = value;
      w.dispatchEvent(new w.Event("languagechange"));
    },
    externalTheme(value) {
      for (const listener of storageListeners)
        listener({ uiTheme: { newValue: value } }, "local");
    },
  };
}
test("auto locale translates nested attributes and dynamic text, and restores originals without changing user data", async (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  const { w, $ } = f;
  await settle();
  assert.equal(w.document.documentElement.lang, "en");
  assert.equal(w.document.title, "Settings · ezEx");
  assert.equal($("key").title, "Show API key");
  assert.equal($("group").label, "Models for answering");
  $("status").textContent = "Управление и индикатор сохранены.";
  await settle();
  assert.equal($("status").textContent, "Controls and indicator saved.");
  $("label").firstChild.nodeValue = "Тема оформления";
  await settle();
  assert.equal($("label").textContent, "Appearance");
  for (let i = 0; i < 4; i++) {
    w.EzExLocale.apply("ru");
    assert.equal($("label").textContent, "Тема оформления");
    assert.equal($("key").title, "Показать API-ключ");
    assert.equal($("status").textContent, "Управление и индикатор сохранены.");
    w.EzExLocale.apply("en");
  }
  assert.equal($("key").value, "ModelShowPause");
  assert.equal($("user").textContent, "Модель Show Pause");
  assert.equal($("instruction").value, "Модель Show Pause");
  assert.equal($("script").textContent, 'const value = "Модель";');
  w.EzExLocale.apply("auto");
  f.language("ru-RU");
  assert.equal(w.document.documentElement.lang, "ru");
});
test("auto theme follows browser changes live; manual and externally saved choices take priority", async (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  await settle();
  const root = f.w.document.documentElement;
  assert.equal(root.dataset.theme, "light");
  f.systemDark(true);
  assert.equal(root.dataset.theme, "dark");
  f.w.EzExTheme.apply("light");
  f.systemDark(false);
  f.systemDark(true);
  assert.equal(root.dataset.theme, "light");
  f.externalTheme("auto");
  assert.equal(root.dataset.theme, "dark");
  f.systemDark(false);
  assert.equal(root.dataset.theme, "light");
  f.externalTheme("dark");
  assert.equal(root.dataset.theme, "dark");
});
test("late storage initialization cannot overwrite a theme the user just chose", async (t) => {
  const f = fixture(undefined, "light");
  t.after(() => f.w.close());
  f.w.EzExTheme.apply("dark");
  await settle();
  assert.equal(f.w.document.documentElement.dataset.theme, "dark");
});
test("content-page language and theme stay untouched", async (t) => {
  const f = fixture("https://docs.google.com/forms/d/example/viewform");
  t.after(() => f.w.close());
  f.w.EzExLocale.apply("en");
  f.w.EzExTheme.apply("dark");
  await settle();
  assert.equal(f.w.document.documentElement.lang, "ru");
  assert.equal(f.w.document.documentElement.dataset.theme, undefined);
  assert.equal(f.$("label").textContent, "  Язык интерфейса  ");
});
