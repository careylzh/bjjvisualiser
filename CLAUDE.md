# CLAUDE.md — working notes for Claude Code

Agent-facing conventions for this repo. Human overview is in `README.md`; how a session
runs in `docs/architecture/APP-FLOW.md`; current state/runbook in `HANDOFF.md`; dated
history in `CHANGELOG.md`; open work in `TODO.md`. The conventions here are inherited from
the ImmersiFit repo (`~/Desktop/immersifit`) and adapted to a static web app.

## What this is
A **phone/iPad web app on GitHub Pages** for Brazilian Jiu-Jitsu revision: a rigged
anatomy figure (USDZ, three.js) the user taps; the panel lists the submissions and
controls that target or grip that region, by position, with the anatomical mechanism,
IBJJF legality and sources. The figure is the **defender**.

Three parts, three owners (`.claude/agents/`):
- `knowledge/` — the hand-curated knowledge base (**knowledge-curator**). Source of truth.
- `tools/rig/` + `app/models/` + `app/js/viewer.js` — the rig and 3D viewer (**rig-steward**).
- `app/` — the static site (index.html, styles.css, app.js, js/panel.js), deployed as-is.

Also: **version-steward** (semver + tags), **qa-inspector** (evidence, not claims),
**repo-butler** (tidy, propose-only). `legacy/note-to-scene/` is the archived v0.1 pipeline.

## Build / verify (the gates — CI runs exactly these)
```bash
npm ci
npm run build          # build:knowledge (validate + bundle → app/data/knowledge.json) + build:web (static guard)
scripts/version.sh verify
npm test               # vitest: knowledge facts pinned as regressions + legacy tests
npm run test:e2e       # Playwright: phone, iPad (chromium + webkit), desktop 1280, laptop 1366, desktop-wide 1920
npm run shots          # headless screenshots → .shots/*.png — LOOK at them
npm run build:rig      # only after editing tools/rig/build_anatomy_rig.py (needs python3+pxr, usdzip)
npm run dev            # http://localhost:5173 (python http.server over app/)
```
- **`app/data/knowledge.json` is a committed build output.** Pages serves it. Regenerate it
  (`npm run build:knowledge`) in the same commit as any `knowledge/` edit or version bump.
- **No CDN, no bundler.** three.js r181 is vendored under `app/vendor/three/` so the site
  works offline and on Pages. Never add a `<script src="https://…">`.
- **Playwright browsers** are installed per machine: `npx playwright install chromium webkit`.
- Screenshots and e2e are HEADLESS (no window opens). Real-device checks on an iPhone/iPad
  in Safari are the only proof of touch feel, safe-area insets and AR Quick Look.
- `python3` on this Mac has the `pxr` module (Apple USD tools) and `/usr/bin/usdzip`;
  Blender 5.2 is at `/Applications/Blender.app` as the alternative rig pipeline.

## Invariants — do not break
1. **No technique ships without a source.** `tools/knowledge/build.mjs` fails the build on
   an unsourced entry, an unknown region/position/belt, or a `demo_motion` the rig cannot
   perform. Low confidence ships with a badge, never hidden.
2. **Region identity = USD prim name; joint identity = skeleton joint name.** Renaming either
   is a breaking change (major). The mapping lives in `app/models/anatomy-rig.json#prims`.
3. **Anatomy is data, not code.** DOF axes, signs, mirroring, ranges, demo companion poses
   are in the rig generator's DOF table → JSON. `viewer.js` must stay anatomy-agnostic.
4. **Rest rotations are identity** (translation-only rest transforms), so local joint axes =
   anatomical frame (X left, Y up, Z anterior; LONG toward the child). Every DOF sign assumes
   this.
5. **Conventions are decided once in `docs/decisions/`** (e.g. heel-hook tibial rotation,
   D-3) and every entry follows them.
6. **The figure is the defender; `grip_regions` is where the attacker holds.** Tapping a
   wrist must surface the kimura/americana as "grip here".
7. **Phone AND iPad Safari AND laptop/desktop.** Under 760 px the panel is a bottom sheet; above,
   a side panel that widens at 1024 px and goes two-column at 1440 px. `ipad-webkit` is a required
   Playwright project, not optional; mouse hover/keyboard affordances must never be the only way in.
8. **Plain language first.** The app is for the average practitioner. Region `plain`, target
   `plain`, `summary` and position notes use gym words (knee, lats, shoulder blade, ankle tendon,
   "hyperextends the elbow"); the build rejects the jargon list in `tools/knowledge/plain-language.mjs`.
   Precise anatomy stays in `anatomy` / `mechanism` / `structures`, shown under "Anatomy detail".

## Conventions
- **Versioning is SEMANTIC: `v[major].[minor].[patch]` + build number, ONE version across
  `package.json` and `app/version.json`, managed ONLY via `scripts/version.sh` and the
  `version-steward`.** patch = fixes and knowledge CORRECTIONS; minor = new entries/features/
  schema additions; major = schema/rig breaks or repurpose; docs-only never bumps. Every
  release gets an annotated tag `vX.Y.Z` (that's what makes revert/handoff work). The number
  is user-visible (app footer). Pre-repurpose history replayed in `docs/VERSION-HISTORY.md`.
- **Every push to `main` deploys** (`.github/workflows/deploy-pages.yml`). Tag before pushing.
  Do not push on the PI's behalf unless asked.
- **Checkboxes/PASS only for behaviour actually observed.** Safari/device behaviour is
  verified on a device, not claimed from a green Chromium run.
- **Review subagent research before trusting it.** The 2026-10-11 research sets were
  validated by the build gate and spot-read; textbook page locators are mostly missing and
  five entries are low-confidence (see `docs/reference/RESEARCH-NOTES-2026-10-11.md`).
- Scratch builds/harnesses go in the session scratchpad, never the repo (`app/_*.html` and
  `tools/dev/` are butler-sweepable if they slip in).

## Where to look
`HANDOFF.md` (state + runbook) · `docs/architecture/APP-FLOW.md` · `docs/decisions/` (D-1
repurpose, D-2 own rig, D-3 heel-hook convention) · `KNOWN_ISSUES.md` · `CHANGELOG.md` ·
`TODO.md` · `docs/reference/SOURCES.md` · `docs/VERSION-HISTORY.md`.
