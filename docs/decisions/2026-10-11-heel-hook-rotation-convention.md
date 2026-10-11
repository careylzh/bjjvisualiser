# D-3 — Heel-hook rotation direction follows the orthopaedic literature

**Conflict found by the lower-limb researcher (2026-10-11):** most BJJ coaching sites say
"inside heel hook = internal rotation of the knee → ACL/MCL". The peer-reviewed review the
entries cite (Hasegawa et al., *Hawai'i J Health Soc Welf* 85(6):132–141, 2026), the
physiotherapy explanations (Reed; Piekarski) and the Baker 2010 case report assign it the
other way, because the anatomical term refers to the TIBIA's rotation relative to the femur:

| Technique | Tibial rotation | Foot | Primary structures |
|---|---|---|---|
| **Outside heel hook** (heel cupped from the outside, twisted laterally) | **internal** | plantarflexed, inverted | ACL, PCL in flexion, posteromedial corner / MCL, medial meniscus |
| **Inside heel hook** (inside sankaku / saddle; heel rotated toward the opponent's midline) | **external** | dorsiflexed, everted | posterolateral corner (LCL, popliteus, popliteofibular lig.), MCL secondary, anterior horn medial meniscus |

## Ruling
The app displays the **tibial-rotation convention** (outside = internal, inside = external),
with the coaching-site shorthand recorded in each entry's `notes` so a reader who learned it
the other way is not confused. `demo_motion` on the knee uses the rig's
`internal_rotation` / `external_rotation` DOF (tibial), with the knee pre-flexed to 90° by
`demo_setup` so the rotation is visible.

Any future entry that describes knee rotation must say which bone rotates relative to which.
