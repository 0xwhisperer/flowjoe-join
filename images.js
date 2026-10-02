// G6b · image generation for a guest (mockup states 5a-5m): the Image Generation tab in the docked Joe panel (prompt, Generate, preview, Send to
// Gallery with the guarded five-second Undo), the slot's Image Generation History drawer, and the guest's own Prompt History. Markup and class
// names are the real app's (its stylesheets are already loaded); every owner-, guest- or model-supplied string is written with textContent.
// The picture is made on the OWNER's computer with the owner's key and lands in the owner's image history first; Send to Gallery is what
// puts it in the node. A picture is fetched as bytes into an in-memory Blob URL (img-src blob:), never as a URL the page hands to the network.
import {$, $$, el, iso, icon} from "./dom.js";
import {avatar} from "./people.js";
import {markNumber} from "./names.js";
import {richToast, settleToast, quoted} from "./toast.js";
import {quoteOf} from "./editlogic.js";
import {undoRemaining, classifyHistory, classifyGenerate, classifyOp, statusCopy, opCopy, numberEntries, visibleEntries, promptRows, copyAllText, relTime, promptProblem, MAX_PROMPT_CHARS} from "./imageslogic.js";

const MAX_THUMBS = 40;
const WIDE_COLUMN_PX = 560;
const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

