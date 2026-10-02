// G3: the shared node's media slots (pictures, audio, video, documents), the slot preview, native playback and the Flow-level audio player.
// Everything that came from the owner (names, notes) is written with textContent. No inline styles (strict CSP): classes, hidden, and the CSSOM.
//
// How bytes reach the page:
//  - audio and video use the browser's own <audio>/<video> elements pointed at the owner address with crossorigin="use-credentials"
//    (the same-site session cookie travels), preload="metadata": the browser asks for ranges, the owner answers at most 1 MiB each,
//    playback starts after the first chunk and a seek is a new range. Nothing is downloaded up front and nothing is saved to disk.
//  - a picture needs all its bytes, so it is fetched in ranged chunks (1 MiB each) into a Blob URL that lives in memory only.
//  - the owner address is the ONLY origin media is ever requested from (CSP media-src / connect-src).
import {$, $$, el, icon, iso} from "./dom.js";

const CHUNK = 1024 * 1024;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024; // a bigger picture is not pulled into the browser
const MAX_CACHED_IMAGES = 24;
const TYPE_LABEL = {image: "IMAGE", audio: "AUDIO", video: "VIDEO", document: "DOCUMENT", file: "FILE"};
const TYPE_ICON = {image: "fa-solid fa-image", audio: "fa-solid fa-music", video: "fa-solid fa-film", document: "fa-solid fa-file-lines", file: "fa-solid fa-file"};

