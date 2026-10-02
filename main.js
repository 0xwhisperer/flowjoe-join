// G0/T4b-1 guest page controller: boot -> (resume | pre-check -> entry dialog -> join) -> read-only live Flow view.
import {$, iso} from "./dom.js";
import {createApi} from "./api.js";
import {readAndClearFragment} from "./fragment.js";
import {loadRemembered, saveRemembered, forgetRemembered} from "./store.js";
import {markId, messageFor} from "./names.js";
import {createEntry} from "./entry.js";
import {createScreens} from "./screens.js";
import {DEFAULT_THEME, applyRoleLocks, applyTheme, clearFlowView, guestify, indexFlow, loadSnapshot, mountApp, prepareChrome, renderBreadcrumb, renderCard, renderChrome, renderTree, wireTooltips} from "./flowview.js";
import {fitPresence, renderPresence, wirePresenceDismissal} from "./people.js";
import {startLive} from "./live.js";
import {ownerBaseAllowed, refuseWhenFramed, isFramed} from "./mode.js";
import {clearToasts, toast} from "./toast.js";
import {createMedia} from "./media.js"; // G3: media slots, preview, playback (hooks below are the only places main.js knows about it)
import {createEditor} from "./edit.js"; // G2: editing for an Edit guest (hooks below are the only places main.js knows about it)
import {createSummaries} from "./summaries.js"; // G4: Flow summary and node summary (hooks marked G4 below)
import {createHistory} from "./history.js"; // G9: History view (hooks marked G9 below)
import {createJoe} from "./joe.js"; // G5: Joe for a guest (the joe lines below are the only places main.js knows about it)

const S = {
  hint: "",
  role: "view",
  ownerName: "",
  flowName: "",
  themeId: DEFAULT_THEME,
  roots: [],
  byId: new Map(),
  parentOf: new Map(),
  selectedId: null,
  presence: [],
  firstSeen: new Map(),
  offline: false,
  paused: false,
  sessionStart: Date.now(),
  presenceHost: null,
  lastSynced: Date.now()
};

let config = {owners: {}, retryMs: 15000, pollWaitMs: 20000, requestTimeoutMs: 15000, pollGraceMs: 10000};
let api = null;
let token = null; // the invitation secret: memory only
const nonce = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + String(Date.now())).replaceAll("-", "") + "00000000";
let live = null;
let mounted = false;
let ended = false;
let editor = null;
let summaries = null; // G4
let media = null;
let historyView = null; // G9
let joe = null; // G5
let offlineTick = null;
let screens = null;
let entry = null;
const info = () => ({ownerName: S.ownerName, flowName: S.flowName, remembered: !!loadRemembered()});

// ---- Flow view ------------------------------------------------------------------------------------------------------
function setFlow(json) {
  S.roots = Array.isArray(json.roots) ? json.roots : [];
  const idx = indexFlow(S.roots);
  S.byId = idx.byId;
  S.parentOf = idx.parentOf;
  if (!S.selectedId || !S.byId.has(S.selectedId)) S.selectedId = S.roots.length ? S.roots[0].id : null;
  if (typeof json.ownerName === "string") S.ownerName = json.ownerName;
  if (typeof json.flowName === "string") S.flowName = json.flowName;
  if (typeof json.theme === "string") S.themeId = applyTheme(json.theme);
  S.role = json.role === "edit" ? "edit" : "view";
}

function renderAll() {
  const focus = editor.captureFocus(); // an edit render must not steal the caret from a field being typed in
  renderTree(S, select);
  renderBreadcrumb(S);
  renderCard(S);
  media.sync(); // G3: the selected node's media cards (kept across renders so playback is never rebuilt)
  renderChrome(S);
  applyRoleLocks(S); // every render (after the card is rebuilt), so a role change in either direction re-locks or unlocks the controls
  fitPresence(S);
  editor.afterRender(focus);
  summaries.onRender(); // G4
  historyView.afterRender(); // G9
  if (joe) joe.sync(); // G5: the Joe panel follows role / offline changes
}

function select(id) {
  if (!S.byId.has(id) || id === S.selectedId) return;
  S.selectedId = id;
  editor.stopTyping();
  renderAll();
  sendPresence();
}

async function reread() {
  let r;
  try {
    r = await api.readFlow();
  } catch (_) {
    return "network";
  }
  if (r.status === 401) {
    endNow();
    return "ended";
  }
  if (r.status === 200 && r.json && r.json.ok) {
    api.setCsrf(r.json.csrfToken);
    setFlow(r.json);
    renderAll();
    media.refresh(); // G3: the owner may have added, removed or hidden a slot
    historyView.refresh(); // G9: a scope change or a lost event can drop entries from an open History list
  }
  return "ok";
}

