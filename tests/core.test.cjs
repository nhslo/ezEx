const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const E = require("../shared.js");
const read = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));
const question = (id) => ({
  id: "q" + id,
  title: "Question " + id,
  kind: "single_choice",
  choices: ["Да", "Нет"],
  order: id,
});
const schema = (count) => ({
  formId: "form-a",
  formTitle: "Local test",
  questions: Array.from({ length: count }, (_, i) => question(i + 1)),
});
const answer = (q) => ({
  id: q.id,
  answerText: "",
  choiceText: q.choices?.[0] || "",
  choiceTexts: [],
});
const candidate = (answers) => ({
  candidates: [
    {
      content: { parts: [{ text: JSON.stringify({ answers }) }] },
      finishReason: "STOP",
    },
  ],
});

function harness(fetchImpl, getImpl) {
  const storage = {
    geminiApiKey: "local-test-key",
    geminiModel: E.DEFAULT_MODEL,
  };
  let listener;
  const posts = [];
  let frameActions = 0;
  let uninstallOptions = null;
  const api = {
    management: {
      async uninstallSelf(options) {
        uninstallOptions = options;
        return true;
      },
    },
    runtime: {
      onMessage: {
        addListener(fn) {
          listener = fn;
        },
      },
      getURL: (suffix) => "chrome-extension://test/" + suffix,
      getPlatformInfo: async () => ({ os: "win" }),
    },
    storage: {
      local: {
        async get(keys) {
          const names =
            keys == null
              ? Object.keys(storage)
              : Array.isArray(keys)
                ? keys
                : [keys];
          return clone(
            Object.fromEntries(
              names.filter((k) => k in storage).map((k) => [k, storage[k]]),
            ),
          );
        },
        async set(values) {
          Object.assign(storage, clone(values));
        },
        async remove(keys) {
          for (const key of Array.isArray(keys) ? keys : [keys])
            delete storage[key];
        },
      },
    },
    webNavigation: {
      async getAllFrames() {
        return [
          { frameId: 0, url: "https://teams.cloud.microsoft/" },
          {
            frameId: 5,
            url: "https://forms.office.com/Pages/ResponsePage.aspx?id=local",
          },
          { frameId: 9, url: "https://forms.office.com/hidden" },
        ];
      },
    },
    tabs: {
      onRemoved: { addListener() {} },
      query: async () => [{ id: 1 }],
      async sendMessage(tab, message, options) {
        if (message.type === "FRAME_PROBE")
          return {
            ok: true,
            data: {
              isForms: options.frameId !== 0,
              visible: options.frameId !== 9,
              questionCount: options.frameId === 0 ? 0 : 61,
              signature: "local",
            },
          };
        assert.equal(options.frameId, 5);
        frameActions++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          ok: true,
          data: {
            questionCount: 61,
            answersCount: 61,
            requestCount: 3,
            signature: "local",
          },
        };
      },
    },
  };
  const context = vm.createContext({
    chrome: api,
    crypto: globalThis.crypto,
    TextEncoder,
    URL,
    AbortController,
    Uint8Array,
    btoa,
    Response,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
    async fetch(url, options = {}) {
      if (options.method === "POST") {
        const body = JSON.parse(options.body);
        const isGemini = Boolean(body.contents);
        const formText = isGemini
          ? body.contents[0].parts.find((p) =>
              p.text?.startsWith('{"formTitle"'),
            ).text
          : body.messages.find((m) => m.role === "user").content;
        const questions = JSON.parse(formText).questions;
        posts.push({
          questions,
          url: String(url),
          body,
          headers: options.headers,
        });
        if (fetchImpl)
          return fetchImpl({ questions, body, index: posts.length });
        if (!isGemini && body.tools)
          return new Response(
            JSON.stringify({
              content: [
                { type: "tool_use", input: { answers: questions.map(answer) } },
              ],
            }),
            { status: 200 },
          );
        if (!isGemini)
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({ answers: questions.map(answer) }),
                  },
                },
              ],
            }),
            { status: 200 },
          );
        return new Response(JSON.stringify(candidate(questions.map(answer))), {
          status: 200,
        });
      }
      if (getImpl) return getImpl(String(url), options);
      return new Response(JSON.stringify({ models: [] }), { status: 200 });
    },
  });
  vm.runInContext(read("shared.js"), context);
  vm.runInContext(read("background.js"), context);
  function send(
    type,
    payload = {},
    sender = { url: "chrome-extension://test/options.html" },
  ) {
    return new Promise((resolve, reject) => {
      const handled = listener({ type, payload }, sender, (response) =>
        response.ok
          ? resolve(response.data)
          : reject(new Error(response.error)),
      );
      if (!handled) reject(new Error("Unhandled: " + type));
    });
  }
  return {
    send,
    storage,
    posts,
    get uninstallOptions() {
      return uninstallOptions;
    },
    get frameActions() {
      return frameActions;
    },
  };
}

