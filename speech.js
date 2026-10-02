// G7 · Spelling, Transcribe and dictation for an Edit guest (mockup states 6a-6c). The Spelling and Transcribe tabs are the app's own panels (its markup and
// stylesheets are already loaded); every guest-, owner- or model-supplied string is written with textContent, never as HTML. Nothing here writes to the Flow by
// itself: a correction (or a transcript) is a SUGGESTION until the guest presses Accept / Save, and then it goes through the ordinary edit path
// (hooks.applyText), so it is credited to the guest, live for everyone, with the five-second Undo. The model runs on the owner's computer on the owner's key.
import {el, icon, iso} from "./dom.js";
import {quoted, richToast} from "./toast.js";
import {MAX_AUDIO_BYTES, MAX_RECORD_SECONDS, MAX_TEXT_CHARS, TRANSCRIBE_TIMEOUT_MS, appendTranscript, checkedValue, classifyAnswer, clock, hasChanges, micErrorCopy, pickRecorderType, refusalCopy, secondsWord, sendableAudioType, wordDiff} from "./speechlogic.js";

const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const CHUNK = 1024 * 1024; // the owner serves at most 1 MiB per media request
const mb = (n) => `${(n / (1024 * 1024)).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB`;

// hooks: {endNow, applyText(nodeId, field, text, {parts}) -> {ok}, nodeId() -> the node Joe is looking at (or null), refreshJoe()}
export function createSpeech({S, api, media, hooks}) {
  const ui = {spell: {}, trans: {}, composer: {}};
  let blocked = null; // null = usable; otherwise the reason text shown on the panels
  let alive = true;
  const owner = () => (S.ownerName ? iso(S.ownerName) : "the owner");
  const ownerPlain = () => (S.ownerName ? S.ownerName : "The owner");
  const nodeOf = () => S.byId.get(hooks.nodeId());

  // a countdown the guest can see and a screen reader hears ONCE (the live region is set at the start and at the end, not every second)
  function countdown(seconds, {onStart, onTick, onDone}) {
    let left = seconds;
    onStart(left);
    const t = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(t);
        onDone();
      } else onTick(left);
    }, 1000);
    return () => clearInterval(t);
  }

  function note(id, iconCls, nodes) {
    const n = el("div", {cls: "gs-joe-note", attrs: {id}});
    n.appendChild(icon(iconCls));
    const span = el("span");
    span.append(...nodes);
    n.appendChild(span);
    return n;
  }
  const bold = (t) => el("b", {text: t, attrs: {dir: "auto"}});
  // the answers every request can get that are not about its own content: the page's end-of-session handling, Joe switched off, role changed
  function commonAnswer(kind) {
    if (kind === "ended") {
      hooks.endNow();
      return true;
    }
    if (kind === "off" || kind === "role") hooks.refreshJoe();
    return false;
  }

  // ====================================================================== Spelling tab
  const sp = {phase: "action", field: "notes", nodeId: null, base: "", edited: false, requestId: null, reqKey: "", busy: false, cancelCooldown: null, diffText: ""};
  function buildSpell(parent) {
    const panel = el("div", {attrs: {id: "spell-check-panel"}});
    const pref = el("div", {cls: "gs-speech-intro"});
    pref.appendChild(note("gsSpellNote", "fa-solid fa-circle-info", [document.createTextNode("Runs on "), bold(S.ownerName ? `${S.ownerName}'s` : "the owner's"), document.createTextNode(" AI account (OpenAI), like chat. Accept changes the notes or title for everyone, credited to you.")]));
    panel.appendChild(pref);

    // action phase: the text to check
    const action = el("div", {attrs: {id: "ai-spell-check-phase-action"}});
    const wrap = el("div", {attrs: {id: "ai-spell-check-preview-wrap"}});
    const fieldRow = el("label", {cls: "ai-generate-option ai-transcribe-option gs-spell-field"});
    fieldRow.appendChild(el("span", {cls: "ai-generate-option-title", text: "Check"}));
    const fieldSel = el("select", {cls: "form-control", attrs: {id: "gs-spell-field", "aria-label": "What to check"}});
    fieldSel.append(el("option", {text: "Notes", attrs: {value: "notes"}}), el("option", {text: "Title", attrs: {value: "name"}}));
    fieldRow.appendChild(fieldSel);
    wrap.appendChild(fieldRow);
    const target = el("p", {cls: "ai-spell-check-label", attrs: {id: "gs-spell-target"}});
    wrap.appendChild(target);
    const preview = el("textarea", {attrs: {id: "ai-spell-check-preview", placeholder: "Your text will appear here...", spellcheck: "true", maxlength: String(MAX_TEXT_CHARS), "aria-label": "Text to check", dir: "auto"}});
    wrap.appendChild(preview);
    action.appendChild(wrap);
    const foot = el("div", {attrs: {id: "ai-spell-check-action-footer"}});
    const left = el("div", {cls: "ai-spell-check-action-footer-left"});
    const err = el("div", {attrs: {id: "ai-spell-check-error", role: "status", "aria-live": "polite"}});
    err.hidden = true;
    left.appendChild(err);
    const actions = el("div", {attrs: {id: "ai-spell-check-actions"}});
    const go = el("button", {cls: "btn confirm-button", text: "Check", attrs: {id: "ai-spell-check-go", type: "button"}});
    const cancel = el("button", {cls: "btn cancel-button", text: "Cancel", attrs: {id: "ai-spell-check-cancel", type: "button"}});
    actions.append(go, cancel);
    foot.append(left, actions);
    action.appendChild(foot);

    // loading
    const loading = el("div", {attrs: {id: "ai-spell-check-loading", role: "status"}});
    loading.append(el("div", {cls: "ai-spell-check-spinner"}), el("p", {text: "Joe AI is checking spelling & grammar..."}));
    loading.hidden = true;

    // review phase: before / after, then the guest's own tweaks, then Accept
    const review = el("div", {attrs: {id: "ai-spell-check-phase-review"}});
    const head = el("div", {cls: "ai-spell-check-review-header"});
    head.append(el("span", {cls: "ai-spell-check-label", text: "Review corrected text"}), el("span", {cls: "ai-spell-check-response-badge", text: "AI Response"}));
    const diff = el("div", {cls: "ai-spell-check-diff", attrs: {id: "ai-spell-check-diff", role: "group", "aria-label": "Changes, removed and added words", dir: "auto"}});
    const tweaksHead = el("div", {cls: "ai-spell-check-tweaks-header"});
    tweaksHead.appendChild(el("p", {cls: "ai-spell-check-label ai-spell-check-tweaks-label", text: "My Tweaks"}));
    const resultWrap = el("div", {attrs: {id: "ai-spell-check-result-wrap"}});
    const result = el("textarea", {attrs: {id: "ai-spell-check-result", placeholder: "Corrected text will appear here...", spellcheck: "true", maxlength: String(MAX_TEXT_CHARS), "aria-label": "Corrected text, editable", dir: "auto"}});
    resultWrap.appendChild(result);
    const rfoot = el("div", {cls: "ai-spell-check-review-footer"});
    const rleft = el("div", {cls: "ai-spell-check-action-footer-left"});
    const rerr = el("div", {attrs: {id: "gs-spell-review-error", role: "status", "aria-live": "polite"}});
    rerr.hidden = true;
    rleft.appendChild(rerr);
    const ractions = el("div", {attrs: {id: "ai-spell-check-review-actions"}});
    const accept = el("button", {cls: "btn confirm-button", text: "Accept", attrs: {id: "ai-spell-check-accept", type: "button"}});
    const retry = el("button", {cls: "btn", text: "Try Again", attrs: {id: "ai-spell-check-retry", type: "button"}});
    const reject = el("button", {cls: "btn cancel-button", text: "Cancel", attrs: {id: "ai-spell-check-reject", type: "button"}});
    ractions.append(accept, retry, reject);
    rfoot.append(rleft, ractions);
    review.append(head, diff, tweaksHead, resultWrap, rfoot);
    review.hidden = true;

    panel.append(action, loading, review);
    parent.appendChild(panel);
    Object.assign(ui.spell, {panel, action, loading, review, fieldSel, target, preview, err, go, cancel, diff, result, accept, retry, reject, rerr});

    fieldSel.addEventListener("change", () => {
      sp.field = fieldSel.value;
      sp.edited = false;
      loadPreview(true);
    });
    preview.addEventListener("input", () => {
      sp.edited = true;
    });
    go.addEventListener("click", () => void check(false));
    cancel.addEventListener("click", () => {
      sp.edited = false;
      loadPreview(true);
      setSpellPhase("action");
      setSpellError("");
    });
    accept.addEventListener("click", () => void acceptCorrection());
    retry.addEventListener("click", () => void check(true));
    reject.addEventListener("click", () => {
      setSpellPhase("action");
      setSpellError("");
    });
    return panel;
  }

  const fieldValue = (node, field) => (field === "name" ? node.name : node.notes || "");
  function setSpellPhase(phase) {
    sp.phase = phase;
    ui.spell.action.hidden = phase !== "action";
    ui.spell.loading.hidden = phase !== "loading";
    ui.spell.review.hidden = phase !== "review";
    if (phase === "review") ui.spell.result.focus({preventScroll: true});
  }
  function setSpellError(text, {tone = "error"} = {}) {
    for (const e of [ui.spell.err, ui.spell.rerr]) {
      if (!e) continue;
      e.textContent = text;
      e.hidden = !text;
      e.setAttribute("data-state", tone);
    }
  }
  // Fills the preview from the node Joe is looking at, unless the guest has already changed the preview text (then a node change is announced, not applied).
  function loadPreview(force) {
    if (!ui.spell.panel) return;
    if (sp.phase !== "action" && !force) return; // a check in flight or under review keeps the text it was started with
    const node = nodeOf();
    const id = node ? node.id : null;
    ui.spell.target.textContent = node ? `${sp.field === "name" ? "Title" : "Notes"} of “${node.name}”` : "Choose a node to check";
    if (node && (force || sp.nodeId !== id || !sp.edited)) {
      if (sp.nodeId !== id) sp.edited = false;
      ui.spell.preview.value = fieldValue(node, sp.field);
      sp.base = fieldValue(node, sp.field); // what the owner held when the guest started: Accept refuses if it is no longer that
      sp.nodeId = id;
    }
    if (!node) sp.nodeId = null;
    renderSpellControls();
  }
  function renderSpellControls() {
    const off = !!blocked || sp.busy || !!sp.cancelCooldown;
    const node = nodeOf();
    ui.spell.go.disabled = off || !node || !ui.spell.preview.value.trim() || !!node.locked;
    ui.spell.preview.readOnly = !!blocked;
    ui.spell.retry.disabled = off;
    ui.spell.accept.disabled = !!blocked || sp.busy;
    if (blocked) setSpellError(blocked, {tone: "info"});
    else if (node && node.locked) {
      sp.lockedMsg = true;
      setSpellError(`${ownerPlain()} locked this node, so its text can't be changed.`, {tone: "info"});
    } else if (sp.lockedMsg) {
      sp.lockedMsg = false; // the lock notice goes away with the lock; any other notice stays until the next action
      setSpellError("");
    }
  }

  async function check(again) {
    if (blocked || sp.busy || sp.cancelCooldown) return;
    const node = nodeOf();
    if (!node || node.locked) return;
    const field = sp.field;
    const text = sp.phase === "review" ? sp.sentText : ui.spell.preview.value;
    if (!String(text || "").trim()) return;
    sp.nodeId = node.id;
    const key = `${node.id}\n${field}\n${text}`;
    if (again || sp.reqKey !== key) {
      sp.requestId = newRequestId(); // the same text pressed again right after "no answer" keeps its id (a first try that landed is never charged twice)
      sp.reqKey = key;
    }
    sp.busy = true;
    sp.sentText = text;
    setSpellError("");
    setSpellPhase("loading");
    renderSpellControls();
    let r = null;
    try {
      r = await api.spell({nodeId: node.id, field, text}, sp.requestId);
    } catch (_) {
      r = null;
    }
    sp.busy = false;
    if (!alive) return;
    if (!r) {
      setSpellPhase("action");
      setSpellError(`Couldn't reach ${owner()}'s FlowJoe. Your text is still here; nothing was changed.`);
      return renderSpellControls();
    }
    const c = classifyAnswer(r.status, r.json);
    if (c.kind === "ok") {
      sp.reqKey = ""; // a finished answer is not reused for the next press
      const corrected = String(r.json.corrected || "");
      const diff = wordDiff(text, corrected);
      if (!hasChanges(diff)) {
        setSpellPhase("action");
        setSpellError("No spelling or grammar changes were needed.", {tone: "success"});
        return renderSpellControls();
      }
      renderDiff(ui.spell.diff, diff);
      ui.spell.result.value = corrected;
      setSpellPhase("review");
      return renderSpellControls();
    }
    if (commonAnswer(c.kind)) return;
    setSpellPhase("action");
    const copy = refusalCopy(c.kind, {what: "spell", owner: owner(), retryAfter: c.retryAfter});
    setSpellError(`${copy.title} ${copy.sub}`, {tone: copy.tone === "info" ? "info" : "error"});
    if (c.kind === "rate_limited") startSpellCooldown(c.retryAfter);
    renderSpellControls();
  }
  function startSpellCooldown(seconds) {
    if (sp.cancelCooldown) sp.cancelCooldown();
    sp.cancelCooldown = countdown(seconds, {
      onStart: (n) => setSpellError(`You're going quickly. You can check again in ${secondsWord(n)}.`, {tone: "info"}),
      onTick: (n) => {
        ui.spell.go.setAttribute("data-wait", String(n));
      },
      onDone: () => {
        sp.cancelCooldown = null;
        ui.spell.go.removeAttribute("data-wait");
        setSpellError("You can check again.", {tone: "info"});
        renderSpellControls();
      }
    });
  }

  async function acceptCorrection() {
    if (blocked || sp.busy) return;
    const node = S.byId.get(sp.nodeId);
    const field = sp.field;
    const surface = ui.spell.rerr;
    const fail = (t) => {
      surface.textContent = t;
      surface.hidden = !t;
      surface.setAttribute("data-state", "error");
    };
    if (!node) {
      setSpellPhase("action");
      return setSpellError("That node isn't in the Flow any more. Nothing was changed.");
    }
    const value = checkedValue(field, ui.spell.result.value);
    if (value === null) return fail(field === "name" ? "A title can't be empty." : `That text is longer than ${MAX_TEXT_CHARS} characters, so it can't be saved. Shorten it.`);
    // Someone changed this text while it was being reviewed: accepting would erase their change, so nothing is applied and the fresh text is loaded.
    if (fieldValue(node, field) !== sp.base) {
      sp.edited = false;
      loadPreview(true);
      setSpellPhase("action");
      return setSpellError(`${S.ownerName ? ownerPlain() : "Someone"} or another guest changed this text while you were reviewing. Nothing was changed. Check it again.`, {tone: "info"});
    }
    sp.busy = true;
    renderSpellControls();
    const parts = field === "name" ? ["You corrected the title to ", quoted(value)] : ["You corrected the notes of ", quoted(node.name)];
    let r;
    try {
      r = await hooks.applyText(node.id, field, value, {parts});
    } catch (_) {
      r = {ok: false};
    }
    sp.busy = false;
    if (!alive) return;
    if (r && r.ok) {
      sp.edited = false;
      loadPreview(true);
      setSpellPhase("action");
      setSpellError(r.unchanged ? "That's what the node already says." : "Applied. Everyone sees it now, credited to you.", {tone: "success"});
    } else fail("Couldn't save the correction. Nothing was changed; try Accept again.");
    renderSpellControls();
  }

  // before / after as DOM: removed words struck, added words marked. `.diff-removed` / `.diff-added` are the app's own classes; the text stays text.
  function renderDiff(box, diff) {
    box.replaceChildren();
    for (const seg of diff) {
      if (seg.type === "same") box.appendChild(document.createTextNode(seg.text));
      else box.appendChild(el("span", {cls: seg.type === "removed" ? "diff-removed" : "diff-added", text: seg.text}));
    }
  }

  // ====================================================================== Transcribe tab
  const tr = {nodeId: null, items: [], mediaId: "", busy: false, requestId: null, abort: null, result: "", cancelCooldown: null};
  function buildTranscribe(parent) {
    const panel = el("div", {attrs: {id: "transcribe-panel"}});
    const heading = el("div", {cls: "ai-transcribe-mode-heading chat-mode-header"});
    heading.appendChild(el("span", {cls: "ai-transcribe-mode-label", text: "Transcribe Audio"}));
    const grid = el("div", {cls: "ai-transcribe-grid"});
    const controls = el("div", {cls: "ai-transcribe-controls"});
    const sh = el("div", {cls: "ai-generate-section-header ai-transcribe-controls-header"});
    sh.appendChild(el("span", {cls: "ai-spell-check-label", text: "SOURCE"}));
    controls.appendChild(sh);

    const card = el("div", {cls: "ai-transcribe-card ai-transcribe-source-card"});
    const content = el("div", {cls: "ai-transcribe-source-content"});
    const thumb = el("div", {cls: "ai-transcribe-source-thumb-wrap"});
    const iconWrap = el("span", {cls: "ai-transcribe-source-icon", attrs: {id: "ai-transcribe-source-icon", "aria-hidden": "true"}});
    iconWrap.appendChild(icon("fas fa-wave-square"));
    thumb.appendChild(iconWrap);
    const details = el("div", {cls: "ai-transcribe-source-details"});
    const title = el("span", {cls: "ai-transcribe-source-title", text: "No audio file selected", attrs: {id: "ai-transcribe-source-title", dir: "auto"}});
    const subtitle = el("span", {cls: "ai-transcribe-source-subtitle", text: "Choose an audio item from the current node.", attrs: {id: "ai-transcribe-source-subtitle", dir: "auto"}});
    const location = el("span", {cls: "ai-transcribe-source-location", text: "Current node", attrs: {id: "ai-transcribe-source-location", dir: "auto"}});
    const meta = el("span", {cls: "ai-transcribe-source-meta", text: "Audio source required", attrs: {id: "ai-transcribe-source-meta"}});
    details.append(title, subtitle, location, meta);
    content.append(thumb, details);
    const select = el("select", {cls: "form-control ai-transcribe-source-select", attrs: {id: "ai-transcribe-source-select", "aria-label": "Audio to transcribe"}});
    const empty = el("div", {cls: "ai-transcribe-empty-state", attrs: {id: "ai-transcribe-empty-state"}});
    empty.append(icon("fas fa-volume-high"), el("span", {text: "No audio files in this node"}));
    card.append(content, select, empty);
    controls.appendChild(card);

    // Model and language are the owner's to choose (and pay for): shown, but fixed. The per-minute prices are left out for guests.
    const opts = el("div", {cls: "ai-transcribe-card ai-transcribe-options-card"});
    const grid2 = el("div", {cls: "ai-transcribe-options-grid"});
    const mkOpt = (label, id, text) => {
      const lab = el("label", {cls: "ai-generate-option ai-transcribe-option"});
      lab.appendChild(el("span", {cls: "ai-generate-option-title", text: label}));
      const s = el("select", {cls: "form-control cx-locked", attrs: {id, disabled: "", "aria-disabled": "true", "aria-label": label, "data-cx-tooltip": `${ownerPlain()} chose this for the shared Flow`}});
      s.appendChild(el("option", {text}));
      lab.appendChild(s);
      return lab;
    };
    grid2.append(mkOpt("Model", "ai-transcribe-model", "Plain text"), mkOpt("Language", "ai-transcribe-language", "Auto"));
    opts.appendChild(grid2);
    controls.appendChild(opts);
    controls.appendChild(note("gsAudioNote", "fa-solid fa-microphone", [document.createTextNode("The audio goes through "), bold(S.ownerName ? `${S.ownerName}'s` : "the owner's"), document.createTextNode(" FlowJoe to their AI provider (OpenAI) to become text. It runs on their AI account.")]));

    const footer = el("div", {attrs: {id: "ai-transcribe-footer"}});
    const progress = el("div", {cls: "ai-transcribe-progress", attrs: {id: "ai-transcribe-progress"}});
    progress.hidden = true;
    const track = el("div", {cls: "ai-transcribe-progress-track", children: [el("div", {cls: "ai-transcribe-progress-bar"})]});
    const plabel = el("span", {cls: "ai-transcribe-progress-label", attrs: {id: "ai-transcribe-progress-label"}});
    progress.append(track, plabel);
    const bottom = el("div", {cls: "ai-transcribe-bottom-row"});
    const status = el("div", {cls: "ai-transcribe-status", attrs: {id: "ai-transcribe-status", "aria-live": "polite", role: "status", "data-state": "info"}});
    const acts = el("div", {attrs: {id: "ai-transcribe-actions"}});
    const run = el("button", {cls: "btn confirm-button", text: "Transcribe", attrs: {id: "ai-transcribe-run", type: "button"}});
    acts.appendChild(run);
    bottom.append(status, acts);
    footer.append(progress, bottom);
    controls.appendChild(footer);

    const rp = el("div", {cls: "ai-transcribe-result-panel"});
    const rh = el("div", {cls: "ai-generate-section-header ai-transcribe-result-header"});
    const rmeta = el("span", {cls: "ai-generate-preview-meta", text: "Editable transcript", attrs: {id: "ai-transcribe-result-meta"}});
    rh.append(el("span", {cls: "ai-spell-check-label", text: "TRANSCRIPT"}), rmeta);
    const rcard = el("div", {cls: "ai-transcribe-result-card"});
    const result = el("textarea", {attrs: {id: "ai-transcribe-result", placeholder: "Transcript will appear here...", spellcheck: "true", "aria-label": "Transcript, editable", dir: "auto"}});
    rcard.appendChild(result);
    const rfoot = el("div", {cls: "ai-transcribe-result-footer"});
    const wc = el("span", {cls: "ai-spell-check-token-counter", attrs: {id: "ai-transcribe-word-count"}});
    const racts = el("div", {cls: "ai-transcribe-result-actions"});
    const copy = el("button", {cls: "btn", text: "Copy", attrs: {id: "ai-transcribe-copy", type: "button"}});
    const apply = el("button", {cls: "btn confirm-button", text: "Save", attrs: {id: "ai-transcribe-apply", type: "button"}});
    const cancel = el("button", {cls: "btn cancel-button", text: "Cancel", attrs: {id: "ai-transcribe-cancel", type: "button"}});
    racts.append(copy, apply, cancel);
    rfoot.append(wc, racts);
    rp.append(rh, rcard, rfoot);
    grid.append(controls, rp);
    panel.append(heading, grid);
    parent.appendChild(panel);
    Object.assign(ui.trans, {panel, title, subtitle, location, meta, select, empty, status, run, progress, plabel, result, wc, copy, apply, cancel, rmeta});

    select.addEventListener("change", () => {
      tr.mediaId = select.value;
      renderSource();
    });
    run.addEventListener("click", () => void transcribeSlot());
    result.addEventListener("input", () => {
      tr.result = result.value;
      renderTransControls();
    });
    apply.addEventListener("click", () => void saveTranscript());
    cancel.addEventListener("click", () => cancelTranscribe(true));
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(ui.trans.result.value);
        richToast("info", "fas fa-copy", ["Transcript copied"], "", {ttlMs: 4000});
      } catch (_) {
        richToast("warning", "fas fa-triangle-exclamation", ["Couldn't copy"], "Select the text and copy it yourself.", {ttlMs: 6000});
      }
    });
    return panel;
  }

  function setTransStatus(text, state = "info") {
    ui.trans.status.textContent = text;
    ui.trans.status.setAttribute("data-state", state);
  }
  function setProgress(label) {
    ui.trans.progress.hidden = !label;
    ui.trans.plabel.textContent = label || "";
  }
  const selectedItem = () => tr.items.find((i) => i.mediaId === tr.mediaId) || null;
  const typeWord = (mime) => (String(mime).split("/")[1] || "audio").replace(/^x-/, "").toUpperCase();
  // The audio the owner serves for the node Joe is looking at. Called when the tab opens, when the node changes and when the media list refreshes.
  function renderSource() {
    if (!ui.trans.panel) return;
    const node = nodeOf();
    const id = node ? node.id : null;
    if (tr.nodeId !== id) {
      cancelTranscribe(true);
      tr.nodeId = id;
    }
    tr.items = id && media ? media.audioItems(id) : [];
    if (!tr.items.some((i) => i.mediaId === tr.mediaId)) tr.mediaId = tr.items[0] ? tr.items[0].mediaId : "";
    ui.trans.select.replaceChildren();
    tr.items.forEach((i, idx) => {
      const label = String(i.title || i.name || "Audio");
      const o = el("option", {text: `${idx + 1}. ${label}${i.size ? ` (${mb(i.size)})` : ""}`, attrs: {value: i.mediaId}});
      ui.trans.select.appendChild(o);
    });
    ui.trans.select.value = tr.mediaId;
    ui.trans.select.disabled = tr.items.length < 2 || tr.busy;
    ui.trans.empty.hidden = tr.items.length > 0;
    const item = selectedItem();
    ui.trans.title.textContent = item ? String(item.title || item.name || "Audio") : "No audio file selected";
    ui.trans.subtitle.textContent = item ? "Audio in this node" : "Choose an audio item from the current node.";
    ui.trans.location.textContent = node ? node.name : "Current node";
    ui.trans.meta.textContent = item ? [typeWord(item.mime), item.size ? mb(item.size) : ""].filter(Boolean).join(" · ") : "Audio source required";
    renderTransControls();
  }
  function renderTransControls() {
    const item = selectedItem();
    const off = !!blocked || tr.busy || !!tr.cancelCooldown;
    ui.trans.run.disabled = off || !item;
    ui.trans.run.title = !item ? "Select an audio file first" : "";
    const has = !!ui.trans.result.value.trim();
    ui.trans.apply.disabled = !!blocked || tr.busy || !has;
    ui.trans.copy.disabled = !has;
    const words = ui.trans.result.value.trim() ? ui.trans.result.value.trim().split(/\s+/).length : 0;
    ui.trans.wc.textContent = has ? `${words} ${words === 1 ? "word" : "words"} • ${ui.trans.result.value.length} chars` : "";
    if (blocked) setTransStatus(blocked, "info");
  }
  function cancelTranscribe(clear) {
    if (tr.abort) tr.abort.abort();
    tr.abort = null;
    tr.busy = false;
    setProgress("");
    if (clear) {
      ui.trans.result.value = "";
      tr.result = "";
      setTransStatus("", "info");
    }
    renderTransControls();
  }

  // Reads the slot's audio through the media path the page already uses for playback (one range per request), up to the owner's size limit.
  async function readAudio(item, signal) {
    const total = Number(item.size);
    if (!Number.isFinite(total) || total <= 0) throw Object.assign(new Error("size"), {code: "failed"});
    if (total > MAX_AUDIO_BYTES) throw Object.assign(new Error("big"), {code: "too_big"});
    const parts = [];
    for (let start = 0; start < total; start += CHUNK) {
      const end = Math.min(start + CHUNK - 1, total - 1);
      const r = await api.mediaChunk(item.mediaId, start, end, signal);
      if (!r || !(r.status === 206 || r.status === 200) || !(r.bytes instanceof Uint8Array)) throw Object.assign(new Error("chunk"), {code: r && r.status === 401 ? "ended" : r && r.status === 429 ? "rate_limited" : "unavailable"});
      parts.push(r.bytes);
      setProgress(`Getting the audio • ${mb(Math.min(end + 1, total))} of ${mb(total)}`);
    }
    return new Blob(parts);
  }

  async function transcribeSlot() {
    if (blocked || tr.busy || tr.cancelCooldown) return;
    const item = selectedItem();
    const node = nodeOf();
    if (!item || !node || node.locked) return;
    const mime = sendableAudioType(item.mime);
    if (!mime) return void setTransStatus("That kind of audio can't be transcribed here.", "error");
    if (Number(item.size) > MAX_AUDIO_BYTES) return void setTransStatus(`This audio is ${mb(item.size)}. Transcribing is limited to ${mb(MAX_AUDIO_BYTES)} in a shared Flow.`, "error");
    tr.busy = true;
    tr.abort = new AbortController();
    const mine = tr.abort;
    ui.trans.result.value = "";
    tr.result = "";
    setTransStatus("Getting the audio…", "info");
    renderTransControls();
    let blob;
    try {
      blob = await readAudio(item, mine.signal);
    } catch (err) {
      return transcribeFailed(mine, err && err.code ? err.code : mine.signal.aborted ? "aborted" : "unavailable");
    }
    if (mine.signal.aborted) return transcribeFailed(mine, "aborted");
    tr.requestId = tr.requestId || newRequestId();
    setProgress(`Sending to ${owner()}'s FlowJoe • ${mb(blob.size)}`);
    setTransStatus("Transcribing…", "info");
    let r = null;
    try {
      r = await api.transcribe(new Blob([blob], {type: mime}), {nodeId: node.id, requestId: tr.requestId, mime, signal: mine.signal, timeoutMs: TRANSCRIBE_TIMEOUT_MS});
    } catch (_) {
      return transcribeFailed(mine, mine.signal.aborted ? "aborted" : "unavailable");
    }
    if (mine.signal.aborted || !alive) return transcribeFailed(mine, "aborted");
    tr.requestId = null;
    tr.busy = false;
    tr.abort = null;
    setProgress("");
    const c = classifyAnswer(r.status, r.json);
    if (c.kind === "ok") {
      const text = String(r.json.text || "");
      if (!text.trim()) {
        setTransStatus("Nothing was heard in that audio.", "info");
      } else {
        ui.trans.result.value = text;
        tr.result = text;
        setTransStatus("Transcript ready. Edit it, then Save.", "success");
        ui.trans.apply.scrollIntoView({block: "nearest"}); // the Save row is in view when the transcript lands, however short the column is
      }
      return renderTransControls();
    }
    transcribeRefused(c);
  }
  function transcribeFailed(mine, code) {
    if (tr.abort === mine) tr.abort = null;
    tr.busy = false;
    setProgress("");
    if (code === "aborted") {
      setTransStatus("", "info");
      return renderTransControls();
    }
    if (code === "ended") return void hooks.endNow();
    if (code === "too_big") setTransStatus(`This audio is longer than ${mb(MAX_AUDIO_BYTES)}, the limit in a shared Flow.`, "error");
    else if (code === "rate_limited") setTransStatus("Reading the audio is going too fast. Try again in a moment.", "info");
    else setTransStatus(`Couldn't read the audio from ${owner()}'s FlowJoe. Nothing was changed. Try again.`, "error");
    renderTransControls();
  }
  function transcribeRefused(c) {
    if (commonAnswer(c.kind)) return;
    const copy = refusalCopy(c.kind, {what: "transcribe", owner: owner(), retryAfter: c.retryAfter});
    setTransStatus(`${copy.title} ${copy.sub}`, copy.tone === "info" ? "info" : "error");
    if (c.kind === "rate_limited") {
      if (tr.cancelCooldown) tr.cancelCooldown();
      tr.cancelCooldown = countdown(c.retryAfter, {
        onStart: (n) => setTransStatus(`You're going quickly. You can transcribe again in ${secondsWord(n)}.`, "info"),
        onTick: (n) => ui.trans.run.setAttribute("data-wait", String(n)),
        onDone: () => {
          tr.cancelCooldown = null;
          ui.trans.run.removeAttribute("data-wait");
          setTransStatus("You can transcribe again.", "info");
          renderTransControls();
        }
      });
    }
    renderTransControls();
  }

  async function saveTranscript() {
    if (blocked || tr.busy) return;
    const node = nodeOf();
    if (!node) return;
    const joined = appendTranscript(node.notes, ui.trans.result.value);
    if (!joined.ok) return void setTransStatus(joined.empty ? "There's no transcript to save." : `The notes would be ${joined.over} characters over the ${MAX_TEXT_CHARS}-character limit. Shorten the transcript.`, "error");
    tr.busy = true;
    renderTransControls();
    let r;
    try {
      r = await hooks.applyText(node.id, "notes", joined.text, {parts: ["The transcript is in the notes of ", quoted(node.name)]});
    } catch (_) {
      r = {ok: false};
    }
    tr.busy = false;
    if (!alive) return;
    if (r && r.ok) {
      ui.trans.result.value = "";
      tr.result = "";
      setTransStatus("Saved to the notes. Everyone sees it now, credited to you.", "success");
    } else setTransStatus("Couldn't save the transcript. Nothing was changed; try Save again.", "error");
    renderTransControls();
  }

  // ====================================================================== composer: prompt spell check and dictation
  const dc = {state: "idle", stream: null, recorder: null, chunks: [], timer: null, startedAt: 0, ctx: null, raf: 0, mime: "", discard: false, requestId: null, abort: null, cancelCooldown: null};
  function bindComposer({area, input, spellBtn, micBtn}) {
    const strip = el("div", {cls: "gs-assist", attrs: {id: "gs-assist", role: "status", "aria-live": "polite"}});
    strip.hidden = true;
    area.after(strip);
    Object.assign(ui.composer, {area, input, spellBtn, micBtn, strip});
    spellBtn.addEventListener("click", () => void promptSpell());
    micBtn.addEventListener("click", () => void toggleDictation());
    return strip;
  }
  const locked = (b) => !b || b.classList.contains("cx-locked") || !!blocked;
  function stripShow(nodes, {tone = "info"} = {}) {
    const s = ui.composer.strip;
    const mark = tone === "error" ? "fa-solid fa-triangle-exclamation" : tone === "success" ? "fa-solid fa-check" : "";
    s.replaceChildren(...(mark ? [icon(mark + " gs-assist-icon")] : []), ...nodes); // the state is also a shape, not only a colour
    s.setAttribute("data-state", tone);
    s.hidden = false;
  }
  function stripHide() {
    if (ui.composer.strip) {
      ui.composer.strip.hidden = true;
      ui.composer.strip.replaceChildren();
    }
  }
  const stripText = (t) => el("span", {cls: "gs-assist-text", text: t, attrs: {dir: "auto"}});
  const stripBtn = (label, cls, fn) => {
    const b = el("button", {cls: `btn ${cls}`, text: label, attrs: {type: "button"}});
    b.addEventListener("click", fn);
    return b;
  };

  // -- prompt spell check: a suggestion shown as before / after, never applied until the guest says so
  let promptBusy = false;
  async function promptSpell() {
    if (locked(ui.composer.spellBtn) || promptBusy || dc.state !== "idle") return;
    const text = ui.composer.input.value.trim();
    if (!text) return stripShow([stripText("Type your message first, then check its spelling.")]);
    const node = nodeOf();
    promptBusy = true;
    ui.composer.spellBtn.setAttribute("aria-busy", "true");
    stripShow([el("span", {cls: "ai-spell-check-spinner gs-assist-spin"}), stripText("Checking your message…")]);
    let r = null;
    try {
      r = await api.spell({field: "prompt", ...(node ? {nodeId: node.id} : {}), text: ui.composer.input.value}, newRequestId());
    } catch (_) {
      r = null;
    }
    promptBusy = false;
    ui.composer.spellBtn.removeAttribute("aria-busy");
    if (!alive) return;
    if (!r) return stripShow([stripText(`Couldn't reach ${owner()}'s FlowJoe. Your message is unchanged.`)], {tone: "error"});
    const c = classifyAnswer(r.status, r.json);
    if (c.kind !== "ok") {
      if (commonAnswer(c.kind)) return;
      const copy = refusalCopy(c.kind, {what: "spell", owner: owner(), retryAfter: c.retryAfter});
      return stripShow([stripText(`${copy.title} ${copy.sub}`)], {tone: copy.tone === "info" ? "info" : "error"});
    }
    const corrected = String(r.json.corrected || "");
    const diff = wordDiff(ui.composer.input.value, corrected);
    if (!hasChanges(diff)) return stripShow([stripText("No spelling or grammar changes were needed.")], {tone: "success"});
    const box = el("div", {cls: "ai-spell-check-diff gs-assist-diff", attrs: {role: "group", "aria-label": "Suggested changes, removed and added words", dir: "auto"}});
    renderDiff(box, diff);
    const use = stripBtn("Use correction", "confirm-button", () => {
      ui.composer.input.value = corrected.slice(0, 2000);
      ui.composer.input.dispatchEvent(new Event("input", {bubbles: true}));
      stripHide();
      ui.composer.input.focus();
    });
    const keep = stripBtn("Keep mine", "cancel-button", () => {
      stripHide();
      ui.composer.input.focus();
    });
    stripShow([el("div", {cls: "gs-assist-head", children: [icon("fas fa-spell-check"), stripText("Suggested correction")]}), box, el("div", {cls: "gs-assist-actions", children: [use, keep]})]);
    use.focus({preventScroll: true});
  }

  // -- dictation: the microphone, a short recording, then the owner turns it into text that is ADDED to the draft (never sent by itself)
  function setMic(on) {
    const b = ui.composer.micBtn;
    if (!b) return;
    b.classList.toggle("is-listening", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-label", on ? "Stop dictating" : "Dictate prompt");
  }
  function releaseMic() {
    cancelAnimationFrame(dc.raf);
    clearInterval(dc.timer);
    dc.timer = null;
    if (dc.ctx) {
      try {
        dc.ctx.close();
      } catch (_) {
        /* already closed */
      }
      dc.ctx = null;
    }
    if (dc.stream) for (const t of dc.stream.getTracks()) t.stop();
    dc.stream = null;
    dc.recorder = null;
    setMic(false);
  }
  async function toggleDictation() {
    if (dc.state === "recording") return stopDictation(false);
    if (dc.state !== "idle" || promptBusy || locked(ui.composer.micBtn) || dc.cancelCooldown) return;
    const node = nodeOf();
    if (!node) return stripShow([stripText("Pick a node first, so Joe knows where you're working.")]);
    if (!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function" && typeof MediaRecorder === "function")) return micProblem("unsupported");
    const mime = pickRecorderType((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) return micProblem("unsupported");
    dc.state = "asking";
    stripShow([el("span", {cls: "ai-spell-check-spinner gs-assist-spin"}), stripText("Waiting for microphone permission…")]);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio: true});
    } catch (err) {
      dc.state = "idle";
      return micProblem(err && err.name);
    }
    if (!alive || blocked) {
      for (const t of stream.getTracks()) t.stop();
      dc.state = "idle";
      return stripHide();
    }
    dc.stream = stream;
    dc.chunks = [];
    dc.discard = false;
    dc.mime = mime.split(";")[0];
    let recorder;
    try {
      recorder = new MediaRecorder(stream, {mimeType: mime});
    } catch (_) {
      releaseMic();
      dc.state = "idle";
      return micProblem("error");
    }
    dc.recorder = recorder;
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size) dc.chunks.push(e.data);
    });
    recorder.addEventListener("stop", () => void finishDictation());
    recorder.addEventListener("error", () => stopDictation(true));
    recorder.start(1000);
    dc.state = "recording";
    dc.startedAt = Date.now();
    setMic(true);
    drawRecording();
    dc.timer = setInterval(tickRecording, 250);
    meter(stream);
  }
  function micProblem(name) {
    const c = micErrorCopy(name);
    stripShow([el("div", {cls: "gs-assist-head", children: [icon("fas fa-triangle-exclamation"), stripText(c.title)]}), stripText(c.sub)], {tone: "error"});
  }
  let timerEl = null;
  let meterEl = null;
  function drawRecording() {
    timerEl = el("span", {cls: "gs-assist-time", text: "0:00", attrs: {"aria-hidden": "true"}});
    meterEl = el("span", {cls: "gs-assist-meter", attrs: {"aria-hidden": "true"}, children: [el("span", {cls: "gs-assist-meter-fill"})]});
    const stop = stripBtn("Stop", "confirm-button", () => stopDictation(false));
    const cancel = stripBtn("Cancel", "cancel-button", () => stopDictation(true));
    stripShow([el("span", {cls: "gs-assist-dot", attrs: {"aria-hidden": "true"}}), stripText(`Recording, up to ${clock(MAX_RECORD_SECONDS)}`), timerEl, meterEl, el("div", {cls: "gs-assist-actions", children: [stop, cancel]})]);
    stop.focus({preventScroll: true});
  }
  function tickRecording() {
    const secs = (Date.now() - dc.startedAt) / 1000;
    if (timerEl) timerEl.textContent = clock(secs);
    if (secs >= MAX_RECORD_SECONDS) stopDictation(false);
  }
  // A level meter from the microphone itself (the fill's size is a CSS custom property; nothing else is written to the element's style).
  function meter(stream) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      dc.ctx = new Ctx();
      const src = dc.ctx.createMediaStreamSource(stream);
      const an = dc.ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        if (dc.state !== "recording" || !meterEl) return;
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 3);
        meterEl.style.setProperty("--gs-level", level.toFixed(2));
        dc.raf = requestAnimationFrame(loop);
      };
      dc.raf = requestAnimationFrame(loop);
    } catch (_) {
      /* no meter: the timer still shows it is recording */
    }
  }
  function stopDictation(discard) {
    if (dc.state !== "recording") return;
    dc.discard = discard;
    dc.state = "stopping";
    clearInterval(dc.timer);
    try {
      dc.recorder.stop();
    } catch (_) {
      void finishDictation();
    }
  }
  async function finishDictation() {
    if (dc.state !== "stopping") return;
    const discard = dc.discard;
    const mime = dc.mime;
    const blob = new Blob(dc.chunks, {type: mime});
    dc.chunks = [];
    releaseMic();
    if (discard || !alive) {
      dc.state = "idle";
      return stripHide();
    }
    if (blob.size < 1200) {
      dc.state = "idle";
      return stripShow([stripText("That was too short to hear. Press the microphone and try again.")]);
    }
    if (blob.size > MAX_AUDIO_BYTES) {
      dc.state = "idle";
      return stripShow([stripText(`That recording is too long. Keep it under ${clock(MAX_RECORD_SECONDS)}.`)], {tone: "error"});
    }
    const node = nodeOf();
    if (!node) {
      dc.state = "idle";
      return stripShow([stripText("Pick a node first, so Joe knows where you're working.")]);
    }
    dc.state = "sending";
    dc.abort = new AbortController();
    const mine = dc.abort;
    ui.composer.micBtn.setAttribute("aria-busy", "true");
    stripShow([el("span", {cls: "ai-spell-check-spinner gs-assist-spin"}), stripText("Turning your voice into text…"), el("div", {cls: "gs-assist-actions", children: [stripBtn("Cancel", "cancel-button", () => mine.abort())]})]);
    let r = null;
    try {
      r = await api.transcribe(blob, {nodeId: node.id, requestId: newRequestId(), mime, signal: mine.signal, timeoutMs: TRANSCRIBE_TIMEOUT_MS});
    } catch (_) {
      r = null;
    }
    dc.abort = null;
    dc.state = "idle";
    ui.composer.micBtn.removeAttribute("aria-busy");
    if (!alive) return;
    if (!r) return mine.signal.aborted ? stripHide() : stripShow([stripText(`Couldn't reach ${owner()}'s FlowJoe. Nothing was added to your message.`)], {tone: "error"});
    const c = classifyAnswer(r.status, r.json);
    if (c.kind !== "ok") {
      if (commonAnswer(c.kind)) return;
      const copy = refusalCopy(c.kind, {what: "dictate", owner: owner(), retryAfter: c.retryAfter});
      if (c.kind === "rate_limited") return startDictationCooldown(c.retryAfter);
      return stripShow([stripText(`${copy.title} ${copy.sub}`)], {tone: copy.tone === "info" ? "info" : "error"});
    }
    const text = String(r.json.text || "").trim();
    if (!text) return stripShow([stripText("Nothing was heard. Press the microphone and try again.")]);
    const input = ui.composer.input;
    const before = input.value.trimEnd();
    input.value = (before ? `${before} ` : "") + text;
    if (input.value.length > 2000) input.value = input.value.slice(0, 2000);
    input.dispatchEvent(new Event("input", {bubbles: true}));
    input.focus();
    stripShow([stripText("Added to your message. Check it, then send. Nothing was sent.")], {tone: "success"});
  }
  function startDictationCooldown(seconds) {
    if (dc.cancelCooldown) dc.cancelCooldown();
    dc.cancelCooldown = countdown(seconds, {
      onStart: (n) => stripShow([stripText(`You're going quickly. You can dictate again in ${secondsWord(n)}.`)]),
      onTick: () => {},
      onDone: () => {
        dc.cancelCooldown = null;
        stripShow([stripText("You can dictate again.")]);
      }
    });
  }

  // ====================================================================== lifecycle
  // `reason` null = usable. Called by Joe's panel whenever role, the share's Joe switch or the owner's connection changes.
  function setBlocked(reason) {
    const was = blocked;
    blocked = reason || null;
    if (blocked && !was) {
      if (dc.state === "recording") stopDictation(true);
      if (dc.state === "sending" && dc.abort) dc.abort.abort();
      cancelTranscribe(false);
      stripHide();
    }
    if (blocked !== was) {
      if (ui.spell.panel) {
        if (!blocked) setSpellError("");
        renderSpellControls();
      }
      if (ui.trans.panel) {
        if (!blocked && ui.trans.status.getAttribute("data-state") === "info") setTransStatus("", "info");
        renderTransControls();
      }
    }
  }
  // The tab was opened or the node / media list changed: refill what each panel shows.
  function refresh() {
    loadPreview(false);
    renderSource();
  }
  function dispose() {
    alive = false;
    if (dc.state === "recording") dc.discard = true;
    if (dc.abort) dc.abort.abort();
    if (tr.abort) tr.abort.abort();
    for (const c of [sp.cancelCooldown, tr.cancelCooldown, dc.cancelCooldown]) if (c) c();
    releaseMic();
  }
  return {buildSpell, buildTranscribe, bindComposer, setBlocked, refresh, dispose, isRecording: () => dc.state === "recording", isBlocked: () => !!blocked};
}
