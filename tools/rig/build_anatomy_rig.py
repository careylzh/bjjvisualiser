#!/usr/bin/env python3
"""
build_anatomy_rig.py — author the tappable, rigged anatomy figure as USDZ.

Why we build our own: the Sketchfab fighter that used to live in this repo is a static
mesh (no UsdSkel, three mesh prims), so it cannot articulate. This script writes a
UsdSkel skeleton with one joint per anatomical articulation and one skinned Mesh prim per
tappable body region, so the viewer can (a) raycast a tap to a region by prim name and
(b) rotate joints through anatomical ranges of motion.

Proportions: Drillis & Contini (1966) segment lengths as fractions of stature, the
standard biomechanics reference (reproduced in Winter, "Biomechanics and Motor Control of
Human Movement", 4th ed., Fig. 4.1). Stature defaults to 1.75 m. Figure stands in an
A-pose (arms abducted ~25°) so every region is reachable by a tap.

Range-of-motion limits: AAOS normative values (Joint Motion: Method of Measuring and
Recording, 1965; reproduced in Norkin & White, "Measurement of Joint Motion"). These are
written into anatomy-rig.json for the viewer; they are NOT baked into the USD.

Outputs (relative to repo root):
  app/models/anatomy-rig.usdz   — the figure (usdc inside a usdz)
  app/models/anatomy-rig.json   — joint metadata: hierarchy, rest positions, DOF axes + limits,
                                  prim→region map

Run:  python3 tools/rig/build_anatomy_rig.py [--stature 1.75]
Needs the `pxr` Python module (Apple's USD tools ship it on macOS) and `usdzip`.
"""
import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile

from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdSkel, Vt

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "app", "models")

# ---------------------------------------------------------------------------------------
# Anthropometry (fractions of stature H) — Drillis & Contini 1966
# ---------------------------------------------------------------------------------------
F = {
    "head_len": 0.130,      # vertex → chin
    "neck_len": 0.052,
    "shoulder_h": 0.818,    # acromion height
    "biacromial": 0.259,
    "upper_arm": 0.186,
    "forearm": 0.146,
    "hand": 0.108,
    "chest_h": 0.720,       # thoracic articulation (≈ xiphoid)
    "navel_h": 0.630,       # lumbar articulation
    "hip_h": 0.530,         # greater trochanter
    "hip_w": 0.191,
    "thigh": 0.245,
    "shank": 0.246,
    "ankle_h": 0.039,
    "foot_len": 0.152,
    "foot_w": 0.055,
}

A_POSE_ABDUCTION_DEG = 25.0

