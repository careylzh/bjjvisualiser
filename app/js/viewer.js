// viewer.js — the rigged anatomy figure: load the USDZ, pick regions by tap, pose joints.
//
// Invariants (see CLAUDE.md):
//  • Region identity comes from the USD prim NAME (e.g. "Elbow_L") via app/models/anatomy-rig.json —
//    never from mesh order or colour.
//  • Joint rest rotations are identity (translation-only rest transforms), so a joint's local
//    axes equal the anatomical frame: X = subject's left, Y = up, Z = anterior. LONG = toward the
//    child joint. DOF signs and mirroring are DATA in the rig JSON, not code.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { USDLoader } from "three/addons/loaders/USDLoader.js";

const HIGHLIGHT = new THREE.Color(0xff7a45);
const PULSE = new THREE.Color(0xff3b1f);
const TAP_SLOP_PX = 8;

export async function createViewer({ container, rigMeta, modelUrl, onPick, onStatus }) {
  const status = (s, m) => onStatus?.(s, m);
  status("loading", "Loading the anatomy rig…");

  // --- scene -------------------------------------------------------------------------------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.minDistance = 0.6;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.92;

  scene.add(new THREE.HemisphereLight(0xdde7f3, 0x2a2420, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ec5ff, 0.9);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 48),
    new THREE.MeshStandardMaterial({ color: 0x1c242d, roughness: 1, metalness: 0, transparent: true, opacity: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.002;
  scene.add(ground);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.13, 64), new THREE.MeshBasicMaterial({ color: 0x2f3a46, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003; scene.add(ring);

  // --- rig --------------------------------------------------------------------------------
  const model = await new USDLoader().loadAsync(modelUrl);
  scene.add(model);

  const bones = new Map();          // bone name -> Bone
  const restQuat = new Map();       // bone name -> rest quaternion
  const prims = [];                 // tappable meshes
  const primInfo = new Map();       // mesh -> { region, side, joint, name }
  let skeleton = null;
  model.traverse((o) => {
    if (o.isBone) { bones.set(o.name, o); restQuat.set(o.name, o.quaternion.clone()); }
    if (o.isSkinnedMesh) {
      skeleton = skeleton || o.skeleton;
      const info = rigMeta.prims[o.name];
      if (!info) return;
      o.material = o.material.clone();           // per-prim highlight
      o.material.emissive = new THREE.Color(0x000000);
      o.frustumCulled = false;                   // skinned bounds are not updated by three
      const side = o.name.endsWith("_L") ? "L" : o.name.endsWith("_R") ? "R" : null;
      primInfo.set(o, { region: info.region, side, joint: info.joint, name: o.name, isJoint: info.shape === "joint" });
      prims.push(o);
    }
  });
  if (!skeleton || prims.length === 0) throw new Error("the USDZ has no skinned region meshes — rebuild with tools/rig/build_anatomy_rig.py");

  const jointMeta = new Map(rigMeta.joints.map((j) => [j.name, j]));
  const longAxis = new Map();
  for (const j of rigMeta.joints) {
    if (!j.child) continue;
    const c = jointMeta.get(j.child);
    longAxis.set(j.name, new THREE.Vector3(...c.rest_world).sub(new THREE.Vector3(...j.rest_world)).normalize());
  }
  const AX = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };

  // --- pose state -------------------------------------------------------------------------
  const angles = new Map(); // bone name -> number[] (deg per DOF)
  const boneFor = (articulation, side) => (side ? `${articulation}_${side}` : articulation);
  const dofsFor = (articulation) => rigMeta.joints.find((j) => j.articulation === articulation)?.dof ?? [];

  function applyBone(boneName) {
    const bone = bones.get(boneName);
    const meta = jointMeta.get(boneName);
    if (!bone || !meta) return;
    const vals = angles.get(boneName) ?? [];
    const q = new THREE.Quaternion();
    const tmp = new THREE.Quaternion();
    meta.dof.forEach((d, i) => {
      const v = vals[i] ?? 0;
      if (!v) return;
      const mirror = d.mirror && meta.side === "R" ? -1 : 1;
      const axis = d.axis === "LONG" ? longAxis.get(boneName) ?? AX.Y : AX[d.axis];
      tmp.setFromAxisAngle(axis, THREE.MathUtils.degToRad(d.sign * mirror * v));
      q.multiply(tmp);
    });
    bone.quaternion.copy(restQuat.get(boneName)).multiply(q);
  }

  function setJointAngle(articulation, side, dofIndex, deg) {
    const name = boneFor(articulation, side);
    const vals = angles.get(name) ?? new Array(dofsFor(articulation).length).fill(0);
    vals[dofIndex] = deg;
    angles.set(name, vals);
    applyBone(name);
  }
  function getJointAngles(articulation, side) {
    const name = boneFor(articulation, side);
    return (angles.get(name) ?? new Array(dofsFor(articulation).length).fill(0)).slice();
  }
  function resetPose() {
    for (const name of angles.keys()) { angles.set(name, angles.get(name).map(() => 0)); applyBone(name); }
    angles.clear();
    stopDemo();
  }

  // --- selection / highlight --------------------------------------------------------------
  let selected = null; // { region, side }
  function paint() {
    for (const m of prims) {
      const info = primInfo.get(m);
      const on = selected && info.region === selected.region && (selected.side == null || info.side == null || info.side === selected.side);
      m.material.emissive.copy(on ? HIGHLIGHT : new THREE.Color(0x000000));
      m.material.emissiveIntensity = on ? 0.55 : 0;
    }
  }
  function selectRegion(region, side = null) {
    selected = region ? { region, side } : null;
    container.dataset.selectedRegion = region ?? "";
    paint();
    if (selected) focusOn(selected);
  }
  function clearSelection() { selectRegion(null); }

  function regionBox(sel) {
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const m of prims) {
      const info = primInfo.get(m);
      if (info.region !== sel.region) continue;
      if (sel.side && info.side && info.side !== sel.side) continue;
      m.geometry.computeBoundingBox();
      tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
      box.union(tmp);
    }
    return box;
  }
  function regionCentre(sel) {
    const box = regionBox(sel);
    return box.isEmpty() ? new THREE.Vector3(0, 0.95, 0) : box.getCenter(new THREE.Vector3());
  }

  // --- camera -----------------------------------------------------------------------------
  const HOME_TARGET = new THREE.Vector3(0, 0.92, 0);
  let camTween = null;
  function fullBodyDistance() {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const byH = (1.95 / 2) / Math.tan(vFov / 2);
    const byW = (1.25 / 2) / Math.tan(hFov / 2);
    return Math.max(byH, byW) * 1.05;
  }
  function tweenCamera(target, distance, ms = 650) {
    const fromT = controls.target.clone();
    const fromP = camera.position.clone();
    const dir = fromP.clone().sub(fromT).normalize();
    const toP = target.clone().add(dir.multiplyScalar(distance));
    const t0 = performance.now();
    camTween = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
      controls.target.lerpVectors(fromT, target, e);
      camera.position.lerpVectors(fromP, toP, e);
      if (k >= 1) camTween = null;
    };
  }
  function focusOn(sel) {
    const box = regionBox(sel);
    const size = box.isEmpty() ? 0.3 : box.getSize(new THREE.Vector3()).length();
    // Show the region with limb context: fit a window of `want` metres in the NARROWER field of view.
    const want = THREE.MathUtils.clamp(size * 4, 0.75, 1.3);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = (want / 2) / Math.tan(Math.min(vFov, hFov) / 2);
    tweenCamera(regionCentre(sel), Math.min(dist, fullBodyDistance() * 0.85));
  }
  function resetCamera() { tweenCamera(HOME_TARGET.clone(), fullBodyDistance()); }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    // Keep the whole figure framed while nothing is selected (the phone sheet resizes the viewport).
    if (!selected && !camTween && controls) {
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).add(dir.multiplyScalar(fullBodyDistance()));
    }
  }
  resize();
  camera.position.set(0.0, 1.05, fullBodyDistance());
  controls.target.copy(HOME_TARGET);
  controls.update();

  // --- demo motion (animate a joint to and past its end range) ----------------------------
  let demo = null;
  function stopDemo() {
    if (!demo) return;
    const { dofIndex, articulation, side, startVal, setup } = demo;
    demo = null;
    if (articulation) setJointAngle(articulation, side, dofIndex, startVal);
    if (setup) setJointAngle(setup.joint, setup.side, setup.dofIndex, setup.startVal);
    paint();
  }
  function playDemo({ joint, axis, direction = 1, side = null, region = null }) {
    stopDemo();
    const dofs = dofsFor(joint);
    if (!dofs.length || axis === "none" || axis === "compression") return pulseOnly(region, side);
    let idx = dofs.findIndex((d) => d.motion === axis);
    let dir = direction;
    if (idx < 0) { idx = dofs.findIndex((d) => d.opposite === axis); dir = -direction; }
    if (idx < 0 && (axis === "extension" || axis === "hyperextension")) {
      idx = dofs.findIndex((d) => d.opposite === "hyperextension" || d.opposite === "extension"); dir = -direction;
    }
    if (idx < 0) return pulseOnly(region, side);
    const d = dofs[idx];
    const span = d.range[1] - d.range[0];
    const overshoot = Math.min(30, span * 0.25);
    const target = dir > 0 ? d.range[1] + overshoot : d.range[0] - overshoot;
    const sideUsed = side ?? (jointMeta.has(`${joint}_L`) ? "L" : null);
    const startVal = getJointAngles(joint, sideUsed)[idx] ?? 0;
    // Optional companion pose from the rig data (e.g. bend the elbow so shoulder rotation reads).
    let setup = null;
    if (d.demo_setup) {
      const sJoint = d.demo_setup.joint;
      const sDofs = dofsFor(sJoint);
      const sIdx = sDofs.findIndex((x) => x.motion === d.demo_setup.motion);
      if (sIdx >= 0) {
        const sSide = jointMeta.has(`${sJoint}_L`) ? sideUsed : null;
        setup = { joint: sJoint, side: sSide, dofIndex: sIdx, startVal: getJointAngles(sJoint, sSide)[sIdx] ?? 0, value: d.demo_setup.value };
      }
    }
    const t0 = performance.now();
    demo = { articulation: joint, side: sideUsed, dofIndex: idx, startVal, region, t0, target, setup };
    demo.step = (now) => {
      const t = now - t0;
      const inMs = 900, hold = 600, outMs = 700;
      let v;
      if (t < inMs) v = startVal + (target - startVal) * ease(t / inMs);
      else if (t < inMs + hold) v = target;
      else if (t < inMs + hold + outMs) v = target + (startVal - target) * ease((t - inMs - hold) / outMs);
      else { stopDemo(); return; }
      if (setup) {
        const k = Math.min(1, t / 500);
        setJointAngle(setup.joint, setup.side, setup.dofIndex, setup.startVal + (setup.value - setup.startVal) * ease(k));
      }
      setJointAngle(joint, sideUsed, idx, v);
      pulsePaint(region, sideUsed, (Math.sin(t / 120) + 1) / 2);
    };
  }
  function pulseOnly(region, side) {
    const t0 = performance.now();
    demo = { articulation: null, side, dofIndex: 0, startVal: 0, region, step: (now) => {
      const t = now - t0;
      if (t > 1600) { stopDemo(); return; }
      pulsePaint(region, side, (Math.sin(t / 120) + 1) / 2);
    } };
  }
  function pulsePaint(region, side, k) {
    if (!region) return;
    for (const m of prims) {
      const info = primInfo.get(m);
      if (info.region !== region) continue;
      if (side && info.side && info.side !== side) continue;
      m.material.emissive.copy(PULSE);
      m.material.emissiveIntensity = 0.35 + 0.5 * k;
    }
  }
  const ease = (k) => (k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k);

  // --- picking ----------------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > TAP_SLOP_PX) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(prims, false);
    if (!hits.length) { onPick?.(null); return; }
    // Joint spheres and limb capsules share a surface at the joint; on a near-tie prefer the joint.
    let hit = hits[0];
    for (const h of hits) {
      if (h.distance - hits[0].distance > 0.015) break;
      if (primInfo.get(h.object).isJoint) { hit = h; break; }
    }
    const info = primInfo.get(hit.object);
    onPick?.({ region: info.region, side: info.side, prim: info.name, joint: info.joint });
  });
  renderer.domElement.addEventListener("pointercancel", () => { down = null; });

  // --- loop -------------------------------------------------------------------------------
  let raf = null;
  function loop(now) {
    camTween?.(now);
    demo?.step?.(now);
    controls.update();
    if (container.clientWidth > 0 && container.clientHeight > 0) renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  // Defer to the next frame: resizing the renderer inside the observer callback trips WebKit's
  // "ResizeObserver loop completed with undelivered notifications" while the sheet animates.
  let resizeQueued = false;
  const ro = new ResizeObserver(() => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; resize(); });
  });
  ro.observe(container);
  raf = requestAnimationFrame(loop);
  status("loaded", "Tap any joint or body part.");

  const __debug = {
    // screen-space (CSS px within the canvas) centre of a prim — used by the e2e tap test
    project(primName) {
      const m = prims.find((p) => p.name === primName);
      if (!m) return null;
      const c = regionCentre({ region: primInfo.get(m).region, side: primInfo.get(m).side });
      const v = c.clone().project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
    }
  };

  return {
    __debug,
    selectRegion, clearSelection, resetPose, resetCamera, setJointAngle, getJointAngles, playDemo, stopDemo,
    dofsFor, hasSide: (articulation) => bones.has(`${articulation}_L`),
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); }
  };
}
