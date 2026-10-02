// Tiny DOM helpers. Text always goes through textContent; there is no innerHTML for anything a person or the owner wrote.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function el(tag, {cls, text, attrs, children} = {}) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (children) for (const c of children) if (c) e.appendChild(c);
  return e;
}

// Person- or owner-supplied text must not reorder its surroundings (RTL names): visible text sits in an element with dir="auto",
// and names inside aria-label/title strings are wrapped in the Unicode isolates FSI (U+2068) ... PDI (U+2069).
export const iso = (s) => "\u2068" + String(s).replace(/[\u202a-\u202e\u2066-\u2069]/g, "") + "\u2069"; // owner-supplied text may carry its own bidi controls: they are removed so they cannot close the isolate early

export const icon = (cls) => el("i", {cls, attrs: {"aria-hidden": "true"}});