async function enterFlow(json) {
  setFlow(json);
  api.setCsrf(json.csrfToken);
  mountApp();
  if (!mounted) {
    wireTooltips();
    wirePresenceDismissal();
    mounted = true;
  }
  guestify(S);
  S.themeId = applyTheme(typeof json.theme === "string" ? json.theme : S.themeId);
  entry.hide();
  screens.hideAll();
  renderAll();
  editor.wire();
  summaries.wire(); // G4
  media.wireHeaderPlayer(); // G3
  media.refresh();
  historyView.wire(); // G9
  joe.mount(); // G5: builds the Joe panel and shows its rail button only when Joe is on for this share
  live = startLive({api, waitMs: config.pollWaitMs, graceMs: Number(config.pollGraceMs) > 0 ? Number(config.pollGraceMs) : 10000, retryMs: config.retryMs, hooks: {onAlive: () => (S.lastSynced = Date.now()), onNetworkFailure, onOnline, onPresence, onReread: reread, onEnded: endNow, onSuperseded}});
  sendPresence();
}

// ---- presence / typing -------------------------------------------------------------------------------------------------
const currentTyping = () => editor.typing();

async function sendPresence(opts = {}) {
  if (ended || S.offline || S.paused || !api) return;
  try {
    const r = await api.presence({nodeId: S.selectedId, typing: currentTyping()}, opts);
    if (r.status === 401) endNow();
    else if (r.status === 403 && r.json && r.json.error === "role_forbidden") reread(); // the owner changed this guest's access: learn the new role
  } catch (_) {
    /* the poll loop owns connection state */
  }
}

// ---- connection state ------------------------------------------------------------------------------------------------
function onPresence(list) {
  S.presence = Array.isArray(list) ? list : [];
  renderPresence(S);
  fitPresence(S);
}

function onNetworkFailure() {
  if (S.offline || ended) return;
  S.offline = true;
  clearInterval(offlineTick);
  offlineTick = setInterval(() => renderChrome(S), 15000); // keeps "last synced N min ago" current while offline
  S.presence = S.presence.map((e) => ({...e, typing: null})); // nothing from before the drop is replayed
  editor.dropDrafts({say: true}); // unsent typing is dropped, never sent later, and the person is told what was lost
  toast("error", "fas fa-plug-circle-xmark", `${S.ownerName ? iso(S.ownerName) + "'s" : "The owner's"} FlowJoe went offline`, "You can keep reading. Editing is paused, and this page reconnects on its own.");
  renderAll();
  media.setOffline(); // G3: players that were loading or playing stop and say why
}

function onOnline(answer) {
  if (answer && Array.isArray(answer.changes)) editor.onChanges(answer.changes); // attribution + "your change was replaced" notices
  if (answer && Array.isArray(answer.changes)) summaries.onChanges(answer.changes); // G4: an open summary asks for its refresh
  if (answer && Array.isArray(answer.changes)) historyView.onChanges(answer.changes); // G9: an open History list refreshes
  const role = answer && answer.role === "edit" ? "edit" : answer && answer.role === "view" ? "view" : null;
  const roleChanged = role !== null && role !== S.role;
  if (roleChanged) S.role = role;
  if (roleChanged && role === "view") editor.dropDrafts(); // a View guest's unsent text never goes out
  if (S.offline) {
    S.offline = false;
    clearInterval(offlineTick);
    clearToasts();
    media.refresh(); // G3: a fresh index; stopped players resume only on "Try again" (a new request)
    toast("info", "fas fa-plug-circle-check", `${S.ownerName ? iso(S.ownerName) + "'s" : "The owner's"} FlowJoe is back`, "You're live again.");
    renderAll();
  } else if (roleChanged) {
    renderAll();
  }
}

function onSuperseded() {
  S.paused = true;
  editor.dropDrafts();
  toast("info", "fas fa-clone", "This Flow is open in another tab", "This tab stopped updating. Reload it to take over again.");
  renderAll();
}

// The session is dead (a 401: revoked or expired): what this browser remembered is cleared at once, so a reload does not keep
// knocking on a closed door. (The HttpOnly session cookie cannot be cleared by the page.)
function endDefinitively() {
  forgetRemembered();
  screens.showEnded(info());
}

// A pre-check or join 404 ("unavailable") is about the LINK that was opened, not about any session this browser holds: it ends only
// this screen and forgets nothing (a stale link opened in a second tab must not wipe a live guest's record).
function endLink() {
  screens.showEnded(info());
}

function endNow() {
  if (ended) return;
  ended = true;
  forgetRemembered();
  if (live) live.stop();
  editor.dispose();
  summaries.close(); // G4
  media.dispose(); // G3: playback stops, in-memory pictures are released
  historyView.dispose(); // G9
  joe.dispose(); // G5
  clearInterval(offlineTick);
  clearToasts();
  S.roots = [];
  S.byId = new Map();
  S.presence = [];
  clearFlowView();
  screens.showEnded({ownerName: S.ownerName, flowName: S.flowName});
}

