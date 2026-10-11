# BJJ Visualiser

**Tap a joint. Revise the attack.** A phone and iPad web app (GitHub Pages, works offline
once loaded) that shows a rigged human anatomy figure. Tap any body region and the panel
lists the Brazilian Jiu-Jitsu **submissions** and **controls** that target or grip it, filtered
by **position** (closed guard, mount, side control, north–south, back, leg entanglements…)
and **attacker role** (top/bottom), with the **anatomical mechanism**, **IBJJF legality** by
belt (gi / no-gi), and the **sources** behind every entry.

The figure is the **defender**: every entry is something you can do *to* that joint.
Tapping the wrist shows the kimura and americana ("grip here · attacks the shoulder");
tapping the shoulder shows the omoplata from closed, open, spider, lasso and rubber guard.
"Show on figure" animates the joint to — and past — its anatomical range so the lock is
visible. The **Joint** tab exposes every degree of freedom with AAOS normative ranges.

> Submissions are dangerous. Drill under a qualified instructor and tap early. This app is
> revision material, not instruction.

## What is in the box
| Part | Where | Owner agent |
|---|---|---|
| Knowledge base — 104 techniques, 153 sources, IBJJF Rules Book v6.1 table | `knowledge/` | `knowledge-curator` |
| Rigged anatomy figure — 21-joint UsdSkel, 29 tappable region meshes, ~83 KB USDZ | `tools/rig/`, `app/models/` | `rig-steward` |
| The app — plain HTML/CSS/JS modules + vendored three.js r181 | `app/` | — |
| Gates — knowledge validator, static guard, vitest facts, Playwright (phone/iPad/WebKit) | `tools/`, `tests/`, `e2e/` | `qa-inspector` |
| Versioning — semver + build, tags | `scripts/version.sh` | `version-steward` |

## Run it
```bash
npm ci
npm run build        # validate + bundle the knowledge base; check the static site
npm run dev          # http://localhost:5173  (open on your phone via your Mac's LAN IP)
```
Verify:
```bash
npm test             # knowledge facts + legacy tests
npx playwright install chromium webkit   # once per machine
npm run test:e2e     # phone, iPad, desktop Chromium + iPad WebKit
npm run shots        # headless screenshots → .shots/
```
Regenerate the figure (needs `python3` with the `pxr` module and `usdzip`, both on macOS
with Apple's USD tools):
```bash
npm run build:rig
```

## On iPhone / iPad
Open the GitHub Pages URL in Safari. Under 760 px wide the technique panel is a bottom
sheet (tap or drag the handle); on an iPad it is a side panel. The **AR** button opens the
same USDZ in AR Quick Look.

## Deployment
Every push to `main` runs `.github/workflows/deploy-pages.yml`: it rebuilds the knowledge
bundle, checks version alignment, runs the unit tests, and deploys `app/` to GitHub Pages.
Releases are tagged `vX.Y.Z` via `scripts/version.sh` (see `CLAUDE.md` ▸ Conventions).

## Sources
Mechanisms cite peer-reviewed anatomy where it exists (e.g. Hasegawa et al. 2026 for leg
locks, Almeida et al. 2017 for the armbar), legality cites the official IBJJF Rules Book
(v6.1, June 2024), positions and naming cite the standard textbooks (Ribeiro & Howell
*Jiu-Jitsu University*; Gracie & Danaher *Mastering Jujitsu*; Gracie & Gracie *Theory and
Technique*) and established coaching sites. Every entry shows its citations under
**Sources**; low-confidence entries carry a badge. See `docs/reference/SOURCES.md` and
`docs/reference/RESEARCH-NOTES-2026-10-11.md` for what is still unresolved.

## History
v0.1 (June 2026) was a note → scene JSON → Blender-prompt pipeline with a static USDZ
viewer; it is archived under `legacy/note-to-scene/`. The 2026-10-11 repurpose is recorded
in `docs/decisions/2026-10-11-repurpose-tap-to-revise.md`.
