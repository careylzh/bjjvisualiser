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

Web viewer:

```bash
cd src/web
npm install
npm run dev
npm run build
```

## Pipeline

```txt
Google Keep-style text note
-> BJJ semantic parser
-> structured BJJ scene JSON
-> Blender MCP prompt
-> USDZ export
-> GitHub Pages USDZ viewer
```

