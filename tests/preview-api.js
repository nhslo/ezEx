// Local UI preview only. This file is never included in extension builds.
(() => {
  const listeners = [];
  let config = {
    uiLanguage: "ru",
    uiTheme: "auto",
    enabled: true,
    indicatorMode: "normal",
    indicatorRestoreMode: "normal",
    numpadHotkey: true,
    geminiApiKey: "preview-example-key",
    geminiModel: "gemini-3.5-flash-lite",
    provider: "gemini",
    providerApiKeys: { gemini: "preview-example-key" },
    providerModels: { gemini: "gemini-3.5-flash-lite" },
    providerBaseUrls: {},
    autoRun: false,
    respectExistingAnswers: true,
    customInstruction: "",
    debugLogs: false,
    legacyCtrlA: false,
    batchSize: 30,
  };
  let job = null;
  let records = [];
  const safeConfig = () => {
    const safe = { ...config };
    delete safe.geminiApiKey;
    const keys = safe.providerApiKeys;
    delete safe.providerApiKeys;
    return { ...safe, hasApiKey: Boolean(keys?.[config.provider]) };
  };
  function publish(patch) {
    const previous = job;
    job = { ...job, ...patch };
    for (const fn of listeners)
      fn({ "ezex:job:1": { oldValue: previous, newValue: job } }, "local");
  }
  const wait = () => new Promise((resolve) => setTimeout(resolve, 80));
  globalThis.chrome = {
    permissions: {
      contains: async () => true,
      request: async () => true,
    },
    tabs: {
      query: async () => [{ id: 1, url: "https://teams.cloud.microsoft/" }],
    },
    storage: {
      onChanged: {
        addListener(fn) {
          listeners.push(fn);
        },
      },
    },
    runtime: {
      openOptionsPage: async () => {
        location.href = "/options.html";
      },
      async sendMessage({ type, payload: p = {} }) {
        let data;
        switch (type) {
          case "TOGGLE_ENABLED":
            return this.sendMessage({
              type: "SAVE_CONFIG",
              payload: { enabled: config.enabled === false },
            });
          case "TOGGLE_INDICATOR":
            return this.sendMessage({
              type: "SAVE_CONFIG",
              payload: {
                indicatorMode:
                  config.indicatorMode === "off"
                    ? config.indicatorRestoreMode
                    : "off",
                indicatorRestoreMode:
                  config.indicatorMode === "off"
                    ? config.indicatorRestoreMode
                    : config.indicatorMode,
              },
            });
          case "OPEN_OPTIONS":
            data = true;
            break;
          case "REQUEST_UNINSTALL":
            throw new Error("Удаление недоступно в локальном предпросмотре.");
          case "GET_CONFIG":
            data = safeConfig();
            break;
          case "GET_SETTINGS":
            data = { ...config };
            break;
          case "SAVE_CONFIG": {
            const previous = config;
            if (["normal", "compact"].includes(p.indicatorMode))
              p.indicatorRestoreMode = p.indicatorMode;
            config = { ...config, ...p };
            for (const key of [
              "providerApiKeys",
              "providerModels",
              "providerBaseUrls",
            ])
              if (p[key]) config[key] = { ...previous[key], ...p[key] };
            const changes = Object.fromEntries(
              Object.keys(p)
                .filter(
                  (key) =>
                    JSON.stringify(previous[key]) !==
                    JSON.stringify(config[key]),
                )
                .map((key) => [
                  key,
                  { oldValue: previous[key], newValue: config[key] },
                ]),
            );
            for (const listener of listeners) listener(changes, "local");
            data = safeConfig();
            break;
          }
          case "LIST_MODELS": {
            const models =
              p.provider === "gemini"
                ? EzEx.FALLBACK_MODELS
                : EzEx.fallbackModelsFor(p.provider);
            data = {
              models: [
                ...models,
                ...(p.provider === "gemini"
                  ? [
                      {
                        id: "gemini-3.8-flash-tts",
                        displayName: "Audio only",
                        compatible: false,
                      },
                    ]
                  : []),
              ],
              source: "fallback",
              at: Date.now(),
            };
            break;
          }
          case "GET_TAB_STATE":
            data = {
              frame: {
                title: "Проверочная форма · 61 вопрос",
                host: "Предпросмотр · локальные данные",
                questionCount: 61,
                signature: "preview",
              },
              config: safeConfig(),
              job,
            };
            break;
          case "LIST_HISTORY":
            data = records;
            break;
          case "CLEAR_HISTORY":
            records = [];
            data = true;
            break;
          case "ROUTE_ACTION": {
            const action = p.action || "run";
            if (action !== "schema") {
              publish({
                status: "running",
                action,
                stage: "Gemini: часть 1 из 3",
                requestCount: 1,
                completed: 0,
                total: 61,
                signature: "preview",
                answersCount: 0,
              });
              await wait();
              publish({ requestCount: 2, completed: 30 });
              await wait();
            }
            data = {
              action,
              title: "Проверочная форма · 61 вопрос",
              questionCount: 61,
              answersCount: action === "schema" ? 0 : 61,
              requestCount: ["schema", "apply"].includes(action) ? 0 : 3,
              model: config.geminiModel,
              cached: action === "apply",
              completed: action === "schema" ? 0 : 61,
              total: 61,
              signature: "preview",
              stats: ["run", "apply"].includes(action)
                ? { filled: 61, skipped: 0, missing: 0 }
                : null,
            };
            publish({ ...data, status: "done", stage: "Готово" });
            if (action !== "schema")
              records = [
                {
                  title: data.title,
                  answersCount: 61,
                  questionCount: 61,
                  complete: true,
                  at: Date.now(),
                },
              ];
            break;
          }
          default:
            throw new Error("Unsupported preview action: " + type);
        }
        return { ok: true, data };
      },
    },
  };
})();
