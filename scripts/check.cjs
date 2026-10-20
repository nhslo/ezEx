const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const version = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
).version;
const files = [
  "shared.js",
  "locale.js",
  "theme.js",
  "background.js",
  "content.js",
  "google-forms.js",
  "ui.js",
  "popup.js",
  "options.js",
];
for (const file of files) {
  const result = spawnSync(
    process.execPath,
    ["--check", path.join(root, file)],
    { stdio: "inherit" },
  );
  if (result.status) process.exit(result.status);
}
for (const file of [
  "manifest.json",
  "manifest.chrome.json",
  "manifest.firefox.json",
]) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  if (manifest.version !== version) throw new Error("Wrong version: " + file);
  const command =
    manifest.manifest_version === 3
      ? "_execute_action"
      : "_execute_browser_action";
  if (!manifest.commands?.[command])
    throw new Error("Missing popup shortcut: " + file);
  for (const icon of ["16", "32", "48", "128"])
    if (!fs.existsSync(path.join(root, "icons", "icon" + icon + ".png")))
      throw new Error("Missing extension icon: " + icon);
  if (!manifest.icons?.["128"])
    throw new Error("Missing manifest icons: " + file);
  const action = manifest.action || manifest.browser_action;
  if (!action?.default_icon?.["16"])
    throw new Error("Missing toolbar icon: " + file);
  if (
    !manifest.content_scripts[0].matches.includes(
      "https://teams.cloud.microsoft/*",
    )
  )
    throw new Error("Missing Teams host: " + file);
  if (!(manifest.permissions || []).includes("webNavigation"))
    throw new Error("Missing frame permission: " + file);
  for (const script of manifest.content_scripts[0].js)
    if (!fs.existsSync(path.join(root, script)))
      throw new Error("Missing script: " + script);
  for (const script of manifest.background.scripts || [
    manifest.background.service_worker,
  ])
    if (!fs.existsSync(path.join(root, script)))
      throw new Error("Missing background script: " + script);
}
console.log("Syntax and all three manifests: OK");
