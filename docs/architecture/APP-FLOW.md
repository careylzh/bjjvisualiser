# APP-FLOW — what actually runs

## Load (app/app.js)
1. Fetch `data/knowledge.json` (built bundle), `models/anatomy-rig.json` (rig metadata),
   `version.json` in parallel; fill the footer.
2. `createViewer()` (`js/viewer.js`): scene, lights, ground; `USDLoader.loadAsync(
   models/anatomy-rig.usdz)` → traverse: collect `Bone`s by name, `SkinnedMesh`es whose
   prim name is in `rigMeta.prims` (clone material per prim for highlight, `frustumCulled =
   false`). Compute each joint's LONG axis from rest positions. Camera framed to the full
   body from the viewport aspect. Status pill → `loaded`.
3. `createPanel()` (`js/panel.js`): render group chips, position select, role toggle, the
   region list with per-region counts under the current filter.

## Tap
`pointerdown`/`pointerup` on the canvas with < 8 px movement → `Raycaster` against the 29
prims → prim name → `{ region, side }` → `panel.select(region, side)`:
- viewer highlights the region's prims (both sides' midline prims included) and tweens the
  camera to the region's bounding-box centre at an aspect-aware distance;
- panel shows the region header (anatomy note, L/R toggle for bilateral regions), the tabs
  **Attacks** (primary or secondary target, non-control), **Grips** (grip_regions only),
  **Controls** (category control), **Joint** (DOF sliders from the rig JSON);
- on phones the sheet opens to "half".

Selecting from the list defaults bilateral regions to the LEFT side.

## Filter
`group` (position group chip) → narrows the position select; `position`; `role`
(top/bottom). A technique matches if ANY of its position entries matches all set filters;
matching position badges are highlighted, others dimmed; per-position notes shown for
matching entries only.

## Demo ("Show on figure")
`viewer.playDemo({ joint, axis, direction, side, region })`: finds the DOF whose `motion`
or `opposite` equals `axis` (extension ≡ hyperextension for elbow/knee), targets the range
limit in that direction plus an overshoot (≤ 30°), optional `demo_setup` companion pose
(e.g. elbow 90° for shoulder rotation), eases in 0.9 s, holds 0.6 s, eases out 0.7 s,
pulsing the target region. Chokes / compressions (`joint: none`) pulse only.

## Pose math
`bone.quaternion = rest × Π_i R(axis_i, sign_i · mirror_i(side) · value_i)` over the joint's
DOF list in order, where `axis ∈ {X, Y, Z, LONG}` in the joint's local (= anatomical) frame.

## Build
`knowledge/*.json` → `tools/knowledge/build.mjs` (validate) → `app/data/knowledge.json`.
`tools/rig/build_anatomy_rig.py` → `app/models/anatomy-rig.usdz` + `.json`.
`tools/web/validate-static.mjs` guards required files, import map, version alignment.
`tools/web/prepare-pages.mjs` → `.pages/` (+ `.nojekyll`) for the Pages artifact.
