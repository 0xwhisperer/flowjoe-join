// G2 · Editing for an Edit guest: the node name and notes (typed, debounced, one request id per attempt), add a node, delete a node
// (themed confirm), the guarded five-second Undo, typing signals to others, attribution, and calm notices for every refusal.
// A View guest never reaches any of this (canEdit() is false) and the owner enforces the role again on every request.
// The owner is the only authority: the page shows its own typing at once (optimistic) and the owner's answer or the live
// re-read settles it. Last arrival wins: nothing here merges text.
import {$, $$, el, iso} from "./dom.js";
import {avatar} from "./people.js";
import {markNumber} from "./names.js";
import {confirmDialog} from "./confirm.js";
import {quoted, richToast, settleToast} from "./toast.js";
import {DEBOUNCE_MS, FINAL_REFUSALS, MAX_RETRIES, RETRY_MS, UNDO_WINDOW_MS, classifyOpAnswer, classifyUndoAnswer, creditVerb, quoteOf, refusalCopy, relativeTime, undoCopy} from "./editlogic.js";

const keyOf = (nodeId, field) => `${nodeId}\u0000${field}`;
const serverValue = (node, field) => (field === "name" ? node.name : node.notes || "");
const FIELD_SEL = {name: ".enum-image-unit .image-title", notes: "textarea.image-notes"};
const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