# Anatomical DOF per joint: (axis-name, local axis, [min,max] degrees in anatomical terms, sign)
# Axes are in the joint's local rest frame, which we author as identity → X = subject's left,
# Y = up, Z = anterior. Sign conventions are chosen so that +value = the named motion for the
# LEFT side; the viewer mirrors X-axis-dependent signs for the right side where needed.
# AAOS normative values (degrees).
DOF = {
    # sign: +1/-1 so that rotating about `axis` by (sign * value) produces the named `motion`
    #       for the LEFT side (or the midline). The viewer uses `mirror` to flip the sign for
    #       right-side joints (lateral/rotational motions mirror; sagittal flexion does not).
    "spine": [  # lumbar
        {"motion": "flexion", "opposite": "extension", "axis": "X", "sign": 1, "mirror": False, "range": [-25, 60]},
        {"motion": "lateral_flexion", "opposite": "lateral_flexion", "axis": "Z", "sign": -1, "mirror": False, "range": [-25, 25]},
        {"motion": "rotation", "opposite": "rotation", "axis": "Y", "sign": 1, "mirror": False, "range": [-15, 15]},
    ],
    "chest": [  # thoracic
        {"motion": "flexion", "opposite": "extension", "axis": "X", "sign": 1, "mirror": False, "range": [-20, 45]},
        {"motion": "lateral_flexion", "opposite": "lateral_flexion", "axis": "Z", "sign": -1, "mirror": False, "range": [-20, 20]},
        {"motion": "rotation", "opposite": "rotation", "axis": "Y", "sign": 1, "mirror": False, "range": [-35, 35]},
    ],
    "neck": [  # cervical
        {"motion": "flexion", "opposite": "extension", "axis": "X", "sign": 1, "mirror": False, "range": [-60, 50]},
        {"motion": "lateral_flexion", "opposite": "lateral_flexion", "axis": "Z", "sign": -1, "mirror": False, "range": [-45, 45]},
        {"motion": "rotation", "opposite": "rotation", "axis": "Y", "sign": 1, "mirror": False, "range": [-80, 80]},
    ],
    "shoulder": [  # glenohumeral
        {"motion": "flexion", "opposite": "extension", "axis": "X", "sign": -1, "mirror": False, "range": [-60, 180]},
        {"motion": "abduction", "opposite": "adduction", "axis": "Z", "sign": 1, "mirror": True, "range": [-50, 180]},
        {"motion": "internal_rotation", "opposite": "external_rotation", "axis": "LONG", "sign": 1, "mirror": True, "range": [-90, 70],
         "demo_setup": {"joint": "elbow", "motion": "flexion", "value": 90}},  # bend the elbow so rotation is visible
    ],
    "elbow": [  # humeroulnar + forearm
        {"motion": "flexion", "opposite": "hyperextension", "axis": "X", "sign": -1, "mirror": False, "range": [-10, 150]},
        {"motion": "pronation", "opposite": "supination", "axis": "LONG", "sign": 1, "mirror": True, "range": [-80, 80],
         "demo_setup": {"joint": "elbow", "motion": "flexion", "value": 90}},
    ],
    "wrist": [
        {"motion": "flexion", "opposite": "extension", "axis": "X", "sign": -1, "mirror": False, "range": [-70, 80]},
        {"motion": "ulnar_deviation", "opposite": "radial_deviation", "axis": "Z", "sign": -1, "mirror": True, "range": [-20, 30]},
    ],
    "hip": [
        {"motion": "flexion", "opposite": "extension", "axis": "X", "sign": -1, "mirror": False, "range": [-30, 120]},
        {"motion": "abduction", "opposite": "adduction", "axis": "Z", "sign": 1, "mirror": True, "range": [-30, 45]},
        {"motion": "internal_rotation", "opposite": "external_rotation", "axis": "LONG", "sign": 1, "mirror": True, "range": [-45, 45],
         "demo_setup": {"joint": "knee", "motion": "flexion", "value": 90}},
    ],
    "knee": [
        {"motion": "flexion", "opposite": "hyperextension", "axis": "X", "sign": 1, "mirror": False, "range": [-10, 135]},
        {"motion": "internal_rotation", "opposite": "external_rotation", "axis": "LONG", "sign": 1, "mirror": True, "range": [-10, 10],
         "demo_setup": {"joint": "knee", "motion": "flexion", "value": 90}},  # tibial rotation (small; the heel-hook target)
    ],
    "ankle": [
        {"motion": "plantarflexion", "opposite": "dorsiflexion", "axis": "X", "sign": 1, "mirror": False, "range": [-20, 50]},
        {"motion": "inversion", "opposite": "eversion", "axis": "Z", "sign": 1, "mirror": True, "range": [-15, 35]},
    ],
}


def v(x, y, z):
    return Gf.Vec3f(float(x), float(y), float(z))


