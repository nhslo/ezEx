(() => {
  "use strict";
  const api = typeof browser !== "undefined" ? browser : globalThis.chrome;
  const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  const extensionPage =
    typeof document !== "undefined" &&
    /^(?:chrome|moz|safari-web)-extension:$/.test(document.location.protocol);
  let preference = "auto";
  let revision = 0;
  const listeners = new Set();
  const current = () =>
    preference === "auto" ? (media?.matches ? "dark" : "light") : preference;
  function render() {
    const theme = current();
    if (extensionPage) document.documentElement.dataset.theme = theme;
    for (const listener of listeners) listener(theme);
    return theme;
  }
  function apply(value = "auto") {
    revision++;
    preference = ["auto", "light", "dark"].includes(value) ? value : "auto";
    return render();
  }
  const onMediaChange = () => {
    if (preference === "auto") render();
  };
  if (media?.addEventListener) media.addEventListener("change", onMediaChange);
  else media?.addListener?.(onMediaChange);
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  globalThis.EzExTheme = { apply, current, subscribe };
  render();
  if (extensionPage && api?.storage?.local) {
    const before = revision;
    api.storage.local
      .get("uiTheme")
      .then((saved) => {
        if (revision === before) apply(saved.uiTheme);
      })
      .catch(() => {});
    api.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.uiTheme) apply(changes.uiTheme.newValue);
    });
  }
})();
