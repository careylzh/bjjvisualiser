// build.mjs — validate the knowledge base and bundle it for the app.
//
// Source of truth: knowledge/ (hand-curated JSON). Output: app/data/knowledge.json.
// This is the gate that keeps the mapping honest: an entry with no source, an unknown region or
// position, an invalid belt, or a demo motion the rig cannot perform FAILS the build.
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { jargonHits } from "./plain-language.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const K = (p) => path.join(root, "knowledge", p);

const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));

const regionsDoc = await readJson(K("regions.json"));
const positionsDoc = await readJson(K("positions.json"));
const sources = await readJson(K("sources.json"));
const legality = await readJson(K("ibjjf-legality.json"));
const rig = await readJson(path.join(root, "app", "models", "anatomy-rig.json"));

const regionIds = new Set(regionsDoc.regions.map((r) => r.id));
const positionIds = new Set(positionsDoc.positions.map((p) => p.id));
const belts = new Set(["white", "blue", "purple", "brown", "black", "never"]);
const roles = new Set(["top", "bottom", "standing", "either"]);
const categories = new Set(["joint_lock", "choke", "crank", "compression", "control"]);
const confidences = new Set(["high", "medium", "low"]);
const tiers = new Set(["fundamental", "advanced"]); // optional, editorial; D-4
const demoJoints = new Set(["none", ...rig.joints.map((j) => j.articulation)]);
const motionNames = new Set(["none", "compression"]);
for (const j of rig.joints) for (const d of j.dof) { motionNames.add(d.motion); motionNames.add(d.opposite); }
motionNames.add("extension"); // elbow/knee list "hyperextension"; entries may say "extension"
motionNames.add("hyperextension");

const errors = [];
const warnings = [];
for (const r of regionsDoc.regions) {
  if (!(typeof r.plain === "string" && r.plain.length > 10)) errors.push(`regions.json › ${r.id}: plain required`);
  for (const [w, hint] of jargonHits(r.plain)) errors.push(`regions.json › ${r.id}: plain uses jargon '${w}' — say ${hint}`);
}
const techniques = [];
const seen = new Map();

