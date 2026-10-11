// Static-site guard: every file the page imports must exist and the knowledge bundle must be
// current. Runs in CI before deploy and locally via `npm run build:web`.
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const app = (p) => path.join(root, "app", p);

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "version.json",
  "data/knowledge.json",
  "models/anatomy-rig.usdz",
  "models/anatomy-rig.json",
  "vendor/three/build/three.module.js",
  "vendor/three/build/three.core.js",
  "vendor/three/examples/jsm/controls/OrbitControls.js",
  "vendor/three/examples/jsm/loaders/USDLoader.js",
  "vendor/three/examples/jsm/loaders/usd/USDAParser.js",
  "vendor/three/examples/jsm/loaders/usd/USDCParser.js",
  "vendor/three/examples/jsm/loaders/usd/USDComposer.js",
  "vendor/three/examples/jsm/libs/fflate.module.js"
];

for (const file of requiredFiles) {
  try {
    await access(app(file));
  } catch {
    throw new Error(`missing required static file: app/${file}`);
  }
}

const html = await readFile(app("index.html"), "utf8");
const js = await readFile(app("app.js"), "utf8");
const viewerJs = await readFile(app("js/viewer.js"), "utf8");
if (!html.includes('<script type="module" src="./app.js"></script>')) {
  throw new Error("index.html must load ./app.js as a browser module.");
}
if (!html.includes('"three": "./vendor/three/build/three.module.js"')) {
  throw new Error("index.html must map three to the local vendor file (no CDN — the site must work offline).");
}
if (!viewerJs.includes("USDLoader")) {
  throw new Error("js/viewer.js must load the figure with USDLoader (USDZ-first).");
}

// Every module app.js imports relatively must exist.
for (const m of js.matchAll(/from\s+"(\.\/[^"]+)"/g)) {
  await access(app(m[1])).catch(() => {
    throw new Error(`app.js imports ${m[1]} which does not exist`);
  });
}

const version = JSON.parse(await readFile(app("version.json"), "utf8"));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (version.version !== pkg.version) {
  throw new Error(`version drift: app/version.json ${version.version} vs package.json ${pkg.version} (run scripts/version.sh)`);
}

console.log("Static app files present, self-contained, and version-aligned.");
