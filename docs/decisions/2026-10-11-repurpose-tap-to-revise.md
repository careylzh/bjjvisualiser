# D-1 — Repurpose: from "note → scene → Blender prompt" to "tap a joint, revise the attack"

**PI direction (2026-10-11):** consolidate the repo around a phone/iPad web app, deployed on
GitHub Pages, that shows a rigged human anatomy with as many degrees of movement as
practical. Tapping a body part lists the Brazilian Jiu-Jitsu attacks (submissions) and
controls that target or grip it, by position (closed guard, mount, side control, north–south,
…). The purpose is REVISION for jiu-jiteiros, so the mapping must be as accurate as possible
and traceable to credible sources.

## What changed
| Before (v0.1.0) | After (v1.0.0) |
|---|---|
| `.txt` notes → scene JSON → Blender MCP prompt; a static USDZ viewer | A knowledge base (`knowledge/`) + a rigged figure (`app/models/`) + a tap-to-revise app (`app/`) |
| Sketchfab fighter USDZ (static mesh, no skeleton) | Own UsdSkel rig generated from anthropometric data (see D-2) |
| No agentic conventions, no versioning | ImmersiFit-style agents (`.claude/agents/`), `scripts/version.sh`, semver tags, CHANGELOG/HANDOFF/KNOWN_ISSUES/TODO |

The v0.1 pipeline is archived, not deleted: `legacy/note-to-scene/` (its tests still run
under `npm test`). The old fighter USDZ is dropped from the tree (6.8 MB, unusable); it
remains in history before `v1.0.0`.

## Product rulings
- **The figure is the defender.** Every entry is what can be done TO that region. Positions
  record where the attacker is (`attacker_role` top/bottom/standing/either).
- **Grip points surface techniques too.** Tapping the wrist shows the kimura and americana
  (gripped there, attacking the shoulder), labelled "grip here · attacks the shoulder".
- **Accuracy over volume.** An entry without a source does not ship (build gate).
  Low-confidence entries ship with a visible badge rather than being hidden.
- **Legality is per the official IBJJF Rules Book**, recorded with its edition, gi and no-gi
  separately. Age-division caveats are a note, not a separate entry.
- **Phone first, iPad Safari equal.** Bottom sheet under 760 px; side panel above. WebKit is
  a required test surface.

## Rejected alternatives
- *Find a rigged human USDZ online.* Rigged USDZs with clean, named, side-aware joints and
  one mesh per tappable region do not exist off the shelf; licences are unclear; and the
  tap→region mapping would have to be reverse-engineered. Generating our own is ~300 lines
  and fully specified (D-2).
- *glTF instead of USDZ in the browser.* three.js r181 loads UsdSkel natively, and USDZ gives
  AR Quick Look on iOS for free. USDZ stays first-class.
- *A framework (React/Vue).* The app is one page with a canvas and a list; plain modules
  keep it offline-capable on Pages with no build step.
