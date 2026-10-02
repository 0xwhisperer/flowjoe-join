// The invitation secret travels in the URL fragment (#h=<hint>&s=<token>) so it never reaches the page host, a referrer
// header or a server log. It is read once into memory and removed from the address bar and history at once.
// Port of src/electron/collaboration/inviteFragment.js (readAndClearInviteFragment).

// The routing hint is only ever a lookup key into the owner directory, but it comes from the address bar, so it must be one plain
// DNS label (lowercase letters, digits, inner hyphens; 1 to 63 characters) before anything uses it.
export const isHintLabel = (h) => typeof h === "string" && /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(h);

export function parseFragment(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const hint = p.get("h");
  const token = p.get("s");
  return isHintLabel(hint) && token ? {hint, token} : null;
}

export function readAndClearFragment(win) {
  const parsed = parseFragment(win.location.hash);
  if (win.location.hash) {
    try {
      win.history.replaceState(null, "", `${win.location.pathname}${win.location.search}`);
    } catch (_) {
      /* the secret stays in the address bar only if the browser refuses; it is never copied anywhere else */
    }
  }
  return parsed;
}
