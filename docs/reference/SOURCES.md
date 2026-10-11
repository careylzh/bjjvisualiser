# SOURCES — how the knowledge base is cited

Every technique in `knowledge/techniques/*.json` lists `sources[]` whose `ref` resolves in
`knowledge/sources.json` (153 entries on 2026-10-11). The app renders them under each
card's **Sources** button. The build fails on an unsourced entry.

## Tiering (see `.claude/agents/knowledge-curator.md`)
1. Peer-reviewed anatomy / sports medicine — mechanism and structures.
2. The official **IBJJF Rules Book** — legality. Edition in use: **v6.1, June 2024**
   (`2024JUN_IBJJF_Rules_EN.pdf`; the site labels it v6.0, the back page v6.2). The
   technical-fouls table (p. 29) was read from a rendered page image. Checked 2026-10-11:
   no 2025/2026 edition published.
3. Textbooks — Ribeiro & Howell, *Jiu-Jitsu University* (Victory Belt, 2008); Gracie &
   Danaher, *Mastering Jujitsu* (Human Kinetics, 2003); Gracie & Gracie, *Brazilian
   Jiu-Jitsu: Theory and Technique* (Invisible Cities, 2001); Garcia, *Advanced Brazilian
   Jiujitsu Techniques* (2011); Bravo, *Mastering the Rubber Guard* (2006).
4. Established coaching sites — Grapplearts (Kesting), Digitsu, Evolve, BJJ Fanatics.
5. Wikipedia — cross-check and judo nomenclature only.

## Anatomy references used for the rig
- Drillis R, Contini R. *Body Segment Parameters.* NYU School of Engineering report
  1166-03, 1966 (via Winter DA, *Biomechanics and Motor Control of Human Movement*, 4th ed.).
- American Academy of Orthopaedic Surgeons. *Joint Motion: Method of Measuring and
  Recording.* 1965 (via Norkin & White, *Measurement of Joint Motion*, 5th ed.).

## Key mechanism references (by region)
- Leg locks: Hasegawa et al., *Hawai'i J Health Soc Welf* 85(6):132–141, 2026 (review);
  Baker 2010 *KSSTA* (heel-hook ACL+MCL case).
- Elbow (armbar): Almeida et al., *Acta Ortop Bras* 25(5):209–211, 2017.
- Shoulder capsule bands (kimura/americana): Massimini et al. 2012 *J Orthop Surg Res* 7:29;
  Turkel et al. 1981 *JBJS* 63A:1208.
- Chokes: Mitchell et al. 2012 *J Appl Physiol*; Wikipedia *Chokehold* (cross-check).
