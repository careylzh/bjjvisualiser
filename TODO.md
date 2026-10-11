# TODO — forward-looking open work

State → [HANDOFF.md](HANDOFF.md); history → [CHANGELOG.md](CHANGELOG.md). Updated 2026-10-11.

## Next (v1.0.0 is tagged locally, not pushed)
- [ ] **Push `main` + tags** to deploy v1.0.0 to GitHub Pages (the PI's call — a push deploys).
- [ ] **Real-device pass** — iPhone Safari and iPad Safari (portrait + landscape): load,
      tap, sheet drag, demo, AR Quick Look, no horizontal scroll, safe-area. Record as
      OBSERVED in KNOWN_ISSUES #1.
- [ ] **Curator: textbook locators** for the Ribeiro / Gracie–Danaher / Gracie–Gracie
      citations from physical copies (KNOWN_ISSUES #2).
- [ ] **Curator: resolve the five low-confidence entries** or demote them to `notes` on a
      parent entry (KNOWN_ISSUES #3). Decide `overhook`/`overhook_whizzer` and
      `knee_on_belly`/`knee_on_belly_hips` merges (#4).

## Product ideas (from the original "BJJ Learning Companion" TODO, re-scoped)
- [ ] **Position pose presets** — pose the figure as the defender in each position (mount
      bottom, side-control bottom, turtle, …) so taps happen on a body in context. Needs a
      pose table per position (joint angles) — data in the rig JSON, not code.
- [ ] **Attacker figure** — a second, dimmed figure showing the grip/lever for the selected
      technique. Big; only after presets.
- [ ] **Revision mode / quiz** — hide the names, show the region + position, reveal on tap;
      track what the user has revised (localStorage only — no accounts).
- [ ] **Skill tree & journey timeline** — the earlier module ideas (see git history of
      `TODO.md` at `v0.1.0`); out of scope for the tap-to-revise core.
- [ ] **Text-to-USDZ animation** (KIV from v0.1) — unchanged status: research note only.

## Engineering
- [ ] **Search box** over technique names/aliases (104 entries is past scrolling comfort).
- [ ] **Prefers-light theme** — the app is dark-only today.
- [ ] **Service worker** for true offline on Pages (the site is already CDN-free).
- [ ] **Blender pipeline** as a second rig source (Rigify `basic.human`), keeping joint/prim
      names — only if a "pretty" mesh is wanted.
- [ ] Re-run `npm run legacy:generate` end-to-end after the move (KNOWN_ISSUES #9).