// hooks: {reread, endNow, creditOwn(nodeId, {kind}), changed()}  (changed: the rail button and the live label may need to follow)
export function createImages({S, api, hooks}) {
  const st = {
    mode: null, // null = not known yet, "off" = no tab, "on" = Edit guest and the owner's switch is on, "view" = switch on but this guest can only view
    tab: "chat",
    entries: [], // what the owner served: the guest's own entries (with prompt) and others' (without)
    numbered: [],
    generating: false,
    pending: null, // {requestId, prompt, nodeId}: kept so a retry of the SAME request recovers a lost reply instead of paying twice
    result: null, // {id, nodeId, url, sent}
    status: {kind: "ready"},
    wait: null, // {kind, until, timer}
    sending: false,
    undoOffer: null,
    drawer: null, // {filter, query, sort, linkId}
    prompts: false,
    alive: true,
    offNotice: false,
    provider: "",
    loadedOnce: false
  };
  let refs = null;
  let host = null;
  const thumbs = new Map(); // id -> {url} | {gone: true}
  const thumbLoading = new Map();
  let opener = null; // the control that opened a popup, so focus goes back to it

  const owner = () => (S.ownerName ? iso(S.ownerName) : "the owner");
  const isView = () => st.mode === "view" || S.role !== "edit";
  const waiting = () => !!st.wait && st.wait.until > Date.now();
  const viewTip = () => `You can view this Flow. Ask ${owner()} for edit access`;
  const lock = (e, tip) => {
    if (!e) return;
    e.classList.add("cx-locked");
    e.setAttribute("aria-disabled", "true");
    e.setAttribute("data-cx-tooltip", tip);
  };
  const unlock = (e) => {
    if (!e) return;
    e.classList.remove("cx-locked");
    e.removeAttribute("aria-disabled");
    e.removeAttribute("data-cx-tooltip");
  };
  const isLocked = (e) => e.classList.contains("cx-locked");
  const nodeName = (id) => {
    const n = S.byId.get(id);
    return n ? quoteOf(n.name).slice(0, 60) : "this node";
  };
  const myMark = () => {
    const me = S.presence.find((e) => e.self);
    return me ? markNumber(me.avatar) : 1;
  };
  const hashMark = (name) => {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 12;
    return h + 1;
  };
  // Who made an entry: the guest's own ("You"), the owner (served without a guest name), or another guest (their name; the mark is the one they use in the
  // Flow if they are here now, else a stable pick from their name: the owner's answer carries no mark).
  function authorOf(e) {
    if (e.mine) return {name: "You", mark: myMark(), self: true};
    if (typeof e.guestName !== "string" || !e.guestName) return {name: S.ownerName || "The owner", mark: 8, owner: true};
    const p = S.presence.find((x) => !x.self && x.name === e.guestName);
    return {name: e.guestName, mark: p ? markNumber(p.avatar) : hashMark(e.guestName)};
  }
  const targetNode = () => {
    const pick = $("#ai-assist-target-node-select");
    return (pick && pick.value && S.byId.has(pick.value) ? pick.value : null) || S.selectedId;
  };

  // ---- build -------------------------------------------------------------------------------------------------------------------
  function build({tabs, tChat, chat, selector, content, panel}) {
    refs = {tabs, tChat, chat, selector, content, panel};
    const tab = el("button", {cls: "ai-mode-tab", text: "Image Generation", attrs: {type: "button", role: "tab", id: "gs-tab-images", "aria-selected": "false", "aria-controls": "generate-panel", "data-mode": "generate-images", "data-dock-label": "Images"}});
    // The tab is added to the strip only while the owner's switch is on for this share (render), so a share with pictures off has the same three tabs as before.
    tab.addEventListener("click", () => showTab("images"));
    tChat.addEventListener("click", () => showTab("chat"));
    tabs.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
      const list = [tChat, tab].filter((t) => t.isConnected);
      const i = list.indexOf(document.activeElement);
      if (i < 0 || list.length < 2) return;
      e.preventDefault();
      const next = e.key === "Home" ? list[0] : e.key === "End" ? list[list.length - 1] : list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
      showTab(next === tab ? "images" : "chat", {focus: false}); // arrow keys move between tabs: the focus stays on the tab
      next.focus();
    });
    refs.tab = tab;

    const gen = el("div", {attrs: {id: "generate-panel", role: "tabpanel", "aria-labelledby": "gs-tab-images"}});
    // heading
    const heading = el("div", {cls: "ai-generate-mode-heading chat-mode-header"});
    heading.appendChild(el("span", {cls: "ai-generate-mode-label", text: "Image Generation"}));
    const actions = el("div", {cls: "ai-generate-mode-actions ai-generate-history-actions"});
    const mkAct = (id, ic, label, tip) => {
      const b = el("button", {cls: "btn ai-chat-new-btn", attrs: {id, type: "button", title: tip, "aria-label": tip}});
      b.append(icon(ic), el("span", {text: label}));
      return b;
    };
    const bNew = mkAct("ai-generate-new", "fas fa-plus", "New", "New image");
    const bHist = mkAct("ai-generate-history", "fas fa-history", "History", "Image history");
    actions.append(bNew, bHist);
    heading.appendChild(actions);

    // controls
    const controls = el("div", {cls: "ai-generate-controls"});
    const labelRow = el("div", {cls: "ai-generate-section-header ai-generate-controls-header"});
    labelRow.appendChild(el("label", {cls: "ai-spell-check-label", text: "PROMPT", attrs: {for: "ai-generate-prompt"}}));
    controls.appendChild(labelRow);
    // model: the owner decides; the guest sees what is in use and cannot change it (same idea as Joe's brain chip)
    const pickers = el("div", {cls: "ai-generate-card ai-generate-pickers-card"});
    const opts = el("div", {cls: "ai-generate-options ai-generate-options-pickers"});
    const model = el("select", {cls: "form-control", attrs: {id: "ai-generate-model", "aria-label": "Image model"}});
    model.appendChild(el("option", {text: "Joe's image model", attrs: {value: "owner", selected: ""}}));
    model.disabled = true;
    const modelWrap = el("span", {cls: "tooltip-wrapper gs-img-model-wrap", children: [model]});
    lock(modelWrap, "Joe uses the image model the owner chose for this shared Flow.");
    const modelLabel = el("label", {cls: "ai-generate-option ai-generate-option-model", children: [el("span", {cls: "ai-generate-option-title", text: "Model"}), modelWrap]});
    opts.appendChild(modelLabel);
    pickers.appendChild(opts);
    controls.appendChild(pickers);
    // the line above Generate: whose credits, where it is saved, who it is credited to
    const note = el("div", {cls: "gs-joe-note", attrs: {id: "gsGenNote"}});
    note.appendChild(icon("fa-solid fa-coins"));
    const noteText = el("span");
    note.appendChild(noteText);
    controls.appendChild(note);
    // prompt card
    const card = el("div", {cls: "ai-generate-card ai-generate-prompt-card"});
    const prompt = el("textarea", {attrs: {id: "ai-generate-prompt", rows: "4", maxlength: String(MAX_PROMPT_CHARS), spellcheck: "true", placeholder: "Describe the image you want Joe to create...", "aria-describedby": "ai-generate-prompt-hint"}});
    const empty = el("div", {cls: "ai-generate-prompt-empty-state", attrs: {id: "ai-generate-prompt-empty-state", "aria-hidden": "true"}});
    empty.append(el("strong", {text: "Joe says:"}), document.createTextNode(' Start with the subject, action, and vibe. Try something like: "Joe at the dunes at sunrise, soft watercolor."'));
    const mkCorner = (id, cls, ic, label) => {
      const b = el("button", {cls: `ai-generate-prompt-corner-btn ${cls}`, attrs: {id, type: "button", "aria-label": label}});
      b.appendChild(icon(ic));
      return b;
    };
    const spell = mkCorner("ai-generate-prompt-spell-check", "ai-generate-prompt-spell-check-btn", "fas fa-spell-check", "Spell check image prompt");
    const dictate = mkCorner("ai-generate-prompt-dictate", "ai-generate-prompt-dictate-btn", "fas fa-microphone", "Dictate image prompt");
    const chip = mkCorner("ai-generate-prompt-history-chip", "ai-generate-prompt-history-chip", "fas fa-note-sticky", "No prompt history yet");
    chip.setAttribute("aria-haspopup", "dialog");
    const hint = el("div", {cls: "ai-generate-prompt-hint", text: "Enter to generate · Cmd/Ctrl+Enter for new line", attrs: {id: "ai-generate-prompt-hint"}});
    card.append(prompt, empty, spell, dictate, chip, hint);
    controls.appendChild(card);
    // footer
    const footer = el("div", {attrs: {id: "ai-generate-footer"}});
    const bottom = el("div", {cls: "ai-generate-bottom-row"});
    const status = el("div", {cls: "ai-generate-status", attrs: {id: "ai-generate-status", "aria-live": "polite", "data-state": "info"}});
    const submit = el("button", {cls: "btn confirm-button", text: "Generate", attrs: {id: "ai-generate-submit", type: "button"}});
    bottom.append(status, el("div", {attrs: {id: "ai-generate-actions"}, children: [submit]}));
    footer.appendChild(bottom);
    controls.appendChild(footer);

    // preview
    const previewPanel = el("div", {cls: "ai-generate-preview-panel"});
    const head = el("div", {cls: "ai-generate-section-header ai-generate-preview-header"});
    head.append(el("span", {cls: "ai-spell-check-label", text: "PREVIEW"}), el("span", {cls: "ai-generate-preview-meta", text: "", attrs: {id: "ai-generate-preview-meta"}}));
    const stage = el("div", {cls: "ai-generate-preview-stage"});
    const pcard = el("div", {cls: "ai-generate-card ai-generate-preview-card"});
    const placeholder = el("div", {cls: "ai-generate-preview-placeholder", attrs: {id: "ai-generate-preview-placeholder", "data-aspect": "1024x1024"}});
    placeholder.appendChild(el("span", {cls: "ai-generate-placeholder-text", text: "No generated image yet"}));
    const img = el("img", {attrs: {id: "ai-generate-preview-image", alt: "Generated preview", "data-aspect": "1024x1024"}});
    pcard.append(placeholder, img);
    const save = el("button", {cls: "ai-generate-save-overlay", attrs: {id: "ai-generate-save", type: "button", title: "Send to Gallery", "aria-label": "Send to Gallery"}});
    const saveLabel = el("span", {text: "Send to Gallery"});
    save.append(icon("fas fa-download"), saveLabel);
    stage.append(pcard, save);
    previewPanel.append(head, stage);

    const grid = el("div", {cls: "ai-generate-grid"});
    grid.append(controls, previewPanel);
    const sr = el("div", {cls: "gs-img-sr", attrs: {role: "status", "aria-live": "polite", id: "gs-img-announce"}});
    gen.append(heading, grid, sr);
    content.appendChild(gen);

    refs = {...refs, noteText, gen, bNew, bHist, prompt, empty, spell, dictate, chip, hint, status, submit, placeholder, img, save, saveLabel, note, model, modelWrap, meta: $("#ai-generate-preview-meta", gen), sr};

    submit.addEventListener("click", () => {
      if (isLocked(submit)) return;
      generate();
    });
    prompt.addEventListener("input", () => {
      refs.empty.hidden = !!prompt.value;
      st.pending = st.pending && st.pending.prompt === prompt.value.trim() ? st.pending : null;
    });
    prompt.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const {selectionStart: a, selectionEnd: b} = prompt;
        prompt.setRangeText("\n", a, b, "end");
        prompt.dispatchEvent(new Event("input"));
        return;
      }
      if (!submit.disabled && !isLocked(submit)) generate();
    });
    bNew.addEventListener("click", () => {
      if (isLocked(bNew) || st.generating) return;
      newImage();
    });
    bHist.addEventListener("click", () => {
      if (st.drawer) closeDrawer();
      else openDrawer(bHist);
    });
    chip.addEventListener("click", () => {
      if (st.prompts) closePrompts();
      else openPrompts(chip);
    });
    save.addEventListener("click", () => {
      if (isLocked(save) || !st.result) return;
      sendEntry(st.result.id);
    });
    for (const b of [spell, dictate]) lock(b, "Spelling and dictation aren't available in a shared Flow yet.");
    img.addEventListener("load", () => {
      // The preview box keeps the placeholder's square from the first moment (the picture is contained inside it), so a picture arriving never moves the layout.
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return;
      refs.meta.textContent = `${w}x${h} • ${(st.result && st.result.type) || "IMAGE"}`;
    });
    refs.chip.setAttribute("title", "No prompt history yet");
    render();
  }

  // ---- state -> screen ----------------------------------------------------------------------------------------------------------
  function announce(text) {
    if (!refs) return;
    refs.sr.textContent = "";
    setTimeout(() => refs && (refs.sr.textContent = text), 30); // re-set so a repeated line is read again
  }
  const currentStatus = () => {
    const o = owner();
    if (isView()) return statusCopy("view", {owner: o});
    if (S.offline) return statusCopy("offline", {owner: o});
    if (st.generating) return statusCopy("working", {owner: o});
    const k = st.status;
    return statusCopy(k.kind, {owner: o, waitS: k.kind === "busy" || k.kind === "rate_limited" ? Math.max(1, Math.ceil(((st.wait ? st.wait.until : 0) - Date.now()) / 1000)) : 0});
  };
  function render() {
    if (!refs) return;
    const view = isView();
    const offline = !!S.offline;
    const busy = st.generating;
    const hold = waiting();
    const hasTab = st.mode === "on" || st.mode === "view";
    if (hasTab !== refs.tab.isConnected) {
      if (hasTab) refs.tabs.appendChild(refs.tab);
      else refs.tab.remove();
    }
    // Four tabs do not fit a 280px column with words, so (as the app does) they show their icons only and keep the words as the accessible name and tooltip.
    for (const t of $$(".ai-mode-tab", refs.tabs)) {
      if (!hasTab) {
        t.removeAttribute("data-dock-label");
        if (t !== refs.tab) t.removeAttribute("title");
      } else {
        t.setAttribute("data-dock-label", t === refs.tab ? "Images" : t.textContent);
        t.setAttribute("title", t.textContent);
      }
    }
    const other = hooks.otherTab ? hooks.otherTab() : null; // G7: a Spelling or Transcribe tab is the open one
    const active = st.tab === "images" && hasTab && !other;
    refs.tab.classList.toggle("active", active);
    refs.tab.setAttribute("aria-selected", active ? "true" : "false");
    refs.tab.tabIndex = active ? 0 : -1;
    refs.tChat.classList.toggle("active", !active && !other);
    refs.tChat.setAttribute("aria-selected", active || other ? "false" : "true");
    refs.tChat.tabIndex = active || other ? -1 : 0;
    if (active) refs.panel.setAttribute("data-mode", "generate-images");
    else if (!other) refs.panel.removeAttribute("data-mode");
    refs.chat.hidden = active || !!other;
    refs.selector.hidden = active || !!other;
    // prompt + buttons
    refs.prompt.disabled = view || offline;
    refs.prompt.readOnly = busy;
    refs.prompt.placeholder = view ? `You can view this Flow. Ask ${owner()} for edit access.` : offline ? `Paused while ${owner()} is offline` : "Describe the image you want Joe to create...";
    refs.empty.hidden = !!refs.prompt.value || view;
    refs.submit.textContent = busy ? "Generating…" : "Generate";
    refs.submit.disabled = !view && (busy || offline || hold);
    refs.submit.setAttribute("aria-busy", busy ? "true" : "false");
    if (view) lock(refs.submit, viewTip());
    else unlock(refs.submit);
    refs.bNew.disabled = !view && busy;
    if (view) lock(refs.bNew, viewTip());
    else unlock(refs.bNew);
    refs.note.hidden = view;
    // status
    const copy = currentStatus();
    refs.status.setAttribute("data-state", copy.state);
    if (!refs.status.firstChild || refs.status.dataset.text !== copy.text) {
      refs.status.textContent = copy.text;
      refs.status.dataset.text = copy.text;
    }
    refs.status.setAttribute("aria-live", hold ? "off" : "polite"); // a countdown must not be read out every second
    refs.placeholder.classList.toggle("is-generating", busy);
    renderNote();
    // preview
    const r = st.result;
    refs.gen.classList.toggle("gs-has-image", !!(r && r.url));
    refs.gen.classList.toggle("gs-has-result", !!r);
    if (r) {
      if (r.url && refs.img.getAttribute("src") !== r.url) refs.img.setAttribute("src", r.url);
      refs.img.setAttribute("alt", "Generated picture, saved in the image history");
      refs.saveLabel.textContent = r.sent ? "In the gallery" : "Send to Gallery";
      refs.save.setAttribute("aria-label", r.sent ? "In the gallery" : "Send to Gallery");
      refs.save.setAttribute("title", r.sent ? "In the gallery" : "Send to Gallery");
      refs.save.disabled = st.sending || r.sent;
      if (view) lock(refs.save, viewTip());
      else unlock(refs.save);
    } else {
      refs.img.removeAttribute("src");
      refs.meta.textContent = "";
    }
    // history chip
    const mine = promptRows(st.entries);
    const chipLabel = mine.length ? "Prompt history" : "No prompt history yet";
    refs.chip.setAttribute("aria-label", chipLabel);
    refs.chip.setAttribute("title", chipLabel);
    refs.chip.setAttribute("aria-expanded", st.prompts ? "true" : "false");
    refs.bHist.setAttribute("aria-expanded", st.drawer ? "true" : "false");
    refs.bHist.classList.toggle("active", !!st.drawer);
  }

  // "Uses Elena's AI credits (OpenAI). Pictures are saved on Elena's computer and credited to you. One picture at a time." The provider is the owner's own plain label.
  function renderNote() {
    const key = `${S.ownerName}|${st.provider}`;
    if (refs.noteText.dataset.key === key) return;
    refs.noteText.dataset.key = key;
    refs.noteText.replaceChildren(document.createTextNode("Uses "), el("b", {text: S.ownerName ? `${S.ownerName}'s` : "the owner's", attrs: {dir: "auto"}}), document.createTextNode(` AI credits${st.provider ? ` (${st.provider})` : ""}. Pictures are saved on ${S.ownerName ? S.ownerName : "the owner"}'s computer and credited to you. One picture at a time.`));
  }
  function setStatus(kind, extra) {
    st.status = {kind, ...(extra || {})};
    render();
    hooks.changed();
  }

  // ---- tabs ---------------------------------------------------------------------------------------------------------------------
  function showTab(which, {focus = true, keepOther = false} = {}) {
    if (!refs) return;
    if (!keepOther && hooks.leaveOther) hooks.leaveOther(); // G7: choosing Chat or Images ends a Spelling / Transcribe tab
    if (which === "images" && !refs.tab.isConnected) which = "chat";
    st.tab = which;
    if (which === "chat") {
      closePrompts({restore: false});
      closeDrawer({restore: false});
    }
    render();
    hooks.changed();
    if (!focus) return;
    if (which === "images") {
      if (!refs.prompt.disabled) refs.prompt.focus({preventScroll: true});
      else refs.tab.focus({preventScroll: true});
    } else {
      const input = $("#ai-chat-input");
      if (input && !input.disabled) input.focus({preventScroll: true});
      else refs.tChat.focus({preventScroll: true});
    }
  }

  // ---- the owner's word on the switch (and the guest's own entries) ----------------------------------------------------------
  function setEntries(list) {
    st.entries = list.map((e) => ({...e}));
    st.numbered = numberEntries(st.entries);
  }
  async function refresh() {
    if (!refs || !st.alive) return;
    let r;
    try {
      r = await api.imageHistory();
    } catch (_) {
      return; // offline or slow: keep what is shown
    }
    if (!st.alive || !refs) return;
    const c = classifyHistory(r.status, r.json);
    if (c.kind === "ended") return hooks.endNow();
    if (c.kind === "slow" || c.kind === "unknown") return;
    const was = st.mode;
    st.mode = c.kind === "on" ? (S.role === "edit" ? "on" : "view") : c.kind;
    if (c.kind === "on") {
      setEntries(c.entries);
      st.provider = c.provider || "";
      st.loadedOnce = true;
    } else {
      setEntries([]);
    }
    if (st.mode !== was) {
      if (st.mode === "off" && was) {
        const inUse = st.tab === "images" || st.generating || !!st.result || st.offNotice; // the guest was working with it: say why it went away
        st.offNotice = false;
        if (st.tab === "images") showTab("chat", {focus: false});
        closePrompts({restore: false});
        closeDrawer({restore: false});
        if (inUse) richToast("warning", "fas fa-image", ["Picture generation is off now"], `${owner()} turned it off for this shared Flow.`);
        st.result = null;
      }
      render();
      hooks.changed();
    } else {
      render();
    }
    if (st.drawer) renderDrawer();
    if (st.prompts) renderPrompts();
  }

  // ---- generate -----------------------------------------------------------------------------------------------------------------
  function startWait(kind, seconds) {
    clearInterval(st.wait && st.wait.timer);
    const until = Date.now() + seconds * 1000;
    st.wait = {kind, until, timer: null};
    st.status = {kind};
    st.wait.timer = setInterval(() => {
      if (!st.alive) return;
      if (Date.now() >= until) {
        clearInterval(st.wait && st.wait.timer);
        st.wait = null;
        st.status = {kind: "ready"};
        render();
        announce("You can generate again.");
        hooks.changed();
        return;
      }
      render();
    }, 1000);
    render();
    announce(statusCopy(kind, {owner: owner(), waitS: seconds}).text);
    hooks.changed();
  }

  async function generate() {
    if (!refs || st.generating || waiting() || st.mode !== "on" || S.role !== "edit" || S.offline) return;
    const text = refs.prompt.value.trim();
    const problem = promptProblem(text);
    if (problem) {
      setStatus("bad_request");
      announce(statusCopy("bad_request").text);
      refs.prompt.focus();
      return;
    }
    const nodeId = targetNode();
    if (!nodeId) return setStatus("out_of_scope");
    const same = st.pending && st.pending.prompt === text && st.pending.nodeId === nodeId;
    const requestId = same ? st.pending.requestId : newRequestId();
    st.pending = {requestId, prompt: text, nodeId};
    st.generating = true;
    st.status = {kind: "working"};
    render();
    hooks.changed();
    announce(statusCopy("working").text);
    let r = null;
    try {
      r = await api.imageGen({nodeId, prompt: text}, requestId);
    } catch (_) {
      r = null;
    }
    if (!st.alive || !refs) return;
    st.generating = false;
    const c = r ? classifyGenerate(r.status, r.json, r.retryAfter) : {kind: "network"};
    if (c.kind === "ended") return hooks.endNow();
    if (c.kind === "ok") {
      st.pending = null;
      st.status = {kind: "done"};
      await showResult(c.id, c.nodeId);
      render();
      hooks.changed();
      announce(statusCopy("done").text);
      refresh();
      return;
    }
    if (c.kind === "off") st.offNotice = true;
    if (c.kind === "off" || c.kind === "view") refresh(); // the owner's answer decides what the tab shows
    if (c.kind === "busy" || c.kind === "rate_limited") {
      startWait(c.kind, c.waitS);
      return;
    }
    if (c.kind === "network" && S.offline) st.status = {kind: "offline"};
    else st.status = {kind: c.kind};
    if (c.kind === "bad_request" || c.kind === "out_of_scope" || c.kind === "locked" || c.kind === "reused") st.pending = null; // a reused id is never retried as it is
    render();
    hooks.changed();
    announce(currentStatus().text);
  }

  async function showResult(id, nodeId) {
    const thumb = await loadThumb(id);
    if (!st.alive || !refs) return;
    st.result = {id, nodeId, url: thumb && thumb.url ? thumb.url : null, sent: false, type: thumb && thumb.type ? thumb.type : "IMAGE"};
    if (!thumb || !thumb.url) refs.meta.textContent = "";
  }

  function newImage() {
    st.result = null;
    st.pending = null;
    st.status = {kind: "ready"};
    refs.prompt.value = "";
    refs.empty.hidden = false;
    render();
    hooks.changed();
    refs.prompt.focus();
    announce("Ready for a new picture.");
  }

  // ---- picture bytes ------------------------------------------------------------------------------------------------------------
  async function loadThumb(id) {
    const hit = thumbs.get(id);
    if (hit) return hit;
    if (thumbLoading.has(id)) return thumbLoading.get(id);
    const p = (async () => {
      for (let tries = 0; tries < 4 && st.alive; tries++) {
        let r;
        try {
          r = await api.imageBytes(id);
        } catch (_) {
          return null; // network: try again next time it is asked for
        }
        if (r.status === 401) {
          hooks.endNow();
          return null;
        }
        if (r.status === 429) {
          await new Promise((done) => setTimeout(done, Math.min(Math.max(r.retryAfter || 1, 1), 3) * 1000));
          continue;
        }
        if (r.status === 200 && r.bytes && /^image\/(png|jpeg|webp)$/.test(r.type)) {
          const url = URL.createObjectURL(new Blob([r.bytes], {type: r.type}));
          const rec = {url, type: r.type.slice(6).toUpperCase()};
          thumbs.set(id, rec);
          while (thumbs.size > MAX_THUMBS) {
            const [old, rec0] = thumbs.entries().next().value;
            if (st.result && st.result.id === old) break; // the picture in the preview stays
            thumbs.delete(old);
            if (rec0.url) URL.revokeObjectURL(rec0.url);
          }
          return rec;
        }
        const gone = {gone: true}; // {state:"unavailable"}, a refusal, or not a picture: no thumbnail, remembered so the list does not ask again on every redraw
        thumbs.set(id, gone);
        return gone;
      }
      return null;
    })().finally(() => thumbLoading.delete(id));
    thumbLoading.set(id, p);
    return p;
  }

  // ---- Send to Gallery + the guarded Undo ---------------------------------------------------------------------------------------
  async function slotNumber(nodeId, id) {
    try {
      const r = await api.mediaIndex();
      if (r.status === 200 && r.json && Array.isArray(r.json.media)) {
        const mine = r.json.media.filter((m) => m.nodeId === nodeId);
        const i = mine.findIndex((m) => m.mediaId === id);
        if (i >= 0) return i + 1;
      }
    } catch (_) {
      /* the number is only a nicety */
    }
    return 0;
  }
  async function sendEntry(id) {
    if (st.sending || !refs || isView()) return;
    const entry = st.entries.find((e) => e.id === id);
    const nodeId = (st.result && st.result.id === id ? st.result.nodeId : entry && entry.nodeId) || null;
    st.sending = true;
    render();
    renderDrawerIfOpen();
    let r = null;
    const t0 = Date.now();
    try {
      r = await api.imageSend(id);
    } catch (_) {
      r = null;
    }
    st.sending = false;
    const rtt = Date.now() - t0;
    if (!st.alive || !refs) return;
    const c = r ? classifyOp(r.status, r.json) : {kind: "network"};
    if (c.kind === "ended") return hooks.endNow();
    if (c.kind === "already") {
      // An older send (another tab, or a retry whose first answer was lost): it is in the gallery already. Undo is offered only if the owner says time is left in its window.
      const undoBase = c.undoMs === null ? 0 : undoRemaining({undoMs: c.undoMs, rttMs: rtt});
      const repliedAt = Date.now();
      if (st.result && st.result.id === id) st.result.sent = true;
      if (entry) {
        entry.sent = true;
        entry.sentAt = Date.now();
      }
      const node = (r.json && r.json.nodeId) || nodeId;
      st.status = {kind: "sent"};
      render();
      renderDrawerIfOpen();
      hooks.changed();
      const slot = node ? await slotNumber(node, id) : 0;
      const left = undoBase - (Date.now() - repliedAt);
      if (left > 400) {
        offerUndo({id, nodeId: node, slot, remaining: left});
        refresh();
        return;
      }
      richToast("info", "fas fa-check", ["That picture is already in " + (slot ? `slot ${slot}` : "the gallery") + (node ? ", " : ""), ...(node ? [quoted(nodeName(node))] : [])], "Everyone can already see it.", {ttlMs: 9000});
      refresh();
      return;
    }
    if (c.kind === "ok" || c.kind === "nothing") {
      const sentAt = Date.now();
      const undoBase = undoRemaining({undoMs: c.undoMs, rttMs: rtt, elapsedMs: sentAt - t0}); // counted from the reply; the awaits below spend some of it
      if (st.result && st.result.id === id) st.result.sent = true;
      if (entry) entry.sentAt = sentAt;
      if (entry) entry.sent = true;
      const node = (r.json && r.json.nodeId) || nodeId;
      if (node) hooks.creditOwn(node, {kind: "media"});
      st.status = {kind: "sent"};
      render();
      renderDrawerIfOpen();
      hooks.changed();
      await hooks.reread();
      const slot = node ? await slotNumber(node, id) : 0;
      offerUndo({id, nodeId: node, slot, remaining: Math.max(0, undoBase - (Date.now() - sentAt))});
      refresh();
      return;
    }
    if (c.kind === "off") st.offNotice = true;
    if (c.kind === "off" || c.kind === "view") refresh();
    const copy = opCopy(c.kind === "network" ? "unavailable" : c.kind, {what: "send", owner: owner(), node: nodeId ? nodeName(nodeId) : "this node"});
    richToast(copy.tone, copy.icon, [copy.title], copy.sub, {ttlMs: 12000});
    if (c.kind === "regenerate") {
      if (entry && entry.mine && entry.prompt && refs.prompt && !refs.prompt.value.trim()) {
        refs.prompt.value = entry.prompt;
        refs.empty.hidden = true;
      }
      if (st.result && st.result.id === id) st.result = null;
      st.status = {kind: "ready"};
      refresh();
    }
    render();
    renderDrawerIfOpen();
    hooks.changed();
  }

  function offerUndo({id, nodeId, slot, remaining}) {
    if (st.undoOffer) settleOffer(st.undoOffer);
    const where = slot ? `slot ${slot}` : "the gallery";
    const parts = ["Your picture is in " + where + (nodeId ? ", " : ""), ...(nodeId ? [quoted(nodeName(nodeId))] : [])];
    const offer = {n: null, timer: null, id, nodeId, slot};
    offer.n = richToast("info", "fas fa-rotate-left", parts, "Everyone sees it now, credited to you.", {undo: {windowMs: remaining, onUndo: () => doUndo(offer)}});
    if (!offer.n) return;
    offer.timer = setTimeout(() => {
      if (st.undoOffer === offer) st.undoOffer = null;
      settleOffer(offer);
    }, remaining);
    st.undoOffer = offer;
  }
  function settleOffer(offer) {
    if (!offer || !offer.n || !offer.n.isConnected) return;
    clearTimeout(offer.timer);
    settleToast(offer.n, "info", "fas fa-check", ["Your picture is in the gallery"], `Saved. ${owner()} can still undo it from History.`);
  }
  async function doUndo(offer) {
    const btn = offer.n.querySelector(".notification-undo-btn");
    if (btn) btn.disabled = true;
    clearTimeout(offer.timer);
    let r = null;
    try {
      r = await api.imageUndo(offer.id);
    } catch (_) {
      r = null;
    }
    if (st.undoOffer === offer) st.undoOffer = null;
    if (!st.alive) return;
    const c = r ? classifyOp(r.status, r.json) : {kind: "network"};
    if (c.kind === "ended") return hooks.endNow();
    if (c.kind === "ok" || c.kind === "nothing") {
      const entry = st.entries.find((e) => e.id === offer.id);
      if (entry) {
        entry.sent = false;
        entry.sentAt = null;
      }
      if (st.result && st.result.id === offer.id) st.result.sent = false;
      st.status = {kind: "done"};
      settleToast(offer.n, "info", "fas fa-check", [offer.slot ? `Undone. Slot ${offer.slot} is back to how it was` : "Undone. The gallery is back to how it was"], "The picture stays in the image history.");
      render();
      renderDrawerIfOpen();
      hooks.changed();
      await hooks.reread();
      refresh();
      return;
    }
    if (c.kind === "network") return settleToast(offer.n, "warning", "fas fa-triangle-exclamation", ["Undo wasn't sent"], `Couldn't reach ${owner()}. The picture stays in the gallery.`, 12000);
    const copy = opCopy(c.kind, {what: "undo", owner: owner()});
    settleToast(offer.n, copy.tone, copy.icon, [copy.title], copy.sub, 12000);
    refresh();
  }

  // ---- popups: one host, the drawer and the prompt list ---------------------------------------------------------------------------
  function ensureHost() {
    if (host && host.isConnected) return host;
    host = el("div", {cls: "gs-img-host", attrs: {id: "gsImgHost"}});
    document.body.appendChild(host);
    document.addEventListener("keydown", onEscape);
    return host;
  }
  // Escape closes the popup that is open (the prompt list, else the history drawer), wherever the focus is, and focus goes back to what opened it.
  function onEscape(e) {
    if (e.key !== "Escape" || e.defaultPrevented || (!st.prompts && !st.drawer)) return;
    e.preventDefault();
    if (st.prompts) closePrompts();
    else closeDrawer();
  }
  // The popups need more room than Joe's 280px column; widen it the way the app does (CSS custom properties on the container), docked only.
  function widen(on) {
    const container = $(".container");
    if (!container) return;
    if (on && innerWidth > 1100) {
      const w = `${Math.max(280, Math.min(WIDE_COLUMN_PX, innerWidth - 378))}px`;
      container.style.setProperty("--joe-dock-open-width", w);
      document.body.style.setProperty("--joe-dock-column-width", w);
    } else {
      container.style.removeProperty("--joe-dock-open-width");
      document.body.style.removeProperty("--joe-dock-column-width");
    }
  }
  const syncWide = () => widen(!!(st.drawer || st.prompts));
  function restoreFocus(restore) {
    const o = opener;
    opener = null;
    if (restore && o && o.isConnected) o.focus({preventScroll: true});
  }

  // ---- the Image Generation History drawer (mockup 5f) ----------------------------------------------------------------------------
  function openDrawer(from) {
    if (!refs) return;
    closePrompts({restore: false});
    opener = from || opener;
    ensureHost();
    st.drawer = {filter: "node", query: "", sort: "newest", linkId: null, sig: ""};
    const aside = el("aside", {cls: "ai-image-history-drawer show", attrs: {id: "ai-image-history-drawer", role: "dialog", "aria-label": "Image Generation History"}});
    const inner = el("div", {cls: "ai-image-history-drawer-inner"});
    const header = el("div", {cls: "ai-image-history-drawer-header"});
    const h = el("h4");
    h.append(icon("fas fa-history"), document.createTextNode(" Image Generation History"));
    const acts = el("div", {cls: "ai-image-history-header-actions"});
    const close = el("button", {cls: "close-btn", attrs: {type: "button", id: "ai-image-history-close", "aria-label": "Close image generation history"}});
    close.appendChild(icon("fa-solid fa-xmark"));
    close.addEventListener("click", () => closeDrawer());
    acts.appendChild(close);
    header.append(h, acts);

    const toolbar = el("div", {cls: "ai-image-history-toolbar"});
    const primary = el("div", {cls: "ai-image-history-primary-row"});
    const searchWrap = el("label", {cls: "ai-image-history-search-wrap", attrs: {for: "ai-image-history-search"}});
    const search = el("input", {attrs: {id: "ai-image-history-search", type: "search", placeholder: "Search history...", autocomplete: "off", "aria-label": "Search image history"}});
    searchWrap.append(icon("fas fa-search"), search);
    const filterWrap = el("label", {cls: "ai-image-history-filter-wrap", attrs: {for: "ai-image-history-filter"}});
    const filter = el("select", {cls: "form-control", attrs: {id: "ai-image-history-filter", "aria-label": "Filter image history"}});
    for (const [v, t] of [
      ["node", "Current node"],
      ["all", "All shared nodes"]
    ])
      filter.appendChild(el("option", {text: t, attrs: {value: v}}));
    filterWrap.append(icon("fas fa-filter"), filter);
    primary.append(searchWrap, filterWrap);
    const metaRow = el("div", {cls: "ai-image-history-meta-row"});
    const count = el("div", {cls: "ai-image-history-count", attrs: {id: "ai-image-history-count", role: "status", "aria-live": "polite"}});
    const sort = el("select", {cls: "form-control ai-image-history-sort", attrs: {id: "ai-image-history-sort", "aria-label": "Sort image history"}});
    for (const [v, t] of [
      ["newest", "Newest first"],
      ["oldest", "Oldest first"]
    ])
      sort.appendChild(el("option", {text: t, attrs: {value: v}}));
    metaRow.append(count, sort);
    toolbar.append(primary, metaRow);
    const list = el("div", {cls: "ai-image-history-list", attrs: {id: "ai-image-history-list"}});
    inner.append(header, toolbar, list);
    aside.appendChild(inner);
    host.appendChild(aside);
    search.addEventListener("input", () => {
      st.drawer.query = search.value;
      renderDrawer({force: true});
    });
    filter.addEventListener("change", () => {
      st.drawer.filter = filter.value;
      renderDrawer({force: true});
    });
    sort.addEventListener("change", () => {
      st.drawer.sort = sort.value;
      renderDrawer({force: true});
    });
    st.drawer.refs = {aside, list, count, search, filter, sort};
    syncWide();
    render();
    renderDrawer({force: true});
    refresh();
    setTimeout(() => search.focus({preventScroll: true}), 30); // the app focuses search on open
  }
  function closeDrawer({restore = true} = {}) {
    if (!st.drawer) return;
    st.drawer.refs.aside.remove();
    st.drawer = null;
    syncWide();
    render();
    restoreFocus(restore);
  }
  const renderDrawerIfOpen = () => st.drawer && renderDrawer({force: true});

  function renderDrawer({force = false} = {}) {
    const d = st.drawer;
    if (!d) return;
    const cur = targetNode();
    const rows = visibleEntries(st.numbered, {filter: d.filter, nodeId: cur, query: d.query, sort: d.sort, nodeName, authorName: (e) => authorOf(e).name});
    const sig = JSON.stringify([rows.map((e) => [e.id, e.n, !!e.sent, e.mine, relTime(e.time)]), d.linkId, st.sending, thumbSig(rows), isView()]);
    d.refs.count.textContent = `Showing ${rows.length} result${rows.length === 1 ? "" : "s"}`;
    if (!force && sig === d.sig) return;
    d.sig = sig;
    const active = document.activeElement;
    const keep = active && d.refs.list.contains(active) ? {id: active.closest("[data-history-id]")?.getAttribute("data-history-id"), action: active.getAttribute("data-action")} : null;
    d.refs.list.replaceChildren();
    if (!rows.length) {
      const msg = !st.numbered.length ? "No image generation history yet. Pictures you and others make appear here." : "Nothing matches. Try another search or the filter.";
      d.refs.list.appendChild(el("div", {cls: "ai-image-history-empty", text: msg}));
    }
    for (const e of rows) d.refs.list.appendChild(historyRow(e));
    if (keep && keep.id) {
      const target = d.refs.list.querySelector(`[data-history-id="${CSS.escape(keep.id)}"] [data-action="${CSS.escape(keep.action || "")}"]`);
      if (target) target.focus({preventScroll: true});
    }
    if (d.linkId) d.refs.list.querySelector(".is-linked")?.scrollIntoView({block: "nearest"});
    lazyThumbs(d.refs.list);
  }
  const thumbSig = (rows) => rows.map((e) => (thumbs.has(e.id) ? (thumbs.get(e.id).gone ? "g" : "t") : "-")).join("");

  function historyRow(e) {
    const a = authorOf(e);
    const own = !!e.mine;
    const row = el("article", {cls: `ai-image-history-item${own ? " gs-mine" : ""}${st.drawer && st.drawer.linkId === e.id ? " is-linked" : ""}`, attrs: {"data-history-id": e.id}});
    const wrap = el("div", {cls: "ai-image-history-thumb-wrap"});
    const t = thumbs.get(e.id);
    if (t && t.url) wrap.appendChild(el("img", {cls: "ai-image-history-thumb", attrs: {alt: `Generated picture ${e.n}`, src: t.url}}));
    else wrap.appendChild(el("div", {cls: "gs-img-thumb-empty", text: t && t.gone ? "Picture not available" : "Loading…", attrs: {"data-thumb-id": e.id}}));
    const body = el("div", {cls: "ai-image-history-item-body"});
    const meta = el("div", {cls: "ai-image-history-item-meta"});
    meta.append(el("strong", {text: `#${e.n}`}), el("span", {text: relTime(e.time)}));
    if (e.sent) meta.appendChild(el("span", {cls: "ai-image-history-saved-badge", text: "Saved", attrs: {title: "In the gallery"}}));
    const by = el("div", {cls: "gs-hist-by"});
    by.appendChild(avatar(a.name, {mark: a.mark, size: "xs", plain: true}));
    const who = el("span", {cls: "gs-hist-who"});
    who.appendChild(el("b", {text: a.name, attrs: {dir: "auto"}}));
    by.append(who, el("span", {cls: "ai-image-history-saved-badge", text: "AI", attrs: {title: "Made with AI"}}));
    const title = el("p", {cls: "ai-image-history-title", text: nodeName(e.nodeId), attrs: {dir: "auto"}});
    body.append(meta, by, title);
    if (own && typeof e.prompt === "string") body.appendChild(el("p", {cls: "ai-image-history-prompt", text: e.prompt, attrs: {dir: "auto"}}));
    else body.appendChild(el("p", {cls: "gs-hist-hidden", text: `Prompt visible to ${S.ownerName ? iso(S.ownerName) : "the owner"} only`}));
    const acts = el("div", {cls: "ai-image-history-row-actions"});
    const mk = (action, ic, tip) => {
      const b = el("button", {cls: "ai-chat-action-btn", attrs: {type: "button", "data-action": action, title: tip, "aria-label": `${tip}, picture ${e.n}`}});
      b.appendChild(icon(ic));
      return b;
    };
    if (own && e.prompt) {
      const branch = mk("branch", "fas fa-code-branch", "Branch from this image");
      const copy = mk("copy", "fas fa-copy", "Copy prompt");
      branch.addEventListener("click", () => branchFrom(e));
      copy.addEventListener("click", () => copyText(e.prompt));
      acts.append(branch, copy);
    }
    if (own) {
      const send = mk("send", "fas fa-share-from-square", e.sent ? "Already in the gallery" : "Send to slot");
      if (e.sent) {
        send.disabled = true;
      } else if (isView()) {
        lock(send, viewTip());
      } else send.disabled = st.sending;
      send.addEventListener("click", () => {
        if (isLocked(send) || send.disabled) return;
        sendEntry(e.id);
      });
      acts.appendChild(send);
    }
    body.appendChild(acts);
    row.append(wrap, body);
    return row;
  }

  // Thumbnails load as the rows scroll into view (one at a time, bounded), so a long history never spends the owner's read budget at once.
  function lazyThumbs(listEl) {
    const want = (node) => {
      const id = node.getAttribute("data-thumb-id");
      if (!id || thumbs.has(id)) return;
      loadThumb(id).then(() => {
        if (st.alive && st.drawer) renderDrawer({force: true});
      });
    };
    const empties = $$(".gs-img-thumb-empty[data-thumb-id]", listEl);
    if (typeof IntersectionObserver !== "function") return empties.slice(0, 12).forEach(want);
    const io = new IntersectionObserver(
      (items) => {
        for (const it of items)
          if (it.isIntersecting) {
            io.unobserve(it.target);
            want(it.target);
          }
      },
      {root: listEl}
    );
    empties.forEach((n) => io.observe(n));
  }

  function branchFrom(e) {
    closeDrawer({restore: false});
    showTab("images", {focus: false});
    refs.prompt.value = e.prompt;
    refs.empty.hidden = true;
    render();
    refs.prompt.focus();
    announce(`Prompt from picture ${e.n} is in the prompt box. Edit it and press Generate.`);
  }
  function copyText(text) {
    let p = null;
    try {
      p = navigator.clipboard && navigator.clipboard.writeText(text);
    } catch (_) {
      p = null;
    }
    if (!p) return richToast("warning", "fas fa-triangle-exclamation", ["Couldn't copy"], "Select the prompt and copy it by hand.");
    p.then(
      () => richToast("success", "fas fa-check", ["Prompt copied"], undefined, {ttlMs: 3000}),
      () => richToast("warning", "fas fa-triangle-exclamation", ["Couldn't copy"], "Select the prompt and copy it by hand.")
    );
  }

  // ---- the guest's Prompt History (mockup 5l): their own prompts only, numbered 1..n with no gaps ------------------------------------
  function openPrompts(from) {
    if (!refs) return;
    closeDrawer({restore: false});
    opener = from || opener;
    ensureHost();
    st.prompts = true;
    const pop = el("div", {cls: "ai-chat-history-popup ai-generate-prompt-history-popup gs-img-prompts show", attrs: {id: "ai-generate-prompt-history-popup", role: "dialog", "aria-label": "Prompt History"}});
    const content = el("div", {cls: "ai-chat-history-content"});
    const header = el("div", {cls: "ai-chat-history-header"});
    const move = el("button", {cls: "gs-img-move", attrs: {type: "button", id: "gs-img-prompts-move", "aria-label": "Move Prompt History", "aria-describedby": "gs-img-prompts-help", title: "Drag to move"}});
    move.append(el("span"), el("span"), el("span"));
    header.append(move, el("h4", {text: "Prompt History"}));
    const acts = el("div", {cls: "ai-chat-history-header-actions"});
    const copyAll = el("button", {cls: "btn ai-generate-history-copy-btn", text: "Copy All", attrs: {type: "button", id: "ai-prompt-history-copy-all"}});
    const close = el("button", {cls: "close-btn", attrs: {id: "ai-prompt-history-close", type: "button", "aria-label": "Close"}});
    close.appendChild(icon("fa-solid fa-xmark"));
    acts.append(copyAll, close);
    header.appendChild(acts);
    const scope = el("p", {cls: "ai-chat-history-scope", text: "Your prompts in this shared Flow", attrs: {id: "ai-prompt-history-scope"}});
    const note = el("p", {cls: "gs-ph-note", text: "Only your prompts are shown here."});
    const list = el("div", {cls: "ai-chat-history-list ai-generate-prompt-history-list", attrs: {id: "ai-prompt-history-list"}});
    content.append(header, scope, note, list);
    const grip = el("span", {cls: "gs-img-resize", attrs: {"aria-hidden": "true", title: "Drag to resize"}});
    const help = el("p", {cls: "gs-img-sr", text: "Arrow keys move this window by a small step, Shift and arrow keys by a large step. Alt and arrow keys resize it.", attrs: {id: "gs-img-prompts-help"}});
    pop.append(content, grip, help);
    host.appendChild(pop);
    movable(pop, move, grip);
    close.addEventListener("click", () => closePrompts());
    copyAll.addEventListener("click", () => {
      const rows = promptRows(st.entries);
      if (rows.length) copyText(copyAllText(rows));
    });
    st.promptRefs = {pop, list, copyAll};
    syncWide();
    render();
    renderPrompts();
    refresh();
    setTimeout(() => (list.querySelector(".ai-generate-prompt-history-entry") || close).focus({preventScroll: true}), 30);
  }
  // Drag by the handle (or with the arrow keys on it), resize by the corner (or with Alt + arrows on the handle). The window is placed with custom properties
  // (CSSOM only: no style text), and always kept inside the viewport.
  const POP_STEP = 16;
  const POP_STEP_BIG = 64;
  const POP_MIN_W = 280;
  const POP_MIN_H = 200;
  const POP_EDGE = 8;
  function movable(pop, handle, grip) {
    const pos = {dx: 0, dy: 0};
    const rtl = () => getComputedStyle(pop).direction === "rtl";
    const place = () => {
      pop.style.setProperty("--gs-pop-dx", `${pos.dx}px`);
      pop.style.setProperty("--gs-pop-dy", `${pos.dy}px`);
      const r = pop.getBoundingClientRect();
      const fx = r.left < POP_EDGE ? POP_EDGE - r.left : r.right > innerWidth - POP_EDGE ? innerWidth - POP_EDGE - r.right : 0;
      const fy = r.top < POP_EDGE ? POP_EDGE - r.top : r.bottom > innerHeight - POP_EDGE ? innerHeight - POP_EDGE - r.bottom : 0;
      if (fx || fy) {
        pos.dx += fx;
        pos.dy += fy;
        pop.style.setProperty("--gs-pop-dx", `${pos.dx}px`);
        pop.style.setProperty("--gs-pop-dy", `${pos.dy}px`);
      }
    };
    const resize = (w, h) => {
      pop.classList.add("is-sized");
      pop.style.setProperty("--gs-pop-w", `${Math.round(Math.max(POP_MIN_W, Math.min(w, innerWidth - 2 * POP_EDGE)))}px`);
      pop.style.setProperty("--gs-pop-h", `${Math.round(Math.max(POP_MIN_H, Math.min(h, innerHeight - 2 * POP_EDGE)))}px`);
      place();
    };
    const drag = (target, onMove) => {
      target.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        target.setPointerCapture(e.pointerId);
        const start = {x: e.clientX, y: e.clientY, dx: pos.dx, dy: pos.dy, rect: pop.getBoundingClientRect()};
        const move = (ev) => onMove(ev.clientX - start.x, ev.clientY - start.y, start);
        const done = () => {
          target.removeEventListener("pointermove", move);
          target.removeEventListener("pointerup", done);
          target.removeEventListener("pointercancel", done);
        };
        target.addEventListener("pointermove", move);
        target.addEventListener("pointerup", done);
        target.addEventListener("pointercancel", done);
      });
    };
    drag(handle, (x, y, start) => {
      pos.dx = start.dx + x;
      pos.dy = start.dy + y;
      place();
    });
    drag(grip, (x, y, start) => resize(start.rect.width + (rtl() ? -x : x), start.rect.height + y));
    handle.addEventListener("keydown", (e) => {
      const dir = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[e.key];
      if (!dir) return;
      e.preventDefault();
      const step = e.shiftKey ? POP_STEP_BIG : POP_STEP;
      if (e.altKey) {
        const r = pop.getBoundingClientRect();
        resize(r.width + dir[0] * step, r.height + dir[1] * step);
      } else {
        pos.dx += dir[0] * step;
        pos.dy += dir[1] * step;
        place();
      }
    });
  }
  function closePrompts({restore = true} = {}) {
    if (!st.prompts) return;
    st.promptRefs.pop.remove();
    st.promptRefs = null;
    st.prompts = false;
    syncWide();
    render();
    restoreFocus(restore);
  }
  function renderPrompts() {
    if (!st.prompts) return;
    const {list, copyAll} = st.promptRefs;
    const rows = promptRows(st.entries);
    const sig = JSON.stringify(rows.map((r) => [r.id, r.num, r.prompt, r.time]));
    copyAll.disabled = !rows.length;
    if (list.dataset.sig === sig) return;
    list.dataset.sig = sig;
    const active = document.activeElement;
    const keepId = active && list.contains(active) ? active.closest("[data-history-id]")?.getAttribute("data-history-id") : null;
    list.replaceChildren();
    if (!rows.length) list.appendChild(el("div", {cls: "ai-chat-history-empty", text: "No prompts yet. Your prompts show here after you generate a picture."}));
    rows.forEach((r, i) => {
      const item = el("div", {cls: "ai-chat-history-item ai-generate-prompt-history-entry", attrs: {role: "button", tabindex: "0", "data-history-id": r.id}});
      const body = el("div", {cls: "ai-chat-history-item-content ai-generate-prompt-history-item-content"});
      body.appendChild(el("span", {cls: "ai-generate-prompt-history-meta", text: `Prompt ${r.num} • generate`}));
      body.appendChild(el("span", {cls: "ai-chat-history-item-time", text: i === 0 ? `Latest · ${relTime(r.time)}` : relTime(r.time)}));
      body.appendChild(el("pre", {cls: "ai-generate-prompt-history-body", text: r.prompt, attrs: {title: "Click to copy prompt", dir: "auto"}}));
      const pic = st.numbered.find((e) => e.id === r.id);
      if (pic) {
        const chip = el("button", {cls: "gs-ph-pic", attrs: {type: "button", "aria-label": `Show picture #${pic.n} in image history`}});
        const thumb = thumbs.get(r.id);
        if (thumb && thumb.url) chip.appendChild(el("img", {attrs: {src: thumb.url, alt: ""}}));
        chip.append(el("span", {text: `Picture #${pic.n}`}), icon("fas fa-arrow-right"));
        chip.addEventListener("click", (ev) => {
          ev.stopPropagation();
          linkPrompt(pic.id, chip);
        });
        body.appendChild(chip);
      }
      item.appendChild(body);
      const copy = () => copyText(r.prompt);
      item.addEventListener("click", (ev) => {
        if (ev.target.closest(".gs-ph-pic")) return;
        if (String((getSelection && getSelection()) || "").trim()) return;
        copy();
      });
      item.addEventListener("keydown", (ev) => {
        if (ev.target !== item || (ev.key !== "Enter" && ev.key !== " ")) return;
        ev.preventDefault();
        copy();
      });
      list.appendChild(item);
    });
    if (keepId) list.querySelector(`[data-history-id="${CSS.escape(keepId)}"]`)?.focus({preventScroll: true});
  }
  // Prompt -> picture (as the owner's 5m): opening the image history closes the prompt list (one popup at a time); the drawer opens on the matching picture.
  function linkPrompt(id, from) {
    const target = st.numbered.find((e) => e.id === id);
    closePrompts({restore: false});
    openDrawer(refs.chip);
    if (!st.drawer || !target) return;
    st.drawer.filter = "all";
    st.drawer.refs.filter.value = "all";
    st.drawer.linkId = id;
    renderDrawer({force: true});
    announce(`Showing picture ${target.n} by ${authorOf(target).name}`);
    setTimeout(() => st.drawer && st.drawer.refs.list.querySelector(".is-linked")?.scrollIntoView({block: "nearest"}), 40);
    void from;
  }

  // ---- lifecycle ----------------------------------------------------------------------------------------------------------------
  // Role / offline changes: the panel follows (View is read from the role at once; the owner confirms it on the next read).
  function sync() {
    if (!refs) return;
    if (S.role !== "edit" && st.mode === "on") st.mode = "view";
    else if (S.role === "edit" && st.mode === "view") refresh();
    render();
    if (st.drawer) renderDrawer({force: true});
  }
  function live() {
    if (!refs) return null;
    if (st.generating) return ["Working", "working"];
    if (st.tab === "images" && refs.tab.isConnected) return S.offline ? ["Paused", "paused"] : ["Ready", "ready"];
    return null;
  }
  function dispose() {
    st.alive = false;
    clearInterval(st.wait && st.wait.timer);
    clearTimeout(st.undoOffer && st.undoOffer.timer);
    st.undoOffer = null;
    for (const t of thumbs.values()) if (t.url) URL.revokeObjectURL(t.url);
    thumbs.clear();
    widen(false);
    document.removeEventListener("keydown", onEscape);
    if (host) host.remove();
    host = null;
    refs = null;
    Object.assign(st, {offNotice: false, mode: null, tab: "chat", entries: [], numbered: [], generating: false, pending: null, result: null, status: {kind: "ready"}, wait: null, sending: false, drawer: null, prompts: false, loadedOnce: false});
    st.alive = true; // a later build() starts fresh
  }

  return {build, refresh, sync, live, dispose, showTab, available: () => st.mode === "on" || st.mode === "view", isActive: () => st.tab === "images"};
}
