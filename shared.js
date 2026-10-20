/* Shared by the service worker, Firefox background page and extension UI. */
(() => {
  "use strict";
  const DEFAULT_MODEL = "gemini-3.5-flash-lite";
  const PROVIDERS = [
    {
      id: "gemini",
      name: "Google Gemini",
      protocol: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    },
    {
      id: "openai",
      name: "OpenAI",
      protocol: "openai",
      baseUrl: "https://api.openai.com/v1",
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      protocol: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
    },
    {
      id: "openrouter",
      name: "OpenRouter · сотни моделей",
      protocol: "openai",
      baseUrl: "https://openrouter.ai/api/v1",
    },
    {
      id: "groq",
      name: "Groq",
      protocol: "openai",
      baseUrl: "https://api.groq.com/openai/v1",
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      protocol: "openai",
      baseUrl: "https://api.deepseek.com",
    },
    {
      id: "mistral",
      name: "Mistral AI",
      protocol: "openai",
      baseUrl: "https://api.mistral.ai/v1",
    },
    {
      id: "together",
      name: "Together AI",
      protocol: "openai",
      baseUrl: "https://api.together.xyz/v1",
    },
    {
      id: "fireworks",
      name: "Fireworks AI",
      protocol: "openai",
      baseUrl: "https://api.fireworks.ai/inference/v1",
    },
    {
      id: "cerebras",
      name: "Cerebras",
      protocol: "openai",
      baseUrl: "https://api.cerebras.ai/v1",
    },
    {
      id: "sambanova",
      name: "SambaNova",
      protocol: "openai",
      baseUrl: "https://api.sambanova.ai/v1",
    },
    {
      id: "ollama",
      name: "Ollama · локальные модели",
      protocol: "openai",
      baseUrl: "http://localhost:11434/v1",
    },
    {
      id: "custom",
      name: "Свой OpenAI-совместимый API",
      protocol: "openai",
      baseUrl: "",
    },
  ];
  const DEFAULT_SHORTCUTS = Object.freeze({
    run: "Ctrl+Shift+KeyY",
    settings: "Alt+Shift+KeyO",
    indicator: "Alt+Shift+KeyI",
    pause: "Alt+Shift+KeyP",
    uninstall: "",
  });
  const DEFAULTS = Object.freeze({
    uiLanguage: "auto",
    uiTheme: "auto",
    enabled: true,
    indicatorMode: "normal",
    indicatorRestoreMode: "normal",
    numpadHotkey: true,
    shortcuts: DEFAULT_SHORTCUTS,
    geminiApiKey: "",
    geminiModel: DEFAULT_MODEL,
    provider: "gemini",
    providerApiKeys: {},
    providerModels: {},
    providerBaseUrls: {},
    autoRun: false,
    respectExistingAnswers: true,
    customInstruction: "",
    debugLogs: false,
    batchSize: 30,
    legacyCtrlA: false,
  });
  const HOSTS = new Set([
    "teams.cloud.microsoft",
    "teams.microsoft.com",
    "assignments.edu.cloud.microsoft",
    "forms.office.com",
    "forms.cloud.microsoft",
    "forms.microsoft.com",
    "res.cdn.office.net",
  ]);
  const FALLBACK_MODELS = [
    "gemini-3.8-flash",
    DEFAULT_MODEL,
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",
  ].map((id) => ({
    id,
    displayName: id,
    compatible: true,
    source: "fallback",
  }));
  const FALLBACK_MODELS_BY_PROVIDER = Object.freeze({
    openai: [
      "gpt-5.1",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-oss-120b",
      "gpt-oss-20b",
    ],
    anthropic: [
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
    ],
    openrouter: [
      "openai/gpt-5.1",
      "anthropic/claude-opus-5",
      "google/gemini-3.8-flash",
      "deepseek/deepseek-v4-pro",
    ],
    groq: [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ],
    deepseek: ["deepseek-flash", "deepseek-v4-pro"],
    mistral: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
    ],
    together: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
      "deepseek-ai/DeepSeek-V3",
    ],
    fireworks: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/qwen3-235b-a22b",
    ],
    cerebras: ["zai-glm-4.7", "gpt-oss-120b", "llama3.1-8b"],
    sambanova: ["DeepSeek-R1"],
    ollama: [],
    custom: [],
  });
  function fallbackModelsFor(provider) {
    return (FALLBACK_MODELS_BY_PROVIDER[provider] || []).map((id) => ({
      id,
      displayName: id,
      compatible: true,
      source: "fallback",
    }));
  }
  const text = (value) => (value == null ? "" : String(value).trim());
  const normalize = (value) =>
    text(value)
      .normalize("NFKC")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();
  const unique = (values) => [...new Set(values.map(text).filter(Boolean))];
  const api = typeof browser !== "undefined" ? browser : globalThis.chrome;
  function listen(handler) {
    api.runtime.onMessage.addListener((message, sender, respond) => {
      if (!message?.type) return false;
      let result;
      try {
        result = handler(message, sender);
      } catch (error) {
        respond({ ok: false, error: text(error.message) });
        return false;
      }
      if (result === undefined) return false;
      Promise.resolve(result).then(
        (data) => respond({ ok: true, data }),
        (error) =>
          respond({
            ok: false,
            error: text(error.message) || "Неизвестная ошибка",
          }),
      );
      return true;
    });
  }
  function unwrap(response) {
    if (!response)
      throw new Error(
        "Расширение не ответило. Обновите расширение и вкладку Teams.",
      );
    if (!response.ok) throw new Error(response.error || "Ошибка расширения");
    return response.data;
  }
  async function request(type, payload = {}) {
    return unwrap(await api.runtime.sendMessage({ type, payload }));
  }
  async function tabRequest(tabId, frameId, type, payload = {}) {
    return unwrap(
      await api.tabs.sendMessage(tabId, { type, payload }, { frameId }),
    );
  }
  function supportedUrl(value) {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (HOSTS.has(url.hostname) || googleFormsUrl(value))
      );
    } catch {
      return false;
    }
  }
  function googleFormsUrl(value) {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "docs.google.com" &&
        /^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?[^/]+\/(?:viewform|formResponse)\/?$/.test(
          url.pathname,
        )
      );
    } catch {
      return false;
    }
  }
  function formsUrl(value) {
    try {
      return /^forms\.(office\.com|cloud\.microsoft|microsoft\.com)$/.test(
        new URL(value).hostname,
      );
    } catch {
      return false;
    }
  }
  function modelId(value) {
    return text(value).replace(/^models\//, "");
  }
  function modelCompatible(model) {
    const id = modelId(model.id || model.name);
    const methods = model.supportedGenerationMethods;
    return (
      (!methods || methods.includes("generateContent")) &&
      /^(gemini-|gemma-)/.test(id) &&
      !/(?:image|tts|audio|live|embedding|robotics|computer-use|transcribe|omni|nano-banana)/i.test(
        id,
      )
    );
  }
  function sanitizeConfig(input = {}) {
    const shortcuts = {};
    for (const [action, fallback] of Object.entries(DEFAULT_SHORTCUTS)) {
      const raw = Object.hasOwn(input.shortcuts || {}, action)
        ? text(input.shortcuts[action])
        : fallback;
      shortcuts[action] = normalizeShortcut(raw);
      if (raw && !shortcuts[action])
        throw new Error(
          "Сочетание должно содержать Ctrl, Alt или Meta и одну клавишу.",
        );
    }
    const bound = Object.values(shortcuts).filter(Boolean);
    if (new Set(bound).size !== bound.length)
      throw new Error("Назначьте разным действиям разные сочетания клавиш.");
    let model = modelId(input.geminiModel || DEFAULT_MODEL);
    if (/^gemini-(?:2\.0-|3-pro-preview$|3\.1-flash-lite-preview$)/.test(model))
      model = DEFAULT_MODEL;
    if (!/^[a-zA-Z0-9._:/-]+$/.test(model))
      throw new Error("Неверный идентификатор модели.");
    const provider = PROVIDERS.some((item) => item.id === input.provider)
      ? input.provider
      : "gemini";
    const providerApiKeys = Object.fromEntries(
      PROVIDERS.map((item) => [
        item.id,
        Object.hasOwn(input.providerApiKeys || {}, item.id)
          ? text(input.providerApiKeys[item.id])
          : item.id === "gemini"
            ? text(input.geminiApiKey)
            : "",
      ]),
    );
    const providerModels = Object.fromEntries(
      PROVIDERS.map((item) => {
        let candidate =
          modelId(input.providerModels?.[item.id]) ||
          (item.id === "gemini" ? model : "");
        // Older saves could copy the global Gemini model into a newly selected provider.
        if (item.id !== "gemini" && /^gemini-/i.test(candidate)) candidate = "";
        return [
          item.id,
          /^[a-zA-Z0-9._:/-]+$/.test(candidate) ? candidate : "",
        ];
      }),
    );
    const providerBaseUrls = Object.fromEntries(
      PROVIDERS.map((item) => [
        item.id,
        safeBaseUrl(input.providerBaseUrls?.[item.id] || item.baseUrl),
      ]),
    );
    return {
      uiLanguage: ["auto", "ru", "en"].includes(input.uiLanguage)
        ? input.uiLanguage
        : "auto",
      uiTheme: ["auto", "light", "dark"].includes(input.uiTheme)
        ? input.uiTheme
        : "auto",
      enabled: input.enabled !== false,
      indicatorMode: ["normal", "compact", "off"].includes(input.indicatorMode)
        ? input.indicatorMode
        : "normal",
      indicatorRestoreMode:
        input.indicatorRestoreMode === "compact" ? "compact" : "normal",
      numpadHotkey: input.numpadHotkey !== false,
      shortcuts,
      geminiApiKey: text(input.geminiApiKey),
      geminiModel: model,
      provider,
      providerApiKeys,
      providerModels,
      providerBaseUrls,
      customInstruction: text(input.customInstruction).slice(0, 8000),
      autoRun: input.autoRun === true,
      respectExistingAnswers: input.respectExistingAnswers !== false,
      debugLogs: input.debugLogs === true,
      legacyCtrlA: input.legacyCtrlA === true,
      batchSize: Math.min(
        50,
        Math.max(5, Math.trunc(Number(input.batchSize)) || 30),
      ),
    };
  }
  function normalizeShortcut(value) {
    const parts = text(value).split("+").filter(Boolean);
    const code = parts.pop();
    const modifiers = ["Ctrl", "Alt", "Shift", "Meta"];
    if (
      !/^(?:Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-2])|Numpad[0-9]|Space|Enter|Arrow(?:Up|Down|Left|Right))$/.test(
        code || "",
      ) ||
      parts.some((part) => !modifiers.includes(part)) ||
      new Set(parts).size !== parts.length ||
      !parts.some((part) => ["Ctrl", "Alt", "Meta"].includes(part))
    )
      return "";
    return [...modifiers.filter((part) => parts.includes(part)), code].join(
      "+",
    );
  }
  function shortcutFromEvent(event) {
    return normalizeShortcut(
      [
        event.ctrlKey && "Ctrl",
        event.altKey && "Alt",
        event.shiftKey && "Shift",
        event.metaKey && "Meta",
        event.code,
      ]
        .filter(Boolean)
        .join("+"),
    );
  }
  function shortcutLabel(value) {
    return value
      ? value
          .replace(/Key([A-Z])/g, "$1")
          .replace(/Digit([0-9])/g, "$1")
          .replace(/Meta/g, "⌘")
          .replace(/\+/g, " + ")
      : "Не назначено";
  }
  function safeBaseUrl(value) {
    const raw = text(value);
    if (!raw) return "";
    try {
      const url = new URL(raw);
      const localHttp =
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (
        (url.protocol !== "https:" && !localHttp) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        return "";
      return url.href.replace(/\/$/, "");
    } catch {
      return "";
    }
  }
  async function hash(value) {
    const bytes = new TextEncoder().encode(
      typeof value === "string" ? value : JSON.stringify(value),
    );
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
  }
  function questionImages(question) {
    const images = [
      ...(question.images || []),
      ...(question.image ? [question.image] : []),
    ];
    return images.filter(
      (image, index) =>
        image?.url &&
        images.findIndex(
          (other) =>
            other?.url === image.url &&
            text(other.choiceText) === text(image.choiceText),
        ) === index,
    );
  }
  function canonicalSchema(schema) {
    let identity = text(schema.formId);
    if (!identity) {
      try {
        const u = new URL(schema.sourceUrl);
        identity = u.searchParams.get("id") || u.origin + u.pathname;
      } catch {
        identity = text(schema.sourceUrl);
      }
    }
    const imageIdentity = (image) => {
      if (image?.resourceId) return text(image.resourceId);
      if (!image?.url) return "";
      try {
        const url = new URL(image.url);
        const stable = new URL(url.origin + url.pathname);
        for (const key of ["id", "resourceId", "fileId", "fileIdentifier"])
          if (url.searchParams.has(key))
            stable.searchParams.set(key, url.searchParams.get(key));
        return stable.href;
      } catch {
        return text(image.url);
      }
    };
    return {
      identity,
      questions: schema.questions
        .map((q) => ({
          id: text(q.id),
          title: text(q.title),
          subtitle: text(q.subtitle),
          kind: q.kind,
          choices: unique(q.choices || []).sort(),
          ...(q.otherChoice ? { otherChoice: q.otherChoice } : {}),
          image: imageIdentity(q.image),
          ...(q.images?.length
            ? {
                images: questionImages(q)
                  .map((image) => ({
                    url: imageIdentity(image),
                    choice: text(image.choiceText),
                  }))
                  .sort((a, b) =>
                    JSON.stringify(a).localeCompare(JSON.stringify(b)),
                  ),
              }
            : {}),
          ...(q.answerFormat ? { answerFormat: q.answerFormat } : {}),
          ...(q.constraints ? { constraints: q.constraints } : {}),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    };
  }
  async function schemaKey(schema) {
    return hash(canonicalSchema(schema));
  }
  function batches(questions, size = 30) {
    const result = [];
    let batch = [];
    let chars = 0;
    for (const q of questions) {
      const length = JSON.stringify(q).length;
      if (batch.length && (batch.length >= size || chars + length > 70000)) {
        result.push(batch);
        batch = [];
        chars = 0;
      }
      batch.push(q);
      chars += length;
    }
    if (batch.length) result.push(batch);
    return result;
  }
  function answerSchema() {
    return {
      type: "object",
      properties: {
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              answerText: { type: "string" },
              choiceText: { type: "string" },
              choiceTexts: { type: "array", items: { type: "string" } },
            },
            required: ["id", "answerText", "choiceText", "choiceTexts"],
            additionalProperties: false,
          },
        },
      },
      required: ["answers"],
      additionalProperties: false,
    };
  }
  function parseAnswerJson(value) {
    const raw = text(value)
      .replace(/^\uFEFF/, "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    try {
      return JSON.parse(raw);
    } catch {
      /* Accept a surrounding explanation, never execute code. */
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        /* Invalid or truncated JSON. */
      }
    }
    throw new Error("Gemini вернул неполный или неверный JSON.");
  }
  function validateAnswers(data, questions) {
    const source = Array.isArray(data?.answers)
      ? data.answers
      : Array.isArray(data)
        ? data
        : [];
    const byId = new Map(questions.map((q) => [q.id, q]));
    const answers = new Map();
    const seenIds = new Set();
    const duplicate = new Set();
    const errors = [];
    for (const item of source) {
      const id = text(item?.id);
      const q = byId.get(id);
      if (!q) {
        errors.push("Неизвестный id ответа");
        continue;
      }
      if (seenIds.has(id) || duplicate.has(id)) {
        answers.delete(id);
        duplicate.add(id);
        continue;
      }
      seenIds.add(id);
      if (
        typeof item.answerText !== "string" ||
        typeof item.choiceText !== "string" ||
        !Array.isArray(item.choiceTexts) ||
        item.choiceTexts.some((x) => typeof x !== "string")
      ) {
        errors.push("Неверные типы полей: " + id);
        continue;
      }
      const answer = {
        id,
        answerText: text(item.answerText),
        choiceText: text(item.choiceText),
        choiceTexts: unique(item.choiceTexts),
      };
      const find = (value) => {
        const choices = q.choices || [];
        const exact = choices.find((choice) => text(choice) === text(value));
        if (exact) return exact;
        const matches = choices.filter(
          (choice) => normalize(choice) === normalize(value),
        );
        return matches.length === 1 ? matches[0] : undefined;
      };
      if (q.kind === "single_choice") {
        const choice = find(
          answer.choiceText || answer.choiceTexts[0] || answer.answerText,
        );
        if (!choice) {
          errors.push("Вариант не совпадает с вопросом: " + id);
          continue;
        }
        answer.choiceText = choice;
        answer.choiceTexts = [];
        if (choice !== q.otherChoice) answer.answerText = "";
        else if (!answer.answerText) {
          errors.push("Нет текста другого варианта: " + id);
          continue;
        }
      } else if (q.kind === "multi_choice") {
        const requested = answer.choiceTexts.length
          ? answer.choiceTexts
          : [answer.choiceText].filter(Boolean);
        const choices = requested.map(find);
        if (!choices.length || choices.some((x) => !x)) {
          errors.push("Неверные варианты: " + id);
          continue;
        }
        answer.choiceTexts = unique(choices);
        answer.choiceText = "";
        if (!choices.includes(q.otherChoice)) answer.answerText = "";
        else if (!answer.answerText) {
          errors.push("Нет текста другого варианта: " + id);
          continue;
        }
      } else if (!answer.answerText) {
        errors.push("Пустой текст: " + id);
        continue;
      }
      if (q.kind === "text" && q.answerFormat) {
        const format = q.answerFormat;
        const value = answer.answerText;
        const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        const timeMatch = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(value);
        let valid = true;
        if (format === "YYYY-MM-DDTHH:mm") {
          const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
          const date = match ? new Date(match[1] + "T00:00:00Z") : null;
          valid = Boolean(
            date &&
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === match[1] &&
            Number(match[2]) < 24 &&
            Number(match[3]) < 60,
          );
        } else if (format === "YYYY-MM-DD") {
          const date = dateMatch ? new Date(value + "T00:00:00Z") : null;
          valid = Boolean(
            date &&
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value,
          );
        } else if (format === "MM-DD") {
          const date = new Date("2000-" + value + "T00:00:00Z");
          valid =
            /^\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(5, 10) === value;
        } else if (format.startsWith("HH:mm")) {
          valid = Boolean(
            timeMatch &&
            Number(timeMatch[2]) < 60 &&
            Number(timeMatch[3] || 0) < 60 &&
            (format.includes("duration") || Number(timeMatch[1]) < 24) &&
            (format.startsWith("HH:mm:ss")
              ? timeMatch[3] !== undefined
              : timeMatch[3] === undefined),
          );
        } else if (format === "number") valid = Number.isFinite(Number(value));
        if (!valid) {
          errors.push("Неверный формат ответа: " + id);
          continue;
        }
      }
      answers.set(id, answer);
    }
    return {
      answers: [...answers.values()],
      missing: questions.filter((q) => !answers.has(q.id)),
      errors,
    };
  }
  function candidateText(data) {
    if (data?.promptFeedback?.blockReason)
      throw new Error(
        "Gemini отклонил запрос: " + data.promptFeedback.blockReason,
      );
    const candidate = data?.candidates?.[0];
    if (
      candidate?.finishReason &&
      !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)
    )
      throw new Error("Gemini не завершил ответ: " + candidate.finishReason);
    return {
      text: (candidate?.content?.parts || [])
        .filter((p) => !p.thought && typeof p.text === "string")
        .map((p) => p.text)
        .join(""),
      truncated: candidate?.finishReason === "MAX_TOKENS",
    };
  }
  async function fetchTimed(url, options = {}, timeout = 90000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      // Keep the deadline active for the body, not only until HTTP headers arrive.
      const bytes = await response.arrayBuffer();
      const buffered = new Response(
        [204, 205, 304].includes(response.status) ? null : bytes,
        {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
      );
      Object.defineProperty(buffered, "url", { value: response.url });
      return buffered;
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error(
          "Превышено время ожидания. Сохранённые ответы останутся; повторите запуск.",
          { cause: error },
        );
      throw new Error(
        "Не удалось подключиться к серверу. Проверьте сеть и доступ к сервису. " +
          text(error.message),
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }
  const exported = {
    api,
    DEFAULTS,
    DEFAULT_SHORTCUTS,
    normalizeShortcut,
    shortcutFromEvent,
    shortcutLabel,
    DEFAULT_MODEL,
    PROVIDERS,
    HOSTS,
    FALLBACK_MODELS,
    FALLBACK_MODELS_BY_PROVIDER,
    fallbackModelsFor,
    text,
    normalize,
    unique,
    listen,
    unwrap,
    request,
    tabRequest,
    supportedUrl,
    formsUrl,
    googleFormsUrl,
    questionImages,
    modelId,
    modelCompatible,
    safeBaseUrl,
    sanitizeConfig,
    hash,
    canonicalSchema,
    schemaKey,
    batches,
    answerSchema,
    parseAnswerJson,
    validateAnswers,
    candidateText,
    fetchTimed,
  };
  globalThis.EzEx = Object.freeze(exported);
  if (typeof module !== "undefined") module.exports = exported;
})();
