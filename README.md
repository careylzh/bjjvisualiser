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
npm run prepare:pages
npm run test:e2e
```

Manual browser check:

```bash
cd src/web
npm run dev
```

Open `http://localhost:5173/`, click `Load USDZ`, and choose
`src/web/public/models/bjj-fighter-caucasian-white-gi-80kg.usdz`. The model
should render in the browser viewport, and `Rotate Left`, `Rotate Right`, and
`Reset View` should respond.

If port `5173` is already in use:

```bash
cd src/web
python3 -m http.server 5174 --bind 0.0.0.0
```

Open `http://localhost:5174/`.

Playwright browser verification:

```bash
cd src/web
npm run test:e2e
npx playwright test --headed
npx playwright test --debug
npx playwright test tests/usdz-viewer.spec.ts --project=chromium
```

If Playwright browsers are not installed:

```bash
cd src/web
npx playwright install
```

## GitHub Pages Deployment

The viewer is deployed as a static GitHub Pages site from `src/web`.

```bash
git push origin main
```

The `.github/workflows/deploy-pages.yml` workflow validates the root pipeline,
validates the static viewer, prepares `src/web/.pages`, and deploys that
artifact to GitHub Pages.

Expected public URL:

```txt
https://careylzh.github.io/bjjvisualiser/
```

The web viewer runtime is plain static HTML/CSS/JS:

- `src/web/index.html`
- `src/web/styles.css`
- `src/web/app.js`
- vendored Three.js modules in `src/web/vendor/`

It loads USDZ files from `src/web/public/models/` or via drag/drop and
file-picker upload, renders them in a Three.js scene, and provides orbit
controls plus horizontal rotate buttons. Generated Blender MCP prompts target
USDZ exports into the models directory. `npm` in `src/web` is only for local
static validation and Playwright tests; GitHub Pages can serve the files
directly.

## Pipeline

```txt
Google Keep-style text note
-> BJJ semantic parser
-> structured BJJ scene JSON
-> Blender MCP prompt
-> USDZ export
-> GitHub Pages USDZ viewer
```
