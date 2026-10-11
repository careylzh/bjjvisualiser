// app.js — glue: load data + rig, create the viewer and the panel, wire taps to the panel.
import { createViewer } from "./js/viewer.js";
import { createPanel } from "./js/panel.js";

const $ = (id) => document.getElementById(id);
const dom = {
  app: $("app"), viewport: $("viewport"), status: $("viewerStatus"), sideBadge: $("sideBadge"),
  groupChips: $("groupChips"), positionSelect: $("positionSelect"),
  roleButtons: Array.from(document.querySelectorAll(".segmented [data-role]")),
  panelHome: $("panelHome"), panelRegion: $("panelRegion"), regionList: $("regionList"),
  panelScroll: $("panelScroll"), sheetHandle: $("sheetHandle"),
  resetPoseButton: $("resetPoseButton"), arLink: $("arLink"), versionLabel: $("versionLabel"), kbLabel: $("kbLabel")
};

function setStatus(state, message) {
  dom.viewport.dataset.viewerStatus = state;
  dom.status.textContent = message;
}

async function main() {
  const [knowledge, rigMeta, version] = await Promise.all([
    fetch("./data/knowledge.json").then((r) => r.json()),
    fetch("./models/anatomy-rig.json").then((r) => r.json()),
    fetch("./version.json").then((r) => r.json())
  ]);
  dom.versionLabel.textContent = `v${version.version} (build ${version.build})`;
  dom.kbLabel.textContent = `${knowledge.techniques.length} techniques · ${Object.keys(knowledge.sources).length} sources · ${knowledge.generated}`;

  // AR Quick Look (iOS/iPadOS Safari) opens the same USDZ natively.
  const a = document.createElement("a");
  if (a.relList?.supports?.("ar")) dom.arLink.hidden = false;

  let viewer;
  try {
    viewer = await createViewer({
      container: dom.viewport, rigMeta, modelUrl: "./models/anatomy-rig.usdz", onStatus: setStatus,
      onPick: (hit) => { if (hit) panel.select(hit.region, hit.side); }
    });
  } catch (err) {
    setStatus("error", `Could not load the figure: ${err?.message ?? err}`);
    throw err;
  }
  const panel = createPanel({ dom, knowledge, viewer });
  dom.resetPoseButton.addEventListener("click", () => { viewer.resetPose(); viewer.resetCamera(); panel.select(null); });
  window.__bjj = { viewer, panel, knowledge }; // for e2e tests and the console
}

main().catch((err) => console.error(err));
