// Avatars, the presence row, hover cards, the Everyone list, tree/breadcrumb/slot presence. Markup and class names are the
// approved mockup's; every name is set with textContent.
import {$, $$, el, iso, icon} from "./dom.js";
import {initials, markNumber} from "./names.js";

const ROLE_LABEL = {owner: "Owner", edit: "Can edit", view: "Can view"};
const FIT = [
  {av: 5, compact: false},
  {av: 3, compact: false},
  {av: 3, compact: true},
  {av: 2, compact: true},
  {av: 0, compact: true}
];
let fitLevel = 0;

// opts: {mark, state, size, you, crown, plain, title}
export function avatar(name, opts = {}) {
  const state = opts.state || "active";
  const cls = ["cx-av", "st-" + state, opts.size ? "sz-" + opts.size : "", opts.you && !opts.plain ? "is-you" : ""].filter(Boolean).join(" ");
  const a = el("i", {cls, attrs: {"aria-hidden": "true"}});
  a.style.setProperty("--mk", `var(--mark-${opts.mark || 1})`);
  a.appendChild(document.createTextNode(initials(name)));
  if (!opts.plain) {
    const dot = el("i", {cls: "dot"});
    if (state === "typing") for (let i = 0; i < 3; i++) dot.appendChild(el("b"));
    a.appendChild(dot);
  }
  if (opts.crown && !opts.plain) a.appendChild(el("i", {cls: "crown fa-solid fa-crown", attrs: {"aria-hidden": "true"}}));
  if (opts.title) a.setAttribute("title", name);
  return a;
}

function minutesText(since, now) {
  const min = Math.floor((now - since) / 60000);
  return min < 1 ? "Just joined" : `Here for ${min} min`;
}

// Builds the people list the UI draws from the owner facts + the presence entries the server sent.
// Each person: {ref, name, mark, role|null, state, you, owner, nodeId, typing, since}
export function buildPeople(S) {
  const now = Date.now();
  const people = [];
  if (S.ownerName) people.push({ref: "owner", name: S.ownerName, mark: 8, role: "owner", state: S.offline ? "away" : "active", you: false, owner: true, nodeId: null, typing: null, since: S.sessionStart});
  const guests = [...S.presence].sort((a, b) => (a.self === b.self ? 0 : a.self ? -1 : 1));
  for (const e of guests) {
    if (!S.firstSeen.has(e.ref)) S.firstSeen.set(e.ref, now);
    const live = e.state === "online" && !S.offline;
    people.push({ref: e.ref, name: e.name, mark: markNumber(e.avatar), role: e.self ? S.role : e.role === "edit" || e.role === "view" ? e.role : null, state: S.offline ? (e.self ? "active" : "reconnecting") : !live ? "away" : e.typing ? "typing" : "active", you: e.self === true, owner: false, nodeId: e.nodeId, typing: e.typing, since: S.firstSeen.get(e.ref)});
  }
  const present = new Set(S.presence.map((e) => e.ref));
  for (const ref of [...S.firstSeen.keys()]) if (!present.has(ref)) S.firstSeen.delete(ref); // someone who left is "just joined" if they come back
  return people;
}

const nodeName = (S, id) => (id && S.byId.has(id) ? S.byId.get(id).name : "");

function describe(S, p) {
  return [iso(p.name) + (p.you ? " (you)" : ""), p.role ? ROLE_LABEL[p.role] : "Guest", minutesText(p.since, Date.now()), nodeName(S, p.nodeId) ? iso(nodeName(S, p.nodeId)) : ""].filter(Boolean).join(", ");
}

function statusText(S, p) {
  if (S.offline) return p.owner ? "Offline" : p.you ? "Waiting for the owner" : "Reconnecting";
  if (p.state === "away") return "Offline";
  const n = nodeName(S, p.nodeId);
  if (p.typing) return n ? `Typing in the ${p.typing.field === "name" ? "name" : "notes"} of ${iso(n)}` : "Typing";
  return n ? `Viewing ${iso(n)}` : "In the shared Flow";
}

