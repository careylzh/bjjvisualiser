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
  resetPoseButton: $("resetPoseButton"), arLink: $("arLink"), versionLabel: $("versionLabel"), kbLabel: $("kbLabel"),
  hoverLabel: $("hoverLabel"), filterToggle: $("filterToggle")
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
  // Desktop Chromium also claims rel="ar" support but has no Quick Look, so require an Apple touch device.
  const a = document.createElement("a");
  const appleTouch = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (appleTouch && a.relList?.supports?.("ar")) dom.arLink.hidden = false;

  let viewer;
  try {
    viewer = await createViewer({
      container: dom.viewport, rigMeta, modelUrl: "./models/anatomy-rig.usdz", onStatus: setStatus,
      onPick: (hit) => { if (hit) panel.select(hit.region, hit.side); },
      onHover: (h) => {
        // Mouse only: a small label at the cursor naming what a click would select.
        if (!h) { dom.hoverLabel.hidden = true; return; }
        const r = knowledge.regions.find((x) => x.id === h.region);
        dom.hoverLabel.textContent = `${r?.label ?? h.region}${h.side ? ` · ${h.side === "L" ? "left" : "right"}` : ""}`;
        dom.hoverLabel.style.transform = `translate(${Math.round(h.x + 14)}px, ${Math.round(h.y + 14)}px)`;
        dom.hoverLabel.hidden = false;
      }
    });
  } catch (err) {
    setStatus("error", `Could not load the figure: ${err?.message ?? err}`);
    throw err;
  }
  const panel = createPanel({ dom, knowledge, viewer });
  dom.resetPoseButton.addEventListener("click", () => { viewer.resetPose(); viewer.resetCamera(); panel.select(null); });
  // Keyboard (desktop): Escape goes back to the region list.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.getSelection() && !e.target.closest?.("input, select, textarea")) panel.select(null);
  });
  window.__bjj = { viewer, panel, knowledge }; // for e2e tests and the console
}

main().catch((err) => console.error(err));
