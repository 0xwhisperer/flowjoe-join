// Pure rules for the Edit guest's writes: how an owner answer is understood, the plain-language copy for every refusal, and the
// attribution wording. No DOM and no network here, so tests can run it in Node.

export const DEBOUNCE_MS = {name: 700, notes: 900}; // a typed edit is sent this long after the last keystroke
export const UNDO_WINDOW_MS = 5000; // the owner's guarded Undo window (guestLive.js undoWindowMs)
export const RETRY_MS = 1500;
export const MAX_RETRIES = 6;
export const QUOTE_MAX = 140;

// A POST /flow/op answer -> what the page does about it.
export function classifyOpAnswer(status, json) {
  const err = json && typeof json === "object" ? json.error : undefined;
  if (status === 200 && json && json.ok === true) return {kind: "ok"};
  if (status === 401) return {kind: "ended"};
  if (status === 429) return {kind: "rate_limited"};
  if (status === 403 && err === "role_forbidden") return {kind: "role_changed"};
  if (status === 423) return {kind: "locked"};
  if (status === 403) return {kind: "not_allowed"};
  if (status === 409) return {kind: "not_allowed"};
  if (status === 400) return {kind: "bad_request"};
  return {kind: "unavailable"}; // 503 and anything unexpected: the owner could not take it just now
}

// A POST /flow/live/undo answer. "not_sent" reasons are generic on the wire; none names a person.
export function classifyUndoAnswer(status, json) {
  if (status === 200 && json && json.ok === true && json.undone === true) return {kind: "undone"};
  if (status === 401) return {kind: "ended"};
  if (status === 503) return {kind: "unavailable"};
  const reason = json && json.error === "not_sent" ? json.reason : null;
  if (reason === "changed_since" || reason === "expired" || reason === "locked") return {kind: reason};
  return {kind: "other"};
}

// Kinds of refusal that are final: the typed text is not saved, and the card goes back to what the owner holds.
export const FINAL_REFUSALS = new Set(["locked", "not_allowed", "bad_request", "role_changed"]);

// Copy for a refused op. `node` is the (already bidi-isolated) node label, `owner` the owner's isolated name or "the owner".
export function refusalCopy(kind, {op = "edit", node = "this node", owner = "the owner"} = {}) {
  if (kind === "rate_limited") return {title: "You're editing faster than this Flow can take", sub: "Your latest change is held here and goes through in a moment."};
  if (kind === "role_changed") return {title: "You can only view this Flow now", sub: `Ask ${owner} for edit access. Your last change wasn't saved.`};
  if (op === "create") return {title: "Couldn't add a node here", sub: "You may have reached the limit for new nodes in this Flow, or this spot isn't open to additions."};
  if (op === "delete") return kind === "locked" ? {title: `Couldn't delete ${node}`, sub: `${owner} locked it, or something inside it.`} : {title: `Couldn't delete ${node}`, sub: "It can't be deleted right now. Nothing was changed."};
  if (kind === "locked") return {title: `Couldn't save your change to ${node}`, sub: `${owner} locked it. Your change wasn't saved.`};
  if (kind === "bad_request") return {title: "That text is too long to save", sub: "Shorten it and it will go through. Nothing was changed."};
  if (kind === "unavailable") return {title: `Couldn't save your change to ${node}`, sub: `${owner}'s FlowJoe is busy. Your text is still here and hasn't been saved.`};
  return {title: `Couldn't save your change to ${node}`, sub: "This part of the Flow can't take that change right now. Nothing was changed."};
}

// Copy for Undo outcomes. The held case is the mockup's: "Undo wasn't sent ... Your edit stays."
export function undoCopy(kind, {what = "your edit", node = "this node"} = {}) {
  if (kind === "changed_since") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: `Undo wasn't sent for ${what}`, sub: "Someone changed it after you, and undoing would erase their change. Your edit stays."};
  if (kind === "expired") return {tone: "info", icon: "fas fa-clock", title: `${node} was saved`, sub: "The five seconds for Undo are over. The owner can still undo it from History."};
  if (kind === "locked") return {tone: "warning", icon: "fas fa-triangle-exclamation", title: `Undo wasn't sent for ${what}`, sub: "It is locked now. Your edit stays."};
  return {tone: "warning", icon: "fas fa-triangle-exclamation", title: `Undo wasn't sent for ${what}`, sub: "Your edit stays. The owner can still undo it from History."};
}

export const creditVerb = (kind, field) => (kind === "create" ? "Added" : kind === "move" ? "Moved" : kind === "media" ? "Media added" : field === "name" ? "Renamed" : "Edited");

export function relativeTime(at, now = Date.now()) {
  const min = Math.floor((now - at) / 60000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.floor(min / 60)} h ago`;
}

// Long typed text is shortened for a notice; the notice is plain text, so this only keeps it readable.
export const quoteOf = (text) => {
  const s = String(text).replace(/\s+/g, " ").trim();
  return s.length > QUOTE_MAX ? s.slice(0, QUOTE_MAX - 1) + "…" : s;
};
