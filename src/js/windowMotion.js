// Window, dialog and menu motion (motion-design mockup, scenes 26-31): one family for every small window the app opens. A window grows out of the
// control (or the point) that opened it, its rows follow on a short beat, and closing goes back into that control a little faster than it opened.
// Motion only: what opens, when, where it is placed and what it does are the app's own; this only animates what the app already shows.
//
// Two rules keep the app's own placement intact:
// - motion is written to the independent opacity / translate / scale properties (and transform-origin inside the keyframes), never to `transform`,
//   because the app centres dialogs with transform: translate(-50%, -50%);
// - closing never delays the app: the window is closed (removed or hidden) at the moment the app closes it, and what the eye sees leave is a
//   "ghost": a still copy of the window as it looked, made inert and invisible to the app (no id, no class, no data, no aria), that fades back into
//   its control and is then removed.
//
// It stands down for reduced motion, for `localStorage.flowjoe_motion = "off"` (every motion in the family), and for
// `localStorage.flowjoe_motion_windows = "off"` (only these windows: today's open and close come back exactly; no reload needed).

import {canAnimate, springCurve} from "./motionSprings.js";

export const WINDOW_MOTION_SWITCH = "flowjoe_motion_windows";
const GHOST_ATTR = "data-fj-motion-ghost";

export function windowMotionOn(el, key = WINDOW_MOTION_SWITCH) {
  if (!canAnimate(el)) return false;
  try {
    if (localStorage.getItem(key) === "off") return false;
  } catch {
    /* storage unavailable: motion stays on */
  }
  return true;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

// The last press (pointer, or Enter / Space on a focused control): the control a window opens from when the code that opens it does not know.
let lastPress = null;
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  // On window, in the capture phase, so a press that the app stops on the document (a following guest's own click) is still seen.
  window.addEventListener("pointerdown", (e) => (lastPress = {el: e.target instanceof Element ? e.target : null, x: e.clientX, y: e.clientY, at: now()}), true);
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" || e.key === " ") lastPress = {el: document.activeElement instanceof Element ? document.activeElement : null, x: null, y: null, at: now()};
    },
    true
  );
}

export function recentPress(maxAgeMs = 1200) {
  return lastPress && now() - lastPress.at <= maxAgeMs ? lastPress : null;
}

// A screen point: an element's centre, a {x, y} point, or null.
export function pointOf(from) {
  if (!from) return null;
  if (typeof from.getBoundingClientRect === "function") {
    if (!from.isConnected) return null;
    const r = from.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return {x: r.left + r.width / 2, y: r.top + r.height / 2};
  }
  if (Number.isFinite(from.x) && Number.isFinite(from.y)) return {x: from.x, y: from.y};
  return null;
}

// Where the last press happened: the pointer's own point, or the focused control's centre for a key.
export function pressPoint(press = recentPress()) {
  if (!press) return null;
  if (Number.isFinite(press.x) && Number.isFinite(press.y)) return {x: press.x, y: press.y};
  return pointOf(press.el);
}

// transform-origin that makes `el` scale about the screen point. The origin lives in the element's layout box, so the translation the app gives it
// with `transform` (a centred dialog) is taken out of the measured rect first. Measured with the element at rest.
function originFor(el, pt) {
  const r = el.getBoundingClientRect();
  let e = 0;
  let f = 0;
  try {
    const tf = getComputedStyle(el).transform;
    if (tf && tf !== "none" && typeof DOMMatrixReadOnly === "function") {
      const m = new DOMMatrixReadOnly(tf);
      e = m.e;
      f = m.f;
    }
  } catch {
    /* no matrix: the rect is the box */
  }
  return `${(pt.x - (r.left - e)).toFixed(2)}px ${(pt.y - (r.top - f)).toFixed(2)}px`;
}

// The motion animations this file started on an element, so a newer motion replaces an older one instead of stacking on it.
const live = new WeakMap();
function keep(el, a) {
  const list = live.get(el) || [];
  list.push(a);
  live.set(el, list);
  const drop = () => {
    const cur = live.get(el);
    if (cur)
      live.set(
        el,
        cur.filter((x) => x !== a)
      );
  };
  a.addEventListener("finish", drop);
  a.addEventListener("cancel", drop);
  return a;
}
export function stopMotion(el) {
  const list = el ? live.get(el) : null;
  if (!list) return;
  live.delete(el);
  list.slice().forEach((a) => a.cancel());
}

// A surface whose motion lives in its stylesheet (CSS transitions on the spring curve) carries `cls` while window motion is on. It is checked
// again whenever the pointer or focus arrives, so the switch and Reduce motion take effect without a reload.
export function gateMotionClass(el, {cls = "fj-motion-windows", key} = {}) {
  if (!el || el.__fjGate) return;
  el.__fjGate = true;
  const sync = () => {
    const on = windowMotionOn(el, key);
    if (on) {
      const {easing, duration} = springCurve("snappy");
      el.style.setProperty("--fj-ease-snappy", easing);
      el.style.setProperty("--fj-t-snappy", duration / 1000 + "s");
    }
    el.classList.toggle(cls, on);
  };
  el.addEventListener("pointerenter", sync);
  el.addEventListener("focusin", sync);
  // A pointer already resting on it when the switch is flipped is picked up by the next move (at most twice a second).
  let last = 0;
  el.addEventListener("pointermove", () => {
    const now = performance.now();
    if (now - last < 500) return;
    last = now;
    sync();
  });
  sync();
}

