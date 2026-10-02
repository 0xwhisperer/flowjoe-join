// G5 · Joe for a guest (mockup states 4a-4k): the docked Joe panel, the guest's chat with the owner's Joe, Joe's change proposals (the guest
// presses Apply; the change then goes through the owner's guarded write path, credited to the guest "via Joe", with the five-second guarded
// Undo), and every calm state around it: thinking, busy, owner offline, off, errors. Markup and class names are the real app's Joe dock (its
// stylesheets are already loaded); every owner-, guest- or model-supplied string is written with textContent, never as HTML. The model's
// reply is shown through a tiny markdown renderer that builds DOM nodes (paragraphs, lists, bold, italic, code) and nothing else.
import {$, $$, el, iso, icon} from "./dom.js";
import {avatar} from "./people.js";
import {markNumber} from "./names.js";
import {richToast, settleToast, quoted} from "./toast.js";
import {UNDO_WINDOW_MS, classifyUndoAnswer, undoCopy, quoteOf} from "./editlogic.js";
import {createImages} from "./images.js"; // G6b
import {createSpeech} from "./speech.js"; // G7: Spelling, Transcribe, prompt spell check and dictation

const STATUS_POLL_MS = 20000;
const BUSY_RETRY_MS = 5000;
const OVERLAY_MAX_PX = 1100;
const SCRUBBER_RIGHT_OPEN = "300px";
const SCRUBBER_RIGHT_CLOSED = "20px";
const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

// ---- safe markdown: DOM nodes only ---------------------------------------------------------------------------------------------
export function renderInline(text, into) {
  // **bold**, *italic*, `code`. Everything else (links, images, HTML) stays literal text.
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) into.appendChild(document.createTextNode(text.slice(last, m.index)));
    const t = m[0];
    if (t.startsWith("**")) into.appendChild(el("strong", {text: t.slice(2, -2)}));
    else if (t.startsWith("`")) into.appendChild(el("code", {text: t.slice(1, -1)}));
    else into.appendChild(el("em", {text: t.slice(1, -1)}));
    last = m.index + t.length;
  }
  if (last < text.length) into.appendChild(document.createTextNode(text.slice(last)));
}
export function renderMarkdown(text) {
  const frag = document.createDocumentFragment();
  for (const block of String(text).split(/\n{2,}/)) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      const ul = el("ul");
      for (const l of lines) {
        const li = el("li");
        renderInline(l.replace(/^\s*[-*]\s+/, ""), li);
        ul.appendChild(li);
      }
      frag.appendChild(ul);
    } else {
      const p = el("p");
      lines.forEach((l, i) => {
        if (i) p.appendChild(el("br"));
        renderInline(l, p);
      });
      frag.appendChild(p);
    }
  }
  return frag;
}

