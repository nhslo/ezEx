(() => {
  "use strict";
  const E = EzEx;
  const U = EzExUI;
  const $ = (id) => document.getElementById(id);
  const toggles = [
    "autoRun",
    "respectExistingAnswers",
    "debugLogs",
    "legacyCtrlA",
  ];
  const links = {
    gemini: ["Google AI Studio", "https://aistudio.google.com/apikey"],
    openai: ["OpenAI dashboard", "https://platform.openai.com/api-keys"],
    anthropic: [
      "Anthropic Console",
      "https://console.anthropic.com/settings/keys",
    ],
    openrouter: ["OpenRouter keys", "https://openrouter.ai/keys"],
    groq: ["Groq Console", "https://console.groq.com/keys"],
    deepseek: ["DeepSeek platform", "https://platform.deepseek.com/api_keys"],
    mistral: ["Mistral Console", "https://console.mistral.ai/api-keys/"],
    together: [
      "Together AI settings",
      "https://api.together.ai/settings/api-keys",
    ],
    fireworks: [
      "Fireworks AI console",
      "https://fireworks.ai/account/api-keys",
    ],
    cerebras: ["Cerebras Cloud", "https://cloud.cerebras.ai/"],
    sambanova: ["SambaNova Cloud", "https://cloud.sambanova.ai/"],
  };
  let config = null;
  let models = E.FALLBACK_MODELS;
  let source = "fallback";
  let selected = E.DEFAULT_MODEL;
  let modelRequestId = 0;
  let selectionWrites = Promise.resolve();
  const providerDrafts = new Map();
  let historyRecords = [];
  let catalogSummary = null;
  const provider = () => $("provider").value;
  const info = () =>
    E.PROVIDERS.find((item) => item.id === provider()) || E.PROVIDERS[0];
  const report = (message, error = false) =>
    U.status($("status"), message, error ? "error" : "done");
  const shortcutInputs = [
    ...document.querySelectorAll("[data-shortcut-action]"),
  ];
  function renderControls(saved) {
    $("uiLanguage").value = saved.uiLanguage || "auto";
    EzExLocale.apply(saved.uiLanguage || "auto");
    $("uiTheme").value = saved.uiTheme || "auto";
    EzExTheme.apply(saved.uiTheme || "auto");
    $("enabled").checked = saved.enabled !== false;
    $("indicatorMode").value = saved.indicatorMode || "normal";
    $("numpadHotkey").checked = saved.numpadHotkey !== false;
    const shortcuts = { ...E.DEFAULT_SHORTCUTS, ...saved.shortcuts };
    for (const input of shortcutInputs) {
      const shortcut = shortcuts[input.dataset.shortcutAction] || "";
      input.dataset.shortcut = shortcut;
      input.value = EzExLocale.translate(E.shortcutLabel(shortcut));
    }
  }
  function controlPreferences() {
    return {
      uiLanguage: $("uiLanguage").value,
      uiTheme: $("uiTheme").value,
      enabled: $("enabled").checked,
      indicatorMode: $("indicatorMode").value,
      numpadHotkey: $("numpadHotkey").checked,
      shortcuts: Object.fromEntries(
        shortcutInputs.map((input) => [
          input.dataset.shortcutAction,
          input.dataset.shortcut || "",
        ]),
      ),
    };
  }
  async function saveControls(event) {
    if (!config) return;
    const preferences = controlPreferences();
    const id = event?.target?.id;
    const patch = Object.hasOwn(preferences, id)
      ? { [id]: preferences[id] }
      : { shortcuts: preferences.shortcuts };
    try {
      const saved = await E.request("SAVE_CONFIG", patch);
      config = { ...config, ...saved };
      EzExLocale.apply(saved.uiLanguage || "auto");
      EzExTheme.apply(saved.uiTheme || "auto");
      report("Управление и индикатор сохранены.");
    } catch (error) {
      renderControls(config);
      report(error.message, true);
    }
  }
  function updateProviderFields() {
    const current = provider();
    const target = info();
    const draft = providerDrafts.get(current);
    const savedKey =
      config?.providerApiKeys?.[current] ||
      (current === "gemini" ? config?.geminiApiKey : "") ||
      "";
    $("apiKey").value = draft?.apiKey ?? savedKey;
    $("apiKey").type = "password";
    $("showKey").textContent = "Показать";
    $("showKey").setAttribute("aria-pressed", "false");
    $("showKey").setAttribute("aria-label", "Показать API-ключ");
    $("baseUrlLabel").hidden = current !== "custom";
    $("baseUrl").hidden = current !== "custom";
    $("baseUrl").value =
      draft?.baseUrl ??
      (config?.providerBaseUrls?.[current] || target.baseUrl || "");
    $("apiKey").placeholder =
      current === "custom"
        ? "API key для выбранного сервиса"
        : current === "ollama"
          ? "Не требуется для локального Ollama"
          : "Вставь ключ " + target.name;
    document.querySelector('label[for="apiKey"]').textContent =
      current === "ollama" ? "API-ключ · необязательно" : "API-ключ";
    const help = links[current];
    $("keyHelp").replaceChildren();
    if (help) {
      const link = document.createElement("a");
      link.href = help[1];
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Получить ключ · " + help[0] + " ↗";
      $("keyHelp").append(link);
    } else {
      $("keyHelp").textContent =
        current === "ollama"
          ? "Работает с моделями Ollama, установленными на этом компьютере."
          : "Для HTTP допустимы только адреса localhost.";
    }
    selected =
      config?.providerModels?.[current] ||
      (current === "gemini" ? config?.geminiModel : "") ||
      "";
    $("customModel").value = draft?.customModel || "";
    U.renderModels(
      $("model"),
      models,
      selected,
      source,
      $("modelSearch").value,
    );
  }
  async function loadModels(force = false) {
    const requestId = ++modelRequestId;
    $("refreshModels").disabled = true;
    $("refreshModels").textContent = "Загружаю…";
    const current = provider();
    try {
      if (
        current !== "gemini" &&
        ($("apiKey").value.trim() || current === "ollama")
      ) {
        if (force) await requestProviderOrigin();
        else {
          const address =
            current === "custom"
              ? E.safeBaseUrl($("baseUrl").value)
              : info().baseUrl;
          if (!address) throw new Error("Введите корректный HTTPS адрес API.");
          const origin = [originPattern(address)];
          if (
            !E.api.permissions ||
            !(await E.api.permissions.contains({ origins: origin }))
          )
            throw new Error(
              "Нажмите «Обновить», чтобы разрешить доступ к API выбранного сервиса.",
            );
        }
      }
      const catalog = await E.request("LIST_MODELS", {
        force,
        provider: current,
        apiKey: $("apiKey").value.trim(),
        baseUrl: current === "custom" ? $("baseUrl").value.trim() : undefined,
      });
      if (requestId !== modelRequestId || current !== provider()) return;
      models = catalog.models;
      source = catalog.source;
      catalogSummary = catalog;
      U.renderModels(
        $("model"),
        models,
        selected,
        source,
        $("modelSearch").value,
      );
      renderCatalogSummary();
    } catch (error) {
      if (requestId !== modelRequestId || current !== provider()) return;
      catalogSummary = null;
      models =
        current === "gemini" ? E.FALLBACK_MODELS : E.fallbackModelsFor(current);
      source = "fallback";
      U.renderModels(
        $("model"),
        models,
        selected,
        source,
        $("modelSearch").value,
      );
      U.status(
        $("modelStatus"),
        "Каталог не загрузился. Показан предварительный список этого сервиса. " +
          error.message,
        "error",
      );
    } finally {
      if (requestId === modelRequestId) {
        $("refreshModels").disabled = false;
        $("refreshModels").textContent = "Обновить ↻";
      }
    }
  }
  async function history() {
    historyRecords = await E.request("LIST_HISTORY");
    renderHistory();
  }
  function renderCatalogSummary() {
    if (!catalogSummary) return;
    const catalog = catalogSummary;
    U.status(
      $("modelStatus"),
      catalog.warning ||
        catalog.models.filter((model) => model.compatible).length +
          " моделей готовы · " +
          catalog.models.length +
          " в каталоге" +
          (catalog.at ? " · " + U.date(catalog.at) : ""),
    );
  }
  function renderHistory() {
    const records = historyRecords;
    $("historyList").replaceChildren();
    $("historyCount").textContent = records.length;
    $("historyEmpty").hidden = records.length > 0;
    $("clearHistory").disabled = !records.length;
    for (const record of records.slice(0, 8)) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.dataset.noI18n = "";
      title.textContent = record.title;
      item.append(title);
      const detail = document.createElement("span");
      detail.textContent =
        record.answersCount +
        "/" +
        record.questionCount +
        " ответов · " +
        U.date(record.at) +
        (record.complete ? "" : " · частично");
      item.append(detail);
      $("historyList").append(item);
    }
  }
  async function requestProviderOrigin(current = provider(), savedAddress) {
    if (current === "gemini") return;
    const address =
      savedAddress ||
      (current === "custom"
        ? E.safeBaseUrl($("baseUrl").value)
        : E.PROVIDERS.find((item) => item.id === current)?.baseUrl);
    if (!address) throw new Error("Введите корректный HTTPS адрес API.");
    const url = new URL(address);
    const origins = [originPattern(url.href)];
    if (!E.api.permissions)
      throw new Error("Браузер не поддерживает разрешения для API адреса.");
    if (!(await E.api.permissions.request({ origins })))
      throw new Error("Разрешение для API адреса не выдано.");
  }
  function originPattern(value) {
    const url = new URL(value);
    return url.protocol + "//" + url.hostname + "/*";
  }
  function saveSelection(providerId, modelId = "") {
    const selectedModel = modelId.trim();
    const write = selectionWrites.then(async () => {
      const providerModels = {};
      if (selectedModel) providerModels[providerId] = selectedModel;
      const payload = { provider: providerId, providerModels };
      if (providerId === "gemini" && selectedModel)
        payload.geminiModel = selectedModel;
      const result = await E.request("SAVE_CONFIG", payload);
      config = {
        ...config,
        ...result,
        providerApiKeys: config?.providerApiKeys || {},
        providerModels: { ...config?.providerModels, ...result.providerModels },
      };
      return selectedModel;
    });
    selectionWrites = write.catch(() => {});
    return write;
  }
  $("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("saveButton").disabled = true;
    try {
      if (!config)
        throw new Error(
          "Настройки ещё загружаются. Повторите через несколько секунд.",
        );
      const current = provider();
      const draftAtSave = providerDrafts.get(current);
      const keys = {
        ...(config?.providerApiKeys || {}),
        [current]: $("apiKey").value.trim(),
      };
      const modelsByProvider = {
        ...(config?.providerModels || {}),
        [current]: $("customModel").value.trim() || $("model").value,
      };
      const urls = {
        ...(config?.providerBaseUrls || {}),
        [current]:
          current === "custom" ? $("baseUrl").value.trim() : info().baseUrl,
      };
      const patch = {
        ...controlPreferences(),
        provider: current,
        providerApiKeys: { [current]: keys[current] },
        providerModels: { [current]: modelsByProvider[current] },
        providerBaseUrls: { [current]: urls[current] },
        ...(current === "gemini"
          ? { geminiApiKey: keys.gemini, geminiModel: modelsByProvider.gemini }
          : {}),
        customInstruction: $("customInstruction").value.trim(),
        batchSize: Number($("batchSize").value),
        ...Object.fromEntries(toggles.map((id) => [id, $(id).checked])),
      };
      if (keys[current] || current === "ollama")
        await requestProviderOrigin(current, E.safeBaseUrl(urls[current]));
      const result = await E.request("SAVE_CONFIG", patch);
      config = {
        ...config,
        ...result,
        providerApiKeys: keys,
        providerModels: result.providerModels,
        providerBaseUrls: result.providerBaseUrls,
      };
      if (provider() === current) selected = modelsByProvider[current];
      if (providerDrafts.get(current) === draftAtSave)
        providerDrafts.delete(current);
      report("Настройки сохранены.");
      await loadModels(true);
    } catch (error) {
      report(error.message, true);
    } finally {
      $("saveButton").disabled = false;
    }
  });
  $("provider").addEventListener("change", () => {
    const current = provider();
    models =
      current === "gemini" ? E.FALLBACK_MODELS : E.fallbackModelsFor(current);
    source = "fallback";
    $("modelSearch").value = "";
    updateProviderFields();
    saveSelection(current).catch((error) => report(error.message, true));
    loadModels().catch((error) =>
      U.status($("modelStatus"), error.message, "error"),
    );
  });
  for (const id of ["apiKey", "baseUrl", "customModel"])
    $(id).addEventListener("input", () =>
      providerDrafts.set(provider(), {
        apiKey: $("apiKey").value,
        baseUrl: $("baseUrl").value,
        customModel: $("customModel").value,
      }),
    );
  $("showKey").addEventListener("click", () => {
    const show = $("apiKey").type === "password";
    $("apiKey").type = show ? "text" : "password";
    $("showKey").textContent = show ? "Скрыть" : "Показать";
    $("showKey").setAttribute("aria-pressed", String(show));
    $("showKey").setAttribute(
      "aria-label",
      show ? "Скрыть API-ключ" : "Показать API-ключ",
    );
  });
  $("model").addEventListener("change", () => {
    selected = $("model").value;
    saveSelection(provider(), selected)
      .then(() => report("Выбранная модель синхронизирована с меню."))
      .catch((error) => report(error.message, true));
  });
  $("modelSearch").addEventListener("input", () =>
    U.renderModels(
      $("model"),
      models,
      selected,
      source,
      $("modelSearch").value,
    ),
  );
  $("refreshModels").addEventListener("click", () => loadModels(true));
  for (const id of [
    "uiLanguage",
    "uiTheme",
    "enabled",
    "indicatorMode",
    "numpadHotkey",
  ])
    $(id).addEventListener("change", saveControls);
  for (const input of shortcutInputs) {
    input.addEventListener("keydown", (event) => {
      if (event.code === "Tab") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        input.blur();
        return;
      }
      if (event.repeat || event.isComposing) return;
      const clear = ["Backspace", "Delete"].includes(event.code);
      const shortcut = clear ? "" : E.shortcutFromEvent(event);
      if (!clear && !shortcut) return;
      if (
        shortcut &&
        shortcutInputs.some(
          (other) => other !== input && other.dataset.shortcut === shortcut,
        )
      ) {
        report("Это сочетание уже назначено другому действию.", true);
        return;
      }
      input.dataset.shortcut = shortcut;
      input.value = E.shortcutLabel(shortcut);
      saveControls();
    });
  }
  $("resetShortcuts").addEventListener("click", () => {
    renderControls({ ...controlPreferences(), shortcuts: E.DEFAULT_SHORTCUTS });
    saveControls();
  });
  $("browserShortcuts").addEventListener("click", async () => {
    const url = /Firefox\//.test(window.navigator.userAgent)
      ? "https://support.mozilla.org/kb/manage-extension-shortcuts-firefox"
      : /Edg\//.test(window.navigator.userAgent)
        ? "edge://extensions/shortcuts"
        : "chrome://extensions/shortcuts";
    try {
      await E.api.tabs.create({ url });
    } catch {
      report(
        "Откройте раздел сочетаний клавиш на странице расширений браузера.",
        true,
      );
    }
  });
  $("uninstallExtension").addEventListener("click", async () => {
    try {
      await E.request("REQUEST_UNINSTALL");
    } catch {
      report(
        "Удаление отменено или запрещено браузером. Можно удалить ezEx на странице расширений.",
        true,
      );
    }
  });
  $("clearHistory").addEventListener("click", async () => {
    try {
      await E.request("CLEAR_HISTORY");
      await history();
      report("Сохранённые ответы удалены.");
    } catch (error) {
      report(error.message, true);
    }
  });
  E.api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !config) return;
    const nextConfig = { ...config };
    for (const key of [
      "provider",
      "providerModels",
      "geminiModel",
      "providerApiKeys",
      "geminiApiKey",
      "providerBaseUrls",
      "enabled",
      "uiLanguage",
      "uiTheme",
      "indicatorMode",
      "numpadHotkey",
      "shortcuts",
    ])
      if (changes[key]) nextConfig[key] = changes[key].newValue;
    const nextProvider = nextConfig.provider || "gemini";
    const providerChanged = nextProvider !== provider();
    const nextModel =
      nextConfig.providerModels?.[nextProvider] ||
      (nextProvider === "gemini" ? nextConfig.geminiModel : "") ||
      "";
    config = nextConfig;
    if (
      [
        "uiLanguage",
        "uiTheme",
        "enabled",
        "indicatorMode",
        "numpadHotkey",
        "shortcuts",
      ].some((key) => changes[key])
    )
      renderControls(config);
    if (providerChanged) {
      $("provider").value = nextProvider;
      models =
        nextProvider === "gemini"
          ? E.FALLBACK_MODELS
          : E.fallbackModelsFor(nextProvider);
      source = "fallback";
      updateProviderFields();
      loadModels().catch((error) =>
        U.status($("modelStatus"), error.message, "error"),
      );
    } else if (
      changes.providerModels ||
      (nextProvider === "gemini" && changes.geminiModel)
    ) {
      selected = nextModel;
      U.renderModels(
        $("model"),
        models,
        selected,
        source,
        $("modelSearch").value,
      );
    }
  });
  EzExLocale.subscribe(() => {
    for (const input of shortcutInputs)
      input.value = EzExLocale.translate(
        E.shortcutLabel(input.dataset.shortcut || ""),
      );
    renderHistory();
    renderCatalogSummary();
  });
  async function init() {
    config = await E.request("GET_SETTINGS");
    EzExLocale.apply(config.uiLanguage || "auto");
    renderControls(config);
    if (E.api.commands?.getAll) {
      E.api.commands
        .getAll()
        .then((commands) => {
          const action = commands.find((command) =>
            ["_execute_action", "_execute_browser_action"].includes(
              command.name,
            ),
          );
          $("popupShortcut").textContent =
            action?.shortcut || "назначьте в браузере";
        })
        .catch(() => {});
    }
    $("provider").value = config.provider || "gemini";
    models =
      provider() === "gemini"
        ? E.FALLBACK_MODELS
        : E.fallbackModelsFor(provider());
    $("customInstruction").value = config.customInstruction;
    if (
      ![...$("batchSize").options].some(
        (option) => Number(option.value) === config.batchSize,
      )
    ) {
      const option = document.createElement("option");
      option.value = config.batchSize;
      option.textContent = config.batchSize;
      $("batchSize").append(option);
    }
    $("batchSize").value = config.batchSize;
    toggles.forEach((id) => {
      $(id).checked = config[id];
    });
    updateProviderFields();
    $("saveButton").disabled = false;
    await Promise.all([loadModels(), history()]);
  }
  $("saveButton").disabled = true;
  init().catch((error) => report(error.message, true));
})();