def build_layout(H):
    """Return joints (ordered, parent-first) with world rest positions, and segment specs."""
    sh_y = F["shoulder_h"] * H
    sh_x = (F["biacromial"] * H) / 2.0 * 0.86  # glenohumeral centre sits medial of the acromion
    hip_y = F["hip_h"] * H
    hip_x = (F["hip_w"] * H) / 2.0 * 0.88
    a = math.radians(A_POSE_ABDUCTION_DEG)
    ua, fa, hd = F["upper_arm"] * H, F["forearm"] * H, F["hand"] * H
    th, sk, ak = F["thigh"] * H, F["shank"] * H, F["ankle_h"] * H
    head_base_y = H - F["head_len"] * H

    J = {}  # name -> (parent, world pos)
    J["pelvis"] = (None, v(0, hip_y, 0))
    J["spine"] = ("pelvis", v(0, F["navel_h"] * H, 0))
    J["chest"] = ("spine", v(0, F["chest_h"] * H, 0))
    J["neck"] = ("chest", v(0, sh_y, 0))
    J["head"] = ("neck", v(0, head_base_y, 0))
    for side, s in (("L", 1.0), ("R", -1.0)):
        shoulder = v(s * sh_x, sh_y - 0.01 * H, 0)
        elbow = v(shoulder[0] + s * ua * math.sin(a), shoulder[1] - ua * math.cos(a), 0)
        wrist = v(elbow[0] + s * fa * math.sin(a), elbow[1] - fa * math.cos(a), 0)
        hand_end = v(wrist[0] + s * hd * math.sin(a), wrist[1] - hd * math.cos(a), 0)
        J[f"shoulder_{side}"] = ("chest", shoulder)
        J[f"elbow_{side}"] = (f"shoulder_{side}", elbow)
        J[f"wrist_{side}"] = (f"elbow_{side}", wrist)
        J[f"hand_{side}"] = (f"wrist_{side}", hand_end)
        hip = v(s * hip_x, hip_y, 0)
        knee = v(s * hip_x, hip_y - th, 0)
        ankle = v(s * hip_x, hip_y - th - sk, 0)
        toe = v(s * hip_x, ak * 0.35, F["foot_len"] * H * 0.72)
        J[f"hip_{side}"] = ("pelvis", hip)
        J[f"knee_{side}"] = (f"hip_{side}", knee)
        J[f"ankle_{side}"] = (f"knee_{side}", ankle)
        J[f"toe_{side}"] = (f"ankle_{side}", toe)

    # Order parent-first
    order = ["pelvis", "spine", "chest", "neck", "head"]
    for side in ("L", "R"):
        order += [f"shoulder_{side}", f"elbow_{side}", f"wrist_{side}", f"hand_{side}"]
    for side in ("L", "R"):
        order += [f"hip_{side}", f"knee_{side}", f"ankle_{side}", f"toe_{side}"]

    # Segment meshes: (prim name, region, joint it is skinned to, shape, params)
    r_torso = 0.075 * H
    S = []
    S.append(("Head", "head", "head", "ellipsoid",
              {"center": (0, head_base_y + F["head_len"] * H * 0.5, 0.01 * H),
               "radii": (0.045 * H, F["head_len"] * H * 0.5, 0.055 * H)}))
    S.append(("Neck", "neck", "neck", "capsule",
              {"a": J["neck"][1], "b": J["head"][1], "r": 0.028 * H}))
    S.append(("Chest", "chest", "chest", "ellipsoid",
              {"center": (0, (J["chest"][1][1] + sh_y) / 2 + 0.005 * H, 0),
               "radii": (sh_x * 0.95, (sh_y - J["chest"][1][1]) * 0.78, 0.062 * H)}))
    S.append(("Abdomen", "abdomen", "spine", "ellipsoid",
              {"center": (0, (J["spine"][1][1] + J["chest"][1][1]) / 2, 0),
               "radii": (0.082 * H, (J["chest"][1][1] - J["spine"][1][1]) * 0.75, 0.058 * H)}))
    S.append(("Pelvis", "hips", "pelvis", "ellipsoid",
              {"center": (0, (hip_y + J["spine"][1][1]) / 2 - 0.005 * H, 0),
               "radii": (hip_x * 1.55, (J["spine"][1][1] - hip_y) * 0.8, 0.065 * H)}))
    for side in ("L", "R"):
        sh, el, wr, hn = (J[f"{n}_{side}"][1] for n in ("shoulder", "elbow", "wrist", "hand"))
        hp, kn, an, te = (J[f"{n}_{side}"][1] for n in ("hip", "knee", "ankle", "toe"))
        # Joint spheres are always a little LARGER than the capsules that meet them, so a tap on a
        # joint hits the joint prim first (the capsule caps are hemispheres centred on the joint).
        S += [
            (f"Shoulder_{side}", "shoulder", f"shoulder_{side}", "sphere", {"c": sh, "r": 0.036 * H}),
            (f"UpperArm_{side}", "upper_arm", f"shoulder_{side}", "capsule", {"a": sh, "b": el, "r": 0.026 * H}),
            (f"Elbow_{side}", "elbow", f"elbow_{side}", "sphere", {"c": el, "r": 0.030 * H}),
            (f"Forearm_{side}", "forearm", f"elbow_{side}", "capsule", {"a": el, "b": wr, "r": 0.021 * H}),
            (f"Wrist_{side}", "wrist", f"wrist_{side}", "sphere", {"c": wr, "r": 0.025 * H}),
            (f"Hand_{side}", "hand", f"wrist_{side}", "capsule_flat", {"a": wr, "b": hn, "r": 0.028 * H, "flat": 0.4}),
            (f"Hip_{side}", "hips", f"hip_{side}", "sphere", {"c": hp, "r": 0.050 * H}),
            (f"Thigh_{side}", "thigh", f"hip_{side}", "capsule", {"a": hp, "b": kn, "r": 0.040 * H}),
            (f"Knee_{side}", "knee", f"knee_{side}", "sphere", {"c": kn, "r": 0.044 * H}),
            (f"Shin_{side}", "shin_calf", f"knee_{side}", "capsule", {"a": kn, "b": an, "r": 0.030 * H}),
            (f"Ankle_{side}", "ankle", f"ankle_{side}", "sphere", {"c": an, "r": 0.034 * H}),
            (f"Foot_{side}", "foot", f"ankle_{side}", "capsule_flat",
             {"a": v(an[0], ak * 0.5, an[2] - 0.03 * H), "b": te, "r": 0.030 * H, "flat": 0.6}),
        ]
    return J, order, S


