// The approved entry dialog: editable name, 12 marks, Join gated on a valid name and a chosen mark.
import {$, $$, el, icon, iso} from "./dom.js";
import {avatar} from "./people.js";
import {MARKS, NAME_MAX, initials, messageFor, suggestedMark, validateName} from "./names.js";

// The scope line under the name, as in the approved mockup: "Whole Flow \u00b7 8 nodes", "One shared node", "Two shared roots \u00b7 5 nodes".
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
export function scopeText(scope) {
  if (!scope || !Number.isInteger(scope.nodes) || scope.nodes < 0) return "Shared Flow";
  const nodes = `${scope.nodes} node${scope.nodes === 1 ? "" : "s"}`;
  if (scope.nodes === 1) return "One shared node";
  if (scope.kind === "selected-roots" && Number.isInteger(scope.roots)) {
    const r = scope.roots;
    return `${r <= 10 ? WORDS[r] : r} shared root${r === 1 ? "" : "s"} \u00b7 ${nodes}`;
  }
  return `Whole Flow \u00b7 ${nodes}`;
}

export function createEntry({onJoin}) {
  let chosenMark = null;
  let defaultName = "";
  let busy = false;
  let serverRefusal = null; // {name, message}: the SERVER said no to this exact text; cleared as soon as the text changes
  let suggestionBase = "";
  const input = $("#cxNameInput");
  const wrap = $("#cxNameWrap");
  const err = $("#cxNameErr");
  const joinBtn = $("#cxJoinBtn");

  function problem() {
    const v = validateName(input.value);
    if (!v.ok) return messageFor(v.reason, v.count);
    if (serverRefusal && serverRefusal.name === v.name) return serverRefusal.message;
    return "";
  }

  function sync() {
    const trimmed = input.value.trim();
    const p = problem();
    const ini = initials(trimmed || "?");
    $("#cxNameCount").textContent = `${[...new Intl.Segmenter("und", {granularity: "grapheme"}).segment(trimmed)].length}/${NAME_MAX}`;
    wrap.classList.toggle("is-invalid", !!p);
    wrap.classList.toggle("is-edited", trimmed !== defaultName);
    input.setAttribute("aria-invalid", p ? "true" : "false");
    err.hidden = !p;
    err.textContent = p;
    for (const a of $$(".cx-mark-opt .cx-av")) a.firstChild.nodeValue = ini;
    for (const b of $$(".cx-mark-opt")) b.setAttribute("aria-label", `${MARKS[b.dataset.mark - 1]} mark with ${ini}${b.querySelector(".sugg") ? ", suggested" : ""}`);
    const preview = $("#cxJoinPreview");
    preview.replaceChildren();
    if (chosenMark) preview.appendChild(avatar(trimmed || "?", {mark: chosenMark, size: "xl", state: "active"}));
    else {
      const a = el("i", {cls: "cx-av sz-xl is-empty", attrs: {"aria-hidden": "true", title: "No mark yet"}});
      a.textContent = ini;
      preview.appendChild(a);
    }
    joinBtn.disabled = !!p || !chosenMark || busy;
    const hint = $("#cxJoinHint");
    hint.textContent = p && !chosenMark ? "Fix your name and choose a mark to continue." : p ? "Fix your name to continue." : !chosenMark ? "Choose a mark to continue." : `${MARKS[chosenMark - 1]} it is. You can change it later from your own card.`;
    hint.classList.toggle("is-waiting", !!p || !chosenMark);
  }

  function renderMarkGrid() {
    const sug = suggestedMark(suggestionBase || defaultName || "Guest");
    const grid = $("#cxMarkGrid");
    grid.replaceChildren();
    MARKS.forEach((nm, i) => {
      const m = i + 1;
      const b = el("button", {cls: "cx-mark-opt", attrs: {type: "button", role: "radio", "aria-checked": String(chosenMark === m), tabindex: (chosenMark ?? sug) === m ? "0" : "-1", "data-mark": String(m)}});
      if (m === sug) b.appendChild(el("i", {cls: "fa-solid fa-star sugg", attrs: {"aria-hidden": "true", title: "Suggested for you"}}));
      const check = el("span", {cls: "check"});
      check.appendChild(icon("fa-solid fa-check"));
      b.appendChild(check);
      const a = el("i", {cls: "cx-av sz-lg st-active", attrs: {"aria-hidden": "true"}});
      a.style.setProperty("--mk", `var(--mark-${m})`);
      a.textContent = "?";
      a.appendChild(el("i", {cls: "dot"}));
      b.appendChild(a);
      b.appendChild(el("span", {cls: "nm", text: nm}));
      b.addEventListener("click", () => chooseMark(m));
      b.addEventListener("keydown", (e) => {
        const cols = innerWidth <= 760 ? 4 : 6;
        const d = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols}[e.key];
        if (!d) return;
        e.preventDefault();
        const next = ((m - 1 + d + 12) % 12) + 1;
        chooseMark(next);
        $(`.cx-mark-opt[data-mark="${next}"]`).focus();
      });
      grid.appendChild(b);
    });
  }

  function chooseMark(m) {
    chosenMark = m;
    for (const b of $$(".cx-mark-opt")) {
      const on = Number(b.dataset.mark) === m;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    sync();
  }

  input.addEventListener("input", () => {
    serverRefusal = null;
    sync();
  });
  $("#cxNamePen").addEventListener("click", () => input.focus());
  input.addEventListener("focus", (e) => e.target.select());
  $("#modal").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.target.closest("button")) {
      e.preventDefault();
      if (!joinBtn.disabled) joinBtn.click();
    }
  });
  joinBtn.addEventListener("click", async () => {
    if (joinBtn.disabled) return;
    const v = validateName(input.value);
    if (!v.ok || !chosenMark) return;
    busy = true;
    sync();
    joinBtn.textContent = "Joining…";
    let outcome;
    try {
      outcome = await onJoin({name: v.name, mark: chosenMark});
    } finally {
      busy = false;
      joinBtn.textContent = "Join shared Flow";
    }
    if (outcome && outcome.refusal) serverRefusal = {name: v.name, message: outcome.refusal};
    sync();
    if (outcome && outcome.retryText) {
      $("#cxJoinHint").textContent = outcome.retryText;
      $("#cxJoinHint").classList.add("is-waiting");
    }
  });

  return {
    show({invitedName, role, scope, ownerName, flowName, remembered}) {
      defaultName = invitedName || "";
      const startName = remembered && remembered.name ? remembered.name : defaultName;
      suggestionBase = startName;
      chosenMark = remembered && remembered.mark >= 1 && remembered.mark <= 12 ? remembered.mark : null;
      serverRefusal = null;
      $("[data-cx=inviteFrom]").textContent = ownerName ? `Invitation from ${iso(ownerName)}` : "Invitation";
      const flow = flowName || "a shared Flow";
      $("#cxJoinFlow").textContent = flow;
      $("#cxJoinTitle").title = "Choose your mark to join " + iso(flow);
      $("#cxJoinFlow").setAttribute("dir", "auto"); // the Flow name sits inside the sentence "Choose your mark to join <name>"
      $("#cxJoinScope").textContent = scopeText(scope);
      const roleChip = $("#cxJoinRole");
      roleChip.className = `cx-chip ${role === "view" ? "view" : "edit"}`;
      roleChip.replaceChildren(icon(`fa-solid ${role === "view" ? "fa-eye" : "fa-pen"}`), el("span", {text: role === "view" ? "Can view" : "Can edit"}));
      renderMarkGrid();
      input.value = startName;
      $("#modal").hidden = false;
      if (chosenMark) chooseMark(chosenMark);
      else sync();
    },
    hide() {
      $("#modal").hidden = true;
    }
  };
}