function topbarOverflows() {
  const bar = $(".topbar"),
    brand = $(".topbar .topbar-brand-stack") || $(".topbar .logo-svg"),
    right = $("#cxPresence");
  if (!bar || !right || !brand) return false;
  const last = [...bar.querySelectorAll(".topbar-settings-group, #settings-btn, #sounds-toggle-btn")].filter((e) => e.offsetWidth).pop();
  const br = brand.getBoundingClientRect(),
    rr = right.getBoundingClientRect(),
    barR = bar.getBoundingClientRect();
  return rr.left < br.right + 12 || (last && last.getBoundingClientRect().right > barR.right + 1);
}

export function fitPresence(S) {
  fitLevel = 0;
  renderPresence(S);
  while (topbarOverflows() && fitLevel < FIT.length - 1) {
    fitLevel++;
    renderPresence(S);
  }
}

export function renderPresence(S) {
  const pinned = $(".cx-member[data-pinned]")?.dataset.ref || null;
  const panelWasOpen = $("#cxPanel") && !$("#cxPanel").hidden;
  $("#cxPresence")?.remove();
  const host = S.presenceHost || $(".topbar");
  const people = buildPeople(S);
  const wrap = el("div", {cls: "cx-presence" + (FIT[fitLevel].compact ? " is-compact" : ""), attrs: {id: "cxPresence"}});
  const livePill = S.paused ? "paused" : S.offline ? "down" : "live";
  const liveLabel = S.paused ? "Another tab" : S.offline ? "Offline" : "Live";
  const livePillEl = el("span", {cls: `cx-pill ${livePill === "paused" ? "down" : livePill}`, attrs: {id: "cxLivePill", "data-state": livePill, title: S.paused ? "This Flow is open in another tab" : S.offline ? `${S.ownerName ? iso(S.ownerName) : "The owner"}'s FlowJoe is offline` : "Connected live", "aria-label": liveLabel}});
  livePillEl.appendChild(el("i", {cls: "dotx"}));
  livePillEl.appendChild(el("span", {cls: "t", text: liveLabel}));
  const rolePill = el("span", {cls: "cx-pill", attrs: {id: "cxRolePill", "data-role": S.role, title: `Your access: ${S.role === "view" ? "can view" : "can edit"}`, "aria-label": `Your access: ${S.role === "view" ? "can view" : "can edit"}`}});
  rolePill.appendChild(el("i", {cls: `fa-solid ${S.role === "view" ? "fa-eye" : "fa-pen"}`}));
  rolePill.appendChild(el("span", {cls: "t", text: S.role === "view" ? "Can view" : "Can edit"}));
  wrap.append(livePillEl, rolePill);
  const vis = people.slice(0, FIT[fitLevel].av);
  const rest = people.length - vis.length;
  const stack = el("div", {cls: "cx-stack", attrs: {role: "group", "aria-label": "People in this shared Flow"}});
  for (const p of vis) {
    const b = el("button", {cls: "cx-member", attrs: {type: "button", "data-ref": p.ref, "aria-label": describe(S, p), "aria-expanded": "false"}});
    b.appendChild(avatar(p.name, {mark: p.mark, state: p.state, you: p.you, crown: p.owner}));
    stack.appendChild(b);
  }
  if (rest > 0) stack.appendChild(el("button", {cls: "cx-more", text: `+${rest}`, attrs: {type: "button", id: "cxMore", "aria-label": `Show everyone, ${rest} more`, "aria-expanded": "false"}}));
  wrap.appendChild(stack);
  wrap.appendChild(el("div", {cls: "cx-card", attrs: {id: "cxCard", role: "tooltip", hidden: ""}}));
  wrap.appendChild(el("div", {cls: "cx-panel", attrs: {id: "cxPanel", role: "dialog", "aria-label": "Everyone in this shared Flow", hidden: ""}}));
  host.insertBefore(wrap, host.firstChild);
  for (const b of $$(".cx-member", wrap)) {
    const p = people.find((x) => x.ref === b.dataset.ref);
    b.addEventListener("mouseenter", () => openCard(S, b, p));
    b.addEventListener("focus", () => openCard(S, b, p));
    b.addEventListener("click", () => openCard(S, b, p, true));
    b.addEventListener("mouseleave", () => {
      if (!b.dataset.pinned) closeCard();
    });
  }
  $("#cxMore")?.addEventListener("click", () => togglePanel(S));
  if (pinned) {
    const b = $$(".cx-member", wrap).find((x) => x.dataset.ref === pinned);
    if (b)
      openCard(
        S,
        b,
        people.find((x) => x.ref === pinned),
        true
      );
  }
  if (panelWasOpen) togglePanel(S, true);
  renderHere(S, people);
  renderTreeHere(S, people);
  renderTyping(S, people);
}