# ---------------------------------------------------------------------------------------
# Geometry generators (positions + face lists)
# ---------------------------------------------------------------------------------------
def sphere_geo(c, r, rings=10, segs=16, radii=None, flat=None):
    rx, ry, rz = radii if radii else (r, r, r)
    pts, counts, idx = [], [], []
    for i in range(rings + 1):
        th = math.pi * i / rings
        for j in range(segs):
            ph = 2 * math.pi * j / segs
            x = rx * math.sin(th) * math.cos(ph)
            y = ry * math.cos(th)
            z = rz * math.sin(th) * math.sin(ph)
            pts.append(v(c[0] + x, c[1] + y, c[2] + z))
    for i in range(rings):
        for j in range(segs):
            a = i * segs + j
            b = i * segs + (j + 1) % segs
            cc = (i + 1) * segs + (j + 1) % segs
            d = (i + 1) * segs + j
            counts.append(4)
            idx += [a, b, cc, d]
    return pts, counts, idx


def capsule_geo(a, b, r, segs=16, rings=5, flat=None):
    """Capsule from a to b: hemisphere caps + cylinder, in a frame aligned to b-a.
    flat (0..1) squashes the capsule along the local Z (anterior) axis for hands/feet."""
    ax = Gf.Vec3d(float(b[0] - a[0]), float(b[1] - a[1]), float(b[2] - a[2]))
    L = ax.GetLength()
    axn = ax / L
    up = Gf.Vec3d(0, 0, 1) if abs(axn[1]) > 0.9 else Gf.Vec3d(0, 1, 0)
    u = Gf.Cross(axn, up).GetNormalized()
    w = Gf.Cross(u, axn).GetNormalized()
    # make w the "anterior" (Z-ish) direction so flattening squashes front/back
    if abs(w[2]) < abs(u[2]):
        u, w = w, u
    fz = flat if flat else 1.0
    pts, counts, idx = [], [], []
    # bottom cap (at a), cylinder, top cap (at b) — all as latitude rings
    lat = []
    for i in range(rings + 1):  # bottom hemisphere: from pole at a-r to equator
        th = math.pi / 2 * (1 - i / rings)
        lat.append((-r * math.sin(th), math.cos(th), 0.0))
    for i in range(rings + 1):  # top hemisphere
        th = math.pi / 2 * i / rings
        lat.append((L + r * math.sin(th), math.cos(th), 1.0))
    for (t, rs, _) in lat:
        for j in range(segs):
            ph = 2 * math.pi * j / segs
            off = u * (r * rs * math.cos(ph)) + w * (r * rs * math.sin(ph) * fz)
            p = Gf.Vec3d(float(a[0]), float(a[1]), float(a[2])) + axn * t + off
            pts.append(v(p[0], p[1], p[2]))
    nr = len(lat)
    for i in range(nr - 1):
        for j in range(segs):
            p0 = i * segs + j
            p1 = i * segs + (j + 1) % segs
            p2 = (i + 1) * segs + (j + 1) % segs
            p3 = (i + 1) * segs + j
            counts.append(4)
            idx += [p0, p1, p2, p3]
    return pts, counts, idx


