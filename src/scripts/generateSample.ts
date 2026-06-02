import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { generateBlenderPrompt } from "../blender/generateBlenderPrompt";
import { parseBjjNote } from "../parser/parseBjjNote";

const sampleNotesDir = "data/sample-notes";
const scenesDir = "data/generated/scenes";
const promptsDir = "data/generated/blender-prompts";

function outputName(fileName: string) {
  return basename(fileName, ".txt");
}

async function main() {
  await mkdir(scenesDir, { recursive: true });
  await mkdir(promptsDir, { recursive: true });

  const noteFiles = (await readdir(sampleNotesDir))
    .filter((file) => file.endsWith(".txt"))
    .sort();

  for (const noteFile of noteFiles) {
    const notePath = join(sampleNotesDir, noteFile);
    const note = await readFile(notePath, "utf8");
    const scene = parseBjjNote(note);
    const name = outputName(noteFile);
    const scenePath = join(scenesDir, `${name}.json`);
    const promptPath = join(promptsDir, `${name}.txt`);
    const exportTarget = `src/web/public/models/${name}.usdz`;

    await writeFile(scenePath, `${JSON.stringify(scene, null, 2)}\n`);
    await writeFile(
      promptPath,
      `${generateBlenderPrompt(scene, { exportTarget })}\n`
    );

    console.log(`Generated ${scenePath} and ${promptPath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
