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

The web viewer is USDZ-first. It loads USDZ files from `src/web/public/models/`
or via drag/drop and file-picker upload, renders them in a Three.js scene, and
provides orbit controls plus horizontal rotate buttons. Generated Blender MCP
prompts target USDZ exports into the models directory.

## Pipeline

```txt
Google Keep-style text note
-> BJJ semantic parser
-> structured BJJ scene JSON
-> Blender MCP prompt
-> USDZ export
-> GitHub Pages USDZ viewer
```