// The rows of a small window, as the motion mockup picks them: its menu rows, or else its buttons and short one-line blocks.
export function rowsOf(m) {
  const cm = [...m.querySelectorAll(".context-menu-item")];
  if (cm.length) return cm;
  const hasControl = (r) => r.querySelectorAll("button, [role='menuitem'], [role='menuitemradio']").length > 0;
  return [...m.querySelectorAll("button, [role='menuitem'], [role='menuitemradio'], :scope > div > div, :scope > div")].filter((r) => r.offsetHeight >= 18 && r.offsetHeight <= 64 && r.textContent.trim() && !hasControl(r));
}

// ---------- Opening ----------

// The window grows from `from` (an element or a point): opacity 0 -> its own, scale `scale` -> its own, with an optional starting `translate`.
// The end state is always the window's own (no end keyframe for those properties), so nothing the app set is overwritten.
// `settle`: the app places the window a frame after showing it, so the point it grows from is measured again on the next frame.
export function openSurface(el, {from = null, scale = 0.94, spring = "snappy", fade = true, translate = null, delay = 0, settle = false, key} = {}) {
  if (!el || !el.isConnected || !windowMotionOn(el, key)) return false;
  dropGhosts(el);
  stopMotion(el);
  const {easing, duration} = springCurve(spring);
  const pt = pointOf(from);
  const origin = pt ? originFor(el, pt) : null;
  const k0 = {offset: 0};
  const k1 = {offset: 1};
  if (fade) k0.opacity = 0;
  if (scale !== 1) k0.scale = String(scale);
  if (translate) k0.translate = translate;
  if (origin) k0.transformOrigin = k1.transformOrigin = origin;
  const a = keep(el, el.animate([k0, k1], {duration, easing, delay, fill: "backwards"}));
  if (settle && pt)
    requestAnimationFrame(() => {
      if (a.playState === "finished" || a.playState === "idle" || !el.isConnected || !a.effect) return;
      const effect = a.effect;
      a.effect = null; // measured at rest, so the new origin is the window's own box
      const o2 = originFor(el, pointOf(from) || pt);
      k0.transformOrigin = k1.transformOrigin = o2;
      effect.setKeyframes([k0, k1]);
      a.effect = effect;
    });
  warmBaselines(el);
  return true;
}

// Elements that moved because something appeared next to them (a header button settling in): each glides from where it was.
export function snapRects(els) {
  return els.filter(Boolean).map((el) => ({el, r: el.getBoundingClientRect()}));
}
export function flipFrom(snaps, {spring = "snappy", key} = {}) {
  const {easing, duration} = springCurve(spring);
  snaps.forEach(({el, r}) => {
    if (!el.isConnected || !windowMotionOn(el, key)) return;
    const n = el.getBoundingClientRect();
    const dx = r.left - n.left;
    const dy = r.top - n.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    stopMotion(el);
    keep(el, el.animate([{translate: `${dx}px ${dy}px`}, {translate: "0px 0px"}], {duration, easing}));
  });
}

// Parts that arrive one after another: each from `from` to its own state, `beat` ms apart after `delay`.
export function staggerIn(els, {from = {opacity: 0, translate: "0 -3px"}, spring = "default", delay = 0, beat = 12, maxSteps = Infinity, key} = {}) {
  const list = (els || []).filter((p) => p && p.isConnected);
  if (!list.length || !windowMotionOn(list[0], key)) return;
  const {easing, duration} = springCurve(spring);
  list.forEach((p, i) => {
    stopMotion(p);
    keep(p, p.animate([{offset: 0, ...from}, {offset: 1}], {duration, easing, delay: delay + Math.min(i, maxSteps) * beat, fill: "backwards"}));
  });
}

// One beat of confirmation on a control that was pressed.
export function pressBeat(el, {scale = 0.94, key} = {}) {
  if (!el || !el.isConnected || !windowMotionOn(el, key)) return;
  const {easing, duration} = springCurve("snappy");
  el.animate([{offset: 0, scale: String(scale)}, {offset: 1}], {duration, easing});
}

// ---------- Closing: ghosts ----------

const ghostsOf = new WeakMap(); // source element -> Set of its ghost roots still leaving
export function dropGhosts(src) {
  const set = ghostsOf.get(src);
  if (!set) return;
  set.forEach((g) => g.remove());
  set.clear();
}