test("partial provider settings preserve other providers and reject a stale popup selection", async () => {
  const h = harness();
  await h.send("SAVE_CONFIG", {
    providerModels: { openai: "gpt-5-mini" },
    providerApiKeys: { openai: "openai-key" },
  });
  await h.send("SAVE_CONFIG", {
    providerModels: { anthropic: "claude-sonnet-5" },
    uiTheme: "dark",
  });
  const settings = await h.send("GET_SETTINGS");
  assert.equal(settings.providerModels.openai, "gpt-5-mini");
  assert.equal(settings.providerApiKeys.openai, "openai-key");
  assert.equal(settings.providerApiKeys.gemini, "local-test-key");
  assert.equal(settings.uiTheme, "dark");
  await h.send("SAVE_CONFIG", { provider: "anthropic" });
  await assert.rejects(
    h.send("SAVE_CONFIG", {
      expectedProvider: "openai",
      providerModels: { openai: "gpt-5-nano" },
    }),
    /Сервис изменился/,
  );
  assert.equal(
    (await h.send("GET_SETTINGS")).providerModels.openai,
    "gpt-5-mini",
  );
});
test("malformed saved shortcuts and a model cannot lock the settings page", async () => {
  const h = harness();
  h.storage.shortcuts = {
    run: "bad",
    settings: "Alt+Shift+KeyP",
    pause: "Alt+Shift+KeyP",
  };
  h.storage.geminiModel = "bad model";
  h.storage.uiTheme = "unsupported";
  const settings = await h.send("GET_SETTINGS");
  assert.equal(settings.geminiModel, E.DEFAULT_MODEL);
  assert.equal(settings.shortcuts.run, "");
  assert.equal(settings.shortcuts.pause, "");
  assert.equal(settings.uiTheme, "auto");
});

test("clearing a provider key cannot resurrect its old legacy copy", async () => {
  const h = harness();
  await h.send("SAVE_CONFIG", { providerApiKeys: { gemini: "" } });
  const settings = await h.send("GET_SETTINGS");
  assert.equal(settings.geminiApiKey, "");
  assert.equal(settings.providerApiKeys.gemini, "");
  assert.equal((await h.send("GET_CONFIG")).hasApiKey, false);
});

test("removal always asks the browser for confirmation and rejects unrelated web senders", async () => {
  const h = harness();
  await h.send("REQUEST_UNINSTALL");
  assert.equal(h.uninstallOptions.showConfirmDialog, true);
  await assert.rejects(
    h.send("REQUEST_UNINSTALL", {}, { url: "https://unrelated.example/" }),
    /Действие доступно/,
  );
});

test("shortcut normalization is layout-independent and rejects duplicate assignments", () => {
  assert.equal(
    E.shortcutFromEvent({
      ctrlKey: true,
      shiftKey: true,
      code: "KeyK",
      key: "л",
    }),
    "Ctrl+Shift+KeyK",
  );
  assert.equal(E.normalizeShortcut("Shift+KeyP"), "");
  assert.equal(
    E.sanitizeConfig({ indicatorMode: "invalid" }).indicatorMode,
    "normal",
  );
  assert.throws(
    () => E.sanitizeConfig({ shortcuts: { run: "Alt+Shift+KeyP" } }),
    /разные сочетания/,
  );
});

