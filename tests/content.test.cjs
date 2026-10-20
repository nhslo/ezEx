const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const E = require("../shared.js");
const read = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const q = (id, title, type, choices = []) => ({
  id,
  title,
  type,
  allowMultipleValues: false,
  questionInfo: JSON.stringify({
    Choices: choices.map((Description) => ({ Description })),
    ChoiceType: id === "multi" ? 2 : 1,
  }),
});
const questions = [
  q("single", "Один вариант", "Question.Choice", ["Да", "Нет"]),
  q("multi", "Несколько вариантов", "Question.Choice", ["А", "Б", "В"]),
  q("text", "Текст", "Question.TextField"),
  q("select", "Список", "Question.Choice", ["Первый", "Второй"]),
  q("combo", "Новый список", "Question.Choice", ["Один", "Два"]),
];
const answers = [
  { id: "single", answerText: "", choiceText: "Да", choiceTexts: [] },
  { id: "multi", answerText: "", choiceText: "", choiceTexts: ["А", "Б"] },
  { id: "text", answerText: "42", choiceText: "", choiceTexts: [] },
  { id: "select", answerText: "", choiceText: "Второй", choiceTexts: [] },
  { id: "combo", answerText: "", choiceText: "Два", choiceTexts: [] },
];
const root = (id, title, fields) =>
  `<section data-automation-id="questionItem" id="QuestionId_${id}"><h2 data-automation-id="questionTitle"><span class="text-format-content">${title}</span></h2>${fields}</section>`;
