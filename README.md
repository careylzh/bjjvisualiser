# BJJ Visualiser

Pipeline for turning short BJJ notes into structured scene JSON, Blender MCP-ready prompts, and USDZ-first web review assets.

Milestone 1 simulates Google Keep by reading `.txt` notes from `data/sample-notes/`.

## Commands

```bash
npm install
npm test
npm run build
npm run generate:sample
```

`npm run generate:sample` reads `data/sample-notes/*.txt` and writes:

- `data/generated/scenes/*.json`
- `data/generated/blender-prompts/*.txt`

Web viewer:

```bash
cd src/web
npm install
npm run dev
npm run build
```

The web viewer is USDZ-first. It loads default assets from `src/web/public/models/`
and also accepts drag/drop or file-picker `.usdz` uploads for local review.
Generated Blender MCP prompts target USDZ exports into that models directory.

Note: `<model-viewer>` gives orbit/pan/zoom controls where the browser can render
the supplied model format. USDZ Quick Look behavior is strongest on Apple
platforms; the viewer keeps `.usdz` as the first-class source format for this
project.

## Pipeline

```txt
Google Keep-style text note
-> BJJ semantic parser
-> structured BJJ scene JSON
-> Blender MCP prompt
-> USDZ export
-> GitHub Pages USDZ viewer
```
