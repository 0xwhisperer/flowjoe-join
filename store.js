// Remembered name + mark (and the routing hint) for this browser. localStorage ONLY, always inside try/catch: the page
// works without it. It never holds Flow content, tokens or the CSRF value.

import {isHintLabel} from "./fragment.js";

const KEY = "flowjoe.guest.v1";

// The record has exactly one shape: {hint: DNS label, name: short string, mark: 1..12}. Anything else (an array, extra keys, wrong
// types, an oversized value, a bad hint) is not ours: it is removed and the page behaves as if nothing was remembered.
export function loadRemembered() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    let v = null;
    if (raw.length <= 2000) {
      try {
        v = JSON.parse(raw);
      } catch (_) {
        v = null;
      }
    }
    const ok = v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).sort().join(",") === "hint,mark,name" && isHintLabel(v.hint) && typeof v.name === "string" && v.name.length <= 200 && Number.isInteger(v.mark) && v.mark >= 1 && v.mark <= 12;
    if (!ok) {
      forgetRemembered();
      return null;
    }
    return {hint: v.hint, name: v.name, mark: v.mark};
  } catch (_) {
    return null;
  }
}

export function saveRemembered({hint, name, mark}) {
  try {
    localStorage.setItem(KEY, JSON.stringify({hint, name, mark}));
  } catch (_) {
    /* storage may be blocked; nothing depends on it */
  }
}

export function forgetRemembered() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {
    /* ignore */
  }
  forgetOtherPageStorage();
}

// G8: when an invitation ends (or the guest presses Forget) nothing this origin could have kept is left behind. The page itself
// writes only the localStorage record, so this is belt and braces for anything else on the origin: sessionStorage, IndexedDB,
// Cache Storage and any cookie visible to script. (The HttpOnly session cookie is cleared by the owner's 401 answer.)
function forgetOtherPageStorage() {
  try {
    localStorage.clear(); // this origin belongs to the guest page alone
  } catch (_) {
    /* ignore */
  }
  try {
    sessionStorage.clear();
  } catch (_) {
    /* ignore */
  }
  try {
    indexedDB.databases?.()?.then(
      (dbs) => dbs.forEach((d) => d.name && indexedDB.deleteDatabase(d.name)),
      () => {}
    );
  } catch (_) {
    /* ignore */
  }
  try {
    caches?.keys?.().then(
      (keys) => keys.forEach((k) => caches.delete(k)),
      () => {}
    );
  } catch (_) {
    /* ignore */
  }
  try {
    for (const part of document.cookie.split(";")) {
      const name = part.split("=")[0].trim();
      if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    }
  } catch (_) {
    /* ignore */
  }
}
