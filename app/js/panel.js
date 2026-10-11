// panel.js — the technique panel (bottom sheet on phones, sidebar on tablets).
// Pure DOM, no framework. It never decides what is TRUE about a technique — it only renders
// app/data/knowledge.json, which the build gate validated.
const BELT_LABEL = { white: "white+", blue: "blue+", purple: "purple+", brown: "brown+", black: "black", never: "illegal" };
const CAT_LABEL = { joint_lock: "joint lock", choke: "choke", crank: "crank", compression: "compression", control: "control" };
const ROLE_GLYPH = { top: "▲ top", bottom: "▼ bottom", standing: "standing", either: "either" };

const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
};
const pretty = (s) => (s ?? "").replaceAll("_", " ");

export function createPanel({ dom, knowledge, viewer }) {
  const regions = new Map(knowledge.regions.map((r) => [r.id, r]));
  const positions = new Map(knowledge.positions.map((p) => [p.id, p]));
  const filter = { group: "", position: "", role: "" };
  let selection = null;   // { region, side }
  let tab = "attacks";

  // ---- filters ---------------------------------------------------------------------------
  function techniqueMatchesFilter(t) {
    return t.positions.some((p) => {
      if (filter.position && p.position !== filter.position) return false;
      if (!filter.position && filter.group && positions.get(p.position)?.group !== filter.group) return false;
      if (filter.role && p.attacker_role !== filter.role && p.attacker_role !== "either") return false;
      return true;
    });
  }
  function positionMatches(p) {
    if (filter.position) return p.position === filter.position && roleOk(p);
    if (filter.group) return positions.get(p.position)?.group === filter.group && roleOk(p);
    return roleOk(p);
  }
  const roleOk = (p) => !filter.role || p.attacker_role === filter.role || p.attacker_role === "either";

  function renderGroupChips() {
    dom.groupChips.replaceChildren(
      el("button", { class: `chip ${filter.group === "" ? "is-active" : ""}`, type: "button", role: "tab", onclick: () => setGroup("") }, "All"),
      ...knowledge.position_groups.filter((g) => g.id !== "other").map((g) =>
        el("button", { class: `chip ${filter.group === g.id ? "is-active" : ""}`, type: "button", role: "tab", "data-group": g.id, onclick: () => setGroup(g.id) }, g.label))
    );
  }
  function renderPositionSelect() {
    const opts = knowledge.positions.filter((p) => !filter.group || p.group === filter.group).filter((p) => p.id !== "other");
    dom.positionSelect.replaceChildren(
      el("option", { value: "" }, filter.group ? `Any ${knowledge.position_groups.find((g) => g.id === filter.group)?.label.toLowerCase()} position` : "Any position"),
      ...opts.map((p) => el("option", { value: p.id, selected: filter.position === p.id }, p.label))
    );
  }
  function setGroup(g) { filter.group = g; filter.position = ""; renderGroupChips(); renderPositionSelect(); rerender(); }
  dom.positionSelect.addEventListener("change", () => { filter.position = dom.positionSelect.value; rerender(); });
  for (const b of dom.roleButtons) b.addEventListener("click", () => {
    filter.role = b.dataset.role;
    for (const o of dom.roleButtons) o.classList.toggle("is-active", o === b);
    rerender();
  });

  // ---- home --------------------------------------------------------------------------------
  function countsByRegion() {
    const c = {};
    for (const t of knowledge.techniques) {
      if (!techniqueMatchesFilter(t)) continue;
      const ids = new Set([t.primary_target.region, ...(t.secondary_targets ?? []).map((s) => s.region), ...(t.grip_regions ?? [])]);
      for (const id of ids) c[id] = (c[id] ?? 0) + 1;
    }
    return c;
  }
  function renderHome() {
    const counts = countsByRegion();
    dom.regionList.replaceChildren(...knowledge.regions.map((r) =>
      el("li", {}, el("button", { type: "button", "data-region": r.id, onclick: () => select(r.id, null, { fromList: true }) },
        el("span", {}, r.label), el("span", { class: "count" }, `${counts[r.id] ?? 0}`)))));
  }

  // ---- region view ---------------------------------------------------------------------
  function bucket(regionId) {
    const attacks = [], grips = [], controls = [];
    for (const t of knowledge.techniques) {
      if (!techniqueMatchesFilter(t)) continue;
      const targets = t.primary_target.region === regionId || (t.secondary_targets ?? []).some((s) => s.region === regionId);
      const grips_ = (t.grip_regions ?? []).includes(regionId);
      if (t.category === "control") { if (targets || grips_) controls.push(t); }
      else if (targets) attacks.push(t);
      else if (grips_) grips.push(t);
    }
    const prim = (t) => (t.primary_target.region === regionId ? 0 : 1);
    attacks.sort((a, b) => prim(a) - prim(b) || a.name.localeCompare(b.name));
    return { attacks, grips, controls };
  }

  function sourceLine(s) {
    const src = knowledge.sources[s.ref];
    if (!src) return el("li", {}, s.ref);
    const text = `${src.authors ? src.authors + ". " : ""}${src.title}${src.year ? ` (${src.year})` : ""}${src.publisher ? `, ${src.publisher}` : ""}${s.locator ? `, ${s.locator}` : ""}`;
    const url = s.url || src.url;
    return el("li", {}, url ? el("a", { href: url, target: "_blank", rel: "noopener" }, text) : text);
  }

  function card(t, regionId) {
    const belt = t.ibjjf?.legal_from_belt ?? "white";
    const gi = t.ibjjf?.gi, nogi = t.ibjjf?.nogi;
    const ruleTxt = belt === "never" ? "IBJJF: illegal" : `IBJJF ${BELT_LABEL[belt]}${gi && !nogi ? " · gi only" : !gi && nogi ? " · no-gi only" : ""}`;
    const isPrimary = t.primary_target.region === regionId;
    const target = isPrimary ? t.primary_target : (t.secondary_targets ?? []).find((s) => s.region === regionId) ?? t.primary_target;
    const gripOnly = !isPrimary && !(t.secondary_targets ?? []).some((s) => s.region === regionId) && (t.grip_regions ?? []).includes(regionId);
    const posBadges = t.positions.map((p) => el("span", { class: `badge pos ${positionMatches(p) ? "match" : "dim"}`, title: p.note ?? "" },
      `${positions.get(p.position)?.label ?? p.position} ${ROLE_GLYPH[p.attacker_role] ?? ""}`));
    const notes = t.positions.filter((p) => p.note && positionMatches(p)).slice(0, 4).map((p) =>
      el("li", {}, el("b", {}, positions.get(p.position)?.label ?? p.position), ": ", p.note));

    let sourcesBox = null;
    const actions = el("div", { class: "card-actions" },
      t.demo_motion && t.demo_motion.joint !== "none"
        ? el("button", { type: "button", class: "btn primary", "data-demo": t.id, onclick: () => viewer.playDemo({ ...t.demo_motion, side: selection?.side ?? null, region: t.primary_target.region }) }, "Show on figure")
        : el("button", { type: "button", class: "btn", onclick: () => viewer.playDemo({ joint: "none", axis: "none", side: selection?.side ?? null, region: t.primary_target.region }) }, "Highlight target"),
      el("button", { type: "button", class: "btn", onclick: (e) => {
        if (!sourcesBox) {
          sourcesBox = el("div", { class: "sources" }, "Sources", el("ul", {}, ...t.sources.map(sourceLine)), t.notes ? el("p", { class: "small" }, "Note: " + t.notes) : null);
          e.currentTarget.closest(".card").append(sourcesBox);
        } else { sourcesBox.remove(); sourcesBox = null; }
      } }, `Sources (${t.sources.length})`)
    );

    return el("article", { class: "card", "data-technique": t.id },
      el("h3", {}, t.name, t.aliases?.length ? el("span", { class: "aliases" }, t.aliases.join(" · ")) : null),
      el("div", { class: "badges" },
        el("span", { class: "badge cat" }, pretty(t.subcategory) || CAT_LABEL[t.category]),
        el("span", { class: `badge belt-${belt}` }, ruleTxt),
        !isPrimary && !gripOnly ? el("span", { class: "badge" }, `secondary target · primary: ${regions.get(t.primary_target.region)?.label}`) : null,
        gripOnly ? el("span", { class: "badge" }, `grip here · attacks the ${regions.get(t.primary_target.region)?.label.toLowerCase()}`) : null,
        t.confidence === "low" ? el("span", { class: "badge conf-low" }, "low confidence") : null),
      el("p", { class: "mech" }, el("b", {}, gripOnly ? "Grip: " : "Mechanism: "), gripOnly ? `${t.primary_target.mechanism}` : target.mechanism,
        target.structures?.length ? el("span", { class: "muted" }, ` — ${target.structures.join(", ")}`) : null),
      t.summary ? el("p", { class: "summary" }, t.summary) : null,
      el("div", { class: "badges" }, ...posBadges),
      notes.length ? el("ul", { class: "pos-notes" }, ...notes) : null,
      t.ibjjf?.note ? el("p", { class: "small muted" }, "Rules: " + t.ibjjf.note) : null,
      actions);
  }

  function jointPanel(regionId) {
    const region = regions.get(regionId);
    const articulation = region.joint;
    const dofs = viewer.dofsFor(articulation);
    const side = viewer.hasSide(articulation) ? (selection?.side ?? "L") : null;
    const vals = viewer.getJointAngles(articulation, side);
    const box = el("div", { class: "dof" },
      el("p", { class: "muted small" }, `Joint: ${pretty(articulation)}${side ? ` (${side === "L" ? "left" : "right"})` : ""}. Ranges are AAOS normative values; sliders stop at the anatomical limit — a submission goes past it.`));
    dofs.forEach((d, i) => {
      const out = el("span", { class: "val" }, `${Math.round(vals[i])}°`);
      const input = el("input", { class: "range", type: "range", min: d.range[0], max: d.range[1], step: 1, value: vals[i], "data-dof": d.motion,
        oninput: (e) => { const v = Number(e.target.value); viewer.setJointAngle(articulation, side, i, v); out.textContent = `${v}°`; } });
      box.append(el("label", {}, el("span", {}, `${pretty(d.motion)} / ${pretty(d.opposite)}`), out, input,
        el("span", { class: "ends" }, el("span", {}, `${pretty(d.opposite)} ${Math.abs(d.range[0])}°`), el("span", {}, `${pretty(d.motion)} ${d.range[1]}°`))));
    });
    box.append(el("div", { class: "card-actions" }, el("button", { type: "button", class: "btn", onclick: () => { viewer.resetPose(); renderRegion(); } }, "Reset pose")));
    return box;
  }

  function renderRegion() {
    if (!selection) return;
    const r = regions.get(selection.region);
    const b = bucket(r.id);
    const tabs = [["attacks", "Attacks", b.attacks.length], ["grips", "Grips", b.grips.length], ["controls", "Controls", b.controls.length], ["joint", "Joint", null]];
    if (!tabs.some(([id]) => id === tab)) tab = "attacks";
    const list = tab === "joint" ? [jointPanel(r.id)]
      : (b[tab].length ? b[tab].map((t) => card(t, r.id)) : [el("p", { class: "empty" }, "Nothing sourced for this filter yet. Widen the position or role filter.")]);
    dom.panelRegion.replaceChildren(
      el("div", { class: "region-head" },
        el("button", { type: "button", class: "ghost back", "aria-label": "Back to regions", onclick: () => select(null) }, "←"),
        el("div", {}, el("h2", {}, r.label, selection.side ? ` (${selection.side === "L" ? "left" : "right"})` : ""), el("p", { class: "anatomy" }, r.anatomy)),
        selection.side ? el("div", { class: "segmented side-toggle", role: "group", "aria-label": "Side" },
          ...["L", "R"].map((sd) => el("button", { type: "button", class: selection.side === sd ? "is-active" : "", "data-side": sd, onclick: () => select(r.id, sd) }, sd))) : null),
      el("div", { class: "tabs", role: "tablist" }, ...tabs.map(([id, label, n]) =>
        el("button", { type: "button", role: "tab", class: `tab ${tab === id ? "is-active" : ""}`, "data-tab": id, "aria-selected": tab === id, onclick: () => { tab = id; renderRegion(); } },
          label, n != null ? el("span", { class: "n" }, n) : null))),
      ...list);
  }

  // ---- selection -----------------------------------------------------------------------
  const isSided = (regionId) => viewer.hasSide(regions.get(regionId)?.joint);
  function select(regionId, side = null, { fromList = false } = {}) {
    if (regionId && !side && isSided(regionId)) side = selection?.region === regionId && selection.side ? selection.side : "L";
    selection = regionId ? { region: regionId, side } : null;
    viewer.selectRegion(regionId, side);
    dom.panelHome.hidden = !!selection;
    dom.panelRegion.hidden = !selection;
    dom.sideBadge.hidden = !selection;
    if (selection) {
      dom.sideBadge.textContent = `${regions.get(regionId).label}${side ? ` · ${side === "L" ? "left" : "right"}` : ""}`;
      if (dom.app.dataset.sheet === "peek") dom.app.dataset.sheet = fromList ? "half" : "half";
      dom.panelScroll.scrollTop = 0;
    } else {
      viewer.resetCamera();
    }
    rerender();
  }
  function rerender() { renderHome(); renderRegion(); }

  // ---- sheet -----------------------------------------------------------------------------
  const order = ["peek", "half", "full"];
  dom.sheetHandle.addEventListener("click", () => {
    const i = order.indexOf(dom.app.dataset.sheet);
    dom.app.dataset.sheet = order[(i + 1) % order.length];
  });
  let dragY = null;
  dom.sheetHandle.addEventListener("pointerdown", (e) => { dragY = e.clientY; });
  dom.sheetHandle.addEventListener("pointerup", (e) => {
    if (dragY == null) return;
    const dy = e.clientY - dragY; dragY = null;
    if (Math.abs(dy) < 24) return; // treated as a click
    const i = order.indexOf(dom.app.dataset.sheet);
    dom.app.dataset.sheet = order[Math.max(0, Math.min(order.length - 1, i + (dy < 0 ? 1 : -1)))];
    e.preventDefault();
  });

  renderGroupChips();
  renderPositionSelect();
  rerender();
  return { select, getSelection: () => selection, setSheet: (s) => { dom.app.dataset.sheet = s; } };
}
