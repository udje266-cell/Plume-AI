// Assemble src/ en un seul Worker : worker/index.js (fichier généré, ne pas modifier à la main).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

const [html, css, js, server, icon] = await Promise.all([
  read("src/client/index.html"),
  read("src/client/style.css"),
  read("src/client/app.js"),
  read("src/server.js"),
  readFile(resolve(root, "assets/plume-ai-icon.png")),
]);

if (/<\/script/i.test(js)) throw new Error("app.js ne doit pas contenir </script>");
if (/<\/style/i.test(css)) throw new Error("style.css ne doit pas contenir </style>");

const inline = (source, pattern, replacement) => {
  if (!pattern.test(source)) throw new Error(`Balise introuvable dans index.html : ${pattern}`);
  return source.replace(pattern, () => replacement);
};
let page = inline(html, /<link rel="stylesheet" href="style\.css"\s*\/?>/, `<style>${css}</style>`);
page = inline(page, /<script src="app\.js"><\/script>/, `<script>${js}</script>`);

const output = [
  "// Fichier généré par scripts/bundle.mjs à partir de src/. Ne pas modifier directement.",
  `const PAGE = ${JSON.stringify(page)};`,
  `const ICON = ${JSON.stringify(icon.toString("base64"))};`,
  server,
].join("\n");

await mkdir(resolve(root, "worker"), { recursive: true });
await writeFile(resolve(root, "worker/index.js"), output);
console.log("worker/index.js généré");