test("indicator toggle restores the chosen appearance instead of replacing it", async () => {
  const h = harness();
  await h.send("SAVE_CONFIG", { indicatorMode: "normal" });
  assert.equal((await h.send("TOGGLE_INDICATOR")).indicatorMode, "off");
  assert.equal((await h.send("TOGGLE_INDICATOR")).indicatorMode, "normal");
  await h.send("SAVE_CONFIG", { indicatorMode: "compact" });
  assert.equal((await h.send("TOGGLE_INDICATOR")).indicatorMode, "off");
  assert.equal((await h.send("TOGGLE_INDICATOR")).indicatorMode, "compact");
});

test("pause preserves the finished batch and prevents subsequent AI requests", async () => {
  const h = harness(async ({ questions, index }) => {
    if (index === 1) await h.send("SAVE_CONFIG", { enabled: false });
    return new Response(JSON.stringify(candidate(questions.map(answer))), {
      status: 200,
    });
  });
  await assert.rejects(
    h.send("GENERATE_ANSWERS", { schema: schema(61) }),
    /паузе/,
  );
  assert.equal(h.posts.length, 1);
  const saved = await h.send("GET_FORM_CACHE", { schema: schema(61) });
  assert.equal(saved.answers.length, 30);
  await h.send("SAVE_CONFIG", { enabled: true });
  const resumed = await h.send("GENERATE_ANSWERS", { schema: schema(61) });
  assert.equal(resumed.answers.length, 61);
  assert.equal(h.posts.length, 3);
});

test("Teams migration, exact URL checks and retired model migration", () => {
  assert.equal(E.supportedUrl("https://teams.cloud.microsoft/"), true);
  assert.equal(
    E.supportedUrl("https://teams.cloud.microsoft.attacker.test/"),
    false,
  );
  assert.equal(
    E.sanitizeConfig({ geminiModel: "gemini-3.1-flash-lite-preview" })
      .geminiModel,
    E.DEFAULT_MODEL,
  );
  assert.equal(E.sanitizeConfig({ batchSize: 100 }).batchSize, 50);
  assert.equal(
    E.modelCompatible({
      name: "models/gemini-3.8-flash",
      supportedGenerationMethods: ["generateContent"],
    }),
    true,
  );
  for (const id of [
    "gemini-3.8-live",
    "gemini-3.8-flash-tts",
    "gemini-embedding-001",
    "gemini-3.1-flash-image",
    "veo-3.1",
  ])
    assert.equal(E.modelCompatible({ id }), false);
});

