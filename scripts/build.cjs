const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const assets = [
  "shared.js",
  "locale.js",
  "theme.js",
  "theme.css",
  "background.js",
  "content.js",
  "google-forms.js",
  "ui.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "options.html",
  "options.css",
  "options.js",
];
for (const browser of ["chrome", "firefox"]) {
  const destination = path.join(root, "dist", browser);
  fs.mkdirSync(destination, { recursive: true });
  for (const file of assets)
    fs.copyFileSync(path.join(root, file), path.join(destination, file));
  fs.copyFileSync(
    path.join(root, "manifest." + browser + ".json"),
    path.join(destination, "manifest.json"),
  );
  const iconDirectory = path.join(destination, "icons");
  fs.mkdirSync(iconDirectory, { recursive: true });
  for (const icon of fs.readdirSync(path.join(root, "icons")))
    if (/^icon(?:16|32|48|128)\.png$/.test(icon))
      fs.copyFileSync(
        path.join(root, "icons", icon),
        path.join(iconDirectory, icon),
      );
  console.log("Built: " + destination);
}

const releaseDirectory = path.join(root, "dist", "releases");
fs.mkdirSync(releaseDirectory, { recursive: true });
const version = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
).version;
const quotePowerShell = (value) => "'" + value.replaceAll("'", "''") + "'";
function archive(source, filename) {
  const destination = path.join(releaseDirectory, filename);
  if (process.platform === "win32") {
    const command =
      "Compress-Archive -Path " +
      quotePowerShell(path.join(source, "*")) +
      " -DestinationPath " +
      quotePowerShell(destination) +
      " -Force";
    execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
      stdio: "inherit",
    });
  } else {
    execFileSync("zip", ["-qr", destination, "."], { cwd: source });
  }
  console.log("Packaged: " + destination);
}

const chromeDirectory = path.join(root, "dist", "chrome");
const firefoxDirectory = path.join(root, "dist", "firefox");
archive(chromeDirectory, "ezEx-" + version + "-Chrome-Brave-Vivaldi.zip");
archive(chromeDirectory, "ezEx-" + version + "-Edge.zip");
archive(chromeDirectory, "ezEx-" + version + "-Opera.zip");
archive(firefoxDirectory, "ezEx-" + version + "-Firefox-AMO-upload.zip");
archive(firefoxDirectory, "ezEx-" + version + "-Firefox-temporary.zip");
fs.copyFileSync(
  path.join(releaseDirectory, "ezEx-" + version + "-Firefox-temporary.zip"),
  path.join(releaseDirectory, "ezEx-" + version + "-Firefox-temporary.xpi"),
);
