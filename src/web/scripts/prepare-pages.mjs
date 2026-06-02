import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..");
const outputDir = path.resolve(webRoot, ".pages");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const item of ["index.html", "styles.css", "app.js", "vendor", "public"]) {
  await cp(path.join(webRoot, item), path.join(outputDir, item), { recursive: true });
}

console.log(`Prepared GitHub Pages artifact at ${path.relative(webRoot, outputDir)}`);