test("provider defaults never inherit Gemini and fallback catalogs stay provider-specific", () => {
  const config = E.sanitizeConfig({
    provider: "openai",
    geminiModel: E.DEFAULT_MODEL,
  });
  assert.equal(config.providerModels.openai, "");
  assert.equal(
    E.sanitizeConfig({
      provider: "openai",
      geminiModel: E.DEFAULT_MODEL,
      providerModels: { openai: "gemini-3.5-flash-lite" },
    }).providerModels.openai,
    "",
  );
  assert.equal(E.fallbackModelsFor("openai")[0].id, "gpt-5.1");
  for (const [provider, models] of Object.entries(
    E.FALLBACK_MODELS_BY_PROVIDER,
  )) {
    assert.ok(Array.isArray(models), provider);
    assert.ok(
      models.every((model) => !model.startsWith("gemini-")),
      provider,
    );
  }
});
test("custom API addresses accept HTTPS and local loopback HTTP only", () => {
  assert.equal(
    E.safeBaseUrl("https://api.example.com/v1"),
    "https://api.example.com/v1",
  );
  assert.equal(
    E.safeBaseUrl("http://localhost:11434/v1"),
    "http://localhost:11434/v1",
  );
  assert.equal(
    E.safeBaseUrl("http://127.0.0.1:1234/v1"),
    "http://127.0.0.1:1234/v1",
  );
  assert.equal(E.safeBaseUrl("http://192.168.1.10:11434/v1"), "");
  assert.equal(E.safeBaseUrl("https://user:pass@example.com/v1"), "");
});
test("cache ignores reordering, changes for content and different forms", async () => {
  const original = schema(3);
  const key = await E.schemaKey(original);
  const reordered = clone(original);
  reordered.questions.reverse();
  reordered.questions[0].choices.reverse();
  assert.equal(await E.schemaKey(reordered), key);
  const edited = clone(original);
  edited.questions[0].title += " edited";
  assert.notEqual(await E.schemaKey(edited), key);
  assert.notEqual(await E.schemaKey({ ...original, formId: "form-b" }), key);
});
test("strict ids, option matching, duplicates and empty strings", () => {
  const questions = schema(3).questions;
  const result = E.validateAnswers(
    {
      answers: [
        answer(questions[2]),
        { ...answer(questions[0]), choiceText: "Д" },
        { ...answer(questions[1]), id: "foreign" },
      ],
    },
    questions,
  );
  assert.deepEqual(
    result.answers.map((a) => a.id),
    ["q3"],
  );
  const duplicated = E.validateAnswers(
    { answers: [answer(questions[0]), answer(questions[0])] },
    questions,
  );
  assert.equal(duplicated.answers.length, 0);
  assert.equal(
    E.validateAnswers({ answers: [{ id: "q1", choiceText: "Да" }] }, questions)
      .answers.length,
    0,
  );
  assert.equal(
    E.validateAnswers(
      { answers: [{ ...answer(questions[0]), choiceText: "" }] },
      questions,
    ).answers.length,
    0,
  );
});
test("joins response parts, ignores thought text, handles fences and truncated JSON", () => {
  const data = {
    candidates: [
      {
        content: {
          parts: [
            { text: "private reasoning", thought: true },
            { text: '{"answers":' },
            { text: "[]}" },
          ],
        },
      },
    ],
  };
  assert.deepEqual(E.parseAnswerJson(E.candidateText(data).text), {
    answers: [],
  });
  assert.deepEqual(E.parseAnswerJson('```json\n{"answers":[]}\n```'), {
    answers: [],
  });
  assert.throws(() => E.parseAnswerJson('{"answers":['));
});
for (const [count, sizes] of [
  [30, [30]],
  [31, [30, 1]],
  [61, [30, 30, 1]],
]) {
  test(
    count + " questions send each question once, cached repeat sends nothing",
    async () => {
      const h = harness();
      const input = schema(count);
      const sender = { tab: { id: 1 }, url: "https://forms.office.com/" };
      const results = await Promise.all([
        h.send("GENERATE_ANSWERS", { schema: input }, sender),
        h.send("GENERATE_ANSWERS", { schema: input }, sender),
      ]);
      assert.deepEqual(
        h.posts.map((p) => p.questions.length),
        sizes,
      );
      assert.equal(
        new Set(h.posts.flatMap((p) => p.questions.map((q) => q.id))).size,
        count,
      );
      assert.equal(results[0].answers.length, count);
      assert.equal(results[1].answers.length, count);
      assert.equal(results[0].requestCount, sizes.length);
      const cached = await h.send(
        "GENERATE_ANSWERS",
        { schema: { ...input, questions: [...input.questions].reverse() } },
        sender,
      );
      assert.equal(cached.cached, true);
      assert.equal(cached.requestCount, 0);
      assert.equal(h.posts.length, sizes.length);
      assert.equal(h.posts[0].headers["x-goog-api-key"], "local-test-key");
      assert.equal(h.posts[0].url.includes("key="), false);
    },
  );
}
test("incomplete answer requests only missing questions", async () => {
  const h = harness(
    ({ questions, index }) =>
      new Response(
        JSON.stringify(
          candidate(
            (index === 1 ? questions.slice(0, -1) : questions).map(answer),
          ),
        ),
        { status: 200 },
      ),
  );
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(30) });
  assert.deepEqual(
    h.posts.map((p) => p.questions.length),
    [30, 1],
  );
  assert.equal(result.answers.length, 30);
  assert.equal(result.requestCount, 2);
});
test("failure after a batch persists progress; next run resumes only remainder", async () => {
  const h = harness(({ questions, index }) => {
    if (index === 2) throw new Error("simulated offline");
    return new Response(JSON.stringify(candidate(questions.map(answer))), {
      status: 200,
    });
  });
  await assert.rejects(h.send("GENERATE_ANSWERS", { schema: schema(31) }));
  const saved = Object.entries(h.storage).find(([key]) =>
    key.startsWith("ezex:form:"),
  )[1];
  assert.equal(saved.answers.length, 30);
  assert.equal(saved.complete, false);
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(31) });
  assert.deepEqual(
    h.posts.map((p) => p.questions.length),
    [30, 1, 1],
  );
  assert.equal(result.answers.length, 31);
});
test("quota errors are not retried; malformed JSON has a bounded repair", async () => {
  const h = harness(
    () =>
      new Response(JSON.stringify({ error: { message: "Quota exhausted" } }), {
        status: 429,
      }),
  );
  await assert.rejects(
    h.send("GENERATE_ANSWERS", { schema: schema(1) }),
    /429/,
  );
  assert.equal(h.posts.length, 1);
  const bad = harness(
    () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: '{"answers":[' }] },
              finishReason: "MAX_TOKENS",
            },
          ],
        }),
        { status: 200 },
      ),
  );
  await assert.rejects(
    bad.send("GENERATE_ANSWERS", { schema: schema(1) }),
    /JSON/,
  );
  assert.equal(bad.posts.length, 2);
});
test("force regeneration is explicit, separate tests do not share results", async () => {
  const h = harness();
  const input = schema(1);
  await h.send("GENERATE_ANSWERS", { schema: input });
  await h.send("GENERATE_ANSWERS", { schema: input, force: true });
  assert.equal(h.posts.length, 2);
  assert.equal(
    await h.send("GET_FORM_CACHE", {
      schema: { ...input, formId: "another-form" },
    }),
    null,
  );
});
test("popup, hotkeys and autorun route to one explicit visible frame", async () => {
  const h = harness();
  await Promise.all([
    h.send("ROUTE_ACTION", { tabId: 1, action: "run" }),
    h.send("ROUTE_ACTION", { tabId: 1, action: "run" }),
  ]);
  assert.equal(h.frameActions, 1);
  assert.equal(h.storage["ezex:job:1"].status, "done");
});
test("content scripts receive no API key and cannot change settings", async () => {
  const h = harness();
  const sender = { url: "https://teams.cloud.microsoft/", tab: { id: 1 } };
  const config = await h.send("GET_CONFIG", {}, sender);
  assert.equal("geminiApiKey" in config, false);
  assert.equal("providerApiKeys" in config, false);
  assert.equal(config.hasApiKey, true);
  await assert.rejects(
    h.send("SAVE_CONFIG", { geminiApiKey: "other" }, sender),
  );
  assert.equal(h.storage.geminiApiKey, "local-test-key");
});

