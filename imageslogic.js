// G6b · the pure rules behind the guest's image generation (mockup states 5a-5m): how an owner answer is understood, the plain-language
// copy for every state, the numbering of history entries and the prompt list. No DOM and no network here, so tests can run it in Node.

export const UNDO_WINDOW_MS = 5000; // the owner's guarded Undo window (guestLive undoWindowMs; the same five seconds as a typed edit)
export const MAX_PROMPT_CHARS = 1000; // the owner's own limit (guestImageGen MAX_PROMPT_CHARS)
export const DEFAULT_WAIT_S = 15; // when a 429 carries no Retry-After
export const MAX_WAIT_S = 120; // a countdown longer than this is shown as "a moment" (a wrong or hostile header can't freeze the button for hours)
export const MAX_VISIBLE = 200; // the owner serves at most this many entries

// GET /flow/image-history -> what the page does with the Image Generation tab (a 403 / 404, as a host without the route or an older one answers, also means off or view).
//   on: Edit guest, switch on. view: switch on but this guest can only view (tab shown, disabled). off: no tab at all.
export function classifyHistory(status, json) {
  const err = json && typeof json === "object" ? json.error : undefined;
  // The list answers 200 for every state (as Joe's history does, so the browser never logs a failed request): {enabled:false} = off, {role:"view"} = on but view only.
  if (status === 200 && json && json.ok === true && json.enabled === false) return {kind: "off"};
  if (status === 200 && json && json.ok === true && json.role === "view") return {kind: "view"};
  if (status === 200 && json && json.ok === true && Array.isArray(json.entries)) return {kind: "on", entries: json.entries.filter(validEntry).slice(-MAX_VISIBLE), provider: providerOf(json.provider)};
  if (status === 401) return {kind: "ended"};
  if (status === 403 && err === "role_forbidden") return {kind: "view"};
  if (status === 403 || status === 404) return {kind: "off"};
  if (status === 429) return {kind: "slow"};
  return {kind: "unknown"}; // 503 and anything unexpected: keep what is shown
}

// The owner names the image provider as a short plain label ("OpenAI"); anything else is not shown.
export const providerOf = (v) => (typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9 .+-]{0,23}$/.test(v) ? v : "");

const validEntry = (e) => !!e && typeof e === "object" && typeof e.id === "string" && e.id.length > 0 && typeof e.nodeId === "string" && Number.isFinite(e.time);

// POST /flow/image-gen -> a state. `retryAfter` is the whole seconds the owner asked us to wait (0 when absent).
export function classifyGenerate(status, json, retryAfter = 0) {
  const err = json && typeof json === "object" ? json.error : undefined;
  if (status === 200 && json && json.ok === true && typeof json.id === "string" && typeof json.nodeId === "string") return {kind: "ok", id: json.id, nodeId: json.nodeId};
  if (status === 401) return {kind: "ended"};
  if (status === 403 && err === "image_gen_unavailable") return {kind: "off"};
  if (status === 403 && err === "role_forbidden") return {kind: "view"};
  if (status === 403) return {kind: "out_of_scope"};
  if (status === 423) return {kind: "locked"};
  if (status === 429 && err === "daily_cap") return {kind: "daily_cap"};
  if (status === 429) return {kind: "rate_limited", waitS: clampWait(retryAfter)};
  if (status === 503 && err === "busy") return {kind: "busy", waitS: clampWait(retryAfter, 5)};
  if (status === 503 && err === "not_applied" && json.reason === "free_space") return {kind: "free_space"};
  if (status === 502) return {kind: "failed"};
  if (status === 409) return {kind: "reused"};
  if (status === 400) return {kind: "bad_request"};
  return {kind: "unavailable"};
}

