// G8: the Docs rail item. Guests can always read the FlowJoe manual: it opens in a NEW TAB (never an iframe), with noopener and
// noreferrer so the docs site learns neither this page nor the invitation. The URL is a constant (no owner or guest data).
import {$} from "./dom.js";
import {toast} from "./toast.js";

export const DOCS_URL = "https://docs.flowjoe.app/";

let timer = null; // pending restore of the highlight (null = none pending)
let was = []; // the rail item(s) that held the highlight when the window opened; only overwritten when no restore is pending

const others = (btn) => [...document.querySelectorAll(".app-rail-item")].filter((b) => b !== btn);

export function wireDocs() {
  const btn = $("#app-rail-docs-btn");
  if (!btn || btn.dataset.cxDocs) return;
  btn.dataset.cxDocs = "1";
  const restore = () => {
    timer = null;
    btn.classList.remove("active");
    if (!others(btn).some((b) => b.classList.contains("active"))) for (const b of was) b.classList.add("active"); // never a second active item
    was = [];
  };
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    window.open(DOCS_URL, "_blank", "noopener,noreferrer");
    // as in the mockup: Docs takes the highlight from the other rail item(s) for a moment, then they get it back
    if (timer === null) was = others(btn).filter((b) => b.classList.contains("active"));
    clearTimeout(timer);
    for (const b of was) b.classList.remove("active");
    btn.classList.add("active");
    timer = setTimeout(restore, 4000);
    toast("info", "fas fa-book", "The FlowJoe manual opened in a new tab", "Guests can always read the docs. Nothing in the shared Flow changes.");
  });
  // Using another rail item during the window just cancels the pending restore: the guest has navigated away and that item owns the
  // highlight (however late its own handler applies it). Docs lets go at once; nothing is re-added.
  for (const b of others(btn)) {
    b.addEventListener("click", () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      was = [];
      btn.classList.remove("active");
    });
  }
}
