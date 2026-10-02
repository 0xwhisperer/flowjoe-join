// Applies a "name: value; name: value !important" declaration list through the CSS object model (el.style.setProperty), which a
// strict style-src policy allows, unlike setAttribute("style", ...) or a style="" attribute in markup.
export function applyDeclarations(el, text) {
  let depth = 0;
  let quote = "";
  let cur = "";
  const parts = [];
  for (const ch of String(text)) {
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === ";" && depth === 0 && !quote) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  for (const d of parts) {
    const i = d.indexOf(":");
    if (i <= 0) continue;
    let value = d.slice(i + 1).trim();
    let priority = "";
    const m = value.match(/\s*!important$/i);
    if (m) {
      priority = "important";
      value = value.slice(0, m.index).trim();
    }
    el.style.setProperty(d.slice(0, i).trim(), value, priority);
  }
}
