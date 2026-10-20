(() => {
  "use strict";
  function renderModels(select, models, selected, source = "api", query = "") {
    select.replaceChildren();
    const filtered = models.filter((m) =>
      (m.id + " " + m.displayName).toLowerCase().includes(query.toLowerCase()),
    );
    const group = (label, entries, disabled) => {
      if (!entries.length) return;
      const parent = document.createElement("optgroup");
      parent.label = label;
      for (const model of entries) {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        option.title = model.description || model.displayName;
        option.dataset.noI18n = "";
        option.disabled = disabled;
        parent.append(option);
      }
      select.append(parent);
    };
    group(
      source === "api"
        ? "Модели для ответов"
        : "Предварительный список · доступ уточняется по ключу",
      filtered.filter((m) => m.compatible),
      false,
    );
    group(
      "Другие модели API · не поддерживают этот режим",
      filtered.filter((m) => !m.compatible),
      true,
    );
    if (selected && !filtered.some((m) => m.id === selected)) {
      const option = document.createElement("option");
      option.value = selected;
      option.textContent =
        selected +
        (models.some((m) => m.id === selected)
          ? " · выбрана"
          : " · вне каталога");
      select.prepend(option);
    }
    select.value = selected || filtered.find((m) => m.compatible)?.id || "";
    EzExLocale.translateElement(select);
  }
  function status(element, message, kind = "info") {
    EzExLocale.setText(element, message);
    element.dataset.kind = kind;
  }
  function date(value) {
    return value
      ? new Date(value).toLocaleString(
          EzExLocale.current() === "ru" ? "ru-RU" : "en-US",
          {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          },
        )
      : "";
  }
  globalThis.EzExUI = { renderModels, status, date };
})();
