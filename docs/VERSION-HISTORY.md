# VERSION-HISTORY — semver replay of the pre-repurpose history (2026-10-11)

Before 2026-10-11 the repo had no tags and `package.json` sat at `0.1.0`. The history was
replayed under the `scripts/version.sh` rules (any breaking → major · any feature → minor ·
fixes only → patch · docs-only → none). A "release" = a state that was deployed to GitHub
Pages (the deploy workflow landed at `554d055`; every push to `main` after it deployed).

| Version | Anchor | Date | Contents (highest class) |
|---|---|---|---|
| (pre-release) | `04693df` … `191f51b` | 2026-06-02 | Scaffold, parser + Blender prompts, USDZ viewer, layout fixes — no deploy yet |
| **v0.1.0** | `99d3e6c` | 2026-06-02 → 06-28 | First deployed state: Pages workflow, sample USDZ dropdown, Sketchfab fighter model, TODO (feat) — **tagged retroactively** |
| **v1.0.0** | release commit on 2026-10-11 | 2026-10-11 | Repurpose: rigged anatomy figure + sourced knowledge base + tap-to-revise app + agentic conventions (**breaking**: new product, new tree) |

Build numbers start at 1 for v0.1.0 and 2 for v1.0.0 (the "round" counter in
`app/version.json`, shown in the footer).