// POST /flow/image-gen/send and /undo -> a state.
export function classifyOp(status, json) {
  const err = json && typeof json === "object" ? json.error : undefined;
  if (status === 200 && json && json.ok === true && json.alreadySent === true) return {kind: "already", undoMs: Number.isFinite(json.undoMs) ? json.undoMs : null}; // an older send (or a retry whose first answer was lost): Undo only if the owner says time is left
  if (status === 200 && json && json.ok === true) return {kind: json.state === "nothing_to_undo" ? "nothing" : "ok", undoMs: Number.isFinite(json.undoMs) ? json.undoMs : null};
  if (status === 401) return {kind: "ended"};
  if (status === 409 && err === "regenerate") return {kind: "regenerate"}; // the entry is gone from the owner's history: generate it again
  if (status === 409 && err === "undo_expired") return {kind: "expired"};
  if (status === 409) return {kind: "not_allowed"};
  if (status === 403 && err === "image_gen_unavailable") return {kind: "off"};
  if (status === 403 && err === "role_forbidden") return {kind: "view"};
  if (status === 403) return {kind: "out_of_scope"};
  if (status === 423) return {kind: "locked"};
  if (status === 429) return {kind: "rate_limited"};
  return {kind: "unavailable"};
}

// How long the Undo button may stay: the owner's own window ran from when it took the picture, not from when its answer reached us. With the owner's remaining time
// (undoMs) we subtract the round trip and a margin; without it we count from the request's start with a margin that grows with the measured round trip.
export function undoRemaining({undoMs = null, rttMs = 0, elapsedMs = 0} = {}) {
  const rtt = Math.max(0, Number(rttMs) || 0);
  if (Number.isFinite(undoMs)) return Math.max(0, Math.min(UNDO_WINDOW_MS, undoMs) - rtt - 250);
  return Math.max(0, UNDO_WINDOW_MS - Math.max(0, Number(elapsedMs) || 0) - Math.max(250, rtt + 500));
}

export function clampWait(seconds, fallback = DEFAULT_WAIT_S) {
  const n = Math.ceil(Number(seconds));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, MAX_WAIT_S);
}

// The one line under the prompt (mockup 5a/5d/5e/5h/5i/5j and the calm states around them). `owner` is the already bidi-isolated owner name or "the owner".
// Returns {text, state} where state is the app's status style: "error" | "success" | "info".
export function statusCopy(kind, {owner = "the owner", waitS = 0} = {}) {
  switch (kind) {
    case "ready":
      return {text: "Joe is ready. Describe the picture and press Generate.", state: "info"};
    case "view":
      return {text: "Generating pictures needs edit access.", state: "info"};
    case "working":
      return {text: "Generating your picture. You can make one picture at a time; others can keep working.", state: "info"};
    case "done":
      return {text: "Image ready. Send it to Gallery or keep iterating.", state: "success"};
    case "sent":
      return {text: "Image sent to the gallery. You can keep iterating.", state: "success"};
    case "free_space":
      return {text: `Not applied: ${owner}'s computer is out of space, so the picture wasn't saved. Nothing changed. Ask ${owner} to free up space, then try again.`, state: "error"};
    case "failed":
      return {text: "Joe couldn't make this picture just now. Nothing changed and nothing was saved. Try again in a moment, or change the prompt.", state: "error"};
    case "offline":
      return {text: `Paused while ${owner} is offline. Nothing was generated.`, state: "error"};
    case "busy":
      return {text: `${owner}'s FlowJoe is busy right now. Your prompt is kept; you can generate again in ${waitS || 5} s.`, state: "error"};
    case "rate_limited":
      return {text: `You're generating pictures quickly. You can generate again in ${waitS || DEFAULT_WAIT_S} s.`, state: "error"};
    case "daily_cap":
      return {text: "You've used all of today's pictures in this shared Flow. Try again tomorrow. Nothing changed.", state: "error"};
    case "out_of_scope":
      return {text: "That part of the Flow isn't shared with you, so nothing was made. Pick a node from the list above.", state: "error"};
    case "locked":
      return {text: `${owner} locked that node, so nothing was made. Pick another node.`, state: "error"};
    case "off":
      return {text: `${owner} turned off picture generation for this shared Flow. Nothing was generated.`, state: "error"};
    case "network":
      return {text: `Couldn't reach ${owner}'s computer. Nothing was generated. Your prompt is kept; press Generate to try again.`, state: "error"};
    case "bad_request":
      return {text: "That prompt couldn't be used. Shorten it or change it, then try again.", state: "error"};
    case "reused":
    case "unavailable":
    default:
      return {text: `${owner}'s FlowJoe couldn't take that just now. Nothing was generated. Try again in a moment.`, state: "error"};
  }
}

