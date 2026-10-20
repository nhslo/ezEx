(() => {
  "use strict";
  if (globalThis.__ezexLoaded) return;
  globalThis.__ezexLoaded = true;
  const E = EzEx;
  const { text, normalize, api } = E;
  const google = E.googleFormsUrl(location.href)
    ? globalThis.EzExGoogleForms
    : null;
  const ROOT = '[data-automation-id="questionItem"]';
  const TEXT_INPUT =
    'textarea, input[data-automation-id="textInput"], input[type="text"], input[type="number"], input:not([type]), [contenteditable="true"][role="textbox"]';
  let currentAction = null;
  let config = { ...E.DEFAULTS };
  let schemaMemo = null;
  let indicatorTimer;
  let indicatorActive = false;
  let lastIndicator = null;
  let indicatorHost = null;
  let autoTimer;
  let intersectsViewport = true;
  const attemptedAuto = new Set();
  if (window !== window.top && typeof IntersectionObserver === "function") {
    const visibility = new IntersectionObserver((entries) => {
      intersectsViewport = entries.some((entry) => entry.isIntersecting);
    });
    visibility.observe(document.documentElement);
  }

  E.listen((message) => {
    if (message.type === "FRAME_PROBE") return probe();
    if (message.type === "FRAME_ACTION") {
      if (!currentAction) {
        currentAction = performAction(message.payload?.action || "run").finally(
          () => {
            currentAction = null;
          },
        );
      }
      return currentAction;
    }
    return undefined;
  });
  function roots() {
    if (google) return google.roots();
    return [...document.querySelectorAll(ROOT)];
  }
  function isVisible(element) {
    return (
      Boolean(element?.getClientRects().length) &&
      getComputedStyle(element).visibility !== "hidden"
    );
  }
  function plain(value) {
    const doc = new DOMParser().parseFromString(text(value), "text/html");
    return text(doc.body.textContent).replace(/\u00a0/g, " ");
  }
  function titleOf(root) {
    if (google) return google.titleOf(root);
    const el = root.querySelector(
      '[data-automation-id="questionTitle"] .text-format-content, [data-automation-id="questionTitle"]',
    );
    return text(el?.textContent);
  }
  function rawId(root) {
    if (google) return google.rawId(root);
    const id = root.id?.startsWith("QuestionId_")
      ? root.id
      : root.querySelector('[id^="QuestionId_"]')?.id;
    return (
      text(id).replace(/^QuestionId_/, "") ||
      text(root.getAttribute("data-question-id"))
    );
  }
  function shortHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++)
      hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(36);
  }
  function formTitle() {
    if (google) return google.formTitle();
    return (
      text(
        document.querySelector('[data-automation-id="formTitle"]')?.textContent,
      ) || document.title
    );
  }
  function signature() {
    return shortHash(
      location.href +
        "|" +
        roots()
          .filter(isVisible)
          .map((r) => rawId(r) || titleOf(r))
          .join("|"),
    );
  }
  function probe() {
    const items = roots().filter(isVisible);
    return {
      questionCount: items.length,
      visible:
        document.visibilityState !== "hidden" &&
        intersectsViewport &&
        items.length > 0,
      isForms: E.formsUrl(location.href) || Boolean(google),
      title: formTitle(),
      host: location.hostname,
      signature: signature(),
    };
  }
  function inputLabel(input) {
    const labelled = text(input.getAttribute("aria-labelledby"))
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent || "")
      .join(" ");
    if (text(labelled)) return text(labelled);
    const label = input.labels?.[0] || input.closest("label");
    if (label)
      return text(
        label.querySelector(".text-format-content")?.textContent ||
          label.textContent,
      );
    const choice = input.closest('[data-automation-id="choiceItem"]');
    return text(
      input.getAttribute("aria-label") ||
        choice?.querySelector(".text-format-content")?.textContent ||
        input.textContent ||
        input.value,
    );
  }
  function getDomSchema() {
    if (google) return google.getSchema();
    const used = new Set();
    const questions = roots()
      .map((root, order) => {
        const radios = [
          ...root.querySelectorAll('input[type="radio"], [role="radio"]'),
        ];
        const checks = [
          ...root.querySelectorAll('input[type="checkbox"], [role="checkbox"]'),
        ];
        const select = root.querySelector("select");
        const combo = root.querySelector('[role="combobox"]');
        const input = root.querySelector(TEXT_INPUT);
        const kind = checks.length
          ? "multi_choice"
          : radios.length || select || combo
            ? "single_choice"
            : input
              ? "text"
              : "unsupported";
        let choices = select
          ? [...select.options]
              .filter((o) => !o.disabled && o.value !== "")
              .map((o) => text(o.textContent))
          : [
              ...root.querySelectorAll(
                '[data-automation-id="choiceItem"] .text-format-content, [role="option"]',
              ),
            ].map((el) => text(el.textContent));
        if (!choices.length)
          choices = (checks.length ? checks : radios).map(inputLabel);
        const title = titleOf(root);
        let id =
          rawId(root) ||
          "dom_" + shortHash(title + E.unique(choices).sort().join("|"));
        if (used.has(id)) id += "_" + order;
        used.add(id);
        const img = root.querySelector(
          '[data-automation-id="questionImage"] img, img[data-automation-id="questionImage"], .question-image img',
        );
        return {
          id,
          title,
          subtitle: text(
            root.querySelector('[data-automation-id="questionSubtitle"]')
              ?.textContent,
          ),
          kind,
          order,
          choices: E.unique(choices),
          image: img?.src ? { url: img.src, altText: img.alt } : null,
        };
      })
      .filter((q) => q.title);
    return {
      formId: new URL(location.href).searchParams.get("id") || "",
      formTitle: formTitle(),
      locale: document.documentElement.lang || "ru",
      sourceUrl: location.href,
      questions,
    };
  }
  function extractForm(data) {
    if (!data || typeof data !== "object") return null;
    const candidates = [
      data,
      data.form,
      data.data,
      data.data?.form,
      data.assignment?.form,
      data.data?.assignment?.form,
      data.value,
    ];
    return (
      candidates.find((value) => value && Array.isArray(value.questions)) ||
      null
    );
  }
  function json(value) {
    if (value && typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  function normalizeForm(form) {
    const localeInfo = json(form.localeInfo);
    const questions = form.questions
      .filter((q) => !/section/i.test(q.type))
      .map((q, index) => {
        const info = json(q.questionInfo || q.deserializedQuestionInfo);
        const choices = [...(info.Choices || []), ...(q.choices || [])].map(
          (c) =>
            plain(
              typeof c === "string"
                ? c
                : c.Description || c.description || c.title || c.value,
            ),
        );
        const type = text(q.type).toLowerCase();
        const kind = type.includes("choice")
          ? Number(info.ChoiceType) === 2 || q.allowMultipleValues === true
            ? "multi_choice"
            : "single_choice"
          : /textfield|text$/.test(type)
            ? "text"
            : "unsupported";
        const image = q.image?.resourceUrl || q.image?.url;
        return {
          id: text(q.id),
          title: plain(q.title),
          subtitle: plain(q.subtitle),
          kind,
          order: Number.isFinite(q.order) ? q.order : index,
          choices: E.unique(choices),
          image: image
            ? {
                url: image,
                mimeType: q.image.contentType,
                resourceId: q.image.resourceId,
                altText: plain(q.image.altText),
              }
            : null,
        };
      })
      .filter((q) => q.id && q.title);
    return {
      formId: text(form.id),
      formTitle: plain(form.title) || formTitle(),
      locale: text(localeInfo.Locale) || document.documentElement.lang || "ru",
      sourceUrl: location.href,
      questions,
    };
  }
  async function networkSchema(dom) {
    if (!E.formsUrl(location.href)) return null;
    const matchesDom = (schema) =>
      dom.questions.every((q) =>
        schema.questions.some(
          (s) =>
            normalize(s.title) === normalize(q.title) &&
            (q.id.startsWith("dom_") || s.id === q.id) &&
            (!q.choices.length ||
              !s.choices.length ||
              JSON.stringify(q.choices.map(normalize).sort()) ===
                JSON.stringify(s.choices.map(normalize).sort())),
        ),
      );
    if (
      schemaMemo?.url === location.href &&
      Date.now() - schemaMemo.at < 30000 &&
      matchesDom(schemaMemo.schema)
    )
      return schemaMemo.schema;
    const current = new URL(location.href);
    const endpoints = [];
    const resources = (performance.getEntriesByType?.("resource") || []).filter(
      (r) => {
        try {
          const url = new URL(r.name);
          return (
            url.origin === location.origin &&
            /\/runtimeForms\(/i.test(url.pathname) &&
            (!r.responseStatus || r.responseStatus < 400)
          );
        } catch {
          return false;
        }
      },
    );
    if (resources.length) endpoints.push(resources.at(-1).name);
    if (current.searchParams.has("id")) {
      const endpoint = new URL(
        /Assignments/i.test(current.pathname)
          ? "/handlers/AssignmentsResponsePageStartup.ashx"
          : "/handlers/ResponsePageStartup.ashx",
        location.origin,
      );
      for (const key of [
        "id",
        "tid",
        "groupId",
        "origin",
        "channel",
        "mobile",
      ]) {
        if (current.searchParams.has(key))
          endpoint.searchParams.set(key, current.searchParams.get(key));
      }
      endpoints.push(endpoint.href);
    }
    for (const endpoint of endpoints) {
      try {
        const response = await E.fetchTimed(
          endpoint,
          { credentials: "include", headers: { Accept: "application/json" } },
          6000,
        );
        const data = await response.json();
        if (!response.ok) {
          if (
            response.status === 403 &&
            /one response/i.test(text(data.error?.message))
          )
            throw new Error(
              "Forms: разрешён только один ответ на человека. Вы уже отправляли этот тест.",
            );
          continue;
        }
        const form = extractForm(data);
        if (!form) continue;
        const schema = normalizeForm(form);
        // A SPA can retain resources for an earlier assignment: never use that form.
        if (!matchesDom(schema)) continue;
        schemaMemo = { url: location.href, at: Date.now(), schema };
        return schema;
      } catch (error) {
        if (error.message.startsWith("Forms:")) throw error;
        if (config.debugLogs)
          console.debug("[ezEx] Извлечение формы:", error.message);
      }
    }
    return null;
  }
  async function buildSchema() {
    const dom = getDomSchema();
    const schema = (await networkSchema(dom)) || dom;
    for (const q of schema.questions) {
      const visible = dom.questions.find(
        (d) => d.id === q.id || normalize(d.title) === normalize(q.title),
      );
      if (visible && q.kind === "unsupported" && visible.kind !== "unsupported")
        Object.assign(q, { kind: visible.kind, choices: visible.choices });
      if (visible && !q.image && visible.image) q.image = visible.image;
    }
    const unsupported = schema.questions.filter(
      (q) =>
        q.kind === "unsupported" || (q.kind !== "text" && !q.choices.length),
    );
    return {
      ...schema,
      unsupportedCount: unsupported.length,
      manualQuestions: unsupported.map((q) => ({
        title: q.title,
        reason: q.unsupportedReason || "Тип вопроса не поддерживается",
      })),
      totalQuestionCount: schema.questions.length,
      questions: schema.questions.filter((q) => !unsupported.includes(q)),
    };
  }
  async function performAction(action) {
    try {
      config = await E.request("GET_CONFIG");
      if (config.enabled === false) throw new Error("ezEx на паузе.");
      showIndicator("Читаю вопросы…", "running");
      const schema = await buildSchema();
      if (!schema.questions.length)
        throw new Error(
          schema.unsupportedCount
            ? "Требуется ручное заполнение: " +
                schema.manualQuestions
                  .map((q) => q.title + " — " + q.reason)
                  .slice(0, 3)
                  .join("; ")
            : "Вопросы не найдены. Откройте страницу самого теста.",
        );
      if (action === "schema") {
        const result = {
          action,
          title: schema.formTitle,
          questionCount: schema.questions.length,
          unsupportedCount: schema.unsupportedCount,
          manualQuestions: schema.manualQuestions,
          requestCount: 0,
          signature: signature(),
        };
        showIndicator("Найдено вопросов: " + schema.questions.length, "done");
        return result;
      }
      let result;
      if (action === "apply") {
        const cached = await E.request("GET_FORM_CACHE", { schema });
        const validated = E.validateAnswers(
          { answers: cached?.answers || [] },
          schema.questions,
        );
        if (!validated.answers.length)
          throw new Error(
            "Для этого теста ещё нет сохранённых ответов. Нажмите «Заполнить тест».",
          );
        result = {
          answers: validated.answers,
          model: cached.model,
          cached: true,
          requestCount: 0,
        };
      } else {
        showIndicator("Получаю ответы…", "running");
        result = await E.request("GENERATE_ANSWERS", {
          schema,
          force: action === "regenerate",
        });
      }
      let stats = null;
      if (action === "run" || action === "apply") {
        config = await E.request("GET_CONFIG");
        if (config.enabled === false)
          throw new Error(
            "ezEx на паузе. Ответы сохранены, вставка остановлена.",
          );
        showIndicator(
          result.cached ? "Вставляю сохранённые ответы…" : "Заполняю форму…",
          "running",
        );
        stats = await applyAnswers(
          schema,
          result.answers,
          action === "apply" ? false : config.respectExistingAnswers,
        );
      }
      const summary = {
        action,
        title: schema.formTitle,
        questionCount: schema.questions.length,
        answersCount: result.answers.length,
        unsupportedCount: schema.unsupportedCount,
        manualQuestions: schema.manualQuestions,
        requestCount: result.requestCount,
        model: result.model,
        cached: result.cached,
        completed: result.answers.length,
        total: schema.questions.length,
        stats,
        signature: signature(),
      };
      showIndicator(
        stats
          ? "Заполнено: " +
              stats.filled +
              ". Уже заполнено: " +
              stats.skipped +
              ". Не вставлено: " +
              stats.missing +
              (schema.unsupportedCount
                ? ". Вручную: " + schema.unsupportedCount
                : "")
          : "Ответы сохранены: " + result.answers.length,
        "done",
      );
      return summary;
    } catch (error) {
      showIndicator(error.message, "error");
      throw error;
    }
  }
  function rootFor(question) {
    if (google) return google.rootFor(question);
    const byId = document.getElementById("QuestionId_" + question.id);
    if (byId?.closest(ROOT)) return byId.closest(ROOT);
    const byAttribute = roots().find((r) => rawId(r) === question.id);
    if (byAttribute) return byAttribute;
    const matching = roots().filter(
      (r) => normalize(titleOf(r)) === normalize(question.title),
    );
    return matching.length === 1 ? matching[0] : null;
  }
  function checked(input) {
    return (
      input.checked === true || input.getAttribute("aria-checked") === "true"
    );
  }
  function disabled(input) {
    return input.disabled || input.getAttribute("aria-disabled") === "true";
  }
  function alreadyFilled(root, kind, choices) {
    if (kind === "text") {
      const el = root.querySelector(TEXT_INPUT);
      return Boolean(text(el?.value ?? el?.textContent));
    }
    if (root.querySelector('input:checked, [aria-checked="true"]')) return true;
    const select = root.querySelector("select");
    if (select)
      return select.value !== "" && !select.selectedOptions[0]?.disabled;
    const combo = root.querySelector('[role="combobox"]');
    return combo
      ? Boolean(combo.getAttribute("aria-valuetext")) ||
          choices.some(
            (choice) =>
              normalize(choice) === normalize(combo.value || combo.textContent),
          )
      : false;
  }
  async function applyAnswers(schema, items, respectExisting) {
    const answers = new Map(
      E.validateAnswers({ answers: items }, schema.questions).answers.map(
        (a) => [a.id, a],
      ),
    );
    const stats = {
      filled: 0,
      skipped: 0,
      missing: 0,
      offPage: 0,
      failedIds: [],
    };
    const inserted = [];
    for (const q of schema.questions) {
      if (config.enabled === false)
        throw new Error("ezEx на паузе. Дальнейшая вставка остановлена.");
      const root = rootFor(q);
      const answer = answers.get(q.id);
      if (!root || !isVisible(root)) {
        stats.offPage++;
        stats.missing++;
        continue;
      }
      if (
        respectExisting &&
        (google
          ? google.alreadyFilled(q)
          : alreadyFilled(root, q.kind, q.choices))
      ) {
        stats.skipped++;
        continue;
      }
      if (!answer) {
        stats.missing++;
        stats.failedIds.push(q.id);
        continue;
      }
      let ok = false;
      try {
        if (google)
          ok = await google.fill(q, answer, () => config.enabled !== false);
        else if (q.kind === "text")
          ok = await fillText(root, answer.answerText);
        else if (q.kind === "single_choice")
          ok = await fillSingle(root, answer.choiceText);
        else if (q.kind === "multi_choice")
          ok = await fillMultiple(root, answer.choiceTexts);
      } catch (error) {
        if (config.debugLogs)
          console.debug(
            "[ezEx] Не удалось вставить ответ:",
            q.id,
            error.message,
          );
      }
      if (ok) {
        stats.filled++;
        if (google) inserted.push(q);
      } else {
        stats.missing++;
        stats.failedIds.push(q.id);
      }
      if (stats.filled % 10 === 0)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    for (const q of inserted) {
      if (!google.matchesAnswer(q, answers.get(q.id))) {
        stats.filled--;
        stats.missing++;
        stats.failedIds.push(q.id);
      }
    }
    return stats;
  }
  function nativeValue(input, value) {
    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : input instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function liveRoot(root) {
    if (root.isConnected) return root;
    const id = rawId(root);
    return id ? roots().find((item) => rawId(item) === id) : null;
  }
  async function fillText(root, value) {
    const input = root.querySelector(TEXT_INPUT);
    if (!input || disabled(input) || input.readOnly || !text(value))
      return false;
    if (input.isContentEditable) {
      input.textContent = value;
      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: value,
        }),
      );
    } else nativeValue(input, value);
    await settle();
    const fresh = liveRoot(root)?.querySelector(TEXT_INPUT);
    return (
      Boolean(fresh) &&
      text(fresh.value ?? fresh.textContent) === text(value) &&
      (!fresh.checkValidity || fresh.checkValidity())
    );
  }
  function matchingControl(controls, value) {
    const target = normalize(value);
    if (!target) return null;
    const exact = controls.filter(
      (input) => text(inputLabel(input)) === text(value),
    );
    if (exact.length === 1) return exact[0];
    const matches = controls.filter(
      (input) => normalize(inputLabel(input)) === target,
    );
    if (matches.length === 1) return matches[0];
    const byValue = controls.filter(
      (input) => text(input.value) && normalize(input.value) === target,
    );
    return byValue.length === 1 ? byValue[0] : null;
  }
  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  async function fillSingle(root, value) {
    const controls = [...root.querySelectorAll('input[type="radio"]')];
    if (!controls.length)
      controls.push(...root.querySelectorAll('[role="radio"]'));
    if (controls.length) {
      const target = matchingControl(controls, value);
      if (!target || disabled(target)) return false;
      if (!checked(target)) target.click();
      await settle();
      const fresh = liveRoot(root);
      const native = fresh
        ? [...fresh.querySelectorAll('input[type="radio"]')]
        : [];
      const current = fresh
        ? matchingControl(
            native.length
              ? native
              : [...fresh.querySelectorAll('[role="radio"]')],
            value,
          )
        : null;
      return Boolean(current) && checked(current);
    }
    const select = root.querySelector("select");
    if (select && !disabled(select)) {
      let matches = [...select.options].filter(
        (option) =>
          !option.disabled && text(option.textContent) === text(value),
      );
      if (!matches.length)
        matches = [...select.options].filter(
          (option) =>
            !option.disabled &&
            normalize(option.textContent) === normalize(value),
        );
      if (matches.length !== 1) return false;
      nativeValue(select, matches[0].value);
      await settle();
      return (
        liveRoot(root)?.querySelector("select")?.value === matches[0].value
      );
    }
    const combo = root.querySelector('[role="combobox"]');
    if (!combo || disabled(combo)) return false;
    combo.click();
    await settle();
    const ownedId =
      combo.getAttribute("aria-controls") || combo.getAttribute("aria-owns");
    const owned = ownedId ? document.getElementById(ownedId) : null;
    const listboxes = owned
      ? [owned]
      : [...document.querySelectorAll('[role="listbox"]')].filter(isVisible);
    if (listboxes.length !== 1) return false;
    const options = [...listboxes[0].querySelectorAll('[role="option"]')];
    let matching = options.filter((el) => text(el.textContent) === text(value));
    if (!matching.length)
      matching = options.filter(
        (el) => normalize(el.textContent) === normalize(value),
      );
    if (matching.length !== 1 || disabled(matching[0])) {
      combo.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      return false;
    }
    matching[0].click();
    await settle();
    return (
      normalize(
        combo.getAttribute("aria-valuetext") ||
          combo.value ||
          combo.textContent,
      ) === normalize(value) ||
      matching[0].getAttribute("aria-selected") === "true"
    );
  }
  async function fillMultiple(root, values) {
    const controls = [...root.querySelectorAll('input[type="checkbox"]')];
    if (!controls.length)
      controls.push(...root.querySelectorAll('[role="checkbox"]'));
    const targets = values.map((value) => matchingControl(controls, value));
    if (
      !targets.length ||
      targets.some((control) => !control || disabled(control))
    )
      return false;
    const desired = new Set(targets);
    if (
      controls.some(
        (control) =>
          disabled(control) && checked(control) !== desired.has(control),
      )
    )
      return false;
    const currentControls = () => {
      const fresh = liveRoot(root);
      if (!fresh) return [];
      const native = [...fresh.querySelectorAll('input[type="checkbox"]')];
      return native.length
        ? native
        : [...fresh.querySelectorAll('[role="checkbox"]')];
    };
    for (const original of controls) {
      const current = currentControls();
      const control = matchingControl(current, inputLabel(original));
      if (!control) return false;
      const shouldSelect = values.some(
        (value) => matchingControl(current, value) === control,
      );
      if (checked(control) !== shouldSelect) {
        if (disabled(control)) return false;
        control.click();
        await settle();
      }
    }
    const fresh = currentControls();
    return (
      fresh.length > 0 &&
      fresh.every(
        (control) =>
          checked(control) ===
          values.some((value) => matchingControl(fresh, value) === control),
      )
    );
  }
  function showIndicator(message, state) {
    clearTimeout(indicatorTimer);
    lastIndicator = { message, state };
    indicatorActive = true;
    renderIndicator();
    if (state !== "running")
      indicatorTimer = setTimeout(
        () => {
          indicatorActive = false;
          indicatorHost?.remove();
          indicatorHost = null;
        },
        state === "error" ? 14000 : 7000,
      );
  }
  function renderIndicator() {
    let host = indicatorHost?.isConnected ? indicatorHost : null;
    if (config.enabled === false) {
      indicatorActive = false;
      lastIndicator = null;
    }
    if (
      !indicatorActive ||
      !lastIndicator ||
      config.indicatorMode === "off" ||
      config.enabled === false
    ) {
      host?.remove();
      indicatorHost = null;
      return;
    }
    const { state } = lastIndicator;
    const message = EzExLocale.translate(
      lastIndicator.message,
      config.uiLanguage === "auto"
        ? EzExLocale.browserLanguage()
        : config.uiLanguage,
    );
    if (!host) {
      host = document.createElement("div");
      indicatorHost = host;
      host.id = "ezex-status";
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent =
        ':host{all:initial;position:fixed;bottom:18px;right:18px;z-index:2147483647;pointer-events:none}div{max-width:360px;padding:12px 16px;border-radius:14px;background:#172a36;color:#f4fbff;box-shadow:0 8px 32px #14233030;font:500 13px/1.5 Segoe UI,sans-serif;white-space:pre-wrap;border-left:4px solid #65c7c0}div[data-state="error"]{border-color:#f08578}div[data-state="running"]::before{content:"";display:inline-block;width:8px;height:8px;margin-right:8px;border:2px solid #ffffff40;border-top-color:#fff;border-radius:50%;animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){div[data-state="running"]::before{animation:none}}';
      style.textContent += ":host([hidden]){display:none}";
      style.textContent +=
        ':host([data-theme="light"]) div{background:#f6faf8;color:#18313b;border-color:#126b68}:host([data-theme="light"]) div[data-state="error"]{border-color:#a93c34}:host([data-theme="light"]) div[data-state="running"]::before{border-color:#18313b30;border-top-color:#126b68}';
      style.textContent +=
        ':host([data-mode="compact"]){bottom:10px;right:10px;opacity:.6}:host([data-mode="compact"]) div{display:grid;place-items:center;width:20px;height:20px;padding:0;border:1px solid #c3cdcc;border-radius:50%;background:#f1f5f4;color:#50615e;box-shadow:none;font:600 11px/1 Segoe UI,sans-serif}:host([data-mode="compact"]) div::before{display:none}';
      style.textContent +=
        ':host([data-mode="compact"][data-theme="dark"]) div{background:#222c31;color:#c3d9d3;border-color:#526b66}';
      const label = document.createElement("div");
      label.setAttribute("role", "status");
      label.setAttribute("aria-live", "polite");
      shadow.append(style, label);
      document.documentElement.append(host);
    }
    host.hidden = false;
    host.dataset.mode = config.indicatorMode || "normal";
    host.dataset.theme = EzExTheme.current();
    const label = host.shadowRoot.querySelector("div");
    label.dataset.state = state;
    label.setAttribute("aria-label", message);
    label.textContent =
      config.indicatorMode === "compact"
        ? state === "running"
          ? "···"
          : state === "error"
            ? "!"
            : "✓"
        : message;
  }
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.getModifierState?.("AltGraph") ||
        !E.supportedUrl(location.href)
      )
        return;
      const shortcuts = { ...E.DEFAULT_SHORTCUTS, ...config.shortcuts };
      const combo = E.shortcutFromEvent(event);
      let action = Object.keys(shortcuts).find(
        (key) => shortcuts[key] && shortcuts[key] === combo,
      );
      const editable = event.target?.closest?.(
        'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]',
      );
      if (
        !action &&
        !editable &&
        config.numpadHotkey !== false &&
        event.code === "Numpad5" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      )
        action = "run";
      if (!action && !editable && config.legacyCtrlA && combo === "Ctrl+KeyA")
        action = "run";
      if (
        !action ||
        (action === "run" && (editable || config.enabled === false))
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const type = {
        run: "ROUTE_ACTION",
        settings: "OPEN_OPTIONS",
        indicator: "TOGGLE_INDICATOR",
        pause: "TOGGLE_ENABLED",
        uninstall: "REQUEST_UNINSTALL",
      }[action];
      E.request(type, action === "run" ? { action: "run" } : {})
        .then((saved) => {
          if (action === "pause" || action === "indicator") {
            config = saved;
            renderIndicator();
            scheduleAuto();
          }
        })
        .catch((error) => showIndicator(error.message, "error"));
    },
    true,
  );
  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (
      config.enabled === false ||
      !config.autoRun ||
      document.visibilityState === "hidden"
    )
      return;
    const before = signature();
    autoTimer = setTimeout(async () => {
      if (signature() !== before) {
        scheduleAuto();
        return;
      }
      if (
        !roots().some(isVisible) ||
        attemptedAuto.has(before) ||
        currentAction
      )
        return;
      attemptedAuto.add(before);
      try {
        await E.request("ROUTE_ACTION", { action: "run" });
      } catch (error) {
        showIndicator(error.message, "error");
      }
    }, 1500);
  }
  E.request("GET_CONFIG")
    .then((saved) => {
      config = saved;
      EzExTheme.apply(config.uiTheme || "auto");
      EzExLocale.apply(config.uiLanguage || "auto");
      scheduleAuto();
    })
    .catch(() => {});
  api.storage.onChanged.addListener((changes, area) => {
    if (
      area !== "local" ||
      !Object.keys(changes).some((key) => key in E.DEFAULTS)
    )
      return;
    E.request("GET_CONFIG")
      .then((saved) => {
        config = saved;
        EzExTheme.apply(config.uiTheme || "auto");
        EzExLocale.apply(config.uiLanguage || "auto");
        renderIndicator();
        scheduleAuto();
      })
      .catch(() => {});
  });
  EzExTheme.subscribe(renderIndicator);
  if (
    google ||
    E.formsUrl(location.href) ||
    location.hostname === "res.cdn.office.net"
  ) {
    const observer = new MutationObserver((records) => {
      if (records.some((record) => !record.target.closest?.("#ezex-status")))
        scheduleAuto();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("visibilitychange", scheduleAuto);
  }
})();
