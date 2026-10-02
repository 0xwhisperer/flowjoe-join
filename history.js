// G9 · History for a guest: the app's own History view (the rail's History item; real .activity-* markup and classes), read-only.
// It lists who changed what in the SHARED area, newest first, grouped by day. The owner's address decides what a guest may see: every
// entry was in this guest's scope when it happened AND is still in scope now (a node that leaves the share disappears), a deletion is a
// node-less "a node was removed", and an owner change shows only as the owner. This page adds nothing to that and never stores it.
// A guest gets no Restore, Undo or restore-point control here (the owner has those); the header says so in a quiet line.
// Everything from the owner's address is written with textContent; names sit in dir="auto" elements and inside bidi isolates.
import {$, el, iso} from "./dom.js";
import {avatar} from "./people.js";
import {markNumber, suggestedMark} from "./names.js";
import {relativeTime} from "./editlogic.js";
import {describe} from "./historylogic.js";

const REFRESH_GAP_MS = 1500; // live changes refresh an open list at most this often (the owner also rate limits the route)
const LIMITED_RETRY_MS = 3000;
const AGO_TICK_MS = 30000;
const OWNER_MARK = 8; // the same mark the people card gives the owner

const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
function dayLabel(at, now) {
  if (dayKey(at) === dayKey(now)) return "Today";
  if (dayKey(at) === dayKey(now - 86400000)) return "Yesterday";
  return new Date(at).toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"});
}

