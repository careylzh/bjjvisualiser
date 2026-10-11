# D-2 — Generate our own UsdSkel anatomy rig instead of using the Sketchfab fighter

**Finding (2026-10-11):** `bjj-fighter-caucasian-white-gi-80kg.usdz` (the "rigged" model the
README described) contains three `Mesh` prims under `Sketchfab_model/…/GLTF_SceneRootNode`
and NO `Skeleton` — `usdcat --flatten | grep Skel` returns nothing. It cannot articulate and
has no region names. The PI's ruling: "if the existing fighter is poorly rigged and does not
fulfil its job, find one that is better, or rig it using Blender or something you deem fit."

## Ruling: author the rig ourselves with the Pixar USD Python API
`tools/rig/build_anatomy_rig.py` writes a `SkelRoot` with:
- a `Skeleton` of **21 joints** (pelvis · spine · chest · neck · head · shoulder/elbow/wrist/
  hand ×2 · hip/knee/ankle/toe ×2), parent-first, translation-only rest transforms;
- **29 skinned `Mesh` prims**, one per tappable region (joint spheres + segment capsules +
  ellipsoids), every vertex weighted 100 % to one joint, named `Elbow_L`, `Thigh_R`, …;
- proportions from **Drillis & Contini (1966)** segment fractions of stature (1.75 m),
  A-pose (25° abduction) so every region is reachable by a tap;
- ranges of motion from **AAOS (1965)** normative values, written to `anatomy-rig.json` with
  per-DOF axis, sign and mirror flags (the viewer never hard-codes anatomy).

Verified in headless Chromium and WebKit: three.js r181 `USDLoader` yields 1 `Skeleton`,
21 `Bone`s, 29 `SkinnedMesh`es; raycasting a tap on the left elbow returns `Elbow_L`.

## Why not the alternatives
| Option | Verdict |
|---|---|
| Rig the Sketchfab mesh in Blender | Three fused meshes (gi, skin, hair) — would need manual weight painting and region splitting; licence of the asset was never recorded. Rejected. |
| Mixamo / CC0 rigged glTF → USDZ | Workable, but joint names/orientation vary per asset, rest poses are rotated (breaks the identity-rest-frame contract), and no per-region meshes. Kept as a future "pretty skin" option that must keep our joint names. |
| Blender Rigify `basic.human` + USD export | Viable second pipeline (documented in `rig-steward`); not needed for v1.0 — pxr authoring is deterministic and dependency-light. |

## Consequences
- Prim/joint names are a public contract (knowledge `demo_motion`, panel, tests).
- The figure is a mannequin, not a photoreal body. That is acceptable for revision and keeps
  the USDZ at ~83 KB. A skinned "pretty" mesh can be layered later as extra prims.
