# Changelog

All notable changes to the BJJ Visualiser. Dates are `YYYY-MM-DD`. Versions follow
`scripts/version.sh` (semver + build number); every released version is a git tag.

## [Unreleased]

### 2026-10-11 — Round 3 (**v1.0.1**, build 3): iPad side-panel containment + CI demo-test timing

`patch`. Found by loading the LIVE Pages site headless after the first deploy.
- **iPad/desktop layout: a long technique list stretched the stage row**, so the canvas grew
  to ~2500 px and the camera focus (centred correctly in canvas space) landed below the fold.
  The panel now scrolls inside a bounded grid cell (`min-height: 0; overflow: hidden`). A new
  e2e assertion pins canvas height ≤ viewport height after selecting the wrist.
- **CI: the "demo moves the joint" test sampled once at 700 ms**; ubuntu runners render WebGL
  in software and had not delivered a frame yet. It now polls up to 4 s. (The Pages deploy
  job had succeeded; only the CI gate job failed.)
- WebKit "ResizeObserver loop" console error silenced by deferring the renderer resize a frame.
- **Observed:** v1.0.0 live at https://careylzh.github.io/bjjvisualiser/ (version.json,
  knowledge.json 255 KB, anatomy-rig.usdz 82 KB all 200), loads headless on phone Chromium and
  iPad WebKit with zero console errors. Real iPhone/iPad still DEVICE PASS PENDING.

### 2026-10-11 — Round 2 (**v1.0.0**, build 2): REPURPOSE — tap-a-joint BJJ revision app with a rigged anatomy figure and a sourced knowledge base

`major` (product repurpose; the v0.1 note→scene pipeline is archived, not removed).
Decision records: D-1 repurpose, D-2 own rig, D-3 heel-hook convention (`docs/decisions/`).

- **Agentic structure and versioning** emulated from ImmersiFit: `.claude/agents/`
  (`version-steward`, `qa-inspector`, `repo-butler`, `knowledge-curator`, `rig-steward`),
  `scripts/version.sh` (one semver across `package.json` + `app/version.json`, build number
  in the app footer, annotated tags), `CLAUDE.md`, `HANDOFF.md`, `KNOWN_ISSUES.md`, `TODO.md`,
  `docs/{decisions,reference,architecture}`, `docs/VERSION-HISTORY.md` (the pre-repurpose
  history replayed: `v0.1.0` = `99d3e6c`). CI (`ci.yml`) runs the same gates CLAUDE.md names.
- **Rigged anatomy figure (new):** the old Sketchfab fighter USDZ was found to be a static
  mesh with no skeleton. `tools/rig/build_anatomy_rig.py` now authors a UsdSkel rig with the
  Pixar USD Python API — 21 joints, 29 tappable region prims (one per anatomical region,
  L/R), Drillis & Contini proportions, AAOS ranges of motion with per-DOF axis/sign/mirror
  data and demo companion poses — packaged with `usdzip` (~83 KB). Loads in three.js r181
  (`USDLoader` → `Skeleton` + `SkinnedMesh`) and in AR Quick Look.
- **Knowledge base (new):** 104 techniques (42 neck/torso incl. 23 chokes, 37 upper-limb,
  27 lower-limb/hips incl. controls), 153 sources, and an IBJJF legality table read from the
  Rules Book v6.1 (June 2024) p. 29 image. Researched by three parallel agents against a
  shared brief; validated by `tools/knowledge/build.mjs` (unsourced entries fail the build);
  spot-read. Heel hooks follow the orthopaedic tibial-rotation convention (D-3). Five
  entries are low-confidence and badged (`texas_cloverleaf`, `z_lock`, `short_choke`,
  `marceloplata`, `mir_lock`).
- **App (rewritten):** `app/` — full-screen three.js viewport, tap raycast → region + side,
  highlight, camera focus, position-group chips + position select + top/bottom role toggle,
  bottom sheet (phone) / side panel (iPad, ≥760 px), tabs Attacks · Grips · Controls · Joint
  (DOF sliders), "Show on figure" demo animation past the anatomical limit, per-entry
  sources, IBJJF belt badges, L/R toggle, AR Quick Look link, version + knowledge footer.
  Safari: `dvh`, safe-area insets, pointer events, import map.
- **Verified:** `npm run build` 0 errors · `npm test` 21 passing · Playwright 24 passing
  across phone-chromium / ipad-chromium / desktop-chromium / ipad-webkit · headless
  screenshots reviewed (phone portrait, iPad portrait + landscape). **NOT yet opened on a
  real iPhone/iPad** — DEVICE PASS PENDING.
- **Removed from the tree:** `src/web/public/models/bjj-fighter-caucasian-white-gi-80kg.usdz`
  (6.8 MB static mesh), `simple-box.usdz`, the old viewer. `data/`, `src/parser`,
  `src/blender`, `src/scripts`, `tests/` moved to `legacy/note-to-scene/` with paths fixed.

## Released

### 2026-06-28 — **v0.1.0** (tagged retroactively on 2026-10-11 at `99d3e6c`)
Note → scene JSON → Blender MCP prompt pipeline (`parseBjjNote`, `generateBlenderPrompt`,
three sample notes), a static three.js USDZ viewer with sample dropdown and rotate buttons,
GitHub Pages deployment workflow, Playwright viewer tests, and a TODO sketching the
"BJJ Learning Companion" modules. 16 commits, 2026-06-02 → 2026-06-28.