test("all model catalog pages load, incompatible models remain marked and catalog is cached by key", async () => {
  const urls = [];
  const h = harness(null, (url, options) => {
    urls.push(url);
    assert.equal(options.headers["x-goog-api-key"], "local-test-key");
    const data = url.includes("pageToken=second")
      ? {
          models: [
            {
              name: "models/gemma-3-27b-it",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }
      : {
          models: [
            {
              name: "models/gemini-3.8-flash",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/gemini-3.8-flash-tts",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
          nextPageToken: "second",
        };
    return new Response(JSON.stringify(data), { status: 200 });
  });
  const catalog = await h.send("LIST_MODELS");
  assert.equal(catalog.models.length, 3);
  assert.equal(catalog.models.filter((m) => m.compatible).length, 2);
  await h.send("LIST_MODELS");
  assert.equal(urls.length, 2);
});
test("OpenRouter chat API loads models and returns strictly validated JSON answers", async () => {
  const h = harness(null, (url, options) => {
    assert.match(url, /openrouter\.ai\/api\/v1\/models$/);
    assert.equal(options.headers.Authorization, "Bearer router-key");
    return new Response(
      JSON.stringify({
        data: [
          { id: "openai/gpt-5.1", name: "GPT 5.1" },
          { id: "openai/text-embedding-3-small", name: "Embeddings" },
        ],
      }),
      { status: 200 },
    );
  });
  await h.send("SAVE_CONFIG", {
    provider: "openrouter",
    providerApiKeys: { openrouter: "router-key" },
    providerModels: { openrouter: "openai/gpt-5.1" },
  });
  const catalog = await h.send("LIST_MODELS", { provider: "openrouter" });
  assert.equal(catalog.models.filter((item) => item.compatible).length, 1);
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(2) });
  assert.equal(result.answers.length, 2);
  assert.equal(h.posts[0].url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(h.posts[0].headers.Authorization, "Bearer router-key");
  assert.deepEqual(h.posts[0].body.response_format, { type: "json_object" });
  assert.equal(h.posts[0].body.model, "openai/gpt-5.1");
});
test("OpenAI uses strict JSON Schema mode and allows versioned model IDs", async () => {
  const h = harness();
  await h.send("SAVE_CONFIG", {
    provider: "openai",
    providerApiKeys: { openai: "openai-key" },
    providerModels: { openai: "gpt-5.1" },
  });
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(1) });
  assert.equal(result.answers.length, 1);
  assert.equal(h.posts[0].url, "https://api.openai.com/v1/chat/completions");
  assert.deepEqual(h.posts[0].body.response_format, {
    type: "json_schema",
    json_schema: {
      name: "form_answers",
      strict: true,
      schema: E.answerSchema(),
    },
  });
  assert.equal(
    E.sanitizeConfig({
      provider: "openrouter",
      providerModels: { openrouter: "meta-llama/model:free" },
    }).providerModels.openrouter,
    "meta-llama/model:free",
  );
});
test("Ollama reads local models and generates without an API key", async () => {
  const h = harness(null, (url, options) => {
    assert.match(url, /^http:\/\/localhost:11434\/v1\/models/);
    assert.equal(options.headers.Authorization, undefined);
    return new Response(
      JSON.stringify({
        data: [{ id: "qwen3:14b", name: "Qwen 3 14B" }],
      }),
      { status: 200 },
    );
  });
  await h.send("SAVE_CONFIG", {
    provider: "ollama",
    providerApiKeys: { ollama: "" },
    providerModels: { ollama: "qwen3:14b" },
  });
  const config = await h.send("GET_CONFIG");
  assert.equal(config.hasApiKey, true);
  const catalog = await h.send("LIST_MODELS", { provider: "ollama" });
  assert.equal(catalog.models[0].id, "qwen3:14b");
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(1) });
  assert.equal(result.answers.length, 1);
  assert.match(
    h.posts[0].url,
    /^http:\/\/localhost:11434\/v1\/chat\/completions$/,
  );
  assert.equal(h.posts[0].headers.Authorization, undefined);
});
test("unsupported JSON Schema falls back once to JSON mode on explicit provider rejection", async () => {
  const h = harness(({ questions, index }) =>
    index === 1
      ? new Response(
          JSON.stringify({
            error: { message: "response_format json_schema is unsupported" },
          }),
          { status: 400 },
        )
      : new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ answers: questions.map(answer) }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
  );
  await h.send("SAVE_CONFIG", {
    provider: "openai",
    providerApiKeys: { openai: "openai-key" },
    providerModels: { openai: "older-model" },
  });
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(1) });
  assert.equal(result.answers.length, 1);
  assert.equal(result.requestCount, 2);
  assert.equal(h.posts[0].body.response_format.type, "json_schema");
  assert.deepEqual(h.posts[1].body.response_format, { type: "json_object" });
});
test("Anthropic uses Messages API and forced structured tool output", async () => {
  const h = harness();
  await h.send("SAVE_CONFIG", {
    provider: "anthropic",
    providerApiKeys: { anthropic: "claude-key" },
    providerModels: { anthropic: "claude-sonnet-4-5" },
  });
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(2) });
  assert.equal(result.answers.length, 2);
  assert.equal(h.posts[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(h.posts[0].headers["x-api-key"], "claude-key");
  assert.equal(h.posts[0].body.tool_choice.name, "return_answers");
  assert.equal(h.posts[0].body.tools[0].input_schema.type, "object");
});
test("older API format fallback is counted and happens only on explicit format rejection", async () => {
  const h = harness(
    ({ questions, index }) =>
      new Response(
        JSON.stringify(
          index === 1
            ? {
                error: {
                  message: 'Unknown name "responseFormat" at generation_config',
                },
              }
            : candidate(questions.map(answer)),
        ),
        { status: index === 1 ? 400 : 200 },
      ),
  );
  const result = await h.send("GENERATE_ANSWERS", { schema: schema(1) });
  assert.equal(result.requestCount, 2);
  assert.equal(
    h.posts[1].body.generationConfig.responseMimeType,
    "application/json",
  );
  assert.equal(h.posts[1].body.generationConfig.responseFormat, undefined);
});
test("fast concurrent settings changes are serialized instead of overwriting each other", async () => {
  const h = harness();
  await Promise.all([
    h.send("SAVE_CONFIG", { autoRun: true }),
    h.send("SAVE_CONFIG", { geminiModel: "gemini-3.8-flash" }),
  ]);
  assert.equal(h.storage.autoRun, true);
  assert.equal(h.storage.geminiModel, "gemini-3.8-flash");
});
test("signed image URL rotation does not invalidate the same image, image identity does", async () => {
  const original = schema(1);
  original.questions[0].image = {
    url: "https://forms.office.com/image?id=photo1&sig=old",
  };
  const rotated = clone(original);
  rotated.questions[0].image.url =
    "https://forms.office.com/image?id=photo1&sig=new";
  assert.equal(await E.schemaKey(original), await E.schemaKey(rotated));
  rotated.questions[0].image.url =
    "https://forms.office.com/image?id=photo2&sig=new";
  assert.notEqual(await E.schemaKey(original), await E.schemaKey(rotated));
});

test("manually selected model gets its real output limit before generation", async () => {
  const h = harness(
    null,
    () =>
      new Response(
        JSON.stringify({
          name: "models/gemma-3-27b-it",
          outputTokenLimit: 8192,
          supportedGenerationMethods: ["generateContent"],
        }),
        { status: 200 },
      ),
  );
  h.storage.geminiModel = "gemma-3-27b-it";
  await h.send("GENERATE_ANSWERS", { schema: schema(1) });
  assert.equal(h.posts[0].body.generationConfig.maxOutputTokens, 8192);
  assert.equal(h.posts[0].body.systemInstruction, undefined);
  assert.equal(h.posts[0].body.generationConfig.responseFormat, undefined);
});
test("case-sensitive answer options are preserved and malformed duplicate ids are rejected", () => {
  const questions = [{ ...question(1), choices: ["A", "a"] }];
  const valid = { id: "q1", answerText: "", choiceText: "a", choiceTexts: [] };
  assert.equal(
    E.validateAnswers({ answers: [valid] }, questions).answers[0].choiceText,
    "a",
  );
  assert.equal(
    E.validateAnswers({ answers: [{ id: "q1" }, valid] }, questions).answers
      .length,
    0,
  );
});