// hooks: {renderAll, endNow}
export function createHistory({S, api, hooks}) {
  let isOpen = false;
  let saved = null; // {kids, title, flowActive}
  let data = null; // {entries, skew}
  let status = "idle"; // idle | loading | ok | error | limited
  let seq = 0;
  let timer = null; // trailing refresh
  let retry = null;
  let tick = null;
  let lastFetch = 0;
  let wired = false;

  const owner = () => (S.ownerName ? iso(S.ownerName) : "the owner");
  const btn = () => $("#app-rail-activity-btn");
  const disp = () => $("#image-display");

  function wire() {
    const b = btn();
    if (!b || b.dataset.gsHistory) return;
    b.dataset.gsHistory = "1";
    b.hidden = false;
    b.style.removeProperty("display"); // guestify hid every unused rail item; History is one of the guest's
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => (isOpen ? close() : open()));
    // Going back to the Flow (the Flow rail item, or any tree node) closes History, as in the app.
    $("#app-rail-flow-btn")?.addEventListener("click", () => isOpen && close());
    if (!wired) {
      wired = true;
      $("#tree")?.addEventListener("click", () => isOpen && close(), true);
    }
  }

  function open() {
    const d = disp();
    if (isOpen || !d) return;
    isOpen = true;
    const h2 = $("#selected-node-name");
    const flow = $("#app-rail-flow-btn");
    saved = {kids: [...d.childNodes], title: h2 ? [...h2.childNodes] : null, flowActive: !!flow?.classList.contains("active")};
    d.classList.add("gs-history");
    d.setAttribute("role", "region");
    d.setAttribute("aria-label", "History");
    if (h2) h2.textContent = "History";
    flow?.classList.remove("active");
    const b = btn();
    b?.classList.add("active");
    b?.setAttribute("aria-pressed", "true");
    status = "loading";
    paint();
    void load();
    clearInterval(tick);
    tick = setInterval(() => isOpen && status === "ok" && paint(), AGO_TICK_MS);
  }

  function close({render = true} = {}) {
    if (!isOpen) return;
    isOpen = false;
    data = null; // nothing is kept between openings: a list that was true a minute ago may include a node that has left the share since
    status = "idle";
    seq++; // an answer still in flight is dropped
    clearTimeout(timer);
    clearTimeout(retry);
    clearInterval(tick);
    timer = retry = tick = null;
    const d = disp();
    const h2 = $("#selected-node-name");
    if (d && saved) {
      d.classList.remove("gs-history");
      d.removeAttribute("role");
      d.removeAttribute("aria-label");
      d.replaceChildren(...saved.kids);
    }
    if (h2 && saved && saved.title) h2.replaceChildren(...saved.title);
    $("#app-rail-flow-btn")?.classList.toggle("active", !!(saved && saved.flowActive));
    const b = btn();
    b?.classList.remove("active");
    b?.setAttribute("aria-pressed", "false");
    saved = null;
    if (render) hooks.renderAll();
  }

  async function load() {
    const mine = ++seq;
    lastFetch = Date.now();
    let r;
    try {
      r = await api.history();
    } catch (_) {
      if (mine !== seq || !isOpen) return;
      status = "error";
      return paint();
    }
    if (mine !== seq || !isOpen) return;
    if (r.status === 401) return hooks.endNow();
    if (r.status === 429) {
      status = data ? "limited" : "error";
      clearTimeout(retry);
      retry = setTimeout(() => isOpen && load(), LIMITED_RETRY_MS);
      return paint();
    }
    if (r.status === 200 && r.json && r.json.ok === true && Array.isArray(r.json.entries)) {
      data = {entries: r.json.entries, skew: Number(r.json.now) - Date.now(), truncated: r.json.truncated === true};
      status = "ok";
    } else status = data ? "limited" : "error";
    paint();
  }

  // A live change was announced: refresh an open list, at most once per REFRESH_GAP_MS (the last one wins).
  function onChanges(changes) {
    if (!isOpen || !Array.isArray(changes) || !changes.length) return;
    const wait = Math.max(150, REFRESH_GAP_MS - (Date.now() - lastFetch));
    clearTimeout(timer);
    timer = setTimeout(() => isOpen && load(), wait);
  }

  // The owner told this page to re-read the Flow (scope, role or a lost event): an open list is refreshed the same way.
  const refresh = () => onChanges([true]);

  // Every full render rebuilds the gallery and the breadcrumb; while History is open it keeps the surface.
  function afterRender() {
    if (!isOpen) return;
    const d = disp();
    if (d && !d.querySelector(":scope > .activity-timeline, :scope > .activity-panel-loading, :scope > .activity-panel-error, :scope > .activity-empty")) paint();
    const h2 = $("#selected-node-name");
    if (h2 && h2.textContent !== "History") h2.textContent = "History";
  }

  // ---- drawing ----------------------------------------------------------------------------------------------------------------
  const statusBox = (cls, text, role, extra) => {
    const box = el("div", {cls, text, attrs: {role}});
    if (extra) box.appendChild(extra);
    return box;
  };

  function paint() {
    const d = disp();
    if (!d || !isOpen) return;
    if (status === "loading" && !data) return d.replaceChildren(statusBox("activity-panel-loading", "Loading history…", "status"));
    if (status === "error" && !data) {
      const again = el("button", {cls: "activity-toolbar-btn gs-hist-retry", text: "Try again", attrs: {type: "button"}});
      again.addEventListener("click", () => {
        status = "loading";
        paint();
        void load();
      });
      const box = el("div", {cls: "activity-panel-error", attrs: {role: "alert"}});
      box.appendChild(el("p", {cls: "gs-hist-msg", text: S.offline ? `${S.ownerName ? iso(S.ownerName) + "'s" : "The owner's"} FlowJoe is offline. History will load when it is back.` : "History couldn't load just now. The shared Flow is unaffected."}));
      box.appendChild(again);
      return d.replaceChildren(box);
    }
    const header = el("div", {cls: "activity-header"});
    header.appendChild(el("div", {cls: "activity-retention-note", text: `Changes to the shared area, newest first. Only ${S.ownerName ? iso(S.ownerName) : "the owner"} can undo or restore.`}));
    const kids = [header];
    if (status === "limited" || status === "error") kids.push(el("div", {cls: "gs-hist-note", text: status === "limited" ? "Refreshing too quickly. This list will update again in a moment." : "Couldn't refresh. Showing what was loaded before.", attrs: {role: "status"}}));
    const entries = data ? data.entries : [];
    if (!entries.length) {
      kids.push(statusBox("activity-empty", "No changes in the shared area yet. New changes by you, others and the owner appear here.", "status"));
      return d.replaceChildren(...kids);
    }
    const now = Date.now() + (data ? data.skew : 0);
    const tl = el("div", {cls: "activity-timeline"});
    let day = null;
    let list = null;
    for (const e of entries) {
      const label = dayLabel(e.at, now);
      if (label !== day) {
        day = label;
        const sec = el("section", {cls: "activity-day"});
        sec.appendChild(el("h4", {cls: "activity-day-label", text: label}));
        list = el("div", {cls: "activity-entries"});
        sec.appendChild(list);
        tl.appendChild(sec);
      }
      list.appendChild(row(e, now));
    }
    if (data.truncated) tl.appendChild(el("div", {cls: "gs-hist-note", text: "Older changes aren't shown here."}));
    d.replaceChildren(...kids, tl);
  }

  function row(e, now) {
    const ownerName = S.ownerName ? iso(S.ownerName) : "";
    const num = !e.owner && e.num;
    const shownName = e.owner ? ownerName || "The owner" : e.name ? iso(e.name) + (num ? ` (${num})` : "") : "Someone";
    const d = describe({...e, name: e.self ? "You" : e.name ? iso(e.name) + (num ? ` (${num})` : "") : "", title: e.title ? iso(e.title) : ""}, {ownerName});
    const entry = el("div", {cls: "activity-entry" + (e.self ? " gs-mine" : ""), attrs: {"data-actor": e.owner ? "owner" : "guest", "data-kind": e.kind}});
    const main = el("div", {cls: "activity-entry-main"});
    main.appendChild(el("div", {cls: "activity-entry-reason", text: `${d.who} ${d.verb}`, attrs: {dir: "auto"}}));
    const meta = el("div", {cls: "activity-entry-meta"});
    meta.appendChild(el("span", {cls: "activity-entry-time", text: relativeTime(e.at, now), attrs: {title: new Date(e.at).toLocaleString()}}));
    const by = el("span", {cls: "activity-entry-editor gs-act-by"});
    const mark = e.owner ? OWNER_MARK : /^mark-\d{1,2}$/.test(String(e.avatar || "")) ? markNumber(e.avatar) : suggestedMark(String(e.ref || e.name || ""));
    by.appendChild(avatar(e.owner ? S.ownerName || "Owner" : e.name || "?", {mark, size: "xs", plain: true}));
    by.appendChild(el("span", {cls: "gs-act-name", text: e.self ? "You" : shownName, attrs: {dir: "auto"}}));
    if (!e.self) by.appendChild(document.createTextNode(e.owner ? " · owner" : " · guest"));
    if (e.viaJoe && !e.self) by.appendChild(document.createTextNode(" · via Joe"));
    if (e.self && e.viaJoe) by.appendChild(document.createTextNode(" · via Joe"));
    meta.appendChild(by);
    main.appendChild(meta);
    const ul = el("ul", {cls: "activity-entry-changes"});
    ul.appendChild(el("li", {text: d.what, attrs: {dir: "auto"}}));
    main.appendChild(ul);
    entry.appendChild(main);
    return entry;
  }

  function dispose() {
    close({render: false});
    clearTimeout(timer);
    clearTimeout(retry);
    data = null;
  }

  return {wire, open, close, onChanges, refresh, afterRender, dispose, isOpen: () => isOpen};
}
