// G4 · Summaries for a guest: the Flow summary and a node's summary, in the app's own summary window (templates from the app snapshot,
// snapshot-modals.html). Read-only for every guest. What is shown is whatever the owner's address answers for THIS guest:
//   source "written": a node's own notes (the Flow summary is never sent as written text)
//   source "shared" : a summary built from the shared area only (blocks of plain text: paragraphs and a bullet list)
// Everything from the owner is written with textContent / createElement; nothing from the owner is ever parsed as live HTML.
import {$, $$, el, iso, icon} from "./dom.js";
import {relativeTime} from "./editlogic.js";

const REFRESH_DELAY_MS = 250;
const AGO_TICK_MS = 30000;
const ALLOWED = new Set(["p", "ul", "ol", "li", "strong", "b", "em", "i", "u", "br", "h1", "h2", "h3", "h4", "blockquote", "code", "pre"]);
const DROP = new Set(["script", "style", "template", "iframe", "object", "embed", "svg", "math", "noscript", "title", "head"]);
const MAX_RENDER_NODES = 4000;

let templates = null;

async function loadTemplates() {
  if (templates) return templates;
  const res = await fetch("/snapshot/snapshot-modals.html", {cache: "no-store"});
  if (!res.ok) throw new Error("snapshot-modals");
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  templates = {flow: doc.getElementById("snap-modal-flow-summary").innerHTML, node: doc.getElementById("snap-modal-node-summary").innerHTML};
  return templates;
}

// ---- rendering owner text safely ----------------------------------------------------------------------------------------------
// The app stores a summary as the editor's HTML (or as plain text). Either way the page rebuilds it from a short list of harmless
// elements with text copied by textContent: attributes, links, images, scripts, handlers and styles are never carried over.
function rebuild(from, into, budget) {
  for (const child of from.childNodes) {
    if (budget.n-- <= 0) return;
    if (child.nodeType === 3) into.appendChild(document.createTextNode(child.nodeValue));
    else if (child.nodeType === 1) {
      const name = child.localName;
      if (DROP.has(name)) continue;
      if (ALLOWED.has(name)) {
        const copy = document.createElement(name);
        rebuild(child, copy, budget);
        into.appendChild(copy);
      } else rebuild(child, into, budget);
    }
  }
}

function plainBlocks(text, into) {
  let list = null;
  for (const para of String(text).split(/\n{2,}/)) {
    const lines = para.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    const bullets = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    if (bullets) {
      list = el("ul");
      for (const l of lines) list.appendChild(el("li", {children: [el("p", {text: l.replace(/^\s*[-*•]\s+/, "")})]}));
      into.appendChild(list);
    } else into.appendChild(el("p", {text: lines.join("\n").trim(), attrs: {dir: "auto"}}));
  }
}

// format "html": the owner's address already reduced it to allowlisted elements without attributes; it is rebuilt again here anyway.
// format "text": plain text, never parsed as markup.
export function renderWritten(into, text, format) {
  into.replaceChildren();
  const s = String(text);
  if (format === "html") {
    const doc = new DOMParser().parseFromString(s, "text/html"); // an inert document: nothing in it loads or runs
    rebuild(doc.body, into, {n: MAX_RENDER_NODES});
  } else plainBlocks(s, into);
  for (const e of $$("p, li, h1, h2, h3, h4", into)) e.setAttribute("dir", "auto");
}

export function renderBlocks(into, blocks) {
  into.replaceChildren();
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (b && b.t === "p" && typeof b.text === "string") into.appendChild(el("p", {text: b.text, attrs: {dir: "auto"}}));
    else if (b && b.t === "ul" && Array.isArray(b.items)) {
      const ul = el("ul");
      for (const item of b.items) if (typeof item === "string") ul.appendChild(el("li", {children: [el("p", {text: item, attrs: {dir: "auto"}})]}));
      into.appendChild(ul);
    }
  }
}