// hooks: {renderAll, reread, select, endNow, sendPresence}
export function createEditor({S, api, hooks}) {
  const drafts = new Map(); // key -> {nodeId, nodeName, field, value, base, sent, reqId, reqFor, timer, inflight, retries}
  const lastSent = new Map(); // key -> {value, at}: what I last got accepted, to notice when someone replaces it
  let incoming = []; // change events from the last live answer, judged after the re-read
  let typingUntil = 0;
  let typingField = "notes";
  let typingTimer = null;
  let undoOffer = null; // {n, timer}
  let rateToast = null;
  let justEditedTimer = null;
  let unansweredAdd = null; // {parentId, reqId} of an add that got no answer
  let adding = false; // one add at a time: a double-click must not make two nodes
  let tick = null;
  S.credits = S.credits || new Map(); // nodeId -> {name, mark, kind, field, at, self}

  const ownerLabel = () => (S.ownerName ? iso(S.ownerName) : "the owner");
  const canEdit = () => S.role === "edit" && !S.offline && !S.paused;
  const selfRef = () => (S.presence.find((e) => e.self) || {}).ref || null;
  const nodeLabel = (node) => (node ? iso(node.name) : "this node");

  // ---- typing signal (throttled: one send when typing starts, a heartbeat every 2 s while it continues) ----------------
  function noteTyping(field) {
    typingField = field;
    const was = Date.now() < typingUntil;
    typingUntil = Date.now() + 3000;
    if (!was) hooks.sendPresence();
    if (!typingTimer) {
      typingTimer = setInterval(() => {
        if (Date.now() < typingUntil) hooks.sendPresence();
        else {
          clearInterval(typingTimer);
          typingTimer = null;
          hooks.sendPresence();
        }
      }, 2000);
    }
  }
  function stopTyping() {
    typingUntil = 0;
    clearInterval(typingTimer);
    typingTimer = null;
  }
  const typing = () => (canEdit() && S.selectedId && Date.now() < typingUntil ? {nodeId: S.selectedId, field: typingField} : null);

  // ---- fields -----------------------------------------------------------------------------------------------------------
  function fieldOf(target) {
    if (!(target instanceof HTMLElement)) return null;
    if (target.classList.contains("image-title") && target.closest(".enum-image-unit")) return "name";
    if (target instanceof HTMLTextAreaElement && target.classList.contains("image-notes")) return "notes";
    return null;
  }

  function onInput(e) {
    const field = fieldOf(e.target);
    if (!field || e.target.readOnly || !canEdit()) return;
    const node = S.byId.get(S.selectedId);
    if (!node || node.locked) return;
    const key = keyOf(node.id, field);
    let d = drafts.get(key);
    if (!d) {
      d = {nodeId: node.id, nodeName: node.name, field, value: "", base: serverValue(node, field), sent: null, reqId: null, reqFor: null, timer: null, inflight: false, retries: 0};
      drafts.set(key, d);
    }
    d.value = e.target.value;
    d.retries = 0;
    if (field === "notes") e.target.dataset.dirty = "1";
    clearTimeout(d.timer);
    d.timer = setTimeout(() => flush(key), DEBOUNCE_MS[field]);
    noteTyping(field);
  }

  function onFocusOut(e) {
    const field = fieldOf(e.target);
    if (!field) return;
    const node = S.byId.get(S.selectedId);
    const d = node && drafts.get(keyOf(node.id, field));
    if (d && !d.inflight) flush(keyOf(node.id, field)); // leaving the field sends it now instead of waiting out the debounce
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && fieldOf(e.target) === "name") {
      e.preventDefault();
      e.target.blur();
    }
  }

  function clearDirty(d) {
    if (d.field !== "notes") return;
    const ta = $("textarea.image-notes");
    if (ta && ta.dataset.nodeId === d.nodeId) delete ta.dataset.dirty;
  }

  function dropDraft(key) {
    const d = drafts.get(key);
    if (!d) return;
    clearTimeout(d.timer);
    clearDirty(d);
    drafts.delete(key);
  }

  async function flush(key) {
    const d = drafts.get(key);
    if (!d) return;
    clearTimeout(d.timer);
    d.timer = null;
    if (!canEdit()) return;
    if (d.inflight) {
      d.again = true;
      return;
    }
    const node = S.byId.get(d.nodeId);
    if (!node) return dropDraft(key);
    const current = serverValue(node, d.field);
    if (d.value === current || (d.field === "name" && !d.value.trim())) {
      // nothing to send (back to the original, or an empty name, which a node cannot have): show what the owner holds
      dropDraft(key);
      if (d.nodeId === S.selectedId) hooks.renderAll();
      return;
    }
    d.inflight = true;
    d.sent = d.value;
    if (d.reqFor !== d.sent) {
      d.reqId = newRequestId(); // a retry of the SAME text keeps its id (idempotent); new text is a new request
      d.reqFor = d.sent;
    }
    const sentAt = Date.now();
    let r;
    try {
      r = await api.op({op: "edit", nodeId: d.nodeId, fields: {[d.field]: d.sent}}, d.reqId);
    } catch (_) {
      // No answer at all. Retry the SAME request (same id, so a first attempt that did land is not applied twice), a few times;
      // if the live loop meanwhile finds the owner offline, the draft is dropped there with its notice. Out of retries: say so.
      d.inflight = false;
      await refused("unavailable", {op: "edit", node, key, d});
      return;
    }
    d.inflight = false;
    const c = classifyOpAnswer(r.status, r.json);
    if (!drafts.has(key)) return; // dropped meanwhile (offline, deleted, role change)
    if (c.kind === "ok") {
      node[d.field] = d.sent;
      lastSent.set(key, {value: d.sent, at: Date.now()});
      credit({self: true, name: "you", kind: "edit", field: d.field}, node.id);
      if (d.field === "name") patchName(node.id, d.sent);
      offerUndo({changeId: r.json.changeId, kind: "edit", node, field: d.field, before: current, after: d.sent, sentAt, parts: d.parts});
      d.parts = null;
      d.base = d.sent;
      d.retries = 0;
      if (d.value !== d.sent || d.again) {
        d.again = false;
        d.timer = setTimeout(() => flush(key), DEBOUNCE_MS[d.field]); // typed more while it was in flight
      } else dropDraft(key);
      renderAttribution();
      return;
    }
    await refused(c.kind, {op: "edit", node, key, d});
  }

  // A refusal or failure of one write. Final refusals revert the card to what the owner holds (never leave unsaved text looking saved).
  async function refused(kind, {op, node, key, d}) {
    if (kind === "ended") return hooks.endNow();
    const text = d ? d.value : "";
    if (kind === "rate_limited" || kind === "unavailable") {
      if (d && d.retries < (kind === "rate_limited" ? MAX_RETRIES : 3)) {
        d.retries++;
        d.timer = setTimeout(() => flush(key), RETRY_MS);
        if (kind === "rate_limited" && !(rateToast && rateToast.isConnected)) rateToast = notice("info", "fas fa-clock", refusalCopy("rate_limited"));
        return;
      }
      if (d) d.retries = 0;
      return void notice("warning", "fas fa-triangle-exclamation", refusalCopy(kind, {op, node: nodeLabel(node), owner: ownerLabel()}), text);
    }
    notice("warning", "fas fa-triangle-exclamation", refusalCopy(kind, {op, node: nodeLabel(node), owner: ownerLabel()}), text);
    if (key) dropDraft(key);
    if (kind === "role_changed") for (const k of [...drafts.keys()]) dropDraft(k);
    await hooks.reread(); // learn the new role / the owner's current text; the card shows it
  }

  // A calm notice; when a person's own text was affected it is shown under the explanation, so it is never silently lost.
  function notice(kind, iconCls, copy, quote) {
    const subs = [copy.sub, quote && quote.trim() ? `"${quoteOf(quote)}"` : ""].filter(Boolean);
    return richToast(kind, iconCls, [copy.title], subs, {ttlMs: 12000});
  }

  // ---- in-place patches (the card is NOT rebuilt while someone types in it) --------------------------------------------
  function patchName(nodeId, name) {
    for (const li of $$("#tree li[data-node-id]")) {
      if (li.dataset.nodeId !== nodeId) continue;
      const t = li.querySelector(":scope > .flex-container .node-text");
      if (t) t.textContent = name;
    }
    if (S.selectedId === nodeId) {
      const cur = $(".breadcrumb-current-node");
      if (cur) {
        cur.textContent = name;
        cur.setAttribute("title", name);
      }
    }
  }

  // ---- attribution ------------------------------------------------------------------------------------------------------
  function credit(who, nodeId) {
    S.credits.set(nodeId, {...who, at: Date.now()});
  }

  function renderAttribution() {
    for (const e of $$(".cx-attrib")) e.remove();
    const unit = $(".enum-image-unit");
    if (!unit) return;
    const c = S.credits.get(S.selectedId);
    unit.classList.toggle("cx-just-edited", !!(c && c.self && Date.now() - c.at < UNDO_WINDOW_MS));
    const col = $(".image-notes-column", unit);
    if (!c || !col) return;
    const row = el("div", {cls: "cx-attrib", attrs: {"data-attrib": c.self ? "self" : "other"}});
    row.appendChild(avatar(c.self ? "You" : c.name, {mark: c.mark || 1, size: "xs", plain: true}));
    const span = el("span");
    span.appendChild(document.createTextNode(`${creditVerb(c.kind, c.field)} by `));
    span.appendChild(el("b", {text: (c.self ? "you" : c.name) + (c.viaJoe ? " via Joe" : ""), attrs: {dir: "auto"}}));
    span.appendChild(document.createTextNode(` · ${relativeTime(c.at)}`));
    row.appendChild(span);
    col.after(row);
    clearTimeout(justEditedTimer); // one timer, however many times the card is redrawn
    if (c.self) justEditedTimer = setTimeout(() => $(".enum-image-unit")?.classList.remove("cx-just-edited"), Math.max(0, UNDO_WINDOW_MS - (Date.now() - c.at)));
  }

  // G5: a change this guest approved from Joe's proposal card is credited to them, "via Joe", exactly like a typed edit.
  function creditOwn(nodeId, {kind, field, viaJoe = false}) {
    const me = S.presence.find((e) => e.self);
    credit({self: true, name: me ? me.name : "You", mark: me ? markNumber(me.avatar) : 1, kind, field, viaJoe}, nodeId);
    renderAttribution();
  }

  // Called with the change events of a live answer (before the page re-reads the Flow).
  function onChanges(changes) {
    if (!Array.isArray(changes)) return;
    const me = selfRef();
    for (const ch of changes) {
      if (!ch || typeof ch.nodeId !== "string" || !ch.by || typeof ch.by !== "object") continue;
      if (me && ch.by.ref === me) continue; // my own change: already credited when it was accepted
      if (ch.kind === "delete") continue;
      const owner = ch.by.owner === true;
      const entry = owner ? null : S.presence.find((e) => e.ref === ch.by.ref);
      const name = owner ? S.ownerName || "the owner" : typeof ch.by.name === "string" ? ch.by.name : "Someone";
      credit({self: false, name, mark: owner ? 8 : entry ? markNumber(entry.avatar) : 1, kind: ch.kind, viaJoe: ch.by.viaJoe === true}, ch.nodeId); // viaJoe: the person approved a change Joe proposed
      incoming.push({nodeId: ch.nodeId, name});
    }
  }

  // ---- after every render of the Flow view ------------------------------------------------------------------------------
  function captureFocus() {
    const a = document.activeElement;
    const field = a && fieldOf(a);
    return field ? {field, nodeId: S.selectedId, start: a.selectionStart, end: a.selectionEnd} : null;
  }

  function afterRender(focus) {
    const unit = $(".enum-image-unit");
    for (const [key, d] of [...drafts]) {
      const node = S.byId.get(d.nodeId);
      if (!node) {
        // the node I was typing in was deleted by someone: nothing to save into
        notice("warning", "fas fa-keyboard", {title: `${iso(d.nodeName)} was deleted while you were typing in it`, sub: "What you typed wasn't saved."}, d.value);
        dropDraft(key);
        continue;
      }
      if (d.nodeId === S.selectedId && unit) {
        const f = $(FIELD_SEL[d.field], unit);
        if (f && !f.readOnly && f.value !== d.value) f.value = d.value; // my unsent text outranks a re-read
        if (f && d.field === "notes") f.dataset.dirty = "1";
      }
      const sv = serverValue(node, d.field);
      if (sv !== d.base && sv !== d.value && sv !== d.sent) {
        // someone else changed this field while I was typing in it: say so; my text still goes out and replaces theirs
        const who = incoming.filter((x) => x.nodeId === d.nodeId).pop();
        notice("info", "fas fa-arrows-left-right", {title: `${who ? iso(who.name) : "Someone"} changed ${nodeLabel(node)} while you were typing`, sub: "When your edit is sent it replaces theirs. Last change wins."});
        d.base = sv;
      }
    }
    // my accepted edit was replaced by someone else's: tell me what happened to my text
    for (const x of incoming) {
      const node = S.byId.get(x.nodeId);
      if (!node) continue;
      for (const field of ["name", "notes"]) {
        const key = keyOf(x.nodeId, field);
        const ls = lastSent.get(key);
        if (ls && Date.now() - ls.at < 120000 && !drafts.has(key) && serverValue(node, field) !== ls.value) {
          lastSent.delete(key);
          notice("warning", "fas fa-arrows-left-right", {title: `${iso(x.name)}'s change replaced yours on ${nodeLabel(node)}`, sub: "They saved after you, so theirs is what everyone sees. Yours was:"}, ls.value);
        }
      }
    }
    incoming = [];
    renderAttribution();
    if (focus && focus.nodeId === S.selectedId) {
      const f = $(FIELD_SEL[focus.field]);
      if (f && !f.readOnly) {
        f.focus({preventScroll: true});
        try {
          f.setSelectionRange(focus.start, focus.end);
        } catch (_) {
          /* not a text field */
        }
      }
    }
  }

  // G7: a corrected value or a saved transcript goes through the SAME path as typing (same request, same owner check, same credit, same guarded
  // five-second Undo); only the notice wording differs (`parts`). Resolves {ok} once the owner answered: ok means the owner now holds `text`.
  async function applyText(nodeId, field, text, {parts} = {}) {
    if (!canEdit() || (field !== "name" && field !== "notes")) return {ok: false};
    const node = S.byId.get(nodeId);
    if (!node || node.locked) return {ok: false};
    const key = keyOf(nodeId, field);
    if (text === serverValue(node, field)) return {ok: true, unchanged: true};
    let d = drafts.get(key);
    if (!d) {
      d = {nodeId, nodeName: node.name, field, value: "", base: serverValue(node, field), sent: null, reqId: null, reqFor: null, timer: null, inflight: false, retries: 0};
      drafts.set(key, d);
    }
    d.value = text;
    d.retries = 0;
    d.parts = parts || null;
    await flush(key);
    const now = S.byId.get(nodeId);
    const ok = !!now && serverValue(now, field) === text;
    if (ok && nodeId === S.selectedId) hooks.renderAll();
    return {ok};
  }

  // ---- the guarded five-second Undo -----------------------------------------------------------------------------------------
  function settleOffer(offer, text) {
    if (!offer || !offer.n.isConnected) return;
    clearTimeout(offer.timer);
    if (text) settleToast(offer.n, "info", "fas fa-check", offer.parts, `Saved. ${ownerLabel()} can still undo it from History.`);
    else offer.n.remove();
  }

  function offerUndo({changeId, kind, node, field, before, after, sentAt, parts: given}) {
    if (typeof changeId !== "string" || !changeId) return;
    if (undoOffer) settleOffer(undoOffer, true);
    const parts = given || (kind === "create" ? ["You added ", quoted(after)] : field === "name" ? ["You renamed this node to ", quoted(after)] : ["You edited the notes of ", quoted(node.name)]);
    const remaining = Math.max(0, UNDO_WINDOW_MS - (Date.now() - sentAt) - 250); // the owner's window runs from its commit, never earlier than my send
    const offer = {parts, n: null, timer: null};
    offer.n = richToast("info", "fas fa-rotate-left", parts, "Everyone in the Flow sees it now.", {
      undo: {windowMs: remaining, onUndo: () => doUndo({offer, changeId, kind, node, field, before, after})}
    });
    if (!offer.n) return;
    offer.timer = setTimeout(() => {
      if (undoOffer === offer) undoOffer = null;
      settleOffer(offer, true); // the five seconds are over: no button, just the saved line
    }, remaining);
    undoOffer = offer;
  }

  async function doUndo({offer, changeId, kind, node, field, before, after}) {
    const btn = offer.n.querySelector(".notification-undo-btn");
    if (btn) btn.disabled = true;
    clearTimeout(offer.timer);
    let r;
    try {
      r = await api.undo(changeId);
    } catch (_) {
      return settleToast(offer.n, "warning", "fas fa-triangle-exclamation", ["Undo wasn't sent"], "Couldn't reach the owner. Your edit stays.");
    }
    const c = classifyUndoAnswer(r.status, r.json);
    if (undoOffer === offer) undoOffer = null;
    if (c.kind === "ended") return hooks.endNow();
    if (c.kind === "undone") {
      lastSent.delete(keyOf(node.id, field || "name"));
      const parts = kind === "create" ? ["Undone. ", quoted(after), " was removed"] : field === "name" ? ["Undone. This node is ", quoted(before), " again"] : ["Undone. The notes of ", quoted(node.name), " are back how they were"];
      settleToast(offer.n, "info", "fas fa-check", parts, "Rolled back for everyone.");
      if (kind === "create") S.selectedId = S.parentOf.get(node.id) || null;
      await hooks.reread();
      return;
    }
    const what = kind === "create" ? "adding this node" : field === "name" ? "your rename" : "your edit";
    const copy = undoCopy(c.kind, {what, node: quoteOf(node.name)});
    settleToast(offer.n, copy.tone, copy.icon, [copy.title], copy.sub, 12000);
  }

  // ---- add / delete ---------------------------------------------------------------------------------------------------------
  async function addNode() {
    if (!canEdit() || adding) return;
    adding = true;
    try {
      await addNodeNow();
    } finally {
      adding = false;
    }
  }

  async function addNodeNow() {
    const parent = S.byId.get(S.selectedId);
    if (!parent) return;
    const name = "New node";
    const sentAt = Date.now();
    // The same add intent (same parent) retried right after a no-answer reuses its request id, so a first try that did land is not doubled.
    const reqId = unansweredAdd && unansweredAdd.parentId === parent.id ? unansweredAdd.reqId : newRequestId();
    let r;
    try {
      r = await api.op({op: "create", parentId: parent.id, name}, reqId);
    } catch (_) {
      unansweredAdd = {parentId: parent.id, reqId};
      return void notice("warning", "fas fa-plug-circle-xmark", {title: "We couldn't confirm the new node was added", sub: "Check the list before trying again. Pressing add again is safe: it won't make a second one."});
    }
    unansweredAdd = null;
    const c = classifyOpAnswer(r.status, r.json);
    if (c.kind !== "ok") return refused(c.kind, {op: "create", node: parent});
    const id = r.json.id;
    const was = S.selectedId;
    await hooks.reread();
    if (typeof id === "string" && S.byId.has(id)) {
      credit({self: true, name: "you", kind: "create"}, id);
      hooks.select(id);
      const t = $(FIELD_SEL.name);
      if (t && !t.readOnly) {
        t.focus({preventScroll: true});
        t.select();
      }
      offerUndo({changeId: r.json.changeId, kind: "create", node: S.byId.get(id), after: name, sentAt});
    } else S.selectedId = was;
  }

  async function deleteSelected() {
    if (!canEdit()) return;
    const node = S.byId.get(S.selectedId);
    if (!node) return;
    const kids = (node.children || []).length;
    const ok = await confirmDialog({
      title: `Delete ${iso(node.name)}?`,
      body: kids ? `This also deletes everything inside it (${kids} ${kids === 1 ? "node" : "nodes"} directly below). Everyone in the Flow loses it.` : "Everyone in the Flow loses it.",
      sub: `${ownerLabel()} can bring it back from History.`,
      confirmText: "Delete"
    });
    if (!ok || !canEdit() || !S.byId.has(node.id)) return;
    let r;
    try {
      r = await api.op({op: "delete", nodeId: node.id}, newRequestId());
    } catch (_) {
      return void notice("warning", "fas fa-plug-circle-xmark", {title: `Couldn't delete ${iso(node.name)}`, sub: `Couldn't reach ${ownerLabel()}. Nothing was changed.`});
    }
    const c = classifyOpAnswer(r.status, r.json);
    if (c.kind !== "ok") return refused(c.kind, {op: "delete", node});
    for (const [k, d] of [...drafts]) if (d.nodeId === node.id) dropDraft(k);
    S.selectedId = S.parentOf.get(node.id) || null;
    stopTyping();
    await hooks.reread();
    richToast("info", "fas fa-trash-alt", ["You deleted ", quoted(node.name)], `${ownerLabel()} can bring it back from History.`);
  }

  // ---- lifecycle ------------------------------------------------------------------------------------------------------------
  // Drafts that never reached the owner are dropped (never sent later). With `say`, the person is told, in the mockup's words.
  function dropDrafts({say = false} = {}) {
    const lost = [...drafts.values()].filter((d) => d.value.trim());
    for (const k of [...drafts.keys()]) dropDraft(k);
    stopTyping();
    if (say) for (const d of lost.slice(0, 2)) notice("warning", "fas fa-keyboard", {title: `What you were typing in ${iso(d.nodeName)} hadn't reached ${ownerLabel()}, so it wasn't saved`, sub: ""}, d.value);
  }

  function wire() {
    const root = $("#image-display");
    root?.addEventListener("input", onInput);
    root?.addEventListener("focusout", onFocusOut);
    root?.addEventListener("keydown", onKeyDown);
    $("#tree-add-node-btn")?.addEventListener("click", () => addNode());
    $("#tree-delete-node-btn")?.addEventListener("click", () => deleteSelected());
    $("#tree-add-node-btn")?.setAttribute("data-tooltip", "Add a node inside the selected one");
    $("#tree-delete-node-btn")?.setAttribute("data-tooltip", "Delete the selected node");
    clearInterval(tick);
    tick = setInterval(renderAttribution, 30000); // keeps "2 min ago" current
  }

  function dispose() {
    dropDrafts();
    clearInterval(tick);
    clearTimeout(justEditedTimer);
    clearTimeout(undoOffer && undoOffer.timer);
  }

  return {wire, typing, stopTyping, captureFocus, afterRender, onChanges, creditOwn, applyText, dropDrafts, dispose, hasDrafts: () => drafts.size > 0};
}