// ---- entry -----------------------------------------------------------------------------------------------------------
async function doJoin({name, mark}) {
  let r;
  try {
    r = await api.join({token, avatar: markId(mark), joinNonce: nonce, guestName: name});
  } catch (_) {
    return {retryText: "Couldn't reach the owner. Check your connection and press Join again."};
  }
  const j = r.json || {};
  if (j.ok === true) {
    saveRemembered({hint: S.hint, name, mark});
    api.setCsrf(j.csrfToken);
    token = null;
    let f;
    try {
      f = await api.readFlow();
    } catch (_) {
      screens.showUnavailable(info());
      return {};
    }
    if (f.status === 200 && f.json && f.json.ok) await enterFlow(f.json);
    else screens.showUnavailable(info());
    return {};
  }
  if (j.status === "invalid_name") return {refusal: messageFor(j.reason)};
  if (j.status === "name_unavailable") return {refusal: messageFor("name_unavailable")};
  if (r.status === 404 && j.ok === false && j.status === "unavailable") {
    endLink();
    return {};
  }
  return {retryText: "Something went wrong joining. Press Join to try again."};
}

async function begin() {
  const remembered = loadRemembered();
  try {
    // No fragment (a reload, or a retry after a join): the session cookie is the proof, so try the session read FIRST; whether
    // this browser could keep a remembered record (storage may be blocked) decides nothing. Only a 401 is a definitive end.
    if (!token) {
      const r = await api.readFlow();
      if (r.status === 200 && r.json && r.json.ok) return await enterFlow(r.json);
      if (r.status === 401) return endDefinitively();
      return screens.showUnavailable(info());
    }
    const pc = await api.precheck(token);
    const j = pc.json || {};
    if (pc.status === 200 && j.ok === true) {
      S.ownerName = typeof j.ownerName === "string" ? j.ownerName : S.ownerName;
      S.flowName = typeof j.flowName === "string" ? j.flowName : S.flowName;
      if (typeof j.theme === "string") S.themeId = applyTheme(j.theme);
      screens.hideAll();
      entry.show({invitedName: j.displayName, role: j.role, scope: j.scope, ownerName: S.ownerName, flowName: S.flowName, remembered});
      return;
    }
    // Only the owner's uniform "unavailable" (404 with its JSON shape) means the invitation ended. Anything else (5xx, 429, 403
    // origin_forbidden, a non-JSON answer) is an unclear failure: the unavailable card, with its retry.
    if (pc.status === 404 && j.ok === false && j.status === "unavailable") return endLink();
    return screens.showUnavailable(info());
  } catch (e) {
    if (e && e.network) return screens.showUnavailable(info());
    throw e;
  }
}

async function main() {
  if (refuseWhenFramed && isFramed(window)) return; // before the fragment is read and before any request
  const frag = readAndClearFragment(window); // FIRST: the secret leaves the address bar before anything is awaited
  try {
    const res = await fetch("/config.json", {cache: "no-store"});
    config = {...config, ...(await res.json())};
  } catch (_) {
    /* defaults */
  }
  const remembered = loadRemembered();
  S.hint = (frag && frag.hint) || (remembered && remembered.hint) || "";
  token = frag ? frag.token : null;
  await loadSnapshot();
  prepareChrome();
  applyTheme(DEFAULT_THEME);
  entry = createEntry({onJoin: doJoin});
  screens = createScreens({
    retryMs: config.retryMs,
    onRetry: () => begin(),
    onForget: () => forgetRemembered()
  });
  const base = Object.hasOwn(config.owners || {}, S.hint) ? config.owners[S.hint] : null;
  if (!base || !ownerBaseAllowed(base)) return screens.showEnded(info());
  api = createApi(base, {timeoutMs: Number(config.requestTimeoutMs) > 0 ? Number(config.requestTimeoutMs) : 15000});
  editor = createEditor({S, api, hooks: {renderAll, reread, select, endNow, sendPresence}});
  summaries = createSummaries({S, api, hooks: {select}}); // G4
  media = createMedia({S, api, hooks: {endNow, aiState: () => ({enabled: joe ? (joe.isEnabled() ? true : false) : null}), changed: () => joe && joe.mediaChanged()}}); // G7: the preview's dimmed AI buttons read Joe's state; the Transcribe tab follows the media list
  historyView = createHistory({S, api, hooks: {renderAll, endNow}}); // G9
  joe = createJoe({S, api, media, hooks: {reread, endNow, creditOwn: (nodeId, info) => editor.creditOwn(nodeId, info), applyText: (nodeId, field, text, opts) => editor.applyText(nodeId, field, text, opts)}}); // G5, G7
  addEventListener("pagehide", () => {
    if (api && !ended && mounted) api.presence({leave: true}, {keepalive: true}).catch(() => {});
  });
  let t = null;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (mounted && !ended) {
        fitPresence(S);
        media.layout(); // G3: the grid starts below the notes card, whose height can change with the window
      }
    }, 120);
  });
  await begin();
}

main();
