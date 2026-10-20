(() => {
  "use strict";
  const E = globalThis.EzEx;
  if (!E || globalThis.EzExGoogleForms) return;
  const { text, normalize } = E;
  const CHOICES = '[role="radio"], [role="checkbox"]';
  const TEXT =
    'textarea, input:not([type]), input[type="text"], input[type="email"], input[type="url"], input[type="tel"], input[type="number"], input[type="date"], input[type="time"]';
  const visible = (el) =>
    Boolean(el?.getClientRects().length) &&
    getComputedStyle(el).visibility !== "hidden";
  const disabled = (el) =>
    !el ||
    el.disabled ||
    el.readOnly ||
    Boolean(el.closest('[aria-disabled="true"], [inert], fieldset[disabled]'));
  const wait = () => new Promise((resolve) => setTimeout(resolve, 60));
  const metadata = new WeakMap();

  // Decode only JSON. Google data attributes are never executed as JavaScript.
  function itemOf(root) {
    const raw =
      root.querySelector("[data-params]")?.getAttribute("data-params") || "";
    if (metadata.get(root)?.raw === raw) return metadata.get(root).value;
    const start = raw.indexOf("[");
    let depth = 0,
      quoted = false,
      escaped = false;
    for (let i = start; start >= 0 && i < raw.length; i++) {
      const char = raw[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "[") depth++;
      else if (char === "]" && --depth === 0) {
        try {
          const value = JSON.parse(raw.slice(start, i + 1));
          const item = Array.isArray(value[0]) ? value[0] : value;
          metadata.set(root, { raw, value: item });
          return item;
        } catch {
          return [];
        }
      }
    }
    return [];
  }
  function roots() {
    return [...document.querySelectorAll('[role="listitem"]')].filter(
      (root) =>
        root.querySelector('[role="heading"]') &&
        !root.parentElement?.closest('[role="listitem"]') &&
        (root.querySelector("[data-params]") ||
          root.querySelector(CHOICES + ", " + TEXT + ', [role="listbox"]')),
    );
  }
  function rawId(root) {
    return (
      text(itemOf(root)[0]) ||
      text(root.querySelector('[name^="entry."]')?.name).replace(
        /^entry\.(\d+).*$/,
        "$1",
      )
    );
  }
  function titleOf(root) {
    const heading = root.querySelector('[role="heading"]');
    return text(
      heading?.querySelector(".M7eMe")?.textContent ||
        itemOf(root)[1] ||
        heading?.getAttribute("aria-label") ||
        heading?.textContent,
    ).replace(/\s*\*\s*$/, "");
  }
  function label(control, index = 0) {
    if (control.getAttribute("data-value") === "__other_option__")
      return text(control.getAttribute("aria-label")) || "Другое";
    return (
      text(
        control.getAttribute("data-value") ||
          control.getAttribute("aria-label") ||
          control.textContent,
      ) || `Вариант ${index + 1} (изображение)`
    );
  }
  function controls(root) {
    return root ? [...root.querySelectorAll(CHOICES)] : [];
  }
  function images(root, options) {
    return [...root.querySelectorAll("img")]
      .filter(
        (img) => visible(img) && /^https:/.test(img.currentSrc || img.src),
      )
      .map((img) => {
        const option = options.find((control) => {
          const container = control.closest(".nWQGrd, .eBFwI, label");
          return control.contains(img) || container?.contains(img);
        });
        return {
          url: img.currentSrc || img.src,
          altText: text(img.alt),
          choiceText: option ? label(option, options.indexOf(option)) : "",
        };
      });
  }
  function temporalFields(root) {
    const fields = [...root.querySelectorAll(TEXT)].filter(visible);
    const parts = fields.map((input) => {
      if (input.type === "date" || input.type === "time")
        return { input, part: input.type };
      const name = text(input.name).match(
        /_(year|month|day|hour|minute|second)$/,
      )?.[1];
      if (name) return { input, part: name };
      const hint = normalize(
        input.getAttribute("aria-label") ||
          input.placeholder ||
          input.getAttribute("data-placeholder"),
      );
      const isTime =
        Number(itemOf(root)[3]) === 10 ||
        fields.some((el) => /_(?:hour|minute|second)$/.test(el.name));
      const part =
        hint === "mm"
          ? isTime
            ? "minute"
            : "month"
          : Object.entries({
              year: /^(year|год|yyyy)$/,
              month: /^(month|месяц|mm)$/,
              day: /^(day|день|dd)$/,
              hour: /^(hours?|часы|час|hh)$/,
              minute: /^(minutes?|минуты|минута|mm)$/,
              second: /^(seconds?|секунды|секунда|ss)$/,
            }).find(([, pattern]) => pattern.test(hint))?.[0];
      return { input, part };
    });
    return parts.every((field) => field.part) ? parts : [];
  }
  function entriesOf(root) {
    const item = itemOf(root);
    return Array.isArray(item[4])
      ? item[4].filter((entry) => Array.isArray(entry) && entry[0] != null)
      : [];
  }
  function rowRoot(root, entry) {
    const rowTitle = text(Array.isArray(entry[3]) ? entry[3][0] : entry[3]);
    if (!rowTitle) return null;
    const candidates = [
      ...root.querySelectorAll(
        '[role="radiogroup"], [role="group"], [role="row"], .e12QUd',
      ),
    ].filter((el) => controls(el).length);
    const matches = candidates.filter((el) => {
      const labelled = text(el.getAttribute("aria-labelledby"))
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || "")
        .join(" ");
      return (
        normalize(
          el.getAttribute("aria-label") ||
            labelled ||
            el.querySelector(".sH8AKf")?.textContent,
        ) === normalize(rowTitle)
      );
    });
    const deepest = matches.filter(
      (candidate) =>
        !matches.some(
          (other) => other !== candidate && candidate.contains(other),
        ),
    );
    return deepest.length === 1 ? deepest[0] : null;
  }
  function describe(root, entry, order, grid) {
    const item = itemOf(root);
    const scope = grid ? rowRoot(root, entry) : root;
    const opts = scope ? controls(scope) : [];
    const list = scope?.querySelector('[role="listbox"]');
    const fields = scope
      ? [...scope.querySelectorAll(TEXT)].filter(visible)
      : [];
    const type = Number(item[3]);
    const date = type === 9 || fields.some((input) => input.type === "date");
    const time = type === 10 || fields.some((input) => input.type === "time");
    const parts = (date || time) && scope ? temporalFields(scope) : [];
    let kind = opts.some((el) => el.getAttribute("role") === "checkbox")
      ? "multi_choice"
      : opts.length || list
        ? "single_choice"
        : fields.length
          ? "text"
          : "unsupported";
    let reason = "";
    if (!scope) {
      kind = "unsupported";
      reason = "Не удалось однозначно сопоставить строку сетки";
    }
    if ((date || time) && (!parts.length || parts.length !== fields.length)) {
      kind = "unsupported";
      reason = "Не удалось распознать поля даты или времени";
    }
    const hasPart = (part) => parts.some((field) => field.part === part);
    if (
      (date && !hasPart("date") && !(hasPart("month") && hasPart("day"))) ||
      (time && !hasPart("time") && !(hasPart("hour") && hasPart("minute")))
    ) {
      kind = "unsupported";
      reason = "Неполный набор полей даты или времени";
    }
    if (!date && !time && fields.length > 1 && kind === "text") {
      kind = "unsupported";
      reason = "Несколько текстовых полей требуют ручного заполнения";
    }
    if (root.querySelector('input[type="file"]') || type === 13) {
      kind = "unsupported";
      reason = "Загрузка файла выполняется вручную";
    }
    const personal =
      /^(?:имя|фамилия|фио|ваше имя|электронная почта|адрес электронной почты|e-?mail|email address|your email|name|full name|your name|phone|phone number|номер телефона|телефон|адрес|address|your address)\s*[:*]?$/i.test(
        titleOf(root),
      );
    if (kind === "text" && personal) {
      kind = "unsupported";
      reason = "Личные данные заполняются вручную";
    }
    const other = opts.filter(
      (el) => el.getAttribute("data-value") === "__other_option__",
    );
    const choices = list
      ? E.unique(
          [...list.querySelectorAll('[role="option"][data-value]')]
            .map((el) => text(el.getAttribute("data-value")))
            .filter(Boolean),
        )
      : opts.map(label);
    if (kind !== "text" && E.unique(choices).length !== choices.length) {
      kind = "unsupported";
      reason = "У вариантов одинаковые подписи";
    }
    const rowTitle = grid
      ? text(Array.isArray(entry[3]) ? entry[3][0] : entry[3])
      : "";
    const dateTime =
      date && parts.some((field) => ["time", "hour"].includes(field.part));
    const answerFormat = dateTime
      ? "YYYY-MM-DDTHH:mm"
      : date
        ? parts.length && !parts.some((f) => ["year", "date"].includes(f.part))
          ? "MM-DD"
          : "YYYY-MM-DD"
        : time
          ? parts.some((f) => f.part === "second")
            ? "HH:mm:ss (duration, hours may exceed 23)"
            : "HH:mm (24-hour)"
          : fields[0]?.type === "email"
            ? "valid email address; never invent personal information"
            : fields[0]?.type === "url"
              ? "absolute URL"
              : fields[0]?.type === "number"
                ? "number"
                : "";
    return {
      id: "google:" + (entry?.[0] ?? item[0] ?? rawId(root)),
      title:
        (titleOf(root) || "Вопрос без заголовка") +
        (rowTitle ? " — " + rowTitle : ""),
      subtitle: text(item[2]),
      kind,
      order,
      choices,
      otherChoice:
        other.length === 1 ? label(other[0], opts.indexOf(other[0])) : "",
      answerFormat,
      constraints: {
        required: Boolean(entry?.[2]),
        min: fields[0]?.min || "",
        max: fields[0]?.max || "",
        pattern: fields[0]?.pattern || "",
        validation: entry?.[4] || null,
        hasOther: other.length > 0,
      },
      images: images(root, controls(root)),
      unsupportedReason: reason,
    };
  }
  function getSchema() {
    const questions = [];
    for (const root of roots().filter(visible)) {
      const entries = entriesOf(root);
      const grid = entries.length > 1;
      for (const entry of entries.length ? entries : [null])
        questions.push(describe(root, entry, questions.length, grid));
    }
    // No guessing when DOM lacks a stable identity or repeats one.
    const ids = questions.map((q) => q.id);
    questions.forEach((q) => {
      if (q.id === "google:" || ids.filter((id) => id === q.id).length !== 1) {
        q.kind = "unsupported";
        q.unsupportedReason = "Неоднозначный идентификатор вопроса";
      }
    });
    return {
      formId:
        "google:" +
        location.pathname
          .replace(/\/u\/\d+\//, "/")
          .replace(/\/(?:viewform|formResponse)\/?$/, ""),
      formTitle: formTitle(),
      sourceUrl: location.href,
      locale: document.documentElement.lang || "ru",
      questions,
    };
  }
  function formTitle() {
    return (
      text(
        document.querySelector('[role="heading"][aria-level="1"]')?.textContent,
      ) || document.title
    );
  }
  function rootFor(question) {
    for (const root of roots()) {
      const entries = entriesOf(root);
      const entry = entries.find((e) => "google:" + e[0] === question.id);
      if (entry) return entries.length > 1 ? rowRoot(root, entry) : root;
      if (!entries.length && "google:" + rawId(root) === question.id)
        return root;
    }
    return null;
  }
  function selected(el) {
    return (
      el.getAttribute("aria-checked") === "true" ||
      el.getAttribute("aria-selected") === "true"
    );
  }
  function alreadyFilled(question) {
    const root = rootFor(question);
    if (!root) return false;
    if (question.kind === "text")
      return [...root.querySelectorAll(TEXT)].some((el) => text(el.value));
    if (controls(root).some(selected)) return true;
    return [
      ...root.querySelectorAll('[role="option"][aria-selected="true"]'),
    ].some((el) => text(el.getAttribute("data-value")));
  }
  function setValue(input, value) {
    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(input, value);
    for (const type of ["input", "change", "blur"])
      input.dispatchEvent(new Event(type, { bubbles: true }));
  }
  function findControl(root, choice, dropdown = false) {
    if (!root) return null;
    const options = dropdown
      ? [...root.querySelectorAll('[role="option"]')].filter(visible)
      : controls(root);
    const matches = options.filter((el, index) => label(el, index) === choice);
    return matches.length === 1 ? matches[0] : null;
  }
  function temporalValues(question, value) {
    const match =
      question.answerFormat === "YYYY-MM-DDTHH:mm"
        ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
        : question.answerFormat.startsWith("YYYY")
          ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
          : question.answerFormat === "MM-DD"
            ? /^(\d{2})-(\d{2})$/.exec(value)
            : /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (!match) return null;
    if (question.answerFormat.startsWith("YYYY"))
      return {
        year: match[1],
        month: match[2],
        day: match[3],
        date: match.slice(1, 4).join("-"),
        hour: match[4],
        minute: match[5],
        time: match.slice(4, 6).join(":"),
      };
    if (question.answerFormat === "MM-DD")
      return { month: match[1], day: match[2] };
    return {
      hour: match[1],
      minute: match[2],
      second: match[3] || "00",
      time: value,
    };
  }
  async function fill(question, answer, shouldContinue = () => true) {
    let root = rootFor(question);
    if (!root || !visible(root) || disabled(root) || !shouldContinue())
      return false;
    if (question.kind === "text") {
      const fields = [...root.querySelectorAll(TEXT)].filter(visible);
      if (!fields.length || fields.some(disabled) || !text(answer.answerText))
        return false;
      const parts = temporalFields(root);
      const previous = fields.map((input) => input.value);
      if (fields.length === 1) setValue(fields[0], answer.answerText);
      else if (parts.length === fields.length) {
        const values = temporalValues(question, answer.answerText);
        if (!values || parts.some(({ part }) => values[part] === undefined))
          return false;
        for (const { input, part } of parts) {
          if (!shouldContinue()) return false;
          setValue(
            input,
            ["date", "time"].includes(part)
              ? values[part]
              : String(Number(values[part])),
          );
        }
      } else return false;
      const expected = fields.map((el) => el.value);
      await wait();
      const fresh = [
        ...(rootFor(question)?.querySelectorAll(TEXT) || []),
      ].filter(visible);
      const ok =
        fresh.length === fields.length &&
        fresh.every(
          (el, i) =>
            text(el.value) &&
            el.value === expected[i] &&
            el.checkValidity() &&
            (fields.length !== 1 || el.value === answer.answerText),
        ) &&
        !rootFor(question)?.querySelector('[aria-invalid="true"]');
      if (!ok)
        fresh.forEach((input, index) => setValue(input, previous[index] || ""));
      return ok;
    }
    const dropdown = root.querySelector('[role="listbox"]');
    if (dropdown) {
      if (disabled(dropdown)) return false;
      if (
        [
          ...dropdown.querySelectorAll('[role="option"][aria-selected="true"]'),
        ].some(
          (el) => text(el.getAttribute("data-value")) === answer.choiceText,
        )
      )
        return true;
      dropdown.click();
      await wait();
      root = rootFor(question);
      const option = root && findControl(root, answer.choiceText, true);
      if (!option || disabled(option) || !shouldContinue()) {
        dropdown.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        return false;
      }
      option.click();
      await wait();
      return [
        ...(rootFor(question)?.querySelectorAll(
          '[role="option"][aria-selected="true"]',
        ) || []),
      ].some((el) => text(el.getAttribute("data-value")) === answer.choiceText);
    }
    const values =
      question.kind === "multi_choice"
        ? answer.choiceTexts
        : [answer.choiceText];
    if (
      !values.length ||
      values.some((value) => {
        const el = findControl(root, value);
        return !el || disabled(el);
      })
    )
      return false;
    for (const original of controls(root)) {
      if (!shouldContinue()) return false;
      const value = label(original, controls(root).indexOf(original));
      const control = findControl(rootFor(question), value);
      if (!control) return false;
      const desired = values.includes(value);
      if (
        (question.kind === "multi_choice" || desired) &&
        selected(control) !== desired
      ) {
        if (disabled(control)) return false;
        control.click();
        await wait();
      }
    }
    const fresh = rootFor(question);
    if (
      fresh &&
      question.otherChoice &&
      values.includes(question.otherChoice)
    ) {
      const other = findControl(fresh, question.otherChoice);
      const field = other
        ?.closest(".nWQGrd, .eBFwI, label")
        ?.querySelector(TEXT);
      if (!field || disabled(field) || !answer.answerText || !shouldContinue())
        return false;
      setValue(field, answer.answerText);
      await wait();
    }
    return matchesAnswer(question, answer);
  }
  function matchesAnswer(question, answer) {
    const fresh = rootFor(question);
    if (!fresh) return false;
    if (question.kind === "text") {
      const fields = [...fresh.querySelectorAll(TEXT)].filter(visible);
      if (fields.length === 1)
        return (
          fields[0].value === answer.answerText && fields[0].checkValidity()
        );
      const values = temporalValues(question, answer.answerText);
      const parts = temporalFields(fresh);
      return (
        Boolean(values && parts.length === fields.length && fields.length) &&
        parts.every(
          ({ input, part }) =>
            input.value &&
            (["date", "time"].includes(part)
              ? input.value === values[part]
              : Number(input.value) === Number(values[part])) &&
            input.checkValidity(),
        )
      );
    }
    if (fresh.querySelector('[role="listbox"]'))
      return [
        ...fresh.querySelectorAll('[role="option"][aria-selected="true"]'),
      ].some((el) => text(el.getAttribute("data-value")) === answer.choiceText);
    const values =
      question.kind === "multi_choice"
        ? answer.choiceTexts
        : [answer.choiceText];
    const other =
      question.otherChoice && values.includes(question.otherChoice)
        ? findControl(fresh, question.otherChoice)
            ?.closest(".nWQGrd, .eBFwI, label")
            ?.querySelector(TEXT)
        : null;
    return (
      Boolean(fresh) &&
      (!values.includes(question.otherChoice) ||
        (other?.value === answer.answerText && other.checkValidity())) &&
      controls(fresh).every(
        (el, index) => selected(el) === values.includes(label(el, index)),
      )
    );
  }
  globalThis.EzExGoogleForms = {
    roots,
    rawId,
    titleOf,
    formTitle,
    getSchema,
    rootFor,
    alreadyFilled,
    fill,
    matchesAnswer,
  };
})();
