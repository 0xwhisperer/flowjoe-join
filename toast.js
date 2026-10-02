// The app's real notification markup (.notification with icon + message). Text is textContent only.
import {$, el, icon} from "./dom.js";

export function toast(kind, iconCls, message, sub) {
  const box = $("#notification-container");
  if (!box) return null;
  const n = el("div", {cls: `notification ${kind}`, attrs: {"data-toast": kind}});
  const ic = el("div", {cls: "notification-icon"});
  ic.appendChild(icon(iconCls));
  const msg = el("div", {cls: "notification-message"});
  msg.appendChild(document.createTextNode(message));
  if (sub) msg.appendChild(el("span", {cls: "cx-sub", text: sub}));
  const close = el("button", {cls: "notification-close", attrs: {"aria-label": "Close", type: "button"}});
  close.appendChild(icon("fas fa-times"));
  close.addEventListener("click", () => n.remove());
  n.append(ic, msg, close);
  box.appendChild(n);
  setTimeout(() => n.classList.add("show"), 10);
  return n;
}

export function clearToasts() {
  $("#notification-container")?.replaceChildren();
}

// A toast whose message is built from parts (strings and nodes, e.g. a <q> around a node name), optionally with the app's real
// five-second Undo ring and button (the markup the mockup copies from deleteUndoManager.js). Everything is textContent.
const SVGNS = "http://www.w3.org/2000/svg";
export const quoted = (text) => el("q", {text, attrs: {dir: "auto"}});

function fillBody(n, iconCls, parts, sub) {
  n.querySelector(".notification-icon")?.replaceChildren(icon(iconCls));
  const msg = n.querySelector(".notification-message");
  msg.replaceChildren(...parts.map((p) => (typeof p === "string" ? document.createTextNode(p) : p)));
  for (const line of Array.isArray(sub) ? sub : sub ? [sub] : []) msg.appendChild(el("span", {cls: "cx-sub", text: line, attrs: {dir: "auto"}}));
}

export function richToast(kind, iconCls, parts, sub, {undo = null, ttlMs = 9000} = {}) {
  const box = $("#notification-container");
  if (!box) return null;
  const n = el("div", {cls: `notification ${kind}`, attrs: {"data-toast": kind}});
  n.appendChild(el("div", {cls: "notification-icon"}));
  n.appendChild(el("div", {cls: "notification-message"}));
  fillBody(n, iconCls, parts, sub);
  if (undo) {
    n.classList.add("delete-undo-notification");
    n.style.setProperty("--undo-window-ms", `${Math.max(0, Math.round(undo.windowMs))}ms`);
    const ring = el("div", {cls: "notification-undo-timer", attrs: {"aria-hidden": "true"}});
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "notification-undo-timer-svg");
    for (const c of ["notification-undo-timer-track", "notification-undo-timer-progress"]) {
      const circle = document.createElementNS(SVGNS, "circle");
      circle.setAttribute("class", c);
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "9");
      svg.appendChild(circle);
    }
    ring.appendChild(svg);
    n.appendChild(ring);
    const btn = el("button", {cls: "notification-undo-btn", text: "Undo", attrs: {type: "button"}});
    btn.addEventListener("click", undo.onUndo);
    n.appendChild(btn);
  }
  const close = el("button", {cls: "notification-close", attrs: {"aria-label": "Close", type: "button"}});
  close.appendChild(icon("fas fa-times"));
  close.addEventListener("click", () => n.remove());
  n.appendChild(close);
  box.appendChild(n);
  setTimeout(() => n.classList.add("show"), 10);
  if (!undo && ttlMs > 0) setTimeout(() => n.remove(), ttlMs);
  return n;
}

// Settles a toast into a plain one (the Undo ring and button go away). `kind` swaps info/success/warning.
export function settleToast(n, kind, iconCls, parts, sub, ttlMs = 9000) {
  if (!n || !n.isConnected) return;
  n.classList.remove("delete-undo-notification", "info", "warning", "error", "success");
  n.classList.add(kind);
  n.setAttribute("data-toast", kind);
  n.querySelector(".notification-undo-timer")?.remove();
  n.querySelector(".notification-undo-btn")?.remove();
  fillBody(n, iconCls, parts, sub);
  if (ttlMs > 0) setTimeout(() => n.remove(), ttlMs);
}