// Send to Gallery / Undo: the toast for a refusal. Returns {tone, icon, title, sub}.
export function opCopy(kind, {what = "send", owner = "the owner", node = "this node"} = {}) {
  if (kind === "regenerate") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: "That picture is gone from the history", sub: "It was removed, so it can't be sent. Your prompt is back in the box: generate it again."};
  if (kind === "expired") return {tone: "info", icon: "fas fa-clock", title: "The picture was saved", sub: `The five seconds for Undo are over. ${owner} can still undo it from History.`};
  if (kind === "locked") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: what === "undo" ? "Undo wasn't sent" : `Couldn't send the picture to ${node}`, sub: what === "undo" ? "That node is locked now. The picture stays." : `${owner} locked it. Nothing changed.`};
  if (kind === "off") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: "Picture generation is off now", sub: `${owner} turned it off for this shared Flow. Nothing changed.`};
  if (kind === "view") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: "You can only view this Flow now", sub: `Ask ${owner} for edit access. Nothing changed.`};
  if (kind === "rate_limited") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: "That was a bit fast", sub: "Wait a moment and try again. Nothing changed."};
  if (kind === "out_of_scope" || kind === "not_allowed") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: what === "undo" ? "Undo wasn't sent" : `Couldn't send the picture to ${node}`, sub: "That part of the Flow can't take it right now. Nothing changed."};
  return {tone: "warning", icon: "fas fa-triangle-exclamation", title: what === "undo" ? "Undo wasn't sent" : "Couldn't send the picture", sub: `${owner}'s FlowJoe couldn't take that just now. Nothing changed. Press the button to try again.`};
}

// History entries -> numbered by time WITHIN their node, oldest = 1: "#n" is the entry's place among that node's pictures, the number the owner's drawer
// shows under its "current node" view and the owner's prompt list uses for its "Picture #n" link (guestAttribution.pictureLink), so both sides agree.
export function numberEntries(entries) {
  const seen = new Map();
  return [...entries]
    .sort((a, b) => a.time - b.time || (a.id < b.id ? -1 : 1))
    .map((e) => {
      const n = (seen.get(e.nodeId) || 0) + 1;
      seen.set(e.nodeId, n);
      return {...e, n};
    });
}

// The drawer's list: filter (all | node), search over what the guest may see (the node name, the author's name, and the prompt only on their own
// entries: a search can never reveal text of someone else's hidden prompt), sort.
export function visibleEntries(numbered, {filter = "all", nodeId = null, query = "", sort = "newest", nodeName = () => "", authorName = () => ""} = {}) {
  const q = String(query).trim().toLowerCase();
  const list = numbered.filter((e) => {
    if (filter === "node" && e.nodeId !== nodeId) return false;
    if (!q) return true;
    const hay = [nodeName(e.nodeId), authorName(e), e.mine ? e.prompt || "" : ""].join("\n").toLowerCase();
    return hay.includes(q);
  });
  return sort === "oldest" ? list : list.reverse();
}

// The prompt list (mockup 5l): only the guest's own prompts, newest first, numbered with no gaps ("Prompt 2" is the newest of two).
export function promptRows(entries) {
  const mine = entries.filter((e) => e.mine === true && typeof e.prompt === "string" && e.prompt);
  const asc = [...mine].sort((a, b) => a.time - b.time || (a.id < b.id ? -1 : 1));
  return asc.map((e, i) => ({...e, num: i + 1})).reverse();
}

// "Copy All" text for the prompt list: oldest to newest, one per paragraph.
export const copyAllText = (rows) =>
  [...rows]
    .reverse()
    .map((r) => r.prompt)
    .join("\n\n");

export function relTime(at, now = Date.now()) {
  const min = Math.floor((now - at) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

// The prompt as the owner will receive it: the page trims; the owner's side does the rest. Empty and over-long are refused here with a reason the UI shows.
export function promptProblem(text) {
  const t = String(text).trim();
  if (!t) return "empty";
  if (t.length > MAX_PROMPT_CHARS) return "too_long";
  return null;
}