function openCard(S, btn, p, pin) {
  closePanel();
  for (const m of $$(".cx-member")) {
    m.setAttribute("aria-expanded", "false");
    delete m.dataset.pinned;
  }
  btn.setAttribute("aria-expanded", "true");
  if (pin) btn.dataset.pinned = "1";
  const card = $("#cxCard");
  card.replaceChildren();
  const head = el("div", {cls: "cx-head"});
  head.appendChild(avatar(p.name, {mark: p.mark, state: p.state, you: p.you, crown: p.owner, size: "lg"}));
  const who = el("div");
  const nm = el("div", {cls: "cx-name", text: p.name, attrs: {dir: "auto"}});
  if (p.you) nm.appendChild(el("span", {cls: "cx-you", text: "You"}));
  who.appendChild(nm);
  const chips = el("div", {cls: "cx-chips"});
  if (p.role) {
    const chip = el("span", {cls: `cx-chip ${p.role}`});
    chip.appendChild(icon(`fa-solid ${p.role === "owner" ? "fa-crown" : p.role === "edit" ? "fa-pen" : "fa-eye"}`));
    chip.appendChild(document.createTextNode(ROLE_LABEL[p.role]));
    chips.appendChild(chip);
  }
  if (p.owner) chips.appendChild(el("span", {cls: "cx-chip", text: "Hosts this Flow"}));
  who.appendChild(chips);
  head.appendChild(who);
  const rows = el("div", {cls: "cx-rows"});
  const row = (iconCls, content, key) => {
    const r = el("div", {cls: "cx-row", attrs: key ? {"data-row": key} : {}});
    r.appendChild(icon(iconCls));
    r.appendChild(content);
    return r;
  };
  rows.appendChild(row("fa-regular fa-clock", document.createTextNode(minutesText(p.since, Date.now())), "since"));
  const loc = el("span", {cls: "grow", text: nodeName(S, p.nodeId) || "The shared Flow", attrs: {dir: "auto"}});
  rows.appendChild(row("fa-solid fa-location-dot", loc, "where"));
  rows.appendChild(row("fa-solid fa-signal", document.createTextNode(statusText(S, p)), "status"));
  card.append(head, rows);
  card.hidden = false;
}

export function closeCard() {
  const c = $("#cxCard");
  if (c) c.hidden = true;
  for (const m of $$(".cx-member")) {
    m.setAttribute("aria-expanded", "false");
    delete m.dataset.pinned;
  }
}

function togglePanel(S, force) {
  const panel = $("#cxPanel");
  if (!panel) return;
  const open = force ?? panel.hidden;
  closeCard();
  if (!open) return closePanel();
  const people = buildPeople(S);
  panel.replaceChildren();
  const h = el("h6", {text: "Everyone here "});
  h.appendChild(el("span", {text: `${people.length} connected`}));
  panel.appendChild(h);
  const GROUPS = ["owner", "edit", "view"]; // the mockup's order: owner, then Can edit, then Can view
  const rank = (p) => (GROUPS.includes(p.role) ? GROUPS.indexOf(p.role) : GROUPS.length);
  for (const p of [...people].sort((a, b) => rank(a) - rank(b))) {
    const r = el("div", {cls: "cx-prow", attrs: {"data-ref": p.ref}});
    r.appendChild(avatar(p.name, {mark: p.mark, state: p.state, you: p.you, crown: p.owner, size: "sm"}));
    const who = el("div", {cls: "who"});
    const b = el("b", {text: p.name, attrs: {dir: "auto"}});
    if (p.you) b.appendChild(el("span", {cls: "cx-you", text: "You"}));
    who.appendChild(b);
    who.appendChild(el("small", {text: `${statusText(S, p)} · ${minutesText(p.since, Date.now())}`}));
    r.appendChild(who);
    const chip = el("span", {cls: `cx-chip ${p.role || ""}`, text: p.role ? ROLE_LABEL[p.role] : "Guest"});
    r.appendChild(chip);
    panel.appendChild(r);
  }
  panel.hidden = false;
  $("#cxMore")?.setAttribute("aria-expanded", "true");
}

