(() => {
  "use strict";
  const E = EzEx;
  const U = EzExUI;
  const $ = (id) => document.getElementById(id);
  let tabId = null;
  let state = null;
  let busy = false;
  let modelRequestId = 0;
  let refreshRequestId = 0;
  const actionButtons = [
    "btnRun",
    "btnApply",
    "btnSchema",
    "btnGenerate",
    "btnRegenerate",
  ];
  function feedback(message, kind = "info") {
    U.status($("status"), message, kind);
    $("statusDot").dataset.state = kind;
  }
  function buttons(disabled) {
    actionButtons.forEach((id) => {
      $(id).disabled =
        disabled || !state?.frame || state?.config?.enabled === false;
    });
  }
  function renderJob(job) {
    if (
      !job ||
      (job.signature &&
        state?.frame?.signature &&
        job.signature !== state.frame.signature)
    )
      return;
    busy = job.status === "running";
    buttons(busy);
    $("requestCount").textContent = job.requestCount ?? 0;
    $("answersCount").textContent = job.answersCount ?? job.completed ?? "—";
    if (job.questionCount || job.total)
      $("questionCount").textContent = job.questionCount || job.total;
    $("progress").hidden = !busy;
    $("progress").max = job.total || 1;
    $("progress").value = job.completed || 0;
    if (busy && !job.total) $("progress").removeAttribute("value");
    const done =
      job.action === "schema"
        ? "Найдено вопросов: " + job.questionCount + ". Запросов AI: 0."
        : job.stats?.missing
          ? "Не все ответы вставлены. Проверьте результат ниже."
          : job.cached
            ? "Сохранённые ответы использованы. Новых запросов: 0."
            : "Готово. Ответы сохранены для этого теста.";
    feedback(
      job.status === "done" ? done : job.stage,
      job.status === "error" ? "error" : job.status,
    );
    const details = [];
    const t = EzExLocale.translate;
    if (job.stats) {
      details.push(
        t(
          "Вставлено: " +
            job.stats.filled +
            " · Уже заполнено: " +
            job.stats.skipped +
            " · Не вставлено: " +
            job.stats.missing,
        ),
      );
      if (job.stats.offPage)
        details.push(
          t(
            "Не на текущей странице: " +
              job.stats.offPage +
              ". Откройте следующую страницу теста и вставьте сохранённые ответы.",
          ),
        );
    }
    if (job.unsupportedCount)
      details.push(t("Требуют ручного заполнения: " + job.unsupportedCount));
    for (const question of (job.manualQuestions || []).slice(0, 4))
      details.push(
        question.title + " — " + EzExLocale.translate(question.reason),
      );
    if (job.model) details.push(job.model);
    $("resultDetail").textContent = details.join("\n");
    $("resultDetail").hidden = !details.length;
  }
  async function refresh() {
    const requestId = ++refreshRequestId;
    const [tab] = await E.api.tabs.query({ active: true, currentWindow: true });
    const targetTabId = tab?.id;
    if (targetTabId == null) throw new Error("Активная вкладка не найдена.");
    const nextState = await E.request("GET_TAB_STATE", { tabId: targetTabId });
    if (requestId !== refreshRequestId) return;
    tabId = targetTabId;
    state = nextState;
    EzExLocale.apply(state.config.uiLanguage || "auto");
    EzExTheme.apply(state.config.uiTheme || "auto");
    $("uiLanguage").value = state.config.uiLanguage || "auto";
    $("uiTheme").value = state.config.uiTheme || "auto";
    const enabled = state.config.enabled !== false;
    $("btnPause").textContent = enabled ? "Пауза" : "Продолжить";
    $("btnPause").setAttribute("aria-pressed", String(!enabled));
    $("indicatorMode").value = state.config.indicatorMode || "normal";
    $("runShortcut").textContent = E.shortcutLabel(
      (state.config.shortcuts || E.DEFAULT_SHORTCUTS).run,
    );
    $("numpadHint").hidden = state.config.numpadHotkey === false;
    buttons(busy);
    const ready = Boolean(state.frame);
    $("connection").textContent = ready ? "Форма найдена" : "Нет теста";
    $("connection").dataset.ready = String(ready);
    $("formTitle").textContent =
      state.frame?.title || EzExLocale.translate("Откройте тест");
    $("formTitle").title = state.frame?.title || "";
    $("pageHint").textContent =
      state.frame?.host ||
      "teams.cloud.microsoft · forms.office.com · docs.google.com/forms";
    $("questionCount").textContent = state.frame?.questionCount ?? "—";
    $("autoRun").checked = state.config.autoRun;
    if (!ready) feedback(state.error, "info");
    else
      feedback(
        "Можно заполнять. Повторный запуск использует сохранённый ответ.",
      );
    if (state.job && ready) renderJob(state.job);
    if (!state.config.hasApiKey && !state.job)
      feedback(
        "Добавьте API-ключ для " +
          (E.PROVIDERS.find((item) => item.id === state.config.provider)
            ?.name || "выбранного сервиса") +
          " в настройках.",
        "info",
      );
    if (!enabled)
      feedback(
        "ezEx на паузе. Запросы и дальнейшая вставка остановлены.",
        "info",
      );
  }
  async function loadModels(force = false) {
    const requestId = ++modelRequestId;
    $("btnModels").disabled = true;
    $("model").disabled = true;
    let config = state?.config;
    try {
      config = await E.request("GET_CONFIG");
      if (requestId !== modelRequestId) return;
      const catalog = await E.request("LIST_MODELS", {
        force,
        provider: config.provider,
      });
      if (requestId !== modelRequestId) return;
      const model =
        config.providerModels?.[config.provider] ||
        (config.provider === "gemini" ? config.geminiModel : "");
      U.renderModels($("model"), catalog.models, model, catalog.source);
      $("model").dataset.provider = config.provider;
      $("providerName").textContent =
        E.PROVIDERS.find((item) => item.id === config.provider)?.name ||
        "AI помощник";
      $("modelHint").textContent =
        catalog.warning ||
        catalog.models.filter((m) => m.compatible).length +
          " моделей для ответов · " +
          catalog.models.length +
          " в каталоге";
    } catch (error) {
      if (requestId !== modelRequestId) return;
      config ||= state?.config || E.DEFAULTS;
      const model =
        config.providerModels?.[config.provider] ||
        (config.provider === "gemini" ? config.geminiModel : "");
      U.renderModels(
        $("model"),
        config.provider === "gemini"
          ? E.FALLBACK_MODELS
          : E.fallbackModelsFor(config.provider),
        model,
        "fallback",
      );
      $("model").dataset.provider = config.provider;
      $("modelHint").textContent =
        "Каталог недоступен. Проверьте ключ и соединение.";
      feedback(error.message, "error");
    } finally {
      if (requestId === modelRequestId) {
        $("btnModels").disabled = false;
        $("model").disabled = !$("model").options.length;
      }
    }
  }
  async function run(action) {
    if (busy || !state?.frame || state.config.enabled === false) return;
    busy = true;
    buttons(true);
    feedback("Читаю открытый тест…", "running");
    try {
      const result = await E.request("ROUTE_ACTION", { tabId, action });
      await refresh();
      renderJob({ status: "done", ...result });
      if (action === "schema")
        feedback(
          "Найдено вопросов: " + result.questionCount + ". Запросов AI: 0.",
          "done",
        );
    } catch (error) {
      feedback(error.message, "error");
    } finally {
      busy = false;
      buttons(false);
      $("progress").hidden = true;
    }
  }
  for (const [id, action] of Object.entries({
    btnRun: "run",
    btnApply: "apply",
    btnSchema: "schema",
    btnGenerate: "generate",
    btnRegenerate: "regenerate",
  }))
    $(id).addEventListener("click", () => run(action));
  $("btnOptions").addEventListener("click", () =>
    E.api.runtime
      .openOptionsPage()
      .catch((error) => feedback(error.message, "error")),
  );
  $("btnRefresh").addEventListener("click", () =>
    refresh().catch((error) => feedback(error.message, "error")),
  );
  $("btnModels").addEventListener("click", () =>
    loadModels(true).catch((error) => feedback(error.message, "error")),
  );
  $("btnPause").addEventListener("click", async () => {
    $("btnPause").disabled = true;
    try {
      await E.request("TOGGLE_ENABLED");
      await refresh();
    } catch (error) {
      feedback(error.message, "error");
    } finally {
      $("btnPause").disabled = false;
    }
  });
  $("indicatorMode").addEventListener("change", async () => {
    try {
      await E.request("SAVE_CONFIG", {
        indicatorMode: $("indicatorMode").value,
      });
    } catch (error) {
      feedback(error.message, "error");
    }
  });
  $("uiLanguage").addEventListener("change", async () => {
    try {
      const saved = await E.request("SAVE_CONFIG", {
        uiLanguage: $("uiLanguage").value,
      });
      EzExLocale.apply(saved.uiLanguage || "auto");
    } catch (error) {
      $("uiLanguage").value = state?.config?.uiLanguage || "auto";
      feedback(error.message, "error");
    }
  });
  $("uiTheme").addEventListener("change", async () => {
    try {
      const saved = await E.request("SAVE_CONFIG", {
        uiTheme: $("uiTheme").value,
      });
      EzExTheme.apply(saved.uiTheme || "auto");
    } catch (error) {
      $("uiTheme").value = state?.config?.uiTheme || "auto";
      feedback(error.message, "error");
    }
  });
  $("autoRun").addEventListener("change", async () => {
    try {
      await E.request("SAVE_CONFIG", { autoRun: $("autoRun").checked });
    } catch (error) {
      feedback(error.message, "error");
    }
  });
  $("model").addEventListener("change", async () => {
    const selectedModel = $("model").value;
    const selectedProvider = $("model").dataset.provider;
    if (!selectedModel || !selectedProvider) return;
    try {
      const config = await E.request("GET_CONFIG");
      if (selectedProvider !== config.provider) {
        await loadModels();
        throw new Error("Сервис изменился. Выберите модель ещё раз.");
      }
      await E.request("SAVE_CONFIG", {
        expectedProvider: selectedProvider,
        providerModels: { [selectedProvider]: selectedModel },
        ...(config.provider === "gemini" ? { geminiModel: selectedModel } : {}),
      });
      feedback(
        "Модель сохранена. Для нового ответа нажмите «Запросить заново».",
      );
    } catch (error) {
      feedback(error.message, "error");
    }
  });
  E.api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (
      changes.enabled ||
      changes.uiLanguage ||
      changes.uiTheme ||
      changes.autoRun ||
      changes.indicatorMode ||
      changes.shortcuts ||
      changes.numpadHotkey
    )
      refresh().catch((error) => feedback(error.message, "error"));
    if (tabId != null && changes["ezex:job:" + tabId]?.newValue)
      renderJob(changes["ezex:job:" + tabId].newValue);
    if (changes.provider) Promise.allSettled([refresh(), loadModels()]);
    else if (changes.providerModels || changes.geminiModel)
      loadModels().catch((error) => feedback(error.message, "error"));
  });
  buttons(true);
  Promise.allSettled([refresh(), loadModels()]).then((results) => {
    for (const result of results)
      if (result.status === "rejected")
        feedback(result.reason.message, "error");
  });
})();
