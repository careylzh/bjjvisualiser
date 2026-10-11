// Copy the static app into .pages/ for the GitHub Pages artifact. Everything under app/ is
// deployable as-is (no bundler); this only exists so the workflow uploads one clean directory
// and nothing from the repo root leaks onto the site.
import { cp, mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const appDir = path.join(root, "app");
const outputDir = path.join(root, ".pages");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const item of await readdir(appDir)) {
  if (item.startsWith("_") || item.startsWith(".")) continue; // dev harnesses, dotfiles
  await cp(path.join(appDir, item), path.join(outputDir, item), { recursive: true });
}
// GitHub Pages must not run Jekyll over the vendor tree (it drops underscore paths otherwise).
await cp(path.join(root, "tools", "web", ".nojekyll"), path.join(outputDir, ".nojekyll"));

console.log(`Prepared GitHub Pages artifact at ${path.relative(root, outputDir)}`);
