(() => {
  "use strict";
  const translations = {
    "Настройки ещё загружаются. Повторите через несколько секунд.":
      "Settings are still loading. Try again in a few seconds.",
    "Откройте раздел сочетаний клавиш на странице расширений браузера.":
      "Open the shortcuts section on your browser's extensions page.",
    "Удаление отменено или запрещено браузером. Можно удалить ezEx на странице расширений.":
      "Removal was cancelled or blocked by the browser. You can remove ezEx from the extensions page.",
    "выбранного сервиса": "the selected provider",
    "AI помощник": "AI helper",
    "Удалите ezEx через страницу расширений браузера.":
      "Remove ezEx from your browser's extensions page.",
    "Действие доступно из меню расширения.":
      "This action is available from the extension menu.",
    "Действие доступно из расширения или со страницы Teams / Forms.":
      "This action is available from the extension or a Teams / Forms page.",
    "Укажите корректный HTTPS адрес API.": "Enter a valid HTTPS API URL.",
    "Добавьте API-ключ, чтобы загрузить доступные модели.":
      "Add an API key to load available models.",
    "Google вернул повторную страницу каталога. Попробуйте обновить список позже.":
      "Google returned a duplicate catalog page. Try refreshing the list later.",
    " вернул повторную страницу списка моделей.":
      " returned a duplicate page of models.",
    "[ключ скрыт]": "[key hidden]",
    "Проверьте модель и параметры запроса.":
      "Check the model and request parameters.",
    "API-ключ недействителен.": "Invalid API key.",
    "У ключа нет доступа к API или выбранной модели.":
      "The key cannot access this API or model.",
    "Модель или API адрес не найдены.": "The model or API URL was not found.",
    "Лимит API исчерпан. Проверьте тариф и квоту.":
      "API limit reached. Check your plan and quota.",
    "Ошибка сервера. Повторите позже.": "Server error. Try again later.",
    "Сервис перегружен. Повторите позже.":
      "The service is overloaded. Try again later.",
    "Ошибка запроса.": "Request failed.",
    "Проверьте ключ, модель и параметры запроса.":
      "Check the key, model, and request parameters.",
    "У ключа нет доступа к этой модели или API.":
      "The key cannot access this model or API.",
    "Модель недоступна. Обновите список и выберите другую.":
      "Model unavailable. Refresh the list and choose another model.",
    "Лимит Gemini исчерпан. Проверьте квоту и тариф в AI Studio.":
      "Gemini limit reached. Check your quota and plan in AI Studio.",
    "Ошибка сервера Gemini. Повторите позже.":
      "Gemini server error. Try again later.",
    "Модель перегружена. Повторите позже.":
      "The model is overloaded. Try again later.",
    "ezEx на паузе. Возобновите работу в меню или горячей клавишей.":
      "ezEx is paused. Resume from the menu or with your shortcut.",
    "Неизвестное действие.": "Unknown action.",
    "Предыдущий запуск прерван. Повторите: сохранённые части будут использованы.":
      "The previous run was interrupted. Run again to reuse saved batches.",
    "Дождитесь завершения текущего запуска.":
      "Wait for the current run to finish.",
    "В форме нет поддерживаемых вопросов.":
      "This form has no supported questions.",
    "У вопросов отсутствуют уникальные идентификаторы. Обновите страницу формы.":
      "Questions have missing or duplicate IDs. Reload the form.",
    "ezEx на паузе.": "ezEx is paused.",
    "Выберите текстовую модель из списка.":
      "Choose a text model from the list.",
    "Выберите текстовую модель Gemini или Gemma.":
      "Choose a Gemini or Gemma text model.",
    "Для вопросов с изображениями выберите Google Gemini.":
      "Choose Google Gemini for questions with images.",
    "Эта модель не поддерживает генерацию ответов. Выберите текстовую модель из каталога.":
      "This model cannot generate answers. Choose a text model from the catalog.",
    "ezEx на паузе. Полученные ответы сохранены.":
      "ezEx is paused. Generated answers have been saved.",
    "Проверяю и дополняю ответ…": "Validating and completing answers…",
    ": часть ": ": batch ",
    " из ": " of ",
    " Сохранено ": " Saved ",
    " ответов. Повторите запуск или выберите другую модель.":
      " answers. Run again or choose another model.",
    " не дал корректные ответы для ": " did not return valid answers for ",
    " вопросов. Остальные сохранены; повторный запуск запросит только недостающие.":
      " questions. Other answers are saved; running again requests only the missing ones.",
    "Вопросы с изображениями сейчас поддерживает Google Gemini.":
      "Google Gemini currently supports questions with images.",
    "Для вопросов с изображениями выберите Gemini: Gemma работает здесь только с текстом.":
      "Choose Gemini for image questions. Gemma supports only text in this mode.",
    "Изображения превышают 15 МБ. Уменьшите число вопросов в одной части в настройках.":
      "Images exceed 15 MB. Reduce the batch size in settings.",
    "Изображение размещено на неподдерживаемом сервере Forms.":
      "The image is hosted on an unsupported Forms server.",
    "Изображение перенаправлено на неподдерживаемый сервер.":
      "The image redirected to an unsupported server.",
    "Изображение вопроса недоступно (HTTP ":
      "Question image unavailable (HTTP ",
    "Неподдерживаемый формат изображения: ": "Unsupported image format: ",
    "Изображение пустое или превышает 15 МБ.":
      "The image is empty or exceeds 15 MB.",
    "Forms: разрешён только один ответ на человека. Вы уже отправляли этот тест.":
      "Forms allows only one response per person. You have already submitted this test.",
    "Тип вопроса не поддерживается": "Unsupported question type",
    "Читаю вопросы…": "Reading questions…",
    "Требуется ручное заполнение: ": "Manual answers required: ",
    "Вопросы не найдены. Откройте страницу самого теста.":
      "No questions found. Open the test itself.",
    "Для этого теста ещё нет сохранённых ответов. Нажмите «Заполнить тест».":
      "This test has no saved answers yet. Select “Answer test”.",
    "Получаю ответы…": "Generating answers…",
    "ezEx на паузе. Ответы сохранены, вставка остановлена.":
      "ezEx is paused. Answers are saved; insertion has stopped.",
    "Вставляю сохранённые ответы…": "Inserting saved answers…",
    "Заполняю форму…": "Filling the form…",
    "Заполнено: ": "Filled: ",
    ". Вручную: ": ". Manual: ",
    "Ответы сохранены: ": "Answers saved: ",
    "ezEx на паузе. Дальнейшая вставка остановлена.":
      "ezEx is paused. Further insertion has stopped.",
    "Тема оформления": "Appearance",
    "Как в браузере": "Follow browser",
    Светлая: "Light",
    Тёмная: "Dark",
    "Язык и оформление": "Language and appearance",
    "Изменения применяются сразу. Авто использует язык и тему браузера.":
      "Changes apply immediately. Auto follows your browser's language and appearance.",
    "Авто определяет язык по настройкам браузера.":
      "Auto uses the browser's language settings.",
    "Настройки · ezEx": "Settings · ezEx",
    "ezEx, настройки": "ezEx settings",
    Скрыть: "Hide",
    "Настройки сохранены.": "Settings saved.",
    "Управление и индикатор сохранены.": "Controls and indicator saved.",
    "Выбранная модель синхронизирована с меню.":
      "Selected model synced with the popup.",
    "Загружаю…": "Loading…",
    "Обновить ↻": "Refresh ↻",
    "API key для выбранного сервиса": "API key for the selected provider",
    "Вставь ключ ": "Paste the key for ",
    "Не назначено": "Not assigned",
    "назначьте в браузере": "configure in browser",
    "OpenRouter · GPT, Claude, Gemini, DeepSeek и другие":
      "OpenRouter · GPT, Claude, Gemini, DeepSeek and more",
    "Работает с моделями Ollama, установленными на этом компьютере.":
      "Uses Ollama models installed on this computer.",
    "Для HTTP допустимы только адреса localhost.":
      "HTTP is allowed only for localhost addresses.",
    "Введите корректный HTTPS адрес API.": "Enter a valid HTTPS API URL.",
    "Браузер не поддерживает разрешения для API адреса.":
      "This browser does not support permissions for the API URL.",
    "Разрешение для API адреса не выдано.":
      "Permission for the API URL was not granted.",
    "Нажмите «Обновить», чтобы разрешить доступ к API выбранного сервиса.":
      "Select “Refresh” to allow access to the selected provider's API.",
    "Каталог не загрузился. Показан предварительный список этого сервиса. ":
      "Could not load the model list. Showing a preview for this provider. ",
    " моделей готовы · ": " models ready · ",
    " моделей для ответов · ": " models for answering · ",
    " в каталоге": " in the catalog",
    " ответов · ": " answers · ",
    " · частично": " · partial",
    "Это сочетание уже назначено другому действию.":
      "This shortcut is already assigned to another action.",
    "Сохранённые ответы удалены.": "Saved answers removed.",
    "Не удалось сохранить настройки. Повторите попытку.":
      "Could not save settings. Try again.",
    "Сервис изменился. Выберите модель ещё раз.":
      "The provider changed. Select a model again.",
    "Откройте сам тест в Teams или Forms и дождитесь вопросов. После обновления расширения перезагрузите вкладку.":
      "Open the test in Teams or Forms and wait for the questions. Reload the tab after updating the extension.",
    "Поиск открытого теста…": "Finding the open test…",
    Готово: "Done",
    "Авто (язык браузера)": "Auto (browser language)",
    "Язык интерфейса": "Interface language",
    Русский: "Russian",
    English: "English",
    "Открыть Teams ↗": "Open Teams ↗",
    "НАСТРОЙКИ EZEX": "EZEX SETTINGS",
    "Подключи свою модель": "Connect your AI model",
    "Один раз выбери AI — и возвращайся к тестам.":
      "Choose your AI once, then get back to your tests.",
    "Твой ключ остаётся у тебя": "Your key stays with you",
    "Хранится в этом браузере": "Stored in this browser",
    Подключение: "Connection",
    "Выбери сервис, ключ и модель": "Choose a provider, key, and model",
    "AI-сервис": "AI provider",
    "Провайдер AI": "AI provider",
    "Свой OpenAI-совместимый API": "Custom OpenAI-compatible API",
    "Адрес API": "API URL",
    "API-ключ": "API key",
    "API-ключ · необязательно": "API key · optional",
    Показать: "Show",
    "Показать API-ключ": "Show API key",
    "Скрыть API-ключ": "Hide API key",
    "Вставь ключ выбранного сервиса": "Paste the selected provider's API key",
    "Не требуется для локального Ollama": "Not required for local Ollama",
    "Получить ключ Google AI Studio ↗": "Get a Google AI Studio key ↗",
    "Получить ключ · ": "Get key · ",
    Модель: "Model",
    "Можно найти по названию": "Search by name",
    "Обновить список": "Refresh list",
    "Поиск в каталоге": "Search models",
    "Поиск модели": "Search models",
    "Загружаю список…": "Loading list…",
    "Предварительный список до подключения API-ключа.":
      "Preview list until an API key is connected.",
    "Указать ID модели вручную": "Enter a model ID manually",
    "Например, provider/model-name": "For example, provider/model-name",
    "Заполнение тестов": "Test answering",
    "Пакеты, автозапуск и формат": "Batches, auto-run, and format",
    "Автоматический запуск": "Automatic run",
    "После загрузки вопросов в открытой форме":
      "When questions load in the open form",
    "Сохранять введённые ответы": "Keep existing answers",
    "Повторная вставка заменит заполненные поля":
      "Reinserting answers will replace filled fields",
    "Вопросов за один запрос": "Questions per request",
    "10 · длинные вопросы": "10 · long questions",
    "30 · рекомендуется": "30 · recommended",
    "50 · меньше запросов": "50 · fewer requests",
    "Для 61 вопроса при размере 30 уйдут части 30 + 30 + 1. Повторный запуск берёт ответы из кэша.":
      "With a batch size of 30, 61 questions are sent as 30 + 30 + 1. A rerun uses cached answers.",
    "Дополнительные указания": "Additional instructions",
    "Например: отвечай по-русски; для числовых ответов указывай только число.":
      "For example: answer in English; for numeric answers, return only the number.",
    "Строгая структура и соответствие вариантов всё равно проверяются.":
      "The required structure and choice matching are still validated.",
    "Дополнительная клавиша Ctrl+A": "Extra Ctrl+A shortcut",
    "Вне полей ввода заменяет выделение всего":
      "Outside input fields, replaces select-all",
    "Диагностические сообщения": "Diagnostic messages",
    "Короткие сведения об ошибках в консоли":
      "Brief error details in the console",
    "Горячие клавиши можно изменить в блоке «Управление и индикатор».":
      "You can change shortcuts in “Controls and indicator”.",
    "Мои тесты": "My tests",
    "Ответы для повторной вставки": "Answers ready to reinsert",
    "Здесь появятся тесты после получения ответов.":
      "Tests will appear here after answers are generated.",
    "Очистить сохранённые ответы": "Clear saved answers",
    "Управление и индикатор": "Controls and indicator",
    "Свои клавиши, пауза и видимость на странице":
      "Shortcuts, pause, and on-page visibility",
    "Расширение работает": "Extension is enabled",
    "Выключите, чтобы приостановить запросы, автозапуск и вставку":
      "Turn off to pause requests, auto-run, and insertion",
    "Индикатор на странице": "On-page indicator",
    "Обычный · текст и ход работы": "Normal · text and progress",
    "Компактный · маленькая отметка без текста":
      "Compact · small mark without text",
    "Выключен · состояние только в меню расширения":
      "Off · status shown only in the extension menu",
    Обычный: "Normal",
    Компактный: "Compact",
    Выключен: "Off",
    "Меняется сразу, в том числе во время выполнения. В компактном режиме: ··· — работа, ✓ — готово, ! — ошибка.":
      "Changes immediately, including during a run. Compact mode: ··· working, ✓ done, ! error.",
    "Горячие клавиши на Teams / Google Forms":
      "Shortcuts for Teams / Google Forms",
    Сбросить: "Reset",
    "Нажмите на поле и зажмите своё сочетание с Ctrl, Alt или ⌘. Backspace очищает, Escape завершает ввод. Запуск не срабатывает при вводе текста в форме.":
      "Focus a field and press a shortcut with Ctrl, Alt, or ⌘. Backspace clears it; Escape cancels. Run shortcuts are ignored while typing in a form.",
    "Заполнить тест": "Answer test",
    "Открыть настройки": "Open settings",
    "Индикатор: скрыть / показать": "Hide / show indicator",
    "Пауза / продолжить": "Pause / resume",
    "Открыть подтверждение удаления": "Open uninstall confirmation",
    "Сочетание для заполнения теста": "Shortcut to answer the test",
    "Сочетание для настроек": "Settings shortcut",
    "Сочетание для индикатора": "Indicator shortcut",
    "Сочетание для паузы": "Pause shortcut",
    "Сочетание для подтверждения удаления": "Uninstall confirmation shortcut",
    "Запуск клавишей Num5": "Run with Num5",
    "Без Ctrl, Alt и Shift; вне полей ввода":
      "Without Ctrl, Alt, or Shift; outside input fields",
    "Пауза останавливает дальнейшую вставку и новые запросы. Уже отправленный запрос может завершиться; полученные ответы сохраняются.":
      "Pause stops further insertion and new requests. An in-flight request may finish; generated answers are saved.",
    "Значок на панели браузера": "Browser toolbar icon",
    "В меню расширений браузера уберите закрепление ezEx. Для открытия меню можно использовать":
      "Unpin ezEx from the browser extensions menu. To open the menu, use",
    "Страница управления расширениями продолжит показывать ezEx.":
      "The extensions management page will still show ezEx.",
    "Настроить клавиши браузера ↗": "Configure browser shortcuts ↗",
    "Удалить ezEx": "Remove ezEx",
    "Браузер попросит подтверждение. Удаление очистит настройки и сохранённые ответы расширения.":
      "Your browser will ask for confirmation. Removing the extension clears its settings and saved answers.",
    "Удалить…": "Remove…",
    "Сохранить настройки": "Save settings",
    "AI помощник · Teams + Google Forms": "AI helper · Teams + Google Forms",
    "Проверяю…": "Checking…",
    "Открытый тест": "Open test",
    "ОТКРЫТЫЙ ТЕСТ": "OPEN TEST",
    "Откройте тест": "Open a test",
    "Откройте тест в Teams, Microsoft Forms или Google Forms":
      "Open a test in Teams, Microsoft Forms, or Google Forms",
    "Обновить список моделей": "Refresh model list",
    "Загрузка моделей…": "Loading models…",
    Результат: "Result",
    "Проверяю открытую вкладку…": "Checking the active tab…",
    "Обработка вопросов": "Processing questions",
    "Вставить сохранённые ответы": "Insert saved answers",
    "Ещё действия и настройки": "More actions and settings",
    "Автозапуск при открытии теста": "Run automatically when a test opens",
    "Прочитать вопросы": "Read questions",
    "Получить ответы": "Generate answers",
    "Запросить заново": "Generate again",
    "или Num5": "or Num5",
    Пауза: "Pause",
    Продолжить: "Resume",
    "Обновить состояние": "Refresh status",
    "Настройки ↗": "Settings ↗",
    Ответов: "Answers",
    Запросов: "Requests",
    "Модели для ответов": "Models for answering",
    "Предварительный список · доступ уточняется по ключу":
      "Preview list · availability depends on your key",
    "Другие модели API · не поддерживают этот режим":
      "Other API models · this mode is unsupported",
    " · выбрана": " · selected",
    " · вне каталога": " · not in catalog",
    "OpenRouter · сотни моделей": "OpenRouter · hundreds of models",
    "Ollama · локальные модели": "Ollama · local models",
    "Вставлено:": "Inserted:",
    "Уже заполнено:": "Already filled:",
    "Не вставлено:": "Not inserted:",
    "Не на текущей странице:": "Not on the current page:",
    "Откройте следующую страницу теста и вставьте сохранённые ответы.":
      "Open the next test page and insert the saved answers.",
    "Требуют ручного заполнения:": "Need to be answered manually:",
    "Найдено вопросов:": "Questions found:",
    ". Запросов AI: 0.": ". AI requests: 0.",
    "Не все ответы вставлены. Проверьте результат ниже.":
      "Some answers were not inserted. Review the details below.",
    "Сохранённые ответы использованы. Новых запросов: 0.":
      "Used saved answers. New requests: 0.",
    "Готово. Ответы сохранены для этого теста.":
      "Done. Answers are saved for this test.",
    "Форма найдена": "Form found",
    "Нет теста": "No test found",
    "Каталог недоступен. Проверьте ключ и соединение.":
      "Model list unavailable. Check your key and connection.",
    "Можно заполнять. Повторный запуск использует сохранённый ответ.":
      "Ready. Rerunning uses saved answers.",
    "Добавьте API-ключ для ": "Add an API key for ",
    " в настройках.": " in settings.",
    "ezEx на паузе. Запросы и дальнейшая вставка остановлены.":
      "ezEx is paused. Requests and further insertion are stopped.",
    "Читаю открытый тест…": "Reading the open test…",
    "Модель сохранена. Для нового ответа нажмите «Запросить заново».":
      "Model saved. Select “Generate again” for a new answer.",
    "Активная вкладка не найдена.": "Active tab not found.",
    "Расширение не ответило. Обновите расширение и вкладку Teams.":
      "The extension did not respond. Reload it and the Teams tab.",
    "Неизвестная ошибка": "Unknown error",
    "Ошибка расширения": "Extension error",
    "Gemini вернул неполный или неверный JSON.":
      "The model returned incomplete or invalid JSON.",
  };
  const ordered = Object.entries(translations).sort(
    (a, b) => b[0].length - a[0].length,
  );
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const phrases = new RegExp(
    ordered.map(([ru]) => escapeRegex(ru)).join("|"),
    "g",
  );
  const api = typeof browser !== "undefined" ? browser : globalThis.chrome;
  const isExtensionDocument =
    typeof document !== "undefined" &&
    /^(?:chrome|moz|safari-web)-extension:$/.test(document.location.protocol);
  function browserLanguage() {
    try {
      const value = api?.i18n?.getUILanguage?.() || navigator.language || "en";
      return value.toLowerCase().startsWith("ru") ? "ru" : "en";
    } catch {
      return "en";
    }
  }
  let preference = "auto";
  const sources = new WeakMap();
  const listeners = new Set();
  function current() {
    return preference === "auto" ? browserLanguage() : preference;
  }
  function translate(value, language = current()) {
    const input = String(value ?? "");
    if (language !== "en") return input;
    const trimmed = input.trim();
    const normalized = trimmed.replace(/\s+/g, " ");
    const exact = Object.hasOwn(translations, normalized)
      ? translations[normalized]
      : null;
    if (exact)
      return (
        input.slice(0, input.indexOf(trimmed)) +
        exact +
        input.slice(input.indexOf(trimmed) + trimmed.length)
      );
    return input.replace(phrases, (phrase) => translations[phrase]);
  }
  const ignored = "script,style,code,pre,textarea,[data-no-i18n]";
  function renderValue(node, key, value, write) {
    let record = sources.get(node);
    if (!record) {
      record = new Map();
      sources.set(node, record);
    }
    const before = record.get(key);
    const source = before && value === before.rendered ? before.source : value;
    const rendered = translate(source);
    record.set(key, { source, rendered });
    if (rendered !== value) write(rendered);
  }
  function renderNode(node) {
    const element =
      node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!element || element.closest?.(ignored)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      renderValue(node, "text", node.nodeValue, (value) => {
        node.nodeValue = value;
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of [
        "placeholder",
        "aria-label",
        "title",
        "alt",
        "label",
      ]) {
        const value = node.getAttribute(attr);
        if (value)
          renderValue(node, attr, value, (result) =>
            node.setAttribute(attr, result),
          );
      }
    }
  }
  function translateElement(element) {
    if (!element) return;
    renderNode(element);
    if (element.nodeType === Node.TEXT_NODE) return;
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) renderNode(walker.currentNode);
  }
  function setText(element, value) {
    element.textContent = String(value ?? "");
    translateElement(element);
  }
  function apply(value = "auto") {
    preference = ["auto", "ru", "en"].includes(value) ? value : "auto";
    const language = current();
    if (isExtensionDocument) {
      document.documentElement.lang = language;
      translateElement(document.documentElement);
    }
    for (const listener of listeners) listener(language);
    return language;
  }
  if (isExtensionDocument) {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" || record.type === "characterData")
          renderNode(record.target);
        else for (const node of record.addedNodes) translateElement(node);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title", "alt", "label"],
    });
    apply("auto");
    globalThis.addEventListener?.("languagechange", () => {
      if (preference === "auto") apply("auto");
    });
  }
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  globalThis.EzExLocale = {
    apply,
    browserLanguage,
    current,
    translate,
    setText,
    translateElement,
    subscribe,
  };
})();