def make_geo(shape, p):
    if shape == "sphere":
        return sphere_geo(p["c"], p["r"])
    if shape == "ellipsoid":
        return sphere_geo(p["center"], None, rings=12, segs=20, radii=p["radii"])
    if shape == "capsule":
        return capsule_geo(p["a"], p["b"], p["r"])
    if shape == "capsule_flat":
        return capsule_geo(p["a"], p["b"], p["r"], flat=p["flat"])
    raise ValueError(shape)


# ---------------------------------------------------------------------------------------
# USD authoring
# ---------------------------------------------------------------------------------------
def translation_matrix(p):
    m = Gf.Matrix4d(1.0)
    m.SetTranslateOnly(Gf.Vec3d(float(p[0]), float(p[1]), float(p[2])))
    return m


def author(stage_path, H):
    J, order, S = build_layout(H)
    stage = Usd.Stage.CreateNew(stage_path)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)

    root = UsdGeom.Xform.Define(stage, "/AnatomyRig")
    stage.SetDefaultPrim(root.GetPrim())
    skel_root = UsdSkel.Root.Define(stage, "/AnatomyRig/Figure")

    # Materials
    mats = {}
    for name, color in (("Segment", (0.80, 0.74, 0.68)), ("Joint", (0.62, 0.70, 0.78))):
        mpath = f"/AnatomyRig/Materials/{name}"
        mat = UsdShade.Material.Define(stage, mpath)
        sh = UsdShade.Shader.Define(stage, mpath + "/Surface")
        sh.CreateIdAttr("UsdPreviewSurface")
        sh.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color))
        sh.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.65)
        sh.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
        mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), "surface")
        mats[name] = mat

    # Skeleton
    joint_paths = []
    full_path = {}
    for name in order:
        parent = J[name][0]
        full_path[name] = name if parent is None else f"{full_path[parent]}/{name}"
        joint_paths.append(full_path[name])
    bind = Vt.Matrix4dArray([translation_matrix(J[n][1]) for n in order])
    rest = []
    for n in order:
        parent = J[n][0]
        p = J[n][1]
        if parent is None:
            rest.append(translation_matrix(p))
        else:
            pp = J[parent][1]
            rest.append(translation_matrix((p[0] - pp[0], p[1] - pp[1], p[2] - pp[2])))
    skel = UsdSkel.Skeleton.Define(stage, "/AnatomyRig/Figure/Skeleton")
    skel.CreateJointsAttr(Vt.TokenArray(joint_paths))
    skel.CreateJointNamesAttr(Vt.TokenArray(order))
    skel.CreateBindTransformsAttr(bind)
    skel.CreateRestTransformsAttr(Vt.Matrix4dArray(rest))

    joint_index = {n: i for i, n in enumerate(order)}
    prim_region = {}
    for (prim_name, region, joint, shape, params) in S:
        pts, counts, idx = make_geo(shape, params)
        mesh = UsdGeom.Mesh.Define(stage, f"/AnatomyRig/Figure/{prim_name}")
        mesh.CreatePointsAttr(Vt.Vec3fArray(pts))
        mesh.CreateFaceVertexCountsAttr(Vt.IntArray(counts))
        mesh.CreateFaceVertexIndicesAttr(Vt.IntArray(idx))
        mesh.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
        mesh.CreateDoubleSidedAttr(True)  # tap raycasts must hit from any side
        ext = UsdGeom.Boundable.ComputeExtentFromPlugins(mesh, Usd.TimeCode.Default())
        if ext:
            mesh.CreateExtentAttr(ext)
        # Skinning: every vertex 100 % to one joint
        bind_api = UsdSkel.BindingAPI.Apply(mesh.GetPrim())
        bind_api.CreateSkeletonRel().SetTargets([skel.GetPath()])
        ji = bind_api.CreateJointIndicesPrimvar(constant=False, elementSize=1)
        ji.Set(Vt.IntArray([joint_index[joint]] * len(pts)))
        jw = bind_api.CreateJointWeightsPrimvar(constant=False, elementSize=1)
        jw.Set(Vt.FloatArray([1.0] * len(pts)))
        bind_api.CreateGeomBindTransformAttr(Gf.Matrix4d(1.0))
        mat = mats["Joint"] if shape == "sphere" else mats["Segment"]
        UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(mat)
        # Custom metadata the viewer can also read straight from the prim
        mesh.GetPrim().SetCustomDataByKey("bjj:region", region)
        mesh.GetPrim().SetCustomDataByKey("bjj:joint", joint)
        prim_region[prim_name] = {"region": region, "joint": joint, "shape": "joint" if shape == "sphere" else "segment"}

    stage.GetRootLayer().Save()

    # Viewer metadata
    joints_meta = []
    for n in order:
        parent, p = J[n]
        base = n.split("_")[0]
        side = n.split("_")[1] if "_" in n else None
        children = [c for c in order if J[c][0] == n]
        joints_meta.append({
            "name": n,
            "path": full_path[n],
            "parent": parent,
            "side": side,
            "articulation": base,
            "rest_world": [round(float(p[0]), 5), round(float(p[1]), 5), round(float(p[2]), 5)],
            "child": children[0] if children else None,
            "dof": DOF.get(base, []),
        })
    meta = {
        "generator": "tools/rig/build_anatomy_rig.py",
        "stature_m": H,
        "up_axis": "Y",
        "a_pose_abduction_deg": A_POSE_ABDUCTION_DEG,
        "sources": {
            "proportions": "Drillis R, Contini R. Body Segment Parameters. Report 1166-03, NYU School of Engineering, 1966 (via Winter DA, Biomechanics and Motor Control of Human Movement, 4th ed., 2009, Fig. 4.1).",
            "range_of_motion": "American Academy of Orthopaedic Surgeons. Joint Motion: Method of Measuring and Recording. Chicago: AAOS, 1965 (via Norkin CC, White DJ. Measurement of Joint Motion: A Guide to Goniometry, 5th ed., 2016).",
        },
        "joints": joints_meta,
        "prims": prim_region,
    }
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stature", type=float, default=1.75)
    ap.add_argument("--out-dir", default=OUT_DIR)
    args = ap.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        usdc = os.path.join(td, "anatomy-rig.usdc")
        meta = author(usdc, args.stature)
        usdz = os.path.join(td, "anatomy-rig.usdz")
        # usdzip stores the path it is given, so zip from inside the temp dir with a bare name
        subprocess.run(["usdzip", "anatomy-rig.usdz", "anatomy-rig.usdc"], check=True, cwd=td)
        dst = os.path.join(args.out_dir, "anatomy-rig.usdz")
        shutil.copyfile(usdz, dst)
        # also keep a readable usda next to the tooling for diffs/review (not shipped)
        usda = os.path.join(os.path.dirname(os.path.abspath(__file__)), "anatomy-rig.usda")
        subprocess.run(["usdcat", "-o", usda, usdc], check=True)
    with open(os.path.join(args.out_dir, "anatomy-rig.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"wrote {dst} ({os.path.getsize(dst)} bytes), {len(meta['joints'])} joints, {len(meta['prims'])} region prims")


if __name__ == "__main__":
    sys.exit(main())
