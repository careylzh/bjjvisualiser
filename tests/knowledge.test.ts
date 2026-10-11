// Knowledge-base regression tests. The build gate (tools/knowledge/build.mjs) checks schema; these
// pin the FACTS a practitioner would notice if they regressed — the examples the product brief
// was written around, and the IBJJF rulings the researchers verified against the 2024 rulebook.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-ignore — plain ESM helper shared with the build gate
import { jargonHits } from "../tools/knowledge/plain-language.mjs";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const techniques: any[] = readdirSync(path.join(root, "knowledge/techniques"))
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => read(`knowledge/techniques/${f}`));
const byId = Object.fromEntries(techniques.map((t) => [t.id, t]));
const sources = read("knowledge/sources.json");
const regions = read("knowledge/regions.json").regions;
const rig = read("app/models/anatomy-rig.json");

const positionsOf = (t: any) => t.positions.map((p: any) => `${p.position}/${p.attacker_role}`);
const mentions = (region: string) => techniques.filter((t) =>
  t.primary_target.region === region || (t.secondary_targets ?? []).some((s: any) => s.region === region) || (t.grip_regions ?? []).includes(region));

describe("knowledge base integrity", () => {
  it("has unique ids and at least 90 sourced techniques", () => {
    expect(new Set(techniques.map((t) => t.id)).size).toBe(techniques.length);
    expect(techniques.length).toBeGreaterThanOrEqual(90);
  });
  it("every technique cites at least one resolvable source", () => {
    for (const t of techniques) {
      expect(t.sources.length, t.id).toBeGreaterThan(0);
      for (const s of t.sources) expect(sources[s.ref], `${t.id} → ${s.ref}`).toBeDefined();
    }
  });
  it("every region is reachable from at least one technique", () => {
    for (const r of regions) expect(mentions(r.id).length, r.id).toBeGreaterThan(0);
  });
});

describe("the brief's examples", () => {
  it("tapping the shoulder shows the omoplata from closed and open guard", () => {
    const o = byId.omoplata;
    expect(o.primary_target.region).toBe("shoulder");
    expect(positionsOf(o)).toEqual(expect.arrayContaining(["closed_guard/bottom", "open_guard/bottom"]));
  });
  it("tapping the wrist shows the kimura (side control / closed guard) and americana (side control / mount)", () => {
    expect(byId.kimura.grip_regions).toContain("wrist");
    expect(positionsOf(byId.kimura)).toEqual(expect.arrayContaining(["side_control/top", "closed_guard/bottom"]));
    expect(byId.americana.grip_regions).toContain("wrist");
    expect(positionsOf(byId.americana)).toEqual(expect.arrayContaining(["side_control/top", "mount/top"]));
  });
  it("kimura and americana rotate the shoulder in opposite directions", () => {
    expect(byId.kimura.demo_motion).toMatchObject({ joint: "shoulder", axis: "internal_rotation" });
    expect(byId.americana.demo_motion).toMatchObject({ joint: "shoulder", axis: "external_rotation" });
  });
  it("the armbar hyperextends the elbow", () => {
    expect(byId.armbar_closed_guard.primary_target.region).toBe("elbow");
    expect(byId.armbar_closed_guard.demo_motion).toMatchObject({ joint: "elbow", axis: "hyperextension" });
  });
});

describe("IBJJF rulings (Rules Book v6.1, 2024)", () => {
  it("heel hooks are never legal in the gi and brown+ in no-gi", () => {
    for (const id of ["inside_heel_hook", "outside_heel_hook"]) {
      expect(byId[id].ibjjf.gi, id).toBe(false);
      expect(byId[id].ibjjf.nogi, id).toBe(true);
      expect(byId[id].ibjjf.legal_from_belt, id).toBe("brown");
    }
  });
  it("spinal locks without a choke are illegal at every level", () => {
    for (const id of ["twister", "can_opener"]) expect(byId[id].ibjjf.legal_from_belt, id).toBe("never");
  });
  it("wrist locks are legal from adult blue belt; bicep slicers, kneebars and toe holds from brown", () => {
    expect(byId.wristlock_flexion.ibjjf.legal_from_belt).toBe("blue");
    for (const id of ["bicep_slicer", "kneebar", "toe_hold", "calf_slicer"]) expect(byId[id].ibjjf.legal_from_belt, id).toBe("brown");
  });
  it("legality table names the rulebook edition", () => {
    const leg = read("knowledge/ibjjf-legality.json");
    expect(leg.rulebook.title).toMatch(/IBJJF/);
    expect(leg.rows.length).toBeGreaterThan(10);
  });
});

