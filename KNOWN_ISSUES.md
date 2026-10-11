# Known Issues

Known limitations and technical debt in the BJJ Visualiser. Each item cites where it was
verified at the time of writing. "FIXED" is only written for behaviour OBSERVED on the
surface where it runs.

## 1. Never opened on a real iPhone or iPad (2026-10-11)
All verification is headless Playwright (Chromium + WebKit) and screenshots. Touch feel,
Safari toolbar/safe-area behaviour, AR Quick Look, and performance on a real device are
**DEVICE PASS PENDING**. `HANDOFF.md` ▸ Device check lists what to look at.

## 2. Textbook page locators are mostly empty
The three research agents could not retrieve tables of contents for *Jiu-Jitsu University*,
*Mastering Jujitsu* or *Theory and Technique* (catalogue pages returned 403), so entries cite
these books with empty `locator` fields, per the brief's rule "never invent a page number".
**Direction:** the `knowledge-curator` fills locators from physical copies; until then the
Sources list shows the book without a page.

## 3. Five low-confidence entries ship with a badge
`texas_cloverleaf` (sources disagree on the joint loaded), `z_lock` (single source; knee/hip
rotational lock, not a foot lock), `short_choke` (terminology), `marceloplata` (video-only
source), `mir_lock` (kimura- vs americana-variant conflict). Listed as research debt in
`TODO.md`; see `docs/reference/RESEARCH-NOTES-2026-10-11.md`.

## 4. Candidate duplicate controls
`overhook` (torso set) vs `overhook_whizzer` (arm set); `knee_on_belly` (abdomen pressure)
vs `knee_on_belly_hips`. They describe the same hold from two target regions and were kept
separate because they cite different structures. **Direction:** curator merges with a union
of positions/sources if a reader finds it confusing.

## 5. IBJJF legality is a per-technique field, not a full rules engine
`ibjjf.legal_from_belt` + `gi` / `nogi` summarise the adult table; age-division caveats
(4–12, 13–15, 16–17, Master) are notes only. The 50/50 trapped-foot and knee-reaping
definitions are quoted in `knowledge/ibjjf-legality.json`. Rulebook edition: v6.1 (June
2024) — re-check ibjjf.com before relying on it for a competition.

## 6. The figure is a mannequin
Capsules/spheres/ellipsoids, A-pose, no face, no gi. Chosen deliberately (D-2) for a
deterministic, tiny (~83 KB) rig with exact tap→region mapping. A skinned "pretty" mesh can
be layered as extra prims later; it must keep the joint/prim names.

## 7. One figure only (the defender)
Techniques describe what happens TO this body. The attacker is not modelled, so grips are
shown as highlighted regions and text, not as a second body. Position presets (e.g. pose the
figure as if in side-control bottom) are in `TODO.md`.

## 8. Rotational demos are approximate
Internal/external rotation is shown about the limb's long axis in the rest frame with a
companion pre-flex (elbow/knee 90°). It communicates direction, not the exact lever of the
submission. Chokes are highlighted, not animated.

## 9. Legacy pipeline is archived but untested on its generator
`legacy/note-to-scene/` unit tests run under `npm test`; `npm run legacy:generate` was path-
fixed but not re-run end-to-end after the move (writes under `legacy/…/data/generated`).