// ---- the window --------------------------------------------------------------------------------------------------------------
// hooks: {select(id)}  (used by the breadcrumb of a node summary and the Edit-in-notes button)
export function createSummaries({S, api, hooks}) {
  let keyBound = false;
  let view = null; // {kind, nodeId, req, data, refreshing, changedName, opener, timers}

  const ownerName = () => (S.ownerName ? iso(S.ownerName) : "the owner");
  const host = () => $("#gsModalHost");
  const isOpen = () => !!view;

  function wire() {
    const fb = $("#flow-summary-btn");
    if (fb) {
      fb.setAttribute("aria-label", "Flow Summary");
      fb.setAttribute("data-cx-tooltip", "Flow Summary");
      fb.addEventListener("click", () => void open("flow", null, fb));
    }
    const nb = $("#gallery-summary-btn");
    if (nb) {
      nb.setAttribute("aria-label", "Node Summary");
      nb.setAttribute("data-cx-tooltip", "Node Summary");
      nb.addEventListener("click", () => void (S.selectedId && open("node", S.selectedId, nb)));
    }
    if (keyBound) return;
    keyBound = true;
    document.addEventListener("keydown", (e) => {
      if (view && e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });
  }

  async function open(kind, nodeId, opener) {
    if (view) close({restore: false});
    let t;
    try {
      t = await loadTemplates();
    } catch (_) {
      return;
    }
    const h = host();
    if (!h) return;
    h.innerHTML = t[kind]; // a static, trusted file from this repo
    document.body.classList.add("gs-modal-open");
    view = {kind, nodeId, req: 0, data: null, refreshing: false, changedName: "", opener: opener || null, timers: []};
    const m = $("#image-modal", h);
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-labelledby", "image-modal-heading");
    const cancel = $("#image-modal-cancel", h);
    cancel.textContent = "Close";
    cancel.setAttribute("aria-label", "Close");
    cancel.addEventListener("click", () => close());
    $("#image-modal-close", h)?.addEventListener("click", () => close());
    m.addEventListener("mousedown", (e) => {
      if (e.target === m) close();
    });
    const ed = $("#image-modal .ProseMirror", h);
    ed.setAttribute("contenteditable", "false");
    ed.setAttribute("aria-readonly", "true");
    ed.setAttribute("tabindex", "0");
    ed.replaceChildren();
    paintChrome();
    paintLoading();
    view.timers.push(setInterval(paintFooter, AGO_TICK_MS));
    setTimeout(() => cancel.focus(), 30);
    await load();
  }

  function close({restore = true} = {}) {
    if (!view) return;
    for (const t of view.timers) clearInterval(t), clearTimeout(t);
    const opener = view.opener;
    view = null;
    const h = host();
    if (h) h.replaceChildren();
    document.body.classList.remove("gs-modal-open");
    if (restore && opener && opener.isConnected) opener.focus();
  }

  // ---- fetching ----
  async function load({quiet = false} = {}) {
    if (!view) return;
    const mine = ++view.req;
    const kind = view.kind;
    const id = view.nodeId;
    let r;
    try {
      r = await (kind === "flow" ? api.flowSummary() : api.nodeSummary(id));
    } catch (_) {
      if (view && mine === view.req) paintFailure(quiet ? "stale" : "network");
      return;
    }
    if (!view || mine !== view.req) return; // a newer request or a closed window
    if (r.status === 200 && r.json && r.json.ok) {
      view.data = r.json;
      view.treeSig = treeSig();
      view.refreshing = false;
      view.failed = null;
      paintBody();
      paintFooter();
      return;
    }
    if (r.status === 429) return paintFailure(quiet ? "stale" : "busy");
    if (r.status === 401) return; // the page's own end-of-session handling takes over
    paintFailure("gone");
  }

  // ---- painting ----
  function chain() {
    const ids = [];
    for (let n = view.nodeId; n; n = S.parentOf.get(n)) ids.unshift(n);
    return ids;
  }

  function paintChrome() {
    const h = host();
    const bc = $("#summary-modal-breadcrumb", h);
    for (const e of [...bc.children]) if (!e.matches(".tooltip-wrapper")) e.remove(); // the info button stays; crumbs, separators and the source line are rebuilt
    const segs = view.kind === "flow" ? [{name: S.flowName || "Shared Flow", id: null}] : chain().map((id) => ({id, name: (S.byId.get(id) || {}).name || "Untitled"}));
    segs.forEach((s, i) => {
      if (i > 0) bc.appendChild(el("span", {cls: "gs-crumb-sep", text: ">", attrs: {"aria-hidden": "true"}}));
      if (i === segs.length - 1) bc.appendChild(el("span", {cls: "summary-breadcrumb-segment summary-breadcrumb-active", text: s.name, attrs: {dir: "auto", title: s.name}}));
      else {
        const b = el("button", {cls: "summary-breadcrumb-segment", text: s.name, attrs: {type: "button", dir: "auto", title: s.name}});
        b.addEventListener("click", () => {
          view.nodeId = s.id;
          view.data = null;
          paintChrome();
          paintLoading();
          void load();
        });
        bc.appendChild(b);
      }
    });
    const src = el("span", {cls: "gs-source"});
    src.id = "gs-summary-source";
    bc.appendChild(src);
    paintSource();
  }

  function paintSource() {
    const src = $("#gs-summary-source");
    if (!src) return;
    src.replaceChildren();
    const d = view.data;
    if (!d) return;
    if (d.source === "written")
      src.append(icon("fa-regular fa-note-sticky"), el("span", {text: "The node's notes"})); // not "Written by": an Edit guest can change them
    else src.append(icon("fa-solid fa-layer-group"), el("span", {text: "Built from the shared area"}));
  }

  function paintLoading() {
    const wrap = $("#modal-notes-wrapper", host());
    clearNote();
    wrap.classList.remove("gs-dim-text");
    const ed = $("#image-modal .ProseMirror", host());
    ed.replaceChildren(el("p", {cls: "gs-loading", children: [icon("fa-solid fa-rotate gs-spin"), document.createTextNode(" Loading the summary…")]}));
    const status = $("#summary-modal-save-status", host());
    status.replaceChildren();
    $("#summary-modal-footer-meta", host()).replaceChildren();
  }

  function clearNote() {
    for (const n of $$(".gs-scope", host())) n.remove();
  }

  function setNote({iconCls, main, small, refreshing = false, action = null}) {
    clearNote();
    const wrap = $("#modal-notes-wrapper", host());
    const note = el("div", {cls: "gs-scope" + (refreshing ? " is-refreshing" : ""), attrs: {role: "note"}});
    note.appendChild(icon(iconCls));
    const body = el("div", {cls: "gs-scope-main"});
    body.appendChild(document.createTextNode(main));
    if (small) body.appendChild(el("small", {text: small}));
    note.appendChild(body);
    if (action) note.appendChild(action);
    wrap.parentElement.insertBefore(note, wrap);
  }

  function paintBody() {
    const d = view.data;
    const ed = $("#image-modal .ProseMirror", host());
    const wrap = $("#modal-notes-wrapper", host());
    paintSource();
    if (d.source === "written") renderWritten(ed, d.text, d.format);
    else renderBlocks(ed, d.blocks);
    if (!ed.childNodes.length) ed.appendChild(el("p", {cls: "gs-empty", text: "Nothing to summarize yet."}));
    wrap.classList.toggle("gs-dim-text", view.refreshing);
    if (d.source === "shared") {
      const n = Number(d.nodes) || 0;
      const scopeWord = view.kind === "flow" ? "Summary of the shared area" : "Summary of the shared part of this node";
      if (view.refreshing) setNote({iconCls: "fa-solid fa-rotate", main: "Updating this summary for the shared area", small: view.changedName ? `${view.changedName} changed a moment ago. The text below is the previous version.` : "Something in the shared area changed a moment ago. The text below is the previous version.", refreshing: true});
      else setNote({iconCls: "fa-solid fa-layer-group", main: scopeWord, small: `Built from the ${n} shared node${n === 1 ? "" : "s"}. It isn't ${S.ownerName ? iso(S.ownerName) + "'s" : "the owner's"} own summary.`});
    } else clearNote();
  }

  function paintFooter() {
    if (!view) return;
    const h = host();
    const status = $("#summary-modal-save-status", h);
    const meta = $("#summary-modal-footer-meta", h);
    if (!status || !meta) return;
    status.replaceChildren();
    meta.replaceChildren();
    const d = view.data;
    if (d) {
      const label = view.refreshing ? "Refreshing…" : `Updated ${relativeTime(d.updatedAt)}`;
      status.appendChild(el("span", {cls: "gs-attrib", children: [icon("fa-regular fa-clock"), el("span", {text: label})]}));
    }
    // Read-only for every guest. An Edit guest changes a node's summary through the node's Notes.
    const node = view.nodeId ? S.byId.get(view.nodeId) : null;
    const canEditNotes = S.role === "edit" && view.kind === "node" && node && !node.locked && !S.offline;
    const line = el("span", {cls: "gs-readonly"});
    if (view.kind === "flow") line.append(icon("fa-solid fa-lock"), el("span", {text: d && d.source === "shared" ? "Read-only. It updates when shared content changes." : S.role === "edit" ? `Read-only here. Only ${ownerName()} can change the Flow summary.` : `You can view this Flow. Ask ${ownerName()} for edit access.`}));
    else if (d && d.source === "shared") line.append(icon("fa-solid fa-lock"), el("span", {text: "Read-only. It updates when shared content changes."}));
    else if (S.role === "edit") line.append(icon("fa-solid fa-pen"), el("span", {text: canEditNotes ? "This is the node's note. Edit it in the node's Notes." : "Read-only while this node is locked."}));
    else line.append(icon("fa-solid fa-eye"), el("span", {text: `You can view this Flow. Ask ${ownerName()} for edit access.`}));
    meta.appendChild(line);
    const group = $("#image-modal-footer-button-group", h);
    $("#gs-edit-notes", group)?.remove();
    if (canEditNotes) {
      const b = el("button", {cls: "flowjoe-modal-control-btn", text: "Edit in Notes", attrs: {id: "gs-edit-notes", type: "button"}});
      b.addEventListener("click", () => {
        const id = view.nodeId;
        close({restore: false});
        hooks.select(id);
        $("textarea.image-notes")?.focus();
      });
      group.prepend(b);
    }
  }

  function paintFailure(kind) {
    if (!view) return;
    const ed = $("#image-modal .ProseMirror", host());
    if (kind === "stale") {
      // A refresh failed: the last good text stays, said plainly; the next change tries again.
      view.refreshing = false;
      if (view.data) {
        paintBody();
        const status = $("#summary-modal-save-status", host());
        status.replaceChildren(el("span", {cls: "gs-attrib", children: [icon("fa-solid fa-plug-circle-xmark"), el("span", {text: "Couldn't refresh. Showing the last version."})]}));
      }
      return;
    }
    $("#modal-notes-wrapper", host()).classList.remove("gs-dim-text");
    ed.replaceChildren();
    clearNote();
    if (kind === "gone") {
      setNote({iconCls: "fa-regular fa-circle-question", main: "This summary isn't available.", small: "It may have been unshared or removed."});
    } else {
      const retry = el("button", {cls: "flowjoe-modal-control-btn gs-retry", text: "Try again", attrs: {type: "button"}});
      retry.addEventListener("click", () => {
        paintLoading();
        void load();
      });
      setNote({iconCls: "fa-solid fa-triangle-exclamation", main: kind === "busy" ? "Too many requests. Wait a moment, then try again." : `Couldn't reach ${ownerName()}'s FlowJoe.`, small: kind === "busy" ? "" : "Check your connection.", action: retry});
    }
    paintFooter();
  }

  // ---- live changes ----
  // Called with the change events of a live answer (already limited by the owner to what this guest may see). The summary is asked
  // for again shortly after; the owner answers from its cache unless something in the shared area really changed.
  function onChanges(changes) {
    if (!view || !view.data) return;
    if (!Array.isArray(changes) || !changes.length) return;
    const first = changes.map((c) => (c && S.byId.get(c.nodeId)) || null).find(Boolean);
    view.changedName = first ? iso(first.name) : "";
    if (view.data.source === "shared") {
      view.refreshing = true;
      paintBody();
      paintFooter();
    }
    clearTimeout(view.refreshTimer);
    view.refreshTimer = setTimeout(() => void load({quiet: true}), REFRESH_DELAY_MS);
    view.timers.push(view.refreshTimer);
  }

  // The set of nodes this guest can see: when it changes (the owner shared, hid or removed something) the summary is asked for again.
  const treeSig = () => [...S.byId.keys()].join("\u0000");

  // Every full render: the node may have left the shared area, the role may have changed.
  function onRender() {
    if (!view) return;
    if (view.data && view.treeSig !== treeSig()) {
      view.treeSig = treeSig();
      clearTimeout(view.refreshTimer);
      view.refreshTimer = setTimeout(() => void load({quiet: true}), REFRESH_DELAY_MS);
      view.timers.push(view.refreshTimer);
    }
    if (view.kind === "node" && (!view.nodeId || !S.byId.has(view.nodeId))) {
      view.data = null;
      paintFailure("gone");
      return;
    }
    paintFooter();
  }

  return {wire, onChanges, onRender, isOpen, close: () => close({restore: false}), open};
}