export function closePanel() {
  const p = $("#cxPanel");
  if (p) p.hidden = true;
  $("#cxMore")?.setAttribute("aria-expanded", "false");
}

// Placement B: who else is on the node being viewed
function renderHere(S, people) {
  $("#cxHere")?.remove();
  const tools = $(".breadcrumbs-actions");
  const here = people.filter((p) => !p.you && !p.owner && p.nodeId && p.nodeId === S.selectedId);
  if (!tools || !here.length || S.offline) return;
  const e = el("span", {cls: "cx-here", attrs: {id: "cxHere", title: "On this node: " + here.map((p) => iso(p.name)).join(", "), "aria-label": "On this node: " + here.map((p) => iso(p.name)).join(", ")}});
  for (const p of here.slice(0, 3)) e.appendChild(avatar(p.name, {mark: p.mark, size: "sm", plain: true}));
  if (here.length > 3) e.appendChild(el("span", {text: `+${here.length - 3}`}));
  tools.insertBefore(e, tools.firstChild);
}

// Tree rows: who is where
function renderTreeHere(S, people) {
  for (const e of $$(".cx-tree-here")) e.remove();
  if (S.offline) return;
  for (const li of $$("#tree li[data-node-id]")) {
    const here = people.filter((p) => !p.you && !p.owner && p.nodeId === li.dataset.nodeId).slice(0, 3);
    if (!here.length) continue;
    const span = el("span", {cls: "cx-tree-here", attrs: {title: here.map((p) => iso(p.name)).join(", ")}});
    for (const p of here) span.appendChild(avatar(p.name, {mark: p.mark, size: "xs", plain: true}));
    const row = li.querySelector(":scope > .flex-container");
    (row.querySelector(".node-inline-meta") || row).appendChild(span);
  }
}

// Live typing: the card of the node being viewed shows who is typing (a fact, never their text)
function renderTyping(S, people) {
  for (const e of $$(".cx-typing, .cx-offline-note, .cx-slot-viewers")) e.remove();
  $$(".enum-image-unit").forEach((u) => u.classList.remove("cx-remote"));
  const unit = $(".enum-image-unit");
  if (!unit) return;
  const col = $(".image-notes-column", unit);
  if (S.offline) {
    const n = el("div", {cls: "cx-locked-note cx-offline-note"});
    n.appendChild(icon("fa-solid fa-lock"));
    n.appendChild(document.createTextNode(`Editing paused while ${S.ownerName ? iso(S.ownerName) : "the owner"} is offline`));
    col?.after(n);
    return;
  }
  // Others looking at this node: small avatars at the card's top right (the mockup's slot viewers; a person typing is shown below instead)
  const viewers = people.filter((p) => !p.you && !p.owner && p.nodeId && p.nodeId === S.selectedId && !(p.typing && p.typing.nodeId === S.selectedId));
  if (viewers.length) {
    const box = el("div", {cls: "cx-slot-viewers", attrs: {"data-slot-viewers": "1"}});
    for (const v of viewers.slice(0, 3)) box.appendChild(avatar(v.name, {mark: v.mark, size: "xs", plain: true, title: true}));
    unit.appendChild(box);
  }
  const typers = people.filter((p) => !p.you && p.typing && p.typing.nodeId === S.selectedId);
  if (!typers.length) return;
  const p = typers[0];
  unit.classList.add("cx-remote");
  unit.style.setProperty("--mk", `var(--mark-${p.mark})`);
  const t = el("div", {cls: "cx-typing", attrs: {"data-typing": "1"}});
  t.appendChild(avatar(p.name, {mark: p.mark, state: "active", size: "sm", plain: false}));
  const label = el("span");
  label.appendChild(el("b", {text: p.name, attrs: {dir: "auto"}}));
  label.appendChild(document.createTextNode(typers.length > 1 ? ` and ${typers.length - 1} more are typing` : " is typing"));
  t.appendChild(label);
  const dots = el("span", {cls: "dots", attrs: {"aria-hidden": "true"}});
  for (let i = 0; i < 3; i++) dots.appendChild(el("b"));
  t.appendChild(dots);
  col?.after(t);
}

export function wirePresenceDismissal() {
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".cx-presence")) {
      closeCard();
      closePanel();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCard();
      closePanel();
    }
  });
}
