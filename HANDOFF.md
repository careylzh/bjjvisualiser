# HANDOFF — BJJ Visualiser

Current working state + where to look. **Dated history → [CHANGELOG.md](CHANGELOG.md);
open work → [TODO.md](TODO.md); conventions and gates → [CLAUDE.md](CLAUDE.md).**

## Deployed state (updated 2026-10-11)

| Surface | Version | Note |
|---|---|---|
| GitHub Pages (`careylzh/bjjvisualiser`, `main`) | **v0.1.0 (the old viewer)** until the next push | v1.0.0 is committed and tagged locally; **not pushed** — pushing `main` deploys it |
| iPhone Safari | — | never opened on a device — **DEVICE PASS PENDING** |
| iPad Safari | — | never opened on a device — **DEVICE PASS PENDING** (headless WebKit passes) |

## What's live in the tree now — v1.0.0 (build 2)
- `app/` is the whole site: `index.html`, `styles.css`, `app.js`, `js/viewer.js`,
  `js/panel.js`, `data/knowledge.json` (built), `models/anatomy-rig.{usdz,json}`,
  `version.json`, `vendor/three/`.
- `knowledge/` is the source of truth (104 techniques / 153 sources / IBJJF v6.1 table).
- Gates all green locally on 2026-10-11: `npm run build`, `scripts/version.sh verify`,
  `npm test` (21), `npm run test:e2e` (24 across four projects incl. `ipad-webkit`),
  `npm run shots` reviewed.

## Runbook
```bash
npm ci && npx playwright install chromium webkit     # once per machine
npm run build && npm test && npm run test:e2e        # the gates
npm run dev                                          # localhost:5173 — open on the phone via the Mac's LAN IP
npm run shots                                        # .shots/*.png — look at them
```
**Release:** invoke the `version-steward` (classifies commits since the last tag, bumps,
regenerates the bundle, writes the CHANGELOG line, tags). Then the PI pushes:
`git push origin main --tags` → Pages deploys in ~1–2 min.

**Device check (the next thing to do):** open the Pages URL on an iPhone and an iPad in
Safari. Check: figure loads (status pill disappears), tap on a joint selects it (badge
top-left names it), the sheet drags, "Show on figure" animates, the AR button opens Quick
Look with the mannequin, no horizontal scroll, safe-area at the bottom. Record the result
in `KNOWN_ISSUES.md` / `CHANGELOG.md` as OBSERVED, not assumed.

## Decisions in force
D-1 repurpose · D-2 own rig (not the Sketchfab fighter) · D-3 heel-hook tibial-rotation
convention — `docs/decisions/`.

## Known gaps (short)
No device pass · textbook page locators mostly missing · 5 low-confidence entries ·
mannequin look (no "pretty" skin) · no second figure for the attacker · no pose presets per
position. Details in `KNOWN_ISSUES.md` and `TODO.md`.
