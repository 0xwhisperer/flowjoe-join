// The themed in-app confirmation (never a system dialog). Resolves true on the confirm button, false on Cancel, Escape or a click
// on the backdrop. Focus starts on Cancel (the safe choice) and stays inside the dialog; it returns to where it was on close.
import {el, icon} from "./dom.js";

export function confirmDialog({title, body, sub, confirmText, cancelText = "Cancel"}) {
  return new Promise((resolve) => {
    const opener = document.activeElement;
    const scrim = el("div", {cls: "cx-confirm-scrim", attrs: {"data-cx": "confirm"}});
    const panel = el("div", {cls: "cx-confirm", attrs: {role: "alertdialog", "aria-modal": "true", "aria-labelledby": "cxConfirmTitle", "aria-describedby": "cxConfirmBody"}});
    const head = el("div", {cls: "cx-confirm-head"});
    head.appendChild(el("span", {cls: "cx-confirm-icon", children: [icon("fa-solid fa-trash-alt")]}));
    head.appendChild(el("h2", {cls: "cx-confirm-title", text: title, attrs: {id: "cxConfirmTitle", dir: "auto"}}));
    const copy = el("div", {cls: "cx-confirm-body", attrs: {id: "cxConfirmBody"}});
    copy.appendChild(el("p", {text: body, attrs: {dir: "auto"}}));
    if (sub) copy.appendChild(el("p", {cls: "cx-confirm-sub", text: sub}));
    const foot = el("div", {cls: "cx-confirm-foot"});
    const cancel = el("button", {cls: "ob-btn", text: cancelText, attrs: {type: "button", "data-cx": "confirm-cancel"}});
    const ok = el("button", {cls: "ob-btn primary cx-confirm-danger", text: confirmText, attrs: {type: "button", "data-cx": "confirm-ok"}});
    foot.append(ok, cancel); // app convention: Cancel is the rightmost button, and it holds the focus
    panel.append(head, copy, foot);
    scrim.appendChild(panel);
    let done = false;
    const close = (v) => {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", onKey, true);
      scrim.remove();
      if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus({preventScroll: true});
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      } else if (e.key === "Tab") {
        e.preventDefault();
        (document.activeElement === cancel ? ok : cancel).focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    cancel.addEventListener("click", () => close(false));
    ok.addEventListener("click", () => close(true));
    scrim.addEventListener("mousedown", (e) => {
      if (e.target === scrim) close(false);
    });
    document.body.appendChild(scrim);
    cancel.focus();
  });
}