// hooks: {reread, endNow, creditOwn(nodeId, {kind, field, viaJoe}), applyText(nodeId, field, text, {parts})}; media: the page's media module (audio for Transcribe)
export function createJoe({S, api, hooks, media = null}) {
  const st = {
    enabled: null, // null = not known yet, false = off for this share (no entry point), true = on
    open: false,
    busy: false, // a turn of mine is running
    waiting: false, // Joe answers someone else first: send is paused for a moment
    mode: "propose", // propose | read | off (the guest's own permission choice)
    forcedRead: false, // a View guest is held at read-only; back to "propose" when they become an Edit guest
    loaded: false,
    timer: null,
    retryTimer: null,
    undoOffer: null,
    focus: null, // a node the guest picked for Joe; null = follow the selection
    tab: "chat" // chat | spell-check | transcribe-audio
  };
  let dock = null;
  let refs = {};
  let draftDropped = false;
  // G6b: the Image Generation tab lives in this dock. Its switch (the owner's per-share setting) is separate from Joe's, so the rail button shows for either.
  const images = createImages({S, api, hooks: {...hooks, changed: () => (updateRail(), renderState()), otherTab: () => (st.tab !== "chat" ? st.tab : null), leaveOther: () => leaveSpeechTabs()}}); // G7: Spelling and Transcribe share the tab strip with Image Generation
  const updateRail = () => {
    if (refs.railBtn) refs.railBtn.hidden = st.enabled !== true && !images.available() && !st.open; // G6b: off while the panel is open keeps it visible so the guest can read the notice
  };
  let speech = null; // G7: made with the dock (build) and dropped with it (dispose)
  const owner = () => (S.ownerName ? iso(S.ownerName) : "the owner");
  const canPropose = () => S.role === "edit" && st.mode === "propose";
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
  const viewTip = () => `You can view this Flow. Ask ${owner()} for edit access`;

  // The app shows these containers by writing display onto them from JS; here a class does it (collab.css .gs-joe-shown), so no style is written from script.
  const show = (e) => e.classList.add("gs-joe-shown");

  // ---- the dock ---------------------------------------------------------------------------------------------------------------
  function build() {
    const container = $(".container");
    if (!container) return;
    refs = {};
    if (speech) speech.dispose();
    speech = createSpeech({S, api, media, hooks: {endNow: () => hooks.endNow(), applyText: (nodeId, field, text, opts) => hooks.applyText(nodeId, field, text, opts), nodeId: () => st.focus || S.selectedId || null, refreshJoe: () => void refresh()}});
    $("#joe-dock-resizer")?.remove();
    $("#joe-dock-scrim")?.remove();
    $("#joe-dock")?.remove();
    const resizer = el("div", {cls: "joe-dock-resizer", attrs: {id: "joe-dock-resizer", "aria-hidden": "true"}});
    const scrim = el("button", {cls: "joe-dock-scrim", attrs: {id: "joe-dock-scrim", type: "button", "aria-label": "Close Joe", tabindex: "-1"}});
    scrim.hidden = true;
    scrim.addEventListener("click", () => setOpen(false));
    dock = el("aside", {cls: "joe-dock", attrs: {id: "joe-dock", "aria-label": "Joe panel"}});
    const modal = el("div", {cls: "joe-docked", attrs: {id: "ai-spell-check-modal"}});
    const panel = el("div", {attrs: {id: "ai-spell-check-panel"}});

    // header
    const header = el("div", {attrs: {id: "ai-spell-check-header"}});
    const brand = el("div", {cls: "joe-dock-brand", attrs: {id: "joe-dock-brand"}});
    const mark = el("span", {cls: "joe-dock-mark", attrs: {"aria-hidden": "true"}});
    mark.appendChild(icon("fa-solid fa-mug-hot"));
    const live = el("span", {cls: "joe-dock-live-state", attrs: {id: "joe-dock-live-state", "data-state": "ready", role: "status"}});
    live.appendChild(el("span", {cls: "joe-dock-live-dot", attrs: {"aria-hidden": "true"}}));
    const liveLabel = el("span", {cls: "joe-dock-live-label", text: "Ready"});
    live.appendChild(liveLabel);
    const brandText = el("span", {cls: "joe-dock-brand-text", children: [el("h3", {text: "Joe AI Assistant"}), live]});
    brand.append(mark, brandText);
    const actions = el("div", {cls: "ai-spell-check-header-actions"});
    const close = el("button", {cls: "close-btn", attrs: {id: "ai-spell-check-close", type: "button", "aria-label": "Close"}});
    close.appendChild(icon("fa-solid fa-xmark"));
    close.addEventListener("click", () => setOpen(false));
    actions.appendChild(close);
    header.append(brand, actions);

    // mode tabs: Chat, Spelling and Transcribe (G7). The last two are dimmed with the reason while Joe is off, the owner is away or the guest can only view.
    const tabs = el("div", {cls: "ai-mode-tabs", attrs: {id: "ai-assist-mode-tabs", role: "tablist", "aria-label": "Joe AI Assistant mode"}});
    const mkTab = (label, mode, active) => el("button", {cls: `ai-mode-tab${active ? " active" : ""}`, text: label, attrs: {type: "button", role: "tab", "aria-selected": active ? "true" : "false", "data-mode": mode}}); // data-mode picks the tab's icon in the app's stylesheet
    const tChat = mkTab("Chat", "chat", true); // docked, the app shows each tab's short label (data-dock-label)
    const tSpell = mkTab("Spelling", "spell-check", false);
    const tTrans = mkTab("Transcribe", "transcribe-audio", false);
    tabs.append(tChat, tSpell, tTrans);
    refs.tabs = [tSpell, tTrans];
    refs.allTabs = [tChat, tSpell, tTrans];
    for (const [tab, mode] of [
      [tChat, "chat"],
      [tSpell, "spell-check"],
      [tTrans, "transcribe-audio"]
    ])
      tab.addEventListener("click", () => setTab(mode));

    // target row: what Joe is looking at. The node list is the shared nodes only (an unshared parent is never named).
    const target = el("div", {cls: "ai-spell-check-target", attrs: {id: "ai-spell-check-target"}});
    const pick = el("select", {cls: "ai-assist-target-select", attrs: {id: "ai-assist-target-node-select", "aria-label": "The node Joe is looking at"}});
    pick.addEventListener("change", () => {
      st.focus = pick.value || null;
      speech.refresh(); // G7: the Spelling and Transcribe tabs follow the node Joe is looking at
    });
    target.appendChild(el("span", {cls: "ai-assist-follow-state", attrs: {id: "ai-assist-follow-state"}, text: "Node"}));
    target.appendChild(pick);
    refs.pick = pick;

    // thread header
    const content = el("div", {attrs: {id: "ai-spell-check-content"}});
    const selector = el("div", {attrs: {id: "chat-mode-selector"}});
    const head = el("div", {cls: "chat-mode-header"});
    const group = el("div", {cls: "ai-chat-heading-group", children: [el("span", {cls: "ai-chat-section-label", text: "Chat with Joe"}), el("span", {cls: "joe-dock-thread-title", children: [el("span", {cls: "joe-dock-thread-title-lead", text: "Conversation"})]})]});
    head.appendChild(group);
    selector.appendChild(head);

    // messages + composer
    const chat = el("div", {attrs: {id: "chat-panel"}});
    show(chat);
    show(selector);
    show(modal);
    show(panel);
    const msgs = el("div", {attrs: {id: "ai-chat-messages", "aria-live": "polite"}});
    const composerBox = el("div", {cls: "joe-dock-composer-box", attrs: {id: "joe-dock-composer-box"}});
    const area = el("div", {attrs: {id: "ai-chat-input-area"}, cls: "ai-tokens-collapsed"});
    const row = el("div", {cls: "ai-chat-input-row"});
    const wrap = el("div", {cls: "ai-chat-input-field-wrap"});
    const input = el("textarea", {attrs: {id: "ai-chat-input", rows: "1", maxlength: "2000", spellcheck: "true", "aria-label": "Message to Joe"}});
    wrap.appendChild(input);
    const attach = el("button", {cls: "joe-dock-icon-btn joe-context-tray-toggle", attrs: {id: "joe-context-tray-toggle", type: "button", "aria-label": "Attachment"}});
    attach.appendChild(icon("fa-solid fa-paperclip"));
    const spell = el("button", {cls: "btn ai-chat-input-spell-check-btn", attrs: {id: "ai-chat-spell-check", type: "button", "aria-label": "Spell check prompt"}});
    spell.appendChild(icon("fas fa-spell-check"));
    const mic = el("button", {cls: "btn ai-chat-input-mic-btn", attrs: {id: "ai-chat-dictate", type: "button", "aria-label": "Dictate prompt"}});
    mic.appendChild(icon("fas fa-microphone"));
    const send = el("button", {cls: "btn confirm-button", attrs: {id: "ai-chat-send", type: "button"}});
    send.append(icon("fas fa-arrow-up"), el("span", {text: "Send"}));
    row.append(wrap, attach, spell, mic, send);
    area.appendChild(row);
    composerBox.appendChild(area);

    // chips row: brain and permission
    const chips = el("div", {cls: "joe-dock-chips", attrs: {id: "joe-dock-chips", role: "toolbar", "aria-label": "Chat settings"}});
    const model = el("select", {cls: "ai-chat-flow-permission-select ai-chat-model-select", attrs: {id: "ai-chat-model-select", "aria-label": "Joe chat model"}});
    model.appendChild(el("option", {text: "Joe's brain", attrs: {value: "owner", selected: ""}}));
    model.disabled = true;
    const modelWrap = el("span", {cls: "tooltip-wrapper ai-chat-model-wrapper", children: [model]});
    lock(modelWrap, "Joe uses the brain the owner chose for this shared Flow.");
    const perm = el("select", {cls: "ai-chat-flow-permission-select", attrs: {id: "ai-chat-flow-permission", "aria-label": "What Joe can do with the shared Flow in this chat"}});
    const permWrap = el("span", {cls: "tooltip-wrapper ai-chat-flow-permission-wrapper", children: [perm]});
    perm.addEventListener("change", () => {
      st.mode = perm.value;
      renderState();
    });
    chips.append(modelWrap, permWrap);
    composerBox.appendChild(chips);

    chat.append(msgs, composerBox);
    content.append(selector, chat);
    speech.buildSpell(content).classList.add("gs-joe-shown"); // G7: the app's own Spelling and Transcribe panels, shown one at a time by setTab
    speech.buildTranscribe(content).classList.add("gs-joe-shown");
    refs.spellPanel = $("#spell-check-panel", content);
    refs.transPanel = $("#transcribe-panel", content);
    refs.spellPanel.hidden = true;
    refs.transPanel.hidden = true;
    refs.selector = selector;
    refs.chat = chat;
    images.build({tabs, tChat, chat, selector, content, panel}); // G6b
    panel.append(header, tabs, target, content);
    modal.appendChild(panel);
    dock.appendChild(modal);
    container.append(resizer, scrim, dock);

    refs = {...refs, live, liveLabel, msgs, input, send, spell, mic, attach, perm, permWrap, modelWrap, scrim, panel};
    speech.bindComposer({area, input, spellBtn: spell, micBtn: mic}); // G7: prompt spell check and dictation
    send.addEventListener("click", () => submit());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submit();
      }
    });
    input.addEventListener("input", renderState);
    renderStatic();
    renderWelcome();
    renderState();
  }

  // Everything that depends on the role / switch, not on a turn in flight.
  function renderTargets() {
    const keep = st.focus && S.byId.has(st.focus) ? st.focus : "";
    st.focus = keep || null;
    refs.pick.replaceChildren();
    const sel = S.byId.get(S.selectedId);
    refs.pick.appendChild(el("option", {text: sel ? `Following your selection: ${quoteOf(sel.name).slice(0, 40)}` : "Following your selection", attrs: {value: ""}}));
    const walk = (nodes, trail) => {
      for (const n of nodes) {
        const label = [...trail, n.name].join(" \u203a ");
        refs.pick.appendChild(el("option", {text: quoteOf(label).slice(0, 80), attrs: {value: n.id}}));
        walk(n.children || [], [...trail, n.name]);
      }
    };
    walk(S.roots, []);
    refs.pick.value = keep;
  }

  function renderStatic() {
    renderTargets();
    const view = S.role !== "edit";
    refs.perm.replaceChildren();
    if (view) {
      refs.perm.appendChild(el("option", {text: "Read-only", attrs: {value: "read"}}));
      refs.perm.disabled = true;
      lock(refs.permWrap, viewTip());
      st.mode = "read";
      st.forcedRead = true;
    } else {
      if (st.forcedRead) st.mode = "propose";
      st.forcedRead = false;
      for (const [v, t] of [
        ["propose", "Propose & modify"],
        ["read", "Read-only"],
        ["off", "Off"]
      ])
        refs.perm.appendChild(el("option", {text: t, attrs: {value: v}}));
      refs.perm.value = st.mode;
      refs.perm.disabled = false;
      unlock(refs.permWrap);
      refs.permWrap.setAttribute("data-cx-tooltip", "What Joe can do with the shared Flow in this chat. Every change still needs your Apply.");
    }
    refs.input.placeholder = view ? "Ask Joe about this shared Flow…" : "Ask Joe about this shared Flow, or ask for a change…";
    // Spelling, Transcribe, prompt spell check and dictation run on the owner's AI account: live for an Edit guest while Joe is on and the owner is here,
    // otherwise visible but dimmed with the reason (never hidden).
    const aiTip = view ? viewTip() : st.enabled === false ? `${owner()} hasn't turned Joe on for this shared Flow` : S.offline ? `${owner()}'s FlowJoe is offline, and Joe runs there` : "";
    for (const t of refs.tabs) (aiTip ? lock : unlock)(t, aiTip);
    (aiTip ? lock : unlock)(refs.spell, aiTip);
    (aiTip ? lock : unlock)(refs.mic, aiTip);
    if (!aiTip) refs.mic.setAttribute("data-cx-tooltip", `Dictate. Your voice goes through ${owner()}'s FlowJoe to their AI provider (OpenAI) to become text.`);
    speech.setBlocked(aiTip || null);
    if (aiTip && st.tab !== "chat") setTab("chat"); // the panel says why (the chat card), and the tabs stay dimmed
    lock(refs.attach, "Attaching files from your computer is off in a shared Flow. Ask Joe about nodes in this Flow instead.");
  }

  function setLive(label, state) {
    refs.liveLabel.textContent = label;
    refs.live.setAttribute("data-state", state);
  }

  // The composer, live label and notices that follow the current state. Called after every change of state.
  function renderState() {
    if (!dock) return;
    $$(".gs-joe-state", refs.msgs).forEach((n) => n.remove());
    let disabled = false;
    let placeholder = S.role !== "edit" ? "Ask Joe about this shared Flow…" : "Ask Joe about this shared Flow, or ask for a change…";
    let live = ["Ready", "ready"];
    if (st.enabled === false) {
      disabled = true;
      placeholder = "Joe is off for this shared Flow";
      live = ["Off", "off"];
      refs.msgs.appendChild(stateCard("is-off", "fa-power-off", "Joe is off for this shared Flow", `${owner()} hasn't turned Joe on for this shared Flow. Everything else works as before; ask ${owner()} if you need Joe.`));
    } else if (S.offline) {
      disabled = true;
      placeholder = `Paused while ${S.ownerName ? iso(S.ownerName) : "the owner"} is offline`;
      live = ["Paused", "paused"];
      refs.msgs.appendChild(stateCard("is-paused", "fa-plug-circle-xmark", "Joe is paused", `${owner()}'s FlowJoe is offline, and Joe runs there. Your conversation is kept; you can write again when they're back.`));
    } else if (st.waiting) {
      disabled = true;
      placeholder = "Joe answers one request at a time…";
      live = ["Busy", "working"]; // the app styles "working" (its pulse, and its reduced-motion rule)
    } else if (st.busy) {
      disabled = true;
      live = ["Thinking", "working"];
    } else if (st.mode === "off") {
      disabled = true;
      placeholder = "Joe is off in this chat. Choose another option below to ask Joe.";
    }
    const imageLive = images.live(); // G6b
    if (imageLive) live = imageLive;
    setLive(live[0], live[1]);
    refs.input.disabled = disabled;
    refs.input.placeholder = placeholder;
    const empty = !refs.input.value.trim();
    refs.send.disabled = disabled || empty;
    if (st.waiting) lock(refs.send, "Joe answers one request at a time. Try again in a moment.");
    else unlock(refs.send);
    refs.send.setAttribute("aria-disabled", refs.send.disabled ? "true" : "false");
    for (const c of $$(".ai-chat-starter-chip", refs.msgs)) {
      if (disabled) lock(c, st.enabled === false ? `${owner()} hasn't turned Joe on for this shared Flow` : "Joe can't take a message right now");
      else unlock(c);
    }
    if (S.offline && !draftDropped && refs.input.value.trim()) {
      draftDropped = true; // the contract: an unsent draft is dropped, never sent later, and the person is told
      refs.input.value = "";
      richToast("warning", "fas fa-keyboard", ["Your unsent message to Joe wasn't kept"], `${owner()} went offline before it was sent.`);
    }
    if (!S.offline) draftDropped = false;
    $("#gsJoeNote")?.toggleAttribute("hidden", st.enabled === false);
  }

  function stateCard(cls, iconCls, headText, text) {
    const card = el("div", {cls: `gs-joe-state ${cls}`, attrs: {role: "status"}});
    card.appendChild(el("div", {cls: "gs-state-head", children: [icon(`fa-solid ${iconCls}`), el("span", {text: headText})]}));
    card.appendChild(el("p", {text}));
    return card;
  }

  // ---- the tabs (G7) ---------------------------------------------------------------------------------------------------------
  // The app drives its panel styles from data-mode on #ai-spell-check-panel; Chat keeps the page's own layout (no attribute), the others set it.
  function setTab(mode) {
    if (!refs.panel || !speech || (mode !== "chat" && (refs.tabs.some((t) => t.getAttribute("data-mode") === mode && t.classList.contains("cx-locked")) || speech.isBlocked()))) return;
    st.tab = mode;
    refs.allTabs.forEach((t) => {
      const on = t.getAttribute("data-mode") === mode;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (mode === "chat") refs.panel.removeAttribute("data-mode");
    else refs.panel.setAttribute("data-mode", mode);
    refs.selector.hidden = mode !== "chat";
    refs.chat.hidden = mode !== "chat";
    refs.spellPanel.hidden = mode !== "spell-check";
    refs.transPanel.hidden = mode !== "transcribe-audio";
    images.showTab("chat", {focus: false, keepOther: true}); // G6b: Image Generation steps aside (it also keeps the chat tab's look in step with this one)
    if (mode !== "chat") speech.refresh();
    const focusEl = mode === "spell-check" ? $("#ai-spell-check-go") : mode === "transcribe-audio" ? $("#ai-transcribe-run") : refs.input;
    if (focusEl && !focusEl.disabled) focusEl.focus({preventScroll: true});
  }

  // Image Generation (or Chat) was chosen: Spelling and Transcribe let go of the panel.
  function leaveSpeechTabs() {
    if (st.tab === "chat" || !refs.spellPanel) return;
    st.tab = "chat";
    refs.spellPanel.hidden = true;
    refs.transPanel.hidden = true;
    for (const t of refs.tabs) {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    }
  }

  // ---- messages --------------------------------------------------------------------------------------------------------------
  function renderWelcome() {
    if (refs.msgs.querySelector(".ai-chat-welcome")) return;
    const sel = S.byId.get(S.selectedId);
    const name = sel ? quoteOf(sel.name).slice(0, 40) : "";
    const welcome = el("div", {cls: "ai-chat-welcome", children: [el("span", {cls: "welcome-icon", text: "\u{1f44b}", attrs: {"aria-hidden": "true"}}), el("span", {text: "Hey there! I'm Joe. Whether you're brainstorming ideas, feeling stuck, or just want to talk through your flow, I'm here for it. Grab a coffee and let's chat!"})]});
    const chipsBox = el("div", {cls: "ai-chat-starter-chips"});
    const starters = [name ? `Summarize “${name}”` : "Summarize what's shared", "Find gaps in what's shared", name ? `What's still open in “${name}”?` : "What's still open here?"];
    for (const text of starters) {
      const chip = el("button", {cls: "ai-chat-starter-chip", text, attrs: {type: "button"}});
      chip.addEventListener("click", () => {
        if (chip.classList.contains("cx-locked")) return;
        refs.input.value = text;
        submit();
      });
      chipsBox.appendChild(chip);
    }
    const note = el("div", {cls: "gs-joe-note", attrs: {id: "gsJoeNote"}});
    note.appendChild(icon("fa-solid fa-circle-info"));
    const span = el("span");
    span.append(document.createTextNode("Joe runs on "), el("b", {text: S.ownerName ? `${S.ownerName}'s` : "the owner's", attrs: {dir: "auto"}}), document.createTextNode(` AI account and only sees what's shared with you. ${S.ownerName ? S.ownerName : "The owner"} can read this conversation; other guests can't.`));
    note.appendChild(span);
    refs.msgs.prepend(welcome, chipsBox, note);
  }
  function hideWelcome() {
    for (const e of $$(".ai-chat-welcome, .ai-chat-starter-chips, #gsJoeNote", refs.msgs)) e.hidden = true;
  }
  function bubble(role, content) {
    const m = el("div", {cls: `ai-chat-message ${role === "user" ? "user" : "assistant"}`});
    const b = el("div", {cls: "ai-chat-bubble ai-chat-bubble--markdown"});
    const md = el("div", {cls: "flowjoe-markdown flowjoe-markdown--chat"});
    if (typeof content === "string") {
      // what a person typed stays literal text; only Joe's reply goes through the DOM-building markdown renderer
      if (role === "user") md.appendChild(el("p", {text: content, attrs: {dir: "auto"}}));
      else md.appendChild(renderMarkdown(content));
    } else md.appendChild(content);
    b.appendChild(md);
    m.appendChild(b);
    refs.msgs.appendChild(m);
    return m;
  }
  function scrollDown() {
    refs.msgs.scrollTop = refs.msgs.scrollHeight;
  }
  function thinkingLine(label, iconText) {
    const l = el("div", {cls: "ai-chat-loading-message", attrs: {id: "ai-chat-loading", role: "status", "aria-live": "polite"}});
    l.appendChild(el("span", {cls: "ai-chat-loading-icon", text: iconText || "⏳", attrs: {"aria-hidden": "true"}}));
    l.append(document.createTextNode(" "), el("span", {cls: "ai-chat-loading-label", text: label}));
    refs.msgs.appendChild(l);
    return l;
  }

  // ---- proposal cards (the app's own approval card) -------------------------------------------------------------------------
  const kindWord = {edit: "Edit 1 node", create: "Add 1 node", move: "Move 1 node"};
  function settle(card, iconText, label, kind) {
    card.classList.add("fm-approval-settled", "fm-approval-collapsed");
    $(".fm-approval-actions", card)?.remove();
    const h = $(".fm-approval-headline", card);
    h.replaceChildren(el("span", {cls: "fm-approval-headline-close", text: iconText}), document.createTextNode(" "), el("span", {cls: "fm-approval-headline-label", text: `${label} — ${kindWord[kind] || "1 change"}`}));
    h.classList.add("fm-approval-headline-toggle");
    h.title = "Click to expand or collapse";
    h.addEventListener("click", () => card.classList.toggle("fm-approval-collapsed"));
  }
  function proposalCard(p, state) {
    const kind = p.summary && p.summary.kind;
    const card = el("div", {cls: "flow-mutation-approval-card", attrs: {"data-proposal": p.id}});
    card.appendChild(el("div", {cls: "fm-approval-headline", text: `Joe proposes: ${kindWord[kind] || "1 change"}`}));
    card.appendChild(el("div", {cls: "fm-approval-placement", text: String(p.summary.text || ""), attrs: {dir: "auto"}}));
    if (p.summary.preview) card.appendChild(el("div", {cls: "fm-approval-placement gs-fm-preview", text: String(p.summary.preview), attrs: {dir: "auto"}}));
    const me = S.presence.find((e) => e.self);
    const who = el("div", {cls: "gs-fm-guest"});
    who.appendChild(avatar(me ? me.name : "You", {mark: me ? markNumber(me.avatar) : 1, size: "xs", plain: true}));
    const span = el("span");
    span.append(document.createTextNode("Applies for everyone, credited to "), el("b", {text: `${me ? me.name : "you"} via Joe`, attrs: {dir: "auto"}}), document.createTextNode(". It can only change what's shared with you."));
    who.appendChild(span);
    card.appendChild(who);
    if (state === "applied") return settle(card, "✓", "Applied", kind), card;
    if (state === "rejected") return settle(card, "✕", "Rejected", kind), card;
    if (state === "closed") return settle(card, "✕", "Expired", kind), card;
    const actions = el("div", {cls: "fm-approval-actions"});
    const apply = el("button", {cls: "fm-approval-apply", text: "Apply", attrs: {type: "button"}});
    const revise = el("button", {cls: "fm-approval-revise", text: "Revise…", attrs: {type: "button"}});
    const reject = el("button", {cls: "fm-approval-reject", text: "Reject", attrs: {type: "button"}});
    actions.append(apply, revise, reject);
    card.appendChild(actions);
    apply.addEventListener("click", () => applyProposal(card, p));
    reject.addEventListener("click", () => rejectProposal(card, p, "✕", "Rejected"));
    revise.addEventListener("click", async () => {
      await rejectProposal(card, p, "↻", "Revised");
      refs.input.placeholder = "Tell Joe what to change…";
      refs.input.focus();
    });
    return card;
  }
  async function rejectProposal(card, p, iconText, label) {
    settle(card, iconText, label, p.summary.kind);
    try {
      await api.joeReject(p.id);
    } catch (_) {
      /* the card is settled here either way; the owner's copy expires by itself */
    }
  }
  async function applyProposal(card, p) {
    const btns = $$(".fm-approval-actions button", card);
    btns.forEach((b) => (b.disabled = true));
    let r;
    try {
      r = await api.joeApply(p.id);
    } catch (_) {
      btns.forEach((b) => (b.disabled = false));
      return richToast("warning", "fas fa-plug-circle-xmark", ["Couldn't reach the owner"], "Nothing was changed. Press Apply to try again.");
    }
    if (r.status === 401) return hooks.endNow();
    if (r.status === 200 && r.json && r.json.ok) {
      settle(card, "✓", "Applied", p.summary.kind);
      const nodeId = r.json.nodeId || r.json.id || p.summary.nodeId;
      if (nodeId) hooks.creditOwn(nodeId, {kind: p.summary.kind, field: p.summary.kind === "edit" && p.summary.preview ? "notes" : "name", viaJoe: true});
      await hooks.reread();
      offerUndo({changeId: r.json.changeId, card, p, nodeName: p.summary.nodeName, sentAt: Date.now()});
      return;
    }
    const code = r.json && r.json.error;
    if (r.status === 403 && code === "joe_unavailable") {
      refresh();
      return settle(card, "✕", "Not applied", p.summary.kind);
    }
    if (r.status === 503) {
      btns.forEach((b) => (b.disabled = false));
      return richToast("warning", "fas fa-triangle-exclamation", [`${owner()}'s FlowJoe is busy`], "Nothing was changed. Press Apply to try again.");
    }
    settle(card, "✕", "Not applied", p.summary.kind);
    const locked = r.status === 423;
    richToast("warning", "fas fa-triangle-exclamation", [locked ? "That part of the Flow is locked now" : "Joe's change couldn't be applied"], code === "expired" ? "That proposal is no longer open. Ask Joe again." : "Nothing was changed.");
  }

  // The guarded five-second Undo: only sent if nobody changed that spot since (the owner enforces it), exactly like a typed edit's.
  function offerUndo({changeId, card, p, nodeName, sentAt}) {
    if (typeof changeId !== "string" || !changeId) return;
    if (st.undoOffer) settleOffer(st.undoOffer);
    const remaining = Math.max(0, UNDO_WINDOW_MS - (Date.now() - sentAt) - 250);
    const offer = {n: null, timer: null};
    offer.n = richToast("info", "fas fa-rotate-left", ["Joe's change is in the shared Flow"], `${nodeName ? quoteOf(nodeName) + " · " : ""}credited to you via Joe`, {undo: {windowMs: remaining, onUndo: () => doUndo({offer, changeId, card, p, nodeName})}});
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
    settleToast(offer.n, "info", "fas fa-check", ["Joe's change is in the shared Flow"], `Saved. ${owner()} can still undo it from History.`);
  }
  async function doUndo({offer, changeId, card, p, nodeName}) {
    const btn = offer.n.querySelector(".notification-undo-btn");
    if (btn) btn.disabled = true;
    clearTimeout(offer.timer);
    let r;
    try {
      r = await api.undo(changeId);
    } catch (_) {
      return settleToast(offer.n, "warning", "fas fa-triangle-exclamation", ["Undo wasn't sent"], `Couldn't reach ${owner()}. Joe's change stays.`);
    }
    const c = classifyUndoAnswer(r.status, r.json);
    if (st.undoOffer === offer) st.undoOffer = null;
    if (c.kind === "ended") return hooks.endNow();
    if (c.kind === "undone") {
      settle(card, "↶", "Undone", p.summary.kind);
      settleToast(offer.n, "info", "fas fa-check", ["Undone. ", quoted(nodeName || "The node"), " is back how it was"], "Rolled back for everyone.");
      await hooks.reread();
      return;
    }
    const copy = undoCopy(c.kind, {what: `Joe's change to “${quoteOf(nodeName || "this node")}”`, node: quoteOf(nodeName || "this node")});
    const sub = c.kind === "changed_since" ? "Someone changed it after Joe's change, and undoing would erase their change. Joe's change stays." : copy.sub.replace("Your edit stays", "Joe's change stays");
    settleToast(offer.n, copy.tone, copy.icon, [copy.title], sub, 12000);
  }

  // ---- a turn --------------------------------------------------------------------------------------------------------------
  const FIXED = {
    view: "You can view this Flow, so I can't change it for you. Ask the owner for edit access. I can still explain or summarize anything that's shared with you.",
    scope: "I can only work with what's shared with you here, so I didn't change anything. I can make a change inside what's shared with you instead, or you can ask the owner to make that one.",
    unsupported: "I can't delete nodes for you here. You can delete one yourself in the Flow, with the usual confirmation."
  };
  function errorBubble(text, retry) {
    const m = bubble("joe", `⚠️ ${text}`);
    if (retry) {
      const actions = el("div", {cls: "ai-chat-actions"});
      const btn = el("button", {cls: "btn ai-chat-new-btn", text: "Try again", attrs: {type: "button"}});
      btn.addEventListener("click", () => {
        m.remove();
        submit(retry);
      });
      actions.appendChild(btn);
      m.appendChild(actions);
    }
    scrollDown();
  }
  function startBusyWait() {
    st.waiting = true;
    renderState();
    clearTimeout(st.retryTimer);
    st.retryTimer = setTimeout(() => {
      st.waiting = false;
      renderState();
    }, BUSY_RETRY_MS);
  }

  async function submit(retry) {
    const text = retry ? retry.text : refs.input.value.trim();
    if (!text || st.busy || st.waiting || st.enabled === false || S.offline || st.mode === "off") return;
    hideWelcome();
    $$("#ai-chat-loading", refs.msgs).forEach((n) => n.remove());
    if (!retry) bubble("user", text);
    const requestId = retry ? retry.requestId : newRequestId();
    refs.input.value = "";
    st.busy = true;
    renderState();
    const line = thinkingLine("Joe is thinking...");
    scrollDown();
    let r = null;
    try {
      r = await api.joeChat({message: text, ...(st.focus || S.selectedId ? {nodeId: st.focus || S.selectedId} : {}), ...(st.mode === "read" || S.role !== "edit" ? {mode: "read"} : {})}, requestId);
    } catch (_) {
      r = null;
    }
    line.remove();
    st.busy = false;
    const json = r && r.json;
    if (r && r.status === 401) return hooks.endNow();
    if (r && r.status === 200 && json && json.ok) {
      const body = typeof json.reply === "string" ? json.reply : "";
      bubble("joe", body || "…");
      if (json.blocked && FIXED[json.blocked]) bubble("joe", json.blocked === "view" ? FIXED.view.replace("the owner", owner()) : FIXED[json.blocked].replace("the owner", owner()));
      for (const p of Array.isArray(json.proposals) ? json.proposals : []) refs.msgs.appendChild(proposalCard(p, "open"));
      renderState();
      scrollDown();
      return;
    }
    const err = json && json.error;
    if (r && r.status === 503 && err === "busy") {
      refs.input.value = text; // the message is kept: nothing was sent to Joe
      startBusyWait();
      return;
    }
    if (r && r.status === 403 && err === "joe_unavailable") {
      refs.input.value = text;
      st.enabled = false;
      renderStatic();
      renderState();
      return;
    }
    if (r && r.status === 403 && err === "role_forbidden") {
      refresh();
      return errorBubble("Your access changed, so Joe can't take that. Nothing in the Flow changed.");
    }
    renderState();
    if (r && r.status === 503 && err === "joe_not_configured") return errorBubble(`Joe isn't set up on ${owner()}'s computer yet, so he can't answer. Nothing in the Flow changed.`);
    if (r && r.status === 429) {
      return errorBubble(err === "daily_cap" ? "You've used all of today's messages to Joe in this shared Flow. Try again tomorrow. Nothing in the Flow changed." : "You're sending messages quickly. Wait a moment and try again.", {text, requestId});
    }
    errorBubble("Joe couldn't answer just now. Nothing in the Flow changed. Try again in a moment.", {text, requestId});
    scrollDown();
  }

  // The app overlays Joe on the gallery (instead of squeezing it) at 1100px and below, and re-decides on every resize. collab.css hangs the opaque background on
  // body.joe-dock-overlay, so the class must follow the window while the panel is open.
  function syncOverlay() {
    const overlay = st.open && innerWidth <= OVERLAY_MAX_PX;
    document.body.classList.toggle("joe-dock-overlay", overlay);
    if (refs.scrim) refs.scrim.hidden = !overlay;
  }

  // ---- open / close, the rail button, the status check ------------------------------------------------------------------------
  function setOpen(open) {
    if (!dock) return;
    st.open = open && (st.enabled === true || images.available()); // the rail button is hidden until the host has said Joe (or picture generation, G6b) is on, so a click before that (or when both are off) opens nothing
    document.body.classList.toggle("joe-docked-open", st.open);
    refs.railBtn?.classList.toggle("active", st.open);
    refs.railBtn?.setAttribute("aria-pressed", st.open ? "true" : "false");
    document.documentElement.style.setProperty("--gallery-scrubber-fixed-right", st.open ? SCRUBBER_RIGHT_OPEN : SCRUBBER_RIGHT_CLOSED);
    if (st.open) {
      refs.railBtn?.removeAttribute("data-cx-tooltip");
      if (st.enabled !== true && images.available()) images.showTab("images", {focus: false}); // G6b: Joe is off but pictures are on: open on the tab that works
      if (!st.loaded) loadHistory();
      refresh();
      setTimeout(() => refs.input && !refs.input.disabled && refs.input.focus({preventScroll: true}), 30);
    }
    syncOverlay();
  }

  async function loadHistory() {
    let r;
    try {
      r = await api.joeHistory();
    } catch (_) {
      return;
    }
    if (!(r.status === 200 && r.json && r.json.ok === true && r.json.enabled === true)) return;
    st.loaded = true;
    const list = Array.isArray(r.json.messages) ? r.json.messages : [];
    if (!list.length) return;
    hideWelcome();
    for (const m of list) {
      if (m.role === "user") bubble("user", String(m.text || ""));
      else {
        bubble("joe", String(m.text || ""));
        if (m.blocked && FIXED[m.blocked]) bubble("joe", FIXED[m.blocked].replace("the owner", owner()));
        for (const p of Array.isArray(m.proposals) ? m.proposals : []) refs.msgs.appendChild(proposalCard(p, p.state === "open" ? "open" : p.state));
      }
    }
    scrollDown();
  }

  // Is Joe on for this share? Hides the rail button entirely while it is off or the owner has no Joe route (mockup 4k: "no Joe button at all");
  // an open panel turns into the off state. Called at mount, on open and every STATUS_POLL_MS.
  async function refresh() {
    if (!dock) return;
    images.refresh(); // G6b: the owner's picture-generation switch is read on the same rhythm as Joe's
    let r;
    try {
      r = await api.joeHistory();
    } catch (_) {
      return; // offline or slow: keep what is shown
    }
    if (r.status === 401) return hooks.endNow();
    const was = st.enabled;
    if (r.status === 200 && r.json && r.json.ok === true) st.enabled = r.json.enabled === true;
    else if (r.status === 404 || r.status === 403) st.enabled = false;
    else return;
    if (st.enabled !== was) {
      renderStatic();
      if (st.enabled && !st.loaded && st.open) loadHistory();
    }
    updateRail();
    renderState();
  }

  function mount() {
    dispose();
    build();
    const btn = $("#app-rail-joe-btn");
    refs.railBtn = btn;
    if (btn) {
      btn.hidden = true; // until the owner says Joe is on for this share
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => setOpen(!st.open));
    }
    st.timer = setInterval(refresh, STATUS_POLL_MS);
    addEventListener("resize", syncOverlay);
    return refresh();
  }

  function dispose() {
    removeEventListener("resize", syncOverlay);
    clearInterval(st.timer);
    clearTimeout(st.retryTimer);
    clearTimeout(st.undoOffer && st.undoOffer.timer);
    st.undoOffer = null;
    if (speech) speech.dispose();
    speech = null;
    st.tab = "chat";
    st.open = false;
    st.loaded = false;
    st.enabled = null;
    st.busy = false;
    st.waiting = false;
    document.body.classList.remove("joe-docked-open", "joe-dock-overlay");
    images.dispose(); // G6b
  }

  // The page's render cycle calls these: role changes and offline/online both change what the panel allows.
  function sync() {
    if (!dock) return;
    images.sync(); // G6b
    renderStatic();
    renderState();
    if (speech && st.tab !== "chat") speech.refresh(); // G7: the node or its text changed: the open Spelling / Transcribe tab follows
  }

  // G7: the page's media list changed (an audio slot came or went): the Transcribe tab's source list follows it.
  const mediaChanged = () => {
    if (speech && st.tab === "transcribe-audio") speech.refresh();
  };
  return {mount, sync, dispose, refresh, mediaChanged, isOpen: () => st.open, isEnabled: () => st.enabled === true};
}
