const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const allowed = new Set([
  "popup.html",
  "options.html",
  "popup.css",
  "options.css",
  "popup.js",
  "options.js",
  "shared.js",
  "ui.js",
]);
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
};
const server = http.createServer((req, res) => {
  const name =
    new URL(req.url, "http://localhost").pathname.slice(1) || "popup.html";
  if (!allowed.has(name) && name !== "preview-api.js") {
    res.writeHead(404);
    res.end();
    return;
  }
  const file = name === "preview-api.js" ? "tests/preview-api.js" : name;
  let body = fs.readFileSync(path.join(root, file), "utf8");
  if (name.endsWith(".html"))
    body = body.replace(
      '<script src="shared.js">',
      '<script src="preview-api.js"></script><script src="shared.js">',
    );
  res.writeHead(200, {
    "Content-Type":
      (types[path.extname(name)] || "text/plain") + "; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
});
server.listen(4173, "127.0.0.1", () =>
  console.log(
    "Local preview: http://127.0.0.1:4173/popup.html (mock data, no external API requests)",
  ),
);