const techDir = K("techniques");
const files = (await readdir(techDir)).filter((f) => f.endsWith(".json")).sort();
for (const file of files) {
  const list = await readJson(path.join(techDir, file));
  if (!Array.isArray(list)) { errors.push(`${file}: must be a JSON array`); continue; }
  for (const t of list) {
    const where = `${file} › ${t.id ?? "(no id)"}`;
    const must = (cond, msg) => { if (!cond) errors.push(`${where}: ${msg}`); };
    must(typeof t.id === "string" && /^[a-z0-9_]+$/.test(t.id), "id must be snake_case");
    if (seen.has(t.id)) errors.push(`${where}: duplicate id (also in ${seen.get(t.id)})`); else seen.set(t.id, file);
    must(typeof t.name === "string" && t.name.length > 1, "name required");
    must(categories.has(t.category), `category '${t.category}' not in ${[...categories].join("|")}`);
    must(t.primary_target && regionIds.has(t.primary_target.region), `primary_target.region '${t.primary_target?.region}' unknown`);
    must(typeof t.primary_target?.mechanism === "string" && t.primary_target.mechanism.length > 10, "primary_target.mechanism required");
    for (const s of t.secondary_targets ?? []) must(regionIds.has(s.region), `secondary target region '${s.region}' unknown`);
    // Plain language: every target needs a gym-words explanation; jargon stays in mechanism/structures.
    const plainCheck = (label, text) => { for (const [w, hint] of jargonHits(text)) errors.push(`${where}: ${label} uses jargon '${w}' — say ${hint}`); };
    must(typeof t.primary_target?.plain === "string" && t.primary_target.plain.length > 10, "primary_target.plain (plain-language explanation) required");
    plainCheck("primary_target.plain", t.primary_target?.plain);
    (t.secondary_targets ?? []).forEach((s, i) => {
      must(typeof s.plain === "string" && s.plain.length > 10, `secondary_targets[${i}].plain required`);
      plainCheck(`secondary_targets[${i}].plain`, s.plain);
    });
    plainCheck("summary", t.summary);
    for (const p of t.positions ?? []) plainCheck(`position note (${p.position})`, p.note);
    for (const g of t.grip_regions ?? []) must(regionIds.has(g), `grip region '${g}' unknown`);
    must(Array.isArray(t.positions) && t.positions.length > 0, "at least one position required");
    const seenPos = new Set();
    for (const p of t.positions ?? []) {
      const k = `${p.position}/${p.attacker_role}`;
      if (seenPos.has(k)) warnings.push(`${where}: duplicate position ${k}`); seenPos.add(k);
      must(positionIds.has(p.position), `position '${p.position}' unknown`);
      must(roles.has(p.attacker_role), `attacker_role '${p.attacker_role}' invalid`);
      if (p.position === "other" && !p.note) warnings.push(`${where}: position 'other' without a note`);
    }
    must(t.ibjjf && belts.has(t.ibjjf.legal_from_belt), `ibjjf.legal_from_belt '${t.ibjjf?.legal_from_belt}' invalid`);
    must(Array.isArray(t.sources) && t.sources.length > 0, "at least one source required — unsourced entries do not ship");
    for (const s of t.sources ?? []) must(sources[s.ref], `source ref '${s.ref}' not in knowledge/sources.json`);
    must(confidences.has(t.confidence), `confidence '${t.confidence}' invalid`);
    must(t.tier === undefined || tiers.has(t.tier), `tier '${t.tier}' invalid (fundamental | advanced, or omit)`);
    if (t.demo_motion) {
      // Pronation/supination is a forearm motion but lives on the elbow articulation in the rig.
      if (t.demo_motion.joint === "forearm") t.demo_motion.joint = "elbow";
      must(demoJoints.has(t.demo_motion.joint), `demo_motion.joint '${t.demo_motion.joint}' is not a rig articulation`);
      must(motionNames.has(t.demo_motion.axis), `demo_motion.axis '${t.demo_motion.axis}' unknown`);
      if (t.demo_motion.joint !== "none" && t.demo_motion.axis !== "none" && t.demo_motion.axis !== "compression") {
        const j = rig.joints.find((j) => j.articulation === t.demo_motion.joint);
        const ok = !!j && j.dof.some((d) => [d.motion, d.opposite].includes(t.demo_motion.axis))
          || (["extension", "hyperextension"].includes(t.demo_motion.axis) && j.dof.some((d) => ["extension", "hyperextension"].includes(d.opposite)));
        must(ok, `demo_motion '${t.demo_motion.axis}' is not a DOF of joint '${t.demo_motion.joint}'`);
      }
    }
    if (t.confidence === "low") warnings.push(`${where}: low confidence — ${t.notes ?? "(no note)"}`);
    techniques.push(t);
  }
}

if (errors.length) {
  console.error(`knowledge build FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
for (const w of warnings) console.warn("  warn: " + w);

techniques.sort((a, b) => a.name.localeCompare(b.name));
const version = await readJson(path.join(root, "app", "version.json"));
const bundle = {
  schema: 1,
  app_version: version.version,
  generated: new Date().toISOString().slice(0, 10),
  regions: regionsDoc.regions,
  positions: positionsDoc.positions,
  position_groups: positionsDoc.groups,
  sources,
  legality,
  techniques
};
await mkdir(path.join(root, "app", "data"), { recursive: true });
await writeFile(path.join(root, "app", "data", "knowledge.json"), JSON.stringify(bundle));

const byRegion = {};
for (const t of techniques) byRegion[t.primary_target.region] = (byRegion[t.primary_target.region] ?? 0) + 1;
console.log(`knowledge: ${techniques.length} techniques from ${files.length} file(s), ${Object.keys(sources).length} sources, ${warnings.length} warning(s)`);
console.log("  primary targets: " + Object.entries(byRegion).map(([k, v]) => `${k}=${v}`).join(", "));
