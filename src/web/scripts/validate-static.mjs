import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "app.js",
  "styles.css",
  "vendor/three/build/three.module.js",
  "vendor/three/build/three.core.js",
  "vendor/three/examples/jsm/controls/OrbitControls.js",
  "vendor/three/examples/jsm/loaders/USDLoader.js",
  "vendor/three/examples/jsm/loaders/usd/USDAParser.js",
  "vendor/three/examples/jsm/loaders/usd/USDCParser.js",
  "vendor/three/examples/jsm/libs/fflate.module.js",
  "public/models/simple-box.usdz"
];

for (const file of requiredFiles) {
  await access(file);
}

const html = await readFile("index.html", "utf8");
const app = await readFile("app.js", "utf8");

if (!html.includes('<script type="module" src="./app.js"></script>')) {
  throw new Error("index.html must load ./app.js as a browser module.");
}

if (!html.includes('"three": "./vendor/three/build/three.module.js"')) {
  throw new Error("index.html must map three to the local vendor file.");
}

if (!app.includes("new USDLoader()")) {
  throw new Error("app.js must use USDLoader for USDZ visualization.");
}

console.log("Static web viewer files are present and self-contained.");