describe("rig metadata", () => {
  it("has 21 joints and maps every region to a real articulation", () => {
    expect(rig.joints).toHaveLength(21);
    const arts = new Set(rig.joints.map((j: any) => j.articulation));
    for (const r of regions) expect(arts.has(r.joint), r.id).toBe(true);
  });
  it("every tappable prim maps to a known region", () => {
    const ids = new Set(regions.map((r: any) => r.id));
    for (const [prim, info] of Object.entries<any>(rig.prims)) expect(ids.has(info.region), prim).toBe(true);
  });
  it("every demo motion names a DOF the rig can perform", () => {
    const dofByArt: Record<string, Set<string>> = {};
    for (const j of rig.joints) {
      dofByArt[j.articulation] ??= new Set();
      for (const d of j.dof) { dofByArt[j.articulation].add(d.motion); dofByArt[j.articulation].add(d.opposite); }
    }
    for (const t of techniques) {
      const dm = t.demo_motion;
      if (!dm || dm.joint === "none" || dm.axis === "none" || dm.axis === "compression") continue;
      const art = dm.joint === "forearm" ? "elbow" : dm.joint;
      const ok = dofByArt[art]?.has(dm.axis) || (["extension", "hyperextension"].includes(dm.axis) && (dofByArt[art]?.has("hyperextension") || dofByArt[art]?.has("extension")));
      expect(ok, `${t.id}: ${art}.${dm.axis}`).toBe(true);
    }
  });
});

describe("plain language (user feedback 2026-10-12: written for the average practitioner)", () => {
  const fieldsOf = (t: any) => [
    ["primary_target.plain", t.primary_target.plain],
    ...(t.secondary_targets ?? []).map((s: any, i: number) => [`secondary_targets[${i}].plain`, s.plain]),
    ["summary", t.summary],
    ...t.positions.map((p: any) => [`note ${p.position}`, p.note])
  ];
  it("every target has a plain-language explanation", () => {
    for (const t of techniques) {
      expect(typeof t.primary_target.plain, t.id).toBe("string");
      for (const s of t.secondary_targets ?? []) expect(typeof s.plain, `${t.id} › ${s.region}`).toBe("string");
    }
    for (const r of regions) expect(typeof r.plain, r.id).toBe("string");
  });
  it("no medical jargon in anything shown before 'Anatomy detail'", () => {
    const hits: string[] = [];
    for (const t of techniques) for (const [f, text] of fieldsOf(t)) for (const [w] of jargonHits(text)) hits.push(`${t.id} › ${f}: ${w}`);
    for (const r of regions) for (const [w] of jargonHits(r.plain)) hits.push(`region ${r.id}: ${w}`);
    expect(hits).toEqual([]);
  });
  it("the jargon gate actually catches clinical wording (and leaves gym words alone)", () => {
    expect(jargonHits("olecranon locks in the fossa").length).toBeGreaterThan(0);
    expect(jargonHits("compresses both carotid arteries").length).toBeGreaterThan(0);
    expect(jargonHits("forced external rotation of the humerus").length).toBeGreaterThan(0);
    expect(jargonHits("Bends the elbow the wrong way (hyperextension), stretching the ligaments; tears the ACL and MCL; pulls on the ankle tendon and the shoulder blade, lats and toes")).toEqual([]);
  });
  it("the armbar reads in gym words and keeps its precise mechanism for the detail view", () => {
    const a = byId.armbar_closed_guard;
    expect(a.primary_target.plain).toMatch(/elbow/i);
    expect(a.primary_target.plain).toMatch(/hyperext/i);
    expect(a.primary_target.mechanism).toMatch(/olecranon/i);
  });
});