export function createMedia({S, api, hooks}) {
  let items = []; // the shared index: [{nodeId, mediaId, state, mime, type, name?, title?, notes?, size?}] in the owner's order
  let loaded = false;
  let alive = true;
  let seq = 0;
  const units = new Map(); // mediaId -> {unit, item, controller}  (kept across renders so a playing element is never rebuilt)
  const images = new Map(); // mediaId -> {url, size}  in-memory Blob URLs, bounded
  const loading = new Map(); // mediaId -> Promise (one fetch per picture at a time)
  let modal = null;
  let header = null;

  const owner = () => (S.ownerName ? `${iso(S.ownerName)}'s` : "The owner's");
  const ownerWho = () => (S.ownerName ? `${iso(S.ownerName)}` : "The owner");

  // ---- index -----------------------------------------------------------------------------------------------------------
  async function refresh() {
    const my = ++seq;
    let r;
    try {
      r = await api.mediaIndex();
    } catch (_) {
      return false; // network: keep what we have; the live channel owns the offline state
    }
    if (!alive || my !== seq) return false;
    if (r.status === 401) {
      hooks.endNow();
      return false;
    }
    if (r.status !== 200 || !r.json || !r.json.ok || !Array.isArray(r.json.media)) return false;
    items = r.json.media;
    loaded = true;
    const keep = new Set(items.map((i) => i.mediaId));
    for (const [id, rec] of [...units]) if (!keep.has(id)) drop(id, rec);
    for (const id of [...images.keys()]) if (!keep.has(id)) forgetImage(id);
    sync();
    if (header) header.refreshList();
    if (hooks && typeof hooks.changed === "function") hooks.changed();
    return true;
  }

  const forNode = (nodeId) => items.filter((i) => i.nodeId === nodeId);

  function forgetImage(id) {
    const hit = images.get(id);
    if (hit) URL.revokeObjectURL(hit.url);
    images.delete(id);
  }

  function drop(id, rec) {
    if (rec.controller) rec.controller.abort();
    for (const m of $$("audio, video", rec.unit)) {
      m.pause();
      m.removeAttribute("src");
      m.load();
    }
    rec.unit.remove();
    units.delete(id);
  }

  // ---- slot cards ------------------------------------------------------------------------------------------------------
  // Called after every render: reconciles the cards of the selected node with the index. Existing cards (and their playing elements)
  // stay in place; their text is updated in place.
  function sync() {
    const host = gridHost();
    if (!host || !alive) return;
    const node = S.selectedId ? S.byId.get(S.selectedId) : null;
    const want = node ? forNode(node.id) : [];
    const wantIds = new Set(want.map((i) => i.mediaId));
    $("#image-display")?.classList.toggle("gs-has-media", want.length > 0);
    layout(host);
    for (const [id, rec] of [...units]) if (!wantIds.has(id)) drop(id, rec);
    want.forEach((item, i) => {
      let rec = units.get(item.mediaId);
      if (!rec) {
        rec = {unit: buildCard(item, i), item, controller: null};
        units.set(item.mediaId, rec);
        host.appendChild(rec.unit);
        hydrate(rec);
      } else {
        const stateChanged = rec.item.state !== item.state || rec.item.size !== item.size;
        rec.item = item;
        updateText(rec.unit, item, i);
        if (stateChanged) {
          rec.unit.querySelector(".gs-media")?.replaceChildren();
          hydrate(rec);
        }
        if (rec.unit.parentElement !== host) host.appendChild(rec.unit);
      }
    });
    // keep the owner's order; a card is only moved when the order really differs (moving a playing element would pause it)
    const order = want.map((i) => units.get(i.mediaId).unit);
    if (order.some((u, i) => host.children[i] !== u)) host.append(...order);
  }

  // Start the grid just below the node's notes card, measured, not assumed. Re-run on resize: a narrower window can make that card taller.
  function layout(host = $(".gs-media-grid")) {
    if (!host) return;
    const notesCard = $(".image-gallery .enum-image-unit");
    host.style.setProperty("--gs-grid-top", notesCard ? `calc(${notesCard.offsetTop + notesCard.offsetHeight}px + var(--modal-column-gap))` : "0px");
  }

  // The cards live in a CSS grid (no absolute placement): it wraps to the width the canvas has, one column on a phone.
  function gridHost() {
    const display = $("#image-display");
    if (!display) return null;
    let g = $(".gs-media-grid", display);
    if (!g) {
      g = el("div", {cls: "gs-media-grid", attrs: {"aria-label": "Slots"}});
      display.appendChild(g);
    }
    return g;
  }

  function updateText(unit, item, i) {
    const num = $(".gs-media-num", unit);
    if (num) num.textContent = `${i + 1}.`;
    const title = $(".gs-media-title", unit);
    const t = item.title || item.name || "";
    if (title && title.value !== t) title.value = t;
    const ta = $(".gs-media-notes", unit);
    if (ta) {
      if (ta.value !== (item.notes || "")) ta.value = item.notes || "";
      ta.hidden = !item.notes; // an empty note box is not shown
    }
  }

  // The card is this page's own markup (own classes, app tokens): it does not borrow the app canvas card's absolute-position classes.
  function buildCard(item, i) {
    const unit = el("article", {cls: "gs-media-unit", attrs: {"data-media-id": item.mediaId, "data-slot-index": String(i), "data-media-type": item.type || "file"}});
    const head = el("div", {cls: "gs-media-head"});
    head.appendChild(el("span", {cls: "gs-media-num", attrs: {"aria-hidden": "true"}}));
    head.appendChild(el("input", {cls: "gs-media-title", attrs: {type: "text", readonly: "", "aria-label": "Slot title", dir: "auto"}}));
    const open = el("button", {cls: "gs-media-open", attrs: {type: "button", "aria-label": `Preview of Slot ${i + 1}`, title: "Preview"}, children: [icon("fa-solid fa-up-right-and-down-left-from-center")]});
    open.addEventListener("click", () => openPreview(item.mediaId));
    head.appendChild(open);
    unit.appendChild(head);
    const frame = el("div", {cls: "gs-media-frame"});
    frame.appendChild(el("span", {cls: "gs-media-type", text: TYPE_LABEL[item.type] || "FILE"}));
    frame.appendChild(el("div", {cls: "gs-media"}));
    unit.appendChild(frame);
    unit.appendChild(el("textarea", {cls: "gs-media-notes", attrs: {readonly: "", rows: "3", "aria-label": "Slot notes", dir: "auto"}}));
    frame.addEventListener("dblclick", (e) => {
      if (e.target.closest("audio, video, button")) return;
      openPreview(item.mediaId);
    });
    updateText(unit, item, i);
    return unit;
  }

  // ---- the media area of one card ----------------------------------------------------------------------------------------
  function hydrate(rec) {
    const area = rec.unit.querySelector(".gs-media");
    if (!area) return;
    fill(area, rec.item, {compact: true});
  }

  // Builds the media content for `item` into `area` (card or preview). Returns nothing; replaces the area's children.
  function fill(area, item, {compact}) {
    area.replaceChildren();
    area.dataset.state = item.state;
    if (item.state === "local_only") return area.appendChild(localFile(item));
    if (item.state !== "shared") return area.appendChild(stateTile("fa-solid fa-circle-question", item.name || "This file", "This file isn't available right now. It may have been moved or removed."));
    if (item.type === "image") return fillImage(area, item, compact);
    if (item.type === "audio") return fillPlayer(area, item, "audio");
    if (item.type === "video") return fillPlayer(area, item, "video");
    return area.appendChild(stateTile(TYPE_ICON[item.type] || TYPE_ICON.file, item.name || "File", item.type === "document" ? "Documents can't be opened in a shared view." : "This type of file can't be shown here."));
  }

  function localFile(item) {
    const box = el("div", {cls: "gs-localfile", attrs: {role: "img", "aria-label": "File not available in the shared view"}});
    box.appendChild(icon("fa-solid fa-hard-drive"));
    box.appendChild(el("b", {text: item.name || "This file", attrs: {dir: "auto"}}));
    box.appendChild(el("p", {text: `This file is stored on ${owner() === "The owner's" ? "the owner's" : owner()} computer and isn't available in this shared browser view. ${ownerWho()} can add a shared copy.`}));
    return box;
  }

  function stateTile(iconCls, name, text, {action} = {}) {
    const box = el("div", {cls: "gs-media-state", attrs: {role: "status"}});
    box.appendChild(icon(iconCls));
    box.appendChild(el("b", {text: name, attrs: {dir: "auto"}}));
    box.appendChild(el("p", {text}));
    if (action) {
      const b = el("button", {cls: "flowjoe-modal-control-btn gs-media-retry", text: action.label, attrs: {type: "button"}});
      b.addEventListener("click", action.run);
      box.appendChild(b);
    }
    return box;
  }

  function loadingTile(label) {
    const box = el("div", {cls: "gs-media-loading", attrs: {role: "status", "aria-live": "polite"}});
    box.appendChild(el("span", {cls: "gs-media-spinner", attrs: {"aria-hidden": "true"}}));
    box.appendChild(el("span", {text: label}));
    return box;
  }

  function offlineTile(retry) {
    return stateTile("fa-solid fa-plug-circle-xmark", `${owner()} FlowJoe is offline`, "What already loaded keeps working. This reloads when they're back.", {action: {label: "Try again", run: retry}});
  }

  // ---- pictures: ranged chunks -> one in-memory Blob URL ---------------------------------------------------------------------
  function fillImage(area, item, compact) {
    const cached = images.get(item.mediaId);
    if (cached && cached.size === item.size) return area.appendChild(imageEl(cached.url, item));
    if (item.size > MAX_IMAGE_BYTES) return area.appendChild(stateTile("fa-solid fa-image", item.name || "Picture", "This picture is too large to show in the browser."));
    area.appendChild(loadingTile("Loading picture…"));
    loadImage(item).then(
      (url) => {
        if (!alive || !area.isConnected) return;
        area.replaceChildren(imageEl(url, item));
      },
      (err) => {
        if (!alive || !area.isConnected) return;
        if (err && err.ended) return;
        area.replaceChildren(err && err.network ? offlineTile(() => fill(area, item, {compact})) : stateTile("fa-solid fa-triangle-exclamation", item.name || "Picture", "Couldn't load this picture.", {action: {label: "Try again", run: () => fill(area, item, {compact})}}));
      }
    );
  }

  function imageEl(url, item) {
    const img = el("img", {cls: "gs-media-img", attrs: {alt: item.title || item.name || "Shared picture", draggable: "false"}});
    img.addEventListener("error", () => {
      // bytes that do not decode as a picture: forget them and say so, instead of a broken-image icon
      forgetImage(item.mediaId);
      const area = img.closest(".gs-media");
      if (area) area.replaceChildren(stateTile("fa-solid fa-triangle-exclamation", item.name || "Picture", "Couldn't load this picture.", {action: {label: "Try again", run: () => fill(area, item, {compact: true})}}));
    });
    img.src = url;
    return img;
  }

  function loadImage(item) {
    const hit = images.get(item.mediaId);
    if (hit && hit.size === item.size) return Promise.resolve(hit.url);
    if (loading.has(item.mediaId)) return loading.get(item.mediaId);
    const p = (async () => {
      const parts = [];
      let type = "";
      let total = item.size;
      for (let start = 0; start < total; start += CHUNK) {
        const end = Math.min(total, start + CHUNK) - 1;
        let r = await api.mediaChunk(item.mediaId, start, end);
        // The owner's per-invite read budget answered 429 + Retry-After: wait that long (bounded) and ask again, instead of failing the picture.
        for (let tries = 0; r.status === 429 && tries < 4 && alive; tries++) {
          await new Promise((done) => setTimeout(done, Math.min(Math.max(r.retryAfter || 1, 1), 3) * 1000));
          r = await api.mediaChunk(item.mediaId, start, end);
        }
        if (!alive) {
          const e = new Error("ended");
          e.ended = true;
          throw e;
        }
        if (r.status === 401) {
          hooks.endNow();
          const e = new Error("ended");
          e.ended = true;
          throw e;
        }
        if (!r.bytes || (r.status !== 206 && r.status !== 200) || r.bytes.length !== end - start + 1) throw new Error("bad_chunk");
        if (r.total !== null && r.total !== undefined) total = r.total;
        type = r.type || type;
        parts.push(r.bytes);
      }
      // The owner's answer must really be a picture type (the server decides it from the bytes): anything else is never handed to <img>.
      if (!/^image\/(png|jpeg|gif|webp)$/.test(type)) throw new Error("not_image");
      const url = URL.createObjectURL(new Blob(parts, {type: /^image\/(png|jpeg|gif|webp)$/.test(type) ? type : "application/octet-stream"}));
      images.set(item.mediaId, {url, size: item.size});
      while (images.size > MAX_CACHED_IMAGES) forgetImage(images.keys().next().value);
      return url;
    })().finally(() => loading.delete(item.mediaId));
    loading.set(item.mediaId, p);
    return p;
  }

  // ---- audio / video: the browser's native element, ranged by the browser ---------------------------------------------------------
  function fillPlayer(area, item, kind) {
    const wrap = el("div", {cls: `gs-player gs-player--${kind}`});
    const status = el("div", {cls: "gs-player-status", attrs: {role: "status", "aria-live": "polite"}});
    const media = el(kind, {cls: kind === "video" ? "gs-media-video" : "gs-media-audio", attrs: {controls: "", preload: "metadata", crossorigin: "use-credentials", playsinline: "", controlslist: "nodownload noplaybackrate", "aria-label": item.title || item.name || (kind === "video" ? "Shared video" : "Shared audio")}});
    media.disablePictureInPicture = true;
    if (kind === "audio") {
      // An icon tile, not the app's 2 MB album-art-placeholder.png (that file is not shipped with the join site).
      wrap.appendChild(el("div", {cls: "gs-audio-cover", attrs: {"aria-hidden": "true"}, children: [icon("fa-solid fa-music")]}));
    }
    wrap.appendChild(media);
    wrap.appendChild(status);
    area.appendChild(wrap);
    // loading until the first chunk arrives (metadata), then the native controls show
    wrap.classList.add("is-loading");
    status.replaceChildren(loadingTile(kind === "video" ? "Loading video…" : "Loading audio…"));
    const ready = () => {
      wrap.classList.remove("is-loading", "is-stopped");
      status.replaceChildren();
    };
    media.addEventListener("loadedmetadata", ready);
    media.addEventListener("canplay", ready);
    media.addEventListener("playing", ready);
    media.addEventListener("waiting", () => {
      if (S.offline) stop(wrap, status, media, item, kind);
      else if (media.readyState < 3) wrap.classList.add("is-buffering");
    });
    media.addEventListener("canplaythrough", () => wrap.classList.remove("is-buffering"));
    media.addEventListener("playing", () => wrap.classList.remove("is-buffering"));
    media.addEventListener("stalled", () => {
      if (S.offline && media.readyState < 3) stop(wrap, status, media, item, kind);
    });
    media.addEventListener("error", () => stop(wrap, status, media, item, kind));
    media.addEventListener("play", () => {
      // one thing plays at a time on this page
      for (const other of $$("audio, video")) if (other !== media && !other.paused && !other.id) other.pause();
    });
    media.src = api.mediaUrl(item.mediaId);
    return wrap;
  }

  // Playback cannot continue: say why in plain words. Only what the browser already buffered played; a fresh request happens on "Try again".
  function stop(wrap, status, media, item, kind) {
    media.pause();
    wrap.classList.remove("is-loading", "is-buffering");
    wrap.classList.add("is-stopped");
    const at = media.currentTime || 0;
    // Let go of the connection: the browser would otherwise keep retrying the failed request in the background and quietly resume on its
    // own when the owner returns. Resuming happens only through "Try again".
    media.removeAttribute("src");
    media.load();
    const retry = () => {
      wrap.classList.remove("is-stopped");
      status.replaceChildren(loadingTile("Reconnecting…"));
      wrap.classList.add("is-loading");
      media.removeAttribute("src");
      media.load();
      media.src = api.mediaUrl(item.mediaId); // a NEW request: nothing queued before is replayed
      if (at > 0)
        media.addEventListener(
          "loadedmetadata",
          () => {
            try {
              media.currentTime = at;
            } catch (_) {
              /* not seekable yet */
            }
          },
          {once: true}
        );
    };
    status.replaceChildren(S.offline ? offlineTile(retry) : stateTile("fa-solid fa-triangle-exclamation", item.name || (kind === "video" ? "Video" : "Audio"), "This couldn't be played.", {action: {label: "Try again", run: retry}}));
  }

  // The live channel flipped to offline: players that are loading, buffering or playing stop and say so (nothing is auto-resumed).
  function setOffline() {
    for (const rec of units.values()) {
      const wrap = rec.unit.querySelector(".gs-player");
      const media = wrap && wrap.querySelector("audio, video");
      if (media && !wrap.classList.contains("is-stopped") && media.readyState < 3 && (wrap.classList.contains("is-loading") || wrap.classList.contains("is-buffering") || !media.paused)) stop(wrap, wrap.querySelector(".gs-player-status"), media, rec.item, rec.item.type);
    }
    if (modal) modal.refreshOffline();
  }

  // ---- slot preview (the app's "Preview of Slot N" modal) -----------------------------------------------------------------------------
  function openPreview(mediaId) {
    const item = items.find((i) => i.mediaId === mediaId);
    if (!item || modal) return;
    for (const m of $$("audio, video")) if (!m.paused && !m.id) m.pause();
    const slot = forNode(item.nodeId).findIndex((i) => i.mediaId === mediaId) + 1;
    const returnFocus = document.activeElement;
    const root = el("div", {cls: "gs-modal-overlay", attrs: {id: "image-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "image-modal-heading"}});
    const box = el("div", {cls: "gs-modal", attrs: {id: "image-modal-content"}});
    const bar = el("div", {cls: "gs-modal-bar", attrs: {id: "image-modal-titlebar"}});
    bar.appendChild(el("span", {cls: "gs-modal-heading", text: `Preview of Slot ${slot}`, attrs: {id: "image-modal-heading"}}));
    const views = el("div", {cls: "gs-modal-views", attrs: {role: "group", "aria-label": "Preview layout"}});
    const modeBtns = {};
    for (const [mode, label] of [
      ["both", "Both"],
      ["text", "Text"],
      ["media", "Media"]
    ]) {
      const b = el("button", {cls: "flowjoe-modal-control-btn gs-modal-view" + (mode === "both" ? " is-active" : ""), text: label, attrs: {type: "button", "data-view-mode": mode, "aria-pressed": String(mode === "both")}});
      modeBtns[mode] = b;
      views.appendChild(b);
    }
    bar.appendChild(views);
    const full = el("button", {cls: "flowjoe-modal-control-btn gs-modal-icon", attrs: {type: "button", "aria-label": "Fill the window", title: "Fill the window"}, children: [icon("fa-solid fa-expand")]});
    const x = el("button", {cls: "flowjoe-modal-control-btn gs-modal-icon", attrs: {type: "button", id: "image-modal-close", "aria-label": "Close", title: "Close"}, children: [icon("fa-solid fa-xmark")]});
    // G7 (mockup 6c): the slot preview's spell-check, Joe and dictation buttons stay visible but dimmed, each with its reason on hover and focus. Slot text
    // is read-only in a shared view, so even with Joe on there is nothing here for them to change: Joe's Spelling tab does it for the node's notes.
    const aiState = hooks && typeof hooks.aiState === "function" ? hooks.aiState() : {};
    const aiReason = S.role === "view" ? `You can view this Flow. Ask ${ownerWho()} for edit access` : aiState.enabled === false ? `${ownerWho()} hasn't turned Joe on for this shared Flow` : "Slot text is read-only in a shared view. Use Joe's Spelling tab for this node's notes";
    const aiBtn = (id, iconCls, label) => {
      const b = el("button", {cls: "flowjoe-modal-control-btn gs-modal-icon cx-locked", attrs: {type: "button", id, "aria-disabled": "true", "aria-label": label, "data-cx-tooltip": aiReason}, children: [icon(iconCls)]});
      b.addEventListener("click", (e) => e.preventDefault());
      return b;
    };
    const aiTools = [aiBtn("preview-modal-spellcheck-btn", "fas fa-spell-check", "Check spelling"), aiBtn("preview-modal-ai-btn", "fas fa-robot", "Joe AI Assistant"), aiBtn("image-modal-dictate-btn", "fas fa-microphone", "Dictate text")];
    bar.appendChild(el("div", {cls: "gs-modal-window-controls", children: [...aiTools, full, x]}));
    box.appendChild(bar);

    const body = el("div", {cls: "gs-modal-body", attrs: {"data-view-mode": "both"}});
    const mediaPane = el("div", {cls: "gs-modal-media", attrs: {id: "image-container"}});
    const mediaArea = el("div", {cls: "gs-media gs-media--modal"});
    mediaPane.appendChild(mediaArea);
    const textPane = el("div", {cls: "gs-modal-text"});
    const title = el("input", {cls: "gs-modal-title", attrs: {type: "text", id: "image-modal-title", readonly: "", "aria-label": "Slot title", dir: "auto"}});
    title.value = item.title || item.name || "";
    const tabs = el("div", {cls: "gs-modal-tabs"});
    const slotTab = el("span", {cls: "gs-modal-tab is-active", text: "Slot"});
    const tagBtn = el("button", {cls: "flowjoe-modal-control-btn gs-modal-tags cx-locked", attrs: {type: "button", id: "image-modal-edit-tags", "aria-disabled": "true", "aria-label": "Tags", "data-cx-tooltip": S.role === "view" ? `You can view this Flow. Ask ${ownerWho()} for edit access` : "Tags on a slot can't be changed in a shared view"}, children: [icon("fa-solid fa-tags")]});
    tabs.appendChild(slotTab);
    tabs.appendChild(tagBtn);
    const notes = el("div", {cls: "gs-modal-notes", attrs: {id: "modal-notes-wrapper", tabindex: "0", role: "textbox", "aria-readonly": "true", "aria-label": "Slot notes", dir: "auto"}});
    notes.textContent = item.notes || "";
    if (!item.notes) notes.classList.add("is-empty");
    textPane.appendChild(title);
    textPane.appendChild(tabs);
    textPane.appendChild(notes);
    body.appendChild(mediaPane);
    body.appendChild(textPane);
    box.appendChild(body);

    const foot = el("div", {cls: "gs-modal-foot", attrs: {id: "image-modal-footer-actions"}});
    const meta = el("div", {cls: "gs-modal-meta"});
    if (S.role === "view") {
      const ro = el("span", {cls: "gs-readonly"});
      ro.appendChild(icon("fa-solid fa-eye"));
      ro.appendChild(el("span", {text: `You can view this Flow. Ask ${ownerWho()} for edit access.`}));
      meta.appendChild(ro);
    } else {
      const ro = el("span", {cls: "gs-readonly"});
      ro.appendChild(icon("fa-solid fa-lock"));
      ro.appendChild(el("span", {text: "Slot text is read-only in a shared view."}));
      meta.appendChild(ro);
    }
    const offlineNote = el("span", {cls: "gs-readonly gs-modal-offline", attrs: {role: "status"}});
    offlineNote.appendChild(icon("fa-solid fa-plug-circle-xmark"));
    offlineNote.appendChild(el("span", {text: `${owner()} FlowJoe is offline.`}));
    offlineNote.hidden = !S.offline;
    meta.appendChild(offlineNote);
    const close = el("button", {cls: "flowjoe-modal-control-btn", text: "Close", attrs: {type: "button", id: "image-modal-cancel", "aria-label": "Close"}});
    foot.appendChild(meta);
    foot.appendChild(el("div", {cls: "gs-modal-buttons", children: [close]}));
    box.appendChild(foot);
    root.appendChild(box);
    document.body.appendChild(root);
    document.body.classList.add("gs-modal-open");
    fill(mediaArea, item, {compact: false});

    const closeNow = () => {
      if (!modal) return;
      for (const m of $$("audio, video", root)) {
        m.pause();
        m.removeAttribute("src");
        m.load();
      }
      document.removeEventListener("keydown", onKey, true);
      root.remove();
      document.body.classList.remove("gs-modal-open");
      modal = null;
      if (returnFocus && returnFocus.isConnected && returnFocus.focus) returnFocus.focus();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeNow();
      } else if (e.key === "Tab") {
        const f = $$("button:not([disabled]), [tabindex='0'], audio[controls], video[controls]", box).filter((n) => !n.hidden && n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    close.addEventListener("click", closeNow);
    x.addEventListener("click", closeNow);
    root.addEventListener("mousedown", (e) => {
      if (e.target === root) closeNow();
    });
    full.addEventListener("click", () => box.classList.toggle("is-full"));
    for (const [mode, b] of Object.entries(modeBtns))
      b.addEventListener("click", () => {
        body.dataset.viewMode = mode;
        for (const [m2, b2] of Object.entries(modeBtns)) {
          b2.classList.toggle("is-active", m2 === mode);
          b2.setAttribute("aria-pressed", String(m2 === mode));
        }
      });
    modal = {
      root,
      mediaId,
      close: closeNow,
      refreshOffline: () => {
        offlineNote.hidden = !S.offline;
      }
    };
    close.focus();
  }

  // ---- the Flow-level audio player (the header play button) -----------------------------------------------------------------------------
  // Lists ONLY in-scope audio the owner serves (the index is already scope-filtered; hidden and private slots are not in it).
  function wireHeaderPlayer() {
    const audio = $("#header-audio-element");
    const box = $("#header-audio-player");
    if (!audio || !box || header) return;
    audio.setAttribute("crossorigin", "use-credentials");
    audio.preload = "none"; // nothing is requested until the person presses play
    const q = {
      play: $("#header-audio-play-btn"),
      next: $("#header-audio-next-btn"),
      restart: $("#header-audio-restart-btn"),
      seek: $("#header-audio-seek-range"),
      rate: $("#header-audio-rate-btn"),
      list: $("#header-audio-playlist-btn")
    };
    let current = -1;
    let menu = null;
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const playlist = () => items.filter((i) => i.type === "audio" && i.state === "shared");
    const setEnabled = () => {
      const has = playlist().length > 0;
      box.classList.toggle("is-empty", !has);
      for (const b of [q.play, q.next, q.restart, q.seek, q.rate]) if (b) b.disabled = !has;
      if (q.list) q.list.disabled = !has;
      q.play?.setAttribute("aria-label", has ? "Play audio from the shared Flow" : "No audio in the shared Flow");
    };
    const label = (it) => it.title || it.name || "Audio";
    const load = (i, {autoplay}) => {
      const list = playlist();
      if (!list.length) return;
      current = ((i % list.length) + list.length) % list.length;
      audio.removeAttribute("src");
      audio.load();
      audio.src = api.mediaUrl(list[current].mediaId);
      audio.dataset.mediaId = list[current].mediaId;
      if (autoplay) audio.play().catch(() => {});
      renderPlaylistMark();
    };
    const syncPlayIcon = () => {
      const i = q.play && q.play.querySelector("i");
      if (i) i.className = audio.paused ? "fa-solid fa-play" : "fa-solid fa-pause";
      q.play?.setAttribute("aria-label", audio.paused ? "Play audio from the shared Flow" : "Pause audio");
    };
    q.play?.addEventListener("click", () => {
      if (!playlist().length) return;
      if (!audio.getAttribute("src") || audio.error) load(Math.max(0, current), {autoplay: true});
      else if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });
    q.next?.addEventListener("click", () => load(current + 1, {autoplay: true}));
    q.restart?.addEventListener("click", () => {
      if (audio.currentTime > 3 || current <= 0) audio.currentTime = 0;
      else load(current - 1, {autoplay: true});
    });
    q.rate?.addEventListener("click", () => {
      const next = rates[(rates.indexOf(audio.playbackRate) + 1) % rates.length];
      audio.playbackRate = next;
      q.rate.textContent = `${next}x`;
      q.rate.setAttribute("aria-label", `Playback speed ${next}x`);
    });
    q.seek?.addEventListener("input", () => {
      if (audio.duration && Number.isFinite(audio.duration)) audio.currentTime = (Number(q.seek.value) / 1000) * audio.duration;
    });
    audio.addEventListener("timeupdate", () => {
      if (q.seek && audio.duration && Number.isFinite(audio.duration)) q.seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    });
    audio.addEventListener("play", () => {
      for (const o of $$("audio, video")) if (o !== audio && !o.paused) o.pause();
      syncPlayIcon();
    });
    audio.addEventListener("pause", syncPlayIcon);
    audio.addEventListener("ended", () => {
      if (current < playlist().length - 1) load(current + 1, {autoplay: true});
      else syncPlayIcon();
    });
    audio.addEventListener("error", () => {
      box.classList.add("is-stopped");
      q.play?.setAttribute("title", S.offline ? `${owner()} FlowJoe is offline` : "This couldn't be played");
      syncPlayIcon();
    });
    audio.addEventListener("playing", () => {
      box.classList.remove("is-stopped");
      q.play?.removeAttribute("title");
    });
    audio.addEventListener("waiting", () => {
      if (S.offline) {
        audio.pause();
        box.classList.add("is-stopped");
        q.play?.setAttribute("title", `${owner()} FlowJoe is offline`);
      }
    });
    function renderPlaylistMark() {
      if (!menu) return;
      const list = playlist();
      for (const [i, b] of $$(".gs-playlist-item", menu).entries()) b.classList.toggle("is-current", i === current && !!list[i]);
    }
    const closeMenu = () => {
      if (!menu) return;
      menu.remove();
      menu = null;
      box.classList.remove("gs-menu-open");
      q.list?.setAttribute("aria-expanded", "false");
    };
    q.list?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menu) return closeMenu();
      const list = playlist();
      menu = el("div", {cls: "gs-playlist", attrs: {role: "menu", "aria-label": "Audio in this Flow"}});
      if (!list.length) menu.appendChild(el("div", {cls: "gs-playlist-empty", text: "No audio is shared in this Flow."}));
      list.forEach((it, i) => {
        const b = el("button", {cls: "gs-playlist-item" + (i === current ? " is-current" : ""), attrs: {type: "button", role: "menuitem"}});
        b.appendChild(icon("fa-solid fa-music"));
        b.appendChild(el("span", {text: label(it), attrs: {dir: "auto"}}));
        b.addEventListener("click", () => {
          closeMenu();
          load(i, {autoplay: true});
        });
        menu.appendChild(b);
      });
      box.appendChild(menu);
      box.classList.add("gs-menu-open");
      q.list.setAttribute("aria-expanded", "true");
    });
    document.addEventListener("click", (e) => {
      if (menu && !menu.contains(e.target) && e.target !== q.list && !q.list.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu) closeMenu();
    });
    header = {
      audio,
      refreshList: () => {
        setEnabled();
        if (menu) {
          closeMenu();
        }
      },
      stop: () => {
        closeMenu();
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
    setEnabled();
  }

  function dispose() {
    alive = false;
    seq++;
    if (modal) modal.close();
    for (const [id, rec] of [...units]) drop(id, rec);
    for (const id of [...images.keys()]) forgetImage(id);
    if (header) header.stop();
    items = [];
  }

  // G7: the shared audio of one node (what the Transcribe tab can offer), in the owner's order. Only slots the owner serves right now.
  const audioItems = (nodeId) => items.filter((i) => i.nodeId === nodeId && i.type === "audio" && i.state === "shared");
  return {refresh, sync, layout, wireHeaderPlayer, openPreview, setOffline, dispose, audioItems, count: () => items.length, loaded: () => loaded};
}
