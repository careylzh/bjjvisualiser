# Research notes — the 2026-10-11 knowledge build

Three parallel research agents worked from one brief (`scratchpad/research/BRIEF.md`, the
schema now enforced by `tools/knowledge/build.mjs`). Their reports, condensed; the
unresolved items are the `knowledge-curator`'s backlog.

## Neck / torso (42 → 40 after merging 2 controls into the upper-limb set)
23 chokes, 1 illegal hand-on-throat entry, 5 cranks/spinal locks, 1 compression, 12 controls.
Legality read from the IBJJF v6.1 PDF and the illegal-moves poster: spinal lock without a
choke = never (can opener, twister, crucifix neck crank, north–south crank, boston crab);
choke-with-spinal-lock (Peruvian/Japanese necktie) legal from 16 / adult white; Ezekiel,
guillotine, triangle, arm triangle illegal only 4–15; closed-guard rib squeeze from blue.
Blood vs air: RNC/triangle/arm-triangle carotid; low-elbow guillotine tracheal+carotid;
paper cutter and gogoplata contested (noted). Low: `short_choke`. Medium (16): mechanisms
rest on coaching sites or legality is a referee-judgement hybrid. No textbook page numbers.

## Upper limb (37)
10 armbar variants, kimura (11 positions), americana, omoplata (8 positions), the plata
family, hammerlock, Mir lock, bicep slicer, three wristlocks by forced motion, finger lock
(never), and 12 arm controls/grips. Legality from the rendered p. 29 table: omoplata adult
white; wrist locks adult blue+ (blogs claiming purple/brown are wrong); bicep slicer
brown+; finger bending never; flying armbar recorded blue+ with the jumping-guard note.
Low: `marceloplata`, `mir_lock`. Could not find a sourced "wristlock from spider guard" —
omitted rather than padded.

## Lower limb / hips (27) + IBJJF table (29 rows)
Straight ankle lock, heel hooks (inside/outside/backside 50-50), kneebar (7 positions), toe
hold, calf slicer, Estima, Aoki, Texas cloverleaf, Z-lock, banana split, electric chair, and
13 leg/hip controls. **Convention conflict resolved as D-3** (tibial rotation per the
orthopaedic review). Legality highlights: heel hook / knee reaping / twisting knee locks
never in gi, Adult brown/black no-gi only (NOT Master no-gi); kneebar/toe hold/calf slicer
brown; "stretching legs apart" (banana split, electric chair) banned only 4–12. Low:
`texas_cloverleaf`, `z_lock`. Aoki/Estima IBJJF class inferred from mechanics.

## Post-merge edits by the integrator
- `demo_motion.joint: forearm` → `elbow` (pronation lives on the elbow articulation).
- Knee DOF renamed `rotation` → `internal_rotation/external_rotation` (tibial) so heel-hook
  demos are explicit; generic `rotation` demos on `z_lock`/`knee_reap_position` mapped by
  sign.
- `gift_wrap`, `underhook` merged (upper-limb text kept; torso positions/targets/sources
  unioned). Duplicate position rows removed from `bicep_slicer`, `wristlock_flexion`.
- Source maps merged (8 refs appeared in two sets with different descriptions; first kept).