function fixture(cachedAnswers = answers, settings = {}) {
  const html =
    `<div data-automation-id="formTitle">Локальная форма</div>` +
    root(
      "single",
      "Один вариант",
      '<label><input type="radio" name="single" value="yes">Да</label><label><input type="radio" name="single" value="no" checked>Нет</label>',
    ) +
    root(
      "multi",
      "Несколько вариантов",
      '<label><input type="checkbox" value="a">А</label><label><input type="checkbox" value="b">Б</label><label><input type="checkbox" value="c" checked>В</label>',
    ) +
    root("text", "Текст", '<input type="text" value="старый ответ">') +
    root(
      "select",
      "Список",
      '<select><option value="">Выберите</option><option value="one">Первый</option><option value="two">Второй</option></select>',
    ) +
    root(
      "combo",
      "Новый список",
      '<div role="combobox" tabindex="0" aria-controls="portal">Выберите</div>',
    ) +
    '<div role="listbox" id="portal" hidden><div role="option">Один</div><div role="option">Два</div></div>';
  const dom = new JSDOM(html, {
    url: "https://forms.office.com/Pages/AssignmentsResponsePage.aspx?id=local-test",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  let listener;
  let generations = 0;
  let storageListener;
  w.HTMLElement.prototype.getClientRects = function () {
    return this.closest("[hidden]") ? [] : [{ width: 100, height: 20 }];
  };
  w.Response = Response;
  w.TextEncoder = TextEncoder;
  w.fetch = async () =>
    new Response(
      JSON.stringify({
        data: {
          form: { id: "local-test", title: "Локальная форма", questions },
        },
      }),
      { status: 200 },
    );
  w.chrome = {
    runtime: {
      onMessage: {
        addListener(fn) {
          listener = fn;
        },
      },
      async sendMessage(message) {
        if (message.type === "GET_CONFIG")
          return {
            ok: true,
            data: { ...E.DEFAULTS, ...settings, hasApiKey: true },
          };
        if (message.type === "GET_FORM_CACHE")
          return {
            ok: true,
            data: { answers: cachedAnswers, model: E.DEFAULT_MODEL },
          };
        if (message.type === "GENERATE_ANSWERS") {
          generations++;
          return {
            ok: true,
            data: {
              answers,
              model: E.DEFAULT_MODEL,
              requestCount: 1,
              cached: false,
            },
          };
        }
        throw new Error("Unexpected message: " + message.type);
      },
    },
    storage: {
      onChanged: {
        addListener(fn) {
          storageListener = fn;
        },
      },
    },
  };
  const combo = w.document.querySelector('[role="combobox"]');
  const portal = w.document.getElementById("portal");
  combo.addEventListener("click", () => {
    portal.hidden = false;
  });
  portal.querySelectorAll('[role="option"]').forEach((option) =>
    option.addEventListener("click", () => {
      combo.textContent = option.textContent;
      combo.setAttribute("aria-valuetext", option.textContent);
      option.setAttribute("aria-selected", "true");
      portal.hidden = true;
    }),
  );
  w.eval(read("shared.js"));
  w.eval(read("locale.js"));
  w.eval(read("theme.js"));
  w.eval(read("content.js"));
  function send(type, payload = {}) {
    return new Promise((resolve, reject) =>
      listener({ type, payload }, {}, (result) =>
        result.ok ? resolve(result.data) : reject(new Error(result.error)),
      ),
    );
  }
  return {
    dom,
    w,
    send,
    setConfig(patch) {
      Object.assign(settings, patch);
      storageListener(
        Object.fromEntries(
          Object.entries(patch).map(([key, newValue]) => [key, { newValue }]),
        ),
        "local",
      );
    },
    get generations() {
      return generations;
    },
  };
}

test("indicator modes can be changed live and off mode never creates a status panel", async (t) => {
  const f = fixture(answers, { indicatorMode: "compact" });
  t.after(() => f.w.close());
  await f.send("FRAME_ACTION", { action: "schema" });
  const host = f.w.document.getElementById("ezex-status");
  assert.equal(host.dataset.mode, "compact");
  assert.equal(host.shadowRoot.querySelector("div").textContent, "✓");
  f.setConfig({ indicatorMode: "off" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(f.w.document.getElementById("ezex-status"), null);
  await f.send("FRAME_ACTION", { action: "schema" });
  assert.equal(f.w.document.getElementById("ezex-status"), null);
  f.setConfig({ enabled: false });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(f.send("FRAME_ACTION", { action: "apply" }), /паузе/);
  assert.equal(
    f.w.document.querySelector('input[type="text"]').value,
    "старый ответ",
  );
});

test("repeat apply restores radios, text, both types of dropdown and removes wrong checkboxes", async (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  const result = await f.send("FRAME_ACTION", { action: "apply" });
  assert.equal(result.stats.filled, 5);
  assert.equal(result.stats.missing, 0);
  assert.equal(result.requestCount, 0);
  const doc = f.w.document;
  assert.equal(doc.querySelector('input[value="yes"]').checked, true);
  assert.equal(doc.querySelector('input[value="no"]').checked, false);
  assert.deepEqual(
    [...doc.querySelectorAll('input[type="checkbox"]')].map((el) => el.checked),
    [true, true, false],
  );
  assert.equal(doc.querySelector('input[type="text"]').value, "42");
  assert.equal(doc.querySelector("select").value, "two");
  assert.equal(doc.querySelector('[role="combobox"]').textContent, "Два");
  const again = await f.send("FRAME_ACTION", { action: "apply" });
  assert.equal(again.stats.filled, 5);
  assert.equal(again.stats.missing, 0);
  assert.equal(f.generations, 0);
});

test("indicator follows live appearance and language settings without restyling the form", async (t) => {
  const f = fixture(answers, { uiTheme: "dark", uiLanguage: "en" });
  t.after(() => f.w.close());
  await f.send("FRAME_ACTION", { action: "schema" });
  const host = f.w.document.getElementById("ezex-status");
  assert.equal(host.dataset.theme, "dark");
  assert.match(
    host.shadowRoot.querySelector("div").textContent,
    /Questions found/,
  );
  assert.equal(f.w.document.documentElement.dataset.theme, undefined);
  f.setConfig({ uiTheme: "light", uiLanguage: "ru" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(host.dataset.theme, "light");
  assert.match(
    host.shadowRoot.querySelector("div").textContent,
    /Найдено вопросов/,
  );
  assert.equal(
    f.w.document.querySelector('input[type="text"]').value,
    "старый ответ",
  );
});

test("a page element with the indicator's id is preserved", async (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  const native = f.w.document.createElement("div");
  native.id = "ezex-status";
  native.textContent = "Original page content";
  f.w.document.body.append(native);
  await f.send("FRAME_ACTION", { action: "schema" });
  const panel = [...f.w.document.querySelectorAll("#ezex-status")].find(
    (element) => element.shadowRoot,
  );
  assert.ok(panel);
  f.setConfig({ indicatorMode: "off" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(panel.isConnected, false);
  assert.equal(native.isConnected, true);
  assert.equal(native.textContent, "Original page content");
});
test("reordered DOM and answer arrays still fill by id", async (t) => {
  const f = fixture([...answers].reverse());
  t.after(() => f.w.close());
  const doc = f.w.document;
  const all = [...doc.querySelectorAll('[data-automation-id="questionItem"]')];
  for (const item of all.reverse()) doc.body.append(item);
  const result = await f.send("FRAME_ACTION", { action: "apply" });
  assert.equal(result.stats.filled, 5);
  assert.equal(
    doc.getElementById("QuestionId_text").querySelector("input").value,
    "42",
  );
});
test("answers from another form never fall back to array positions", async (t) => {
  const f = fixture(answers.map((a) => ({ ...a, id: "other-" + a.id })));
  t.after(() => f.w.close());
  await assert.rejects(
    f.send("FRAME_ACTION", { action: "apply" }),
    /нет сохранённых/,
  );
  assert.equal(
    f.w.document.querySelector('input[type="text"]').value,
    "старый ответ",
  );
});
test("run respects existing answers; disabled fields count as missing", async (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  const result = await f.send("FRAME_ACTION", { action: "run" });
  assert.equal(result.stats.skipped, 3);
  assert.equal(result.stats.filled, 2);
  assert.equal(f.generations, 1);
  f.w.document.querySelector('input[type="text"]').disabled = true;
  const restored = await f.send("FRAME_ACTION", { action: "apply" });
  assert.equal(restored.stats.missing, 1);
});
test("duplicate content injection registers only one listener", (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  f.w.eval(read("content.js"));
  assert.equal(f.w.__ezexLoaded, true);
});

test("server restriction for a submitted form is surfaced without generating answers", async (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  f.w.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          code: "5001",
          message: "Only one response per person allowed.",
        },
      }),
      { status: 403 },
    );
  await assert.rejects(
    f.send("FRAME_ACTION", { action: "run" }),
    /один ответ на человека/,
  );
  assert.equal(f.generations, 0);
});
test("checkboxes still restore correctly when the page replaces their DOM after every click", async (t) => {
  const f = fixture();
  t.after(() => f.w.close());
  const replaceOnClick = (section) => {
    section.querySelectorAll('input[type="checkbox"]').forEach((input) =>
      input.addEventListener("click", () => {
        const replacement = section.cloneNode(true);
        section.replaceWith(replacement);
        replaceOnClick(replacement);
      }),
    );
  };
  replaceOnClick(f.w.document.getElementById("QuestionId_multi"));
  const result = await f.send("FRAME_ACTION", { action: "apply" });
  assert.equal(result.stats.filled, 5);
  assert.deepEqual(
    [...f.w.document.querySelectorAll('input[type="checkbox"]')].map(
      (input) => input.checked,
    ),
    [true, true, false],
  );
});