// The properties that make up how a still element looks (layout, box, paint, text). Only these are copied, which keeps a copy cheap to make.
const LOOK = (
  "display position top right bottom left z-index float clear box-sizing width height min-width min-height max-width max-height " +
  "margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left " +
  "border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style border-bottom-style border-left-style " +
  "border-top-color border-right-color border-bottom-color border-left-color border-top-left-radius border-top-right-radius border-bottom-right-radius border-bottom-left-radius " +
  "overflow-x overflow-y visibility opacity background-color background-image background-position-x background-position-y background-size background-repeat background-clip background-origin " +
  "box-shadow outline-width outline-style outline-color outline-offset color font-family font-size font-weight font-style font-stretch font-variant-caps font-variant-numeric font-feature-settings " +
  "font-variation-settings line-height letter-spacing word-spacing text-align text-transform text-indent text-decoration-line text-decoration-color text-decoration-style " +
  "text-decoration-thickness text-underline-offset text-shadow text-overflow white-space white-space-collapse text-wrap-mode word-break overflow-wrap hyphens vertical-align direction " +
  "unicode-bidi writing-mode list-style-type list-style-position list-style-image flex-direction flex-wrap flex-grow flex-shrink flex-basis order justify-content align-items " +
  "align-self align-content justify-items justify-self row-gap column-gap grid-template-columns grid-template-rows grid-template-areas grid-auto-flow grid-auto-columns " +
  "grid-auto-rows grid-column-start grid-column-end grid-row-start grid-row-end transform transform-origin translate rotate scale filter backdrop-filter mix-blend-mode isolation " +
  "clip-path mask-image object-fit object-position aspect-ratio table-layout border-collapse border-spacing fill stroke stroke-width stroke-linecap stroke-linejoin " +
  "stroke-dasharray fill-opacity stroke-opacity -webkit-line-clamp -webkit-box-orient -webkit-text-fill-color -webkit-font-smoothing text-rendering color-scheme accent-color appearance"
).split(" ");
// Colours that default to the element's own text colour: always written, or a copy whose text colour differs would resolve them differently.
const ALWAYS = new Set(["border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "outline-color", "text-decoration-color", "-webkit-text-fill-color"]);
const propList = () => LOOK;

// A plain element of each tag, in a hidden sandbox: what a copy shows for a property it is not given.
const baselines = new Map();
let sandbox = null;
function baselineFor(tag, ns) {
  const key = (ns || "") + "|" + tag;
  if (baselines.has(key)) return baselines.get(key);
  if (!sandbox || !sandbox.isConnected) {
    sandbox = document.createElement("div");
    sandbox.setAttribute("aria-hidden", "true");
    sandbox.style.cssText = "position:fixed;left:-99999px;top:0;width:200px;visibility:hidden;pointer-events:none;contain:strict;";
    document.body.appendChild(sandbox);
  }
  let probe;
  try {
    probe = ns && ns !== "http://www.w3.org/1999/xhtml" ? document.createElementNS(ns, tag) : document.createElement(tag);
  } catch {
    probe = document.createElement("span");
  }
  sandbox.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = {};
  propList().forEach((p) => (out[p] = cs.getPropertyValue(p)));
  probe.remove();
  baselines.set(key, out);
  return out;
}

// A window that has just opened will close later: the plain-element look for each kind of element in it is worked out while the page is idle, so
// the copy made at close time is quick.
function warmBaselines(el) {
  const run = () => {
    if (!el.isConnected) return;
    const kinds = new Map([["span|http://www.w3.org/1999/xhtml", ["span", "http://www.w3.org/1999/xhtml"]]]);
    [el, ...el.querySelectorAll("*")].forEach((n) => kinds.set(n.localName + "|" + n.namespaceURI, [n.localName, n.namespaceURI]));
    kinds.forEach(([tag, ns]) => baselineFor(tag, ns));
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, {timeout: 1500});
  else setTimeout(run, 400);
}

function quietMedia(root) {
  root.querySelectorAll("video, audio").forEach((m) => {
    m.removeAttribute("autoplay");
    m.removeAttribute("src");
    m.setAttribute("preload", "none");
    m.querySelectorAll("source").forEach((s) => s.remove());
  });
  root.querySelectorAll("iframe, object, embed").forEach((m) => {
    m.removeAttribute("src");
    m.removeAttribute("srcdoc");
    m.removeAttribute("data");
  });
  root.querySelectorAll("[autofocus]").forEach((n) => n.removeAttribute("autofocus"));
}

const readStyle = (cs) => {
  const out = {};
  propList().forEach((p) => (out[p] = cs.getPropertyValue(p)));
  return out;
};

function pseudoText(content) {
  const m = /^"([\s\S]*)"$/.exec(content || "");
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : null;
}

// A still copy of `clone` (already in the page next to `src`, showing what `src` showed): every element keeps its computed look as inline style, and
// loses everything the app could find it by. Reads first, then writes, so the page lays out once.
function freeze(clone, src) {
  const gEls = [clone, ...clone.querySelectorAll("*")];
  const sEls = [src, ...src.querySelectorAll("*")];
  const map = new Map();
  gEls.forEach((g, i) => (sEls[i] ? map.set(sEls[i], g) : null));
  const rootRect = clone.getBoundingClientRect();
  const values = new Map();
  const rootParent = clone.parentElement;
  const parentValues = rootParent ? readStyle(getComputedStyle(rootParent)) : {};
  const stubs = new Set(); // elements wholly outside the window (rows scrolled out of view): kept as empty boxes of the same size, contents dropped
  const recs = gEls.map((g, i) => {
    for (let a = g.parentElement; a && a !== clone.parentElement; a = a.parentElement) if (stubs.has(a)) return {g, gone: true, inStub: true};
    const cs = getComputedStyle(g);
    if (cs.display === "none") return {g, gone: true};
    if (i > 0) {
      const r = g.getBoundingClientRect();
      if (r.bottom < rootRect.top || r.top > rootRect.bottom || r.right < rootRect.left || r.left > rootRect.right) {
        stubs.add(g);
        let css = `display:${cs.display === "inline" ? "inline-block" : cs.display};position:${cs.position};box-sizing:border-box;width:${r.width}px;height:${r.height}px;visibility:hidden;flex:none;`;
        ["margin-top", "margin-right", "margin-bottom", "margin-left", "top", "left", "grid-column-start", "grid-column-end", "grid-row-start", "grid-row-end"].forEach((p) => (css += `${p}:${cs.getPropertyValue(p)};`));
        return {g, css, pseudos: [], stub: true};
      }
    }
    const v = readStyle(cs);
    values.set(g, v);
    const pv = i === 0 ? parentValues : values.get(g.parentElement) || {};
    const base = baselineFor(g.localName, g.namespaceURI);
    let css = "";
    propList().forEach((p) => {
      const val = v[p];
      if (!val) return;
      if (ALWAYS.has(p) || val !== base[p] || val !== pv[p]) css += `${p}:${val};`;
    });
    const pseudos = [];
    if (g.namespaceURI === "http://www.w3.org/1999/xhtml") {
      ["::before", "::after"].forEach((which) => {
        const ps = getComputedStyle(g, which);
        const text = pseudoText(ps.content);
        if (text === null || ps.display === "none") return;
        let pcss = "";
        const spanBase = baselineFor("span", "http://www.w3.org/1999/xhtml");
        propList().forEach((p) => {
          const val = ps.getPropertyValue(p);
          if (val && (ALWAYS.has(p) || val !== v[p] || val !== spanBase[p])) pcss += `${p}:${val};`;
        });
        pseudos.push({which, text, css: pcss});
      });
    }
    const s = sEls[i];
    const field = s && (s.localName === "input" || s.localName === "textarea" || s.localName === "select") ? s : null;
    const scroll = s && (s.scrollTop || s.scrollLeft) ? {top: s.scrollTop, left: s.scrollLeft} : null;
    return {g, css, pseudos, field, scroll};
  });
  recs.forEach((r) => {
    const {g} = r;
    if (r.gone) return;
    if (r.stub) g.replaceChildren();
    if (r.field) {
      try {
        if (r.field.localName === "select") g.selectedIndex = r.field.selectedIndex;
        else if (r.field.type === "checkbox" || r.field.type === "radio") g.checked = r.field.checked;
        else g.value = r.field.value;
      } catch {
        /* a field that cannot take the value keeps its own */
      }
    }
    [...g.attributes].forEach((a) => {
      const n = a.name;
      if (n === "id" || n === "class" || n === "style" || n === "name" || n === "for" || n === "role" || n === "tabindex" || n === "title" || n === "contenteditable" || n === "draggable" || n.startsWith("data-") || n.startsWith("aria-") || n.startsWith("on")) g.removeAttribute(n);
    });
    g.setAttribute("style", r.css);
    r.pseudos.forEach((p) => {
      const span = document.createElement("span");
      span.setAttribute("style", p.css);
      span.textContent = p.text;
      if (p.which === "::before") g.insertBefore(span, g.firstChild);
      else g.appendChild(span);
    });
  });
  recs.forEach((r) => (r.gone && !r.inStub ? r.g.remove() : null));
  recs.forEach((r) => {
    if (r.gone || !r.scroll) return;
    r.g.scrollTop = r.scroll.top;
    r.g.scrollLeft = r.scroll.left;
  });
  return {rootRect, map};
}

// A ghost of `src`: `restore(clone)` first puts back what the app just took away to hide it (a class, display), for a window that is hidden rather
// than removed. `layer`: an element whose stacking level the ghost takes (a part of a dialog leaves above the dialog). `clipTo`: an element whose
// box the ghost is clipped to (a list inside a scrolling area).
export function makeGhost(src, {restore = null, layer = null, clipTo = null} = {}) {
  const parent = src && src.parentNode;
  if (!parent || !document.body) return null;
  const clone = src.cloneNode(true);
  if (typeof restore === "function") restore(clone);
  quietMedia(clone);
  // A part of a layout (a pane in a row, a screen of a dialog) is copied at its own place and size, out of the flow, so the copy neither moves its
  // neighbours nor lays itself out differently. (A window that is already hidden is a fixed surface: its copy places itself.)
  const srcRect = src.getClientRects().length ? src.getBoundingClientRect() : null;
  if (srcRect) {
    const cs = getComputedStyle(src);
    if (cs.position !== "fixed") {
      ["position:fixed", `left:${srcRect.left}px`, `top:${srcRect.top}px`, `width:${srcRect.width}px`, `height:${srcRect.height}px`, "box-sizing:border-box", "margin:0", "right:auto", "bottom:auto"].forEach((d) => {
        const [k, v] = d.split(":");
        clone.style.setProperty(k, v);
      });
    }
  }
  parent.insertBefore(clone, src.nextSibling);
  let frozen;
  try {
    frozen = freeze(clone, src);
  } catch (err) {
    clone.remove();
    console.warn("[windowMotion] could not copy the closing window:", err);
    return null;
  }
  const {map} = frozen;
  const rootRect = srcRect || frozen.rootRect;
  if (!rootRect.width && !rootRect.height) {
    clone.remove();
    return null;
  }
  const st = clone.style;
  st.setProperty("position", "fixed");
  st.setProperty("left", rootRect.left + "px");
  st.setProperty("top", rootRect.top + "px");
  st.setProperty("right", "auto");
  st.setProperty("bottom", "auto");
  st.setProperty("width", rootRect.width + "px");
  st.setProperty("height", rootRect.height + "px");
  st.setProperty("box-sizing", "border-box");
  st.setProperty("margin", "0");
  st.setProperty("transform", "none");
  st.setProperty("translate", "none");
  st.setProperty("scale", "none");
  st.setProperty("pointer-events", "none");
  if (layer) {
    const z = getComputedStyle(layer).zIndex;
    if (z && z !== "auto") st.setProperty("z-index", z);
  }
  if (clipTo && clipTo.isConnected) {
    const c = clipTo.getBoundingClientRect();
    const top = Math.max(0, c.top - rootRect.top);
    const left = Math.max(0, c.left - rootRect.left);
    const bottom = Math.max(0, rootRect.bottom - c.bottom);
    const right = Math.max(0, rootRect.right - c.right);
    st.setProperty("clip-path", `inset(${top}px ${right}px ${bottom}px ${left}px)`);
  }
  clone.setAttribute(GHOST_ATTR, "");
  clone.setAttribute("aria-hidden", "true");
  clone.inert = true;
  document.body.appendChild(clone);
  let set = ghostsOf.get(src);
  if (!set) ghostsOf.set(src, (set = new Set()));
  set.add(clone);
  return {root: clone, map, src, forget: () => set.delete(clone)};
}

function retire(ghost, anims, duration) {
  let gone = false;
  const done = () => {
    if (gone) return;
    gone = true;
    ghost.forget();
    ghost.root.remove();
  };
  Promise.all(anims.map((a) => a.finished)).then(done, done);
  setTimeout(done, duration + 400);
}

// A ghost leaves toward `end` (keyframe values, e.g. {opacity: 0, translate: "0 -4px"}) and is removed. Returns when it has visibly gone (the spring's
// last tenth is a tail too small to see; the mockup's "leave, then arrive" waits for the same moment), which is when what replaces it may arrive.
export function leaveGhost(ghost, end, {spring = "exit"} = {}) {
  const {easing, duration} = springCurve(spring);
  if (ghost) retire(ghost, [ghost.root.animate([{offset: 0}, {offset: 1, ...end}], {duration, easing, fill: "forwards"})], duration);
  return Math.round(duration * 0.9);
}

// The window leaves into `to` (an element or a point): opacity -> 0, scale -> `scale`, optional translate. `press`: a control inside the window that
// was just pressed; its copy gives the one-beat press while the window leaves.
export function closeSurface(el, {to = null, scale = 0.92, spring = "exit", fade = true, translate = null, restore = null, press = null, layer = null, clipTo = null, key} = {}) {
  if (!el || !el.isConnected || !windowMotionOn(el, key)) return null;
  stopMotion(el);
  const ghost = makeGhost(el, {restore, layer, clipTo});
  if (!ghost) return null;
  const {easing, duration} = springCurve(spring);
  const pt = pointOf(to);
  const origin = pt ? originFor(ghost.root, pt) : null;
  const k0 = {offset: 0};
  const k1 = {offset: 1};
  if (fade) k1.opacity = 0;
  if (scale !== 1) k1.scale = String(scale);
  if (translate) k1.translate = translate;
  if (origin) k0.transformOrigin = k1.transformOrigin = origin;
  const anims = [ghost.root.animate([k0, k1], {duration, easing, fill: "forwards"})];
  const pressed = press ? ghost.map.get(press) : null;
  if (pressed) {
    const c = springCurve("snappy");
    anims.push(pressed.animate([{offset: 0, scale: "0.97"}, {offset: 1}], {duration: Math.min(c.duration, duration), easing: c.easing}));
  }
  retire(ghost, anims, duration);
  return ghost;
}

// A window the app hides by taking a class away (and shows by adding it back): every way the app closes it is caught here, so it leaves the same
// way whichever control closed it. `to()` gives the control it goes back into; `pressSelector` the rows that give a one-beat press when picked.
export function watchClassClose(el, cls, {to = () => null, scale = 0.92, pressSelector = null, key} = {}) {
  if (!el || el.__fjClassWatch || typeof MutationObserver !== "function") return;
  const obs = new MutationObserver((records) => {
    const rec = records.find(
      (r) =>
        r.attributeName === "class" &&
        String(r.oldValue || "")
          .split(/\s+/)
          .includes(cls)
    );
    if (!rec || el.classList.contains(cls)) return;
    const hit = pressSelector ? recentPress(400)?.el?.closest?.(pressSelector) : null;
    closeSurface(el, {to: to(), scale, key, press: hit && el.contains(hit) ? hit : null, restore: (c) => c.classList.add(cls)});
  });
  obs.observe(el, {attributes: true, attributeFilter: ["class"], attributeOldValue: true});
  el.__fjClassWatch = obs;
}

// ---------- Dialogs (the app's shared #modal) ----------

// The dimmer fades in, the panel grows out of `from` and its parts arrive in reading order.
export function openDialog(modal, {from = null, parts = null, key} = {}) {
  const panel = modal && modal.firstElementChild;
  if (!panel || !windowMotionOn(modal, key)) return false;
  dropGhosts(modal);
  stopMotion(modal);
  const d = springCurve("default");
  // 0.01, not 0: the app ignores Escape on a dialog whose computed opacity is exactly 0, and Escape must work from the first frame.
  keep(modal, modal.animate([{offset: 0, opacity: 0.01}, {offset: 1}], {duration: d.duration, easing: d.easing, fill: "backwards"}));
  openSurface(panel, {from, scale: 0.6, spring: "panel", key});
  staggerIn(parts || dialogParts(panel), {from: {opacity: 0, translate: "0 6px"}, delay: 60, beat: 35, key});
  return true;
}

export function dialogParts(panel) {
  const msg = panel.querySelector("#modal-message");
  const sections = msg ? [...msg.querySelectorAll(":scope > *, :scope > * > section, :scope > * > .cx-switch-row")].filter((n) => n.offsetHeight > 0).slice(0, 10) : [];
  // The Add Slot / Convert to Stack chooser is a column of option buttons: each one arrives on its own beat instead of the whole block at once.
  const options = panel.classList.contains("modal-panel-add-item") ? [...panel.querySelectorAll("#modal-button-container > button")] : [];
  const blocks = options.length ? options : panel.querySelectorAll(".modal-buttons, .export-modal-actions, .cx-actions, .modal-footer");
  return [panel.querySelector("#modal-title"), ...sections, ...blocks].filter((n) => n && n.offsetHeight > 0);
}

// The dialog goes back into `to`, faster than it came: the dimmer fades, the panel shrinks into the control. `restore` as for makeGhost (the shared
// #modal is hidden with display: none).
export function closeDialog(modal, {to = null, restore = null, key} = {}) {
  if (!modal || !windowMotionOn(modal, key)) return null;
  const panel = modal.firstElementChild;
  stopMotion(modal);
  if (panel) stopMotion(panel);
  const ghost = makeGhost(modal, {restore});
  if (!ghost) return null;
  const {easing, duration} = springCurve("exit");
  const anims = [ghost.root.animate([{offset: 0}, {offset: 1, opacity: 0}], {duration, easing, fill: "forwards"})];
  const gp = panel ? ghost.map.get(panel) : null;
  if (gp) {
    const pt = pointOf(to);
    const origin = pt ? originFor(gp, pt) : null;
    const k0 = {offset: 0};
    const k1 = {offset: 1, opacity: 0, scale: "0.4"};
    if (origin) k0.transformOrigin = k1.transformOrigin = origin;
    anims.push(gp.animate([k0, k1], {duration, easing, fill: "forwards"}));
  }
  retire(ghost, anims, duration);
  return ghost;
}

// Watches the shared #modal once: when it is hidden, the dialog that was on it leaves into `to`. Another dialog taking the modal over without hiding
// it ends the watch.
export function watchDialogClose(modal, {to = null, key} = {}) {
  if (!modal || typeof MutationObserver !== "function" || !windowMotionOn(modal, key)) return;
  if (modal.__fjDialogWatch) modal.__fjDialogWatch.disconnect();
  const title = modal.querySelector("#modal-title");
  const titleText = title ? title.textContent : "";
  const obs = new MutationObserver(() => {
    const hidden = modal.style.display === "none" || getComputedStyle(modal).display === "none";
    if (!hidden) {
      const t = modal.querySelector("#modal-title");
      if ((t ? t.textContent : "") !== titleText) obs.disconnect(); // another dialog took over
      return;
    }
    obs.disconnect();
    if (modal.__fjDialogWatch === obs) modal.__fjDialogWatch = null;
    closeDialog(modal, {to, key, restore: (c) => c.style.setProperty("display", "block")});
  });
  obs.observe(modal, {attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: true, characterData: true});
  modal.__fjDialogWatch = obs;
}

// ---------- Screens inside one dialog (the Share window's steps) ----------

// Call before the dialog's content is replaced by the next screen: the old screen's parts are copied so they can leave to the left.
export function captureStep(panel, {layer = null, key} = {}) {
  if (!panel || !panel.isConnected || !windowMotionOn(panel, key)) return null;
  const h0 = panel.getBoundingClientRect().height;
  const ghosts = [...panel.children]
    .filter((c) => c.offsetHeight > 0 || c.offsetWidth > 0)
    .map((c) => makeGhost(c, {layer, clipTo: panel}))
    .filter(Boolean);
  return {h0, ghosts};
}

// A window whose top edge moves while its height glides (a centred dialog) would carry the new parts with it: they would show at the old top and then
// ride the edge into place. The edge's real starting top is measured once the height animation is in effect, so a top that moved for another reason
// between capture and play (a card whose scroller clamps) moves once and gets no offset. Its final top is where the new screen settles. Each part starts offset
// by `fromOffset` (final top minus the edge's current top during the glide) and eases to 0 on the same spring, so it stays still at its final place.
// The offset is added to (not replacing) the part's arrival translate. Each hold is also kept on the panel, so stopMotion(panel), which cancels the
// height glide, cancels the holds with it instead of leaving the parts displaced.
function holdContentStill(panel, fromOffset, {duration, easing, delay}) {
  [...panel.children].forEach((c) => {
    const a = c.animate([{translate: `0 ${fromOffset}px`}, {translate: "0 0"}], {duration, easing, delay, fill: "backwards", composite: "add"});
    a.__fjHold = true;
    keep(c, a);
    keep(panel, a);
  });
}

// Call right after the next screen is in: the old screen leaves to the left, then the window's height glides to the new screen's and the new parts
// arrive from the right in reading order.
export function playStep(panel, cap) {
  if (!cap) return;
  let wait = 0;
  cap.ghosts.forEach((g) => (wait = leaveGhost(g, {opacity: 0, translate: "-14px 0"})));
  if (!panel || !panel.isConnected) return;
  const r1 = panel.getBoundingClientRect();
  const h1 = r1.height;
  const top1 = r1.top;
  let hold = null;
  if (Math.abs(h1 - cap.h0) > 0.5) {
    const cs = getComputedStyle(panel);
    const extra = cs.boxSizing === "border-box" ? 0 : ["padding-top", "padding-bottom", "border-top-width", "border-bottom-width"].reduce((sum, p) => sum + (parseFloat(cs.getPropertyValue(p)) || 0), 0);
    const p = springCurve("panel");
    const a = keep(panel, panel.animate([{height: cap.h0 - extra + "px"}, {height: h1 - extra + "px"}], {duration: p.duration, easing: p.easing, delay: wait, fill: "backwards"}));
    a.__fjHeight = {extra, from: cap.h0};
    const topStart = panel.getBoundingClientRect().top; // the old height is in effect now: this is where the edge really starts
    if (Math.abs(top1 - topStart) > 0.5) hold = {fromOffset: top1 - topStart, timing: {duration: p.duration, easing: p.easing, delay: wait}};
  }
  staggerIn([...panel.children], {from: {opacity: 0, translate: "14px 0"}, delay: wait + 50, beat: 40});
  if (hold) holdContentStill(panel, hold.fromOffset, hold.timing); // after staggerIn, so it sits above its replace animations in the stack
}

// The screen's content changed while its height was still gliding (a list that finished loading): the glide goes on to the new height instead of
// holding the old one.
export function retargetHeight(panel) {
  const a = panel ? (live.get(panel) || []).find((x) => x.__fjHeight && x.playState !== "finished") : null;
  if (!a) return;
  const {extra, from} = a.__fjHeight;
  const timing = a.effect.getComputedTiming();
  const pending = Math.max(0, (a.effect.getTiming().delay || 0) - (timing.localTime || 0));
  const cur = panel.getBoundingClientRect().height;
  a.cancel();
  (live.get(panel) || []).filter((x) => x.__fjHold).forEach((x) => x.cancel()); // the hold is rebuilt below for the new glide
  const nat = panel.getBoundingClientRect();
  const natural = nat.height;
  const start = pending > 0 ? from : cur;
  if (Math.abs(natural - start) < 0.5) return;
  const p = springCurve("panel");
  const b = keep(panel, panel.animate([{height: start - extra + "px"}, {height: natural - extra + "px"}], {duration: p.duration, easing: p.easing, delay: pending, fill: "backwards"}));
  b.__fjHeight = {extra, from};
  const topStart = panel.getBoundingClientRect().top; // measured with the new glide in effect, as in playStep
  if (Math.abs(nat.top - topStart) > 0.5) holdContentStill(panel, nat.top - topStart, {duration: p.duration, easing: p.easing, delay: pending});
}

// ---------- Travelling highlights ----------

// One hover highlight glides between the rows of `host` (the rows' own hover fill is held back while it is shown, by the `fj-glide` class in the
// surface's stylesheet). `fill`: the rows' own hover colour.
export function glideHighlight(host, itemSelector, {fill = "var(--hover-bg)", key} = {}) {
  if (!host || host.__fjGlide) return;
  host.__fjGlide = true;
  let hl = null;
  let cur = null;
  const ensure = () => {
    if (hl && hl.parentNode === host) return hl;
    hl = document.createElement("div");
    hl.setAttribute("aria-hidden", "true");
    hl.style.cssText = `position:absolute;left:0;top:0;z-index:-1;pointer-events:none;opacity:0;background:${fill};`;
    host.prepend(hl);
    cur = null;
    return hl;
  };
  const off = () => {
    cur = null;
    host.classList.remove("fj-glide");
    if (hl && hl.parentNode === host) {
      hl.getAnimations().forEach((a) => a.cancel());
      hl.style.opacity = "0";
    }
  };
  host.addEventListener("pointerover", (e) => {
    const item = e.target instanceof Element ? e.target.closest(itemSelector) : null;
    if (!item || !host.contains(item)) {
      if (cur) off(); // the pointer moved from a row onto blank space inside the surface: the highlight leaves with it
      return;
    }
    if (!windowMotionOn(host, key) || item.disabled || item.getAttribute("aria-disabled") === "true" || getComputedStyle(item).pointerEvents === "none") return off();
    if (item === cur) return;
    const h = ensure();
    host.classList.add("fj-glide");
    const hr = host.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    const x = r.left - hr.left + host.scrollLeft - host.clientLeft;
    const y = r.top - hr.top + host.scrollTop - host.clientTop;
    h.style.width = r.width + "px";
    h.style.height = r.height + "px";
    h.style.borderRadius = getComputedStyle(item).borderRadius;
    const target = `${x}px ${y}px`;
    if (h.style.opacity !== "1") {
      h.style.translate = target;
      h.style.opacity = "1";
    } else {
      const was = getComputedStyle(h).translate;
      h.getAnimations().forEach((a) => a.cancel());
      h.style.translate = target;
      const {easing, duration} = springCurve("snappy");
      h.animate([{translate: was === "none" ? "0px 0px" : was}, {translate: target}], {duration, easing});
    }
    cur = item;
  });
  host.addEventListener("focusin", off);
  host.addEventListener("pointerleave", off);
  host.addEventListener("pointermove", () => windowMotionOn(host, key) || off());
}

// A fill (or an outline) travels from one control to another on two springs: the leading edge is stiffer, so it leans as it moves. `host` must be
// positioned; `fromEl` and `toEl` are inside it. `look` is the traveller's style. Resolves when it has arrived.
export function travelBetween(host, fromRect, toEl, look, {key, z = "-1"} = {}) {
  if (!host || !toEl || !windowMotionOn(host, key)) return Promise.resolve(false);
  const hr = host.getBoundingClientRect();
  const tr = toEl.getBoundingClientRect();
  const hl = document.createElement("div");
  hl.setAttribute("aria-hidden", "true");
  hl.style.cssText = `position:absolute;pointer-events:none;box-sizing:border-box;z-index:${z};top:${fromRect.top - hr.top + host.scrollTop}px;height:${fromRect.height}px;left:${fromRect.left - hr.left}px;width:${fromRect.width}px;`;
  Object.assign(hl.style, look);
  host.prepend(hl);
  const right = tr.left > fromRect.left;
  const lead = springCurve("lead");
  const trail = springCurve("trail");
  const L = right ? trail : lead;
  const R = right ? lead : trail;
  const fromL = fromRect.left - hr.left;
  const fromR = hr.right - fromRect.right;
  const toL = tr.left - hr.left;
  const toR = hr.right - tr.right;
  const toTop = tr.top - hr.top + host.scrollTop;
  hl.style.width = "auto";
  hl.style.left = toL + "px";
  hl.style.right = toR + "px";
  hl.style.top = toTop + "px";
  hl.style.height = tr.height + "px";
  const a1 = hl.animate([{left: fromL + "px"}, {left: toL + "px"}], {duration: L.duration, easing: L.easing});
  const a2 = hl.animate([{right: fromR + "px"}, {right: toR + "px"}], {duration: R.duration, easing: R.easing});
  const a3 = hl.animate(
    [
      {top: fromRect.top - hr.top + host.scrollTop + "px", height: fromRect.height + "px"},
      {top: toTop + "px", height: tr.height + "px"}
    ],
    {duration: lead.duration, easing: lead.easing}
  );
  return Promise.all([a1.finished, a2.finished, a3.finished]).then(
    () => (hl.remove(), true),
    () => (hl.remove(), false)
  );
}

// ---------- A frame drawn by a ::after layer on the root (the following guest's screen frame) ----------

// `attr` on <html> draws the frame; `leavingAttr` keeps it drawn (same rule in the stylesheet) while it fades out, so the app's own attribute goes the
// moment the app removes it. It fades in over `inMs` and out, a little faster, over `outMs`.
export function setRootFrame(attr, on, {leavingAttr = attr + "-leaving", inMs = 320, outMs = 180, key} = {}) {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return;
  const had = root.hasAttribute(attr);
  root.toggleAttribute(attr, on);
  if (on === had) return;
  if (root.__fjFrameOut) {
    root.__fjFrameOut.cancel();
    root.__fjFrameOut = null;
  }
  root.removeAttribute(leavingAttr);
  if (!windowMotionOn(root, key)) return;
  try {
    if (on) {
      root.animate([{opacity: 0}, {opacity: 1}], {duration: inMs, easing: "ease-out", pseudoElement: "::after"});
      return;
    }
    root.setAttribute(leavingAttr, "");
    const a = root.animate([{opacity: 1}, {opacity: 0}], {duration: outMs, easing: "ease-in", fill: "forwards", pseudoElement: "::after"});
    root.__fjFrameOut = a;
    const end = () => {
      if (root.__fjFrameOut !== a) return;
      root.__fjFrameOut = null;
      root.removeAttribute(leavingAttr);
      a.cancel();
    };
    a.finished.then(end, end);
  } catch {
    root.removeAttribute(leavingAttr);
  }
}
