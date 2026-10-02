// Guest name rules (a client-side MIRROR of src/electron/collaboration/guestName.js, for instant hints only: the SERVER is
// authoritative) plus the approved copy for each refusal. No refusal ever says whose name clashed.

export const NAME_MAX = 40;
const MAX_RAW_LENGTH = 400;
const MAX_MARKS = 2;
const MAX_MARKS_COMPLEX = 5;
const COMPLEX_BASE_RE = /^[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}\p{Script=Arabic}\p{Script=Hebrew}]/u;
const FORBIDDEN_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}؜‎‏‪-‮⁦-⁩ᅟᅠㅤﾠ⠀͏᠋-᠏]/u;
const NON_ASCII_SPACE_RE = /[^\S ]/u;
const MARK_RE = /\p{M}/u;
let segmenter = null;
const graphemes = (s) => {
  segmenter = segmenter || new Intl.Segmenter("und", {granularity: "grapheme"});
  return Array.from(segmenter.segment(s), (x) => x.segment);
};

// Returns {ok:true, name} or {ok:false, reason, count?}. Reasons are the server's own words.
export function validateName(raw) {
  if (typeof raw !== "string") return {ok: false, reason: "empty"};
  if (raw.length > MAX_RAW_LENGTH) return {ok: false, reason: "too_long", count: raw.length};
  const normalized = raw.normalize("NFKC");
  if (FORBIDDEN_RE.test(normalized) || NON_ASCII_SPACE_RE.test(normalized)) return {ok: false, reason: "forbidden_characters"};
  const name = normalized.trim();
  if (!name) return {ok: false, reason: "empty"};
  const clusters = graphemes(name);
  if (clusters.length > NAME_MAX) return {ok: false, reason: "too_long", count: clusters.length};
  for (const c of clusters) {
    const cap = COMPLEX_BASE_RE.test(c) ? MAX_MARKS_COMPLEX : MAX_MARKS;
    let marks = 0;
    for (const ch of c) if (MARK_RE.test(ch) && ++marks > cap) return {ok: false, reason: "too_many_marks"};
  }
  if (!/[\p{L}\p{N}]/u.test(name)) return {ok: false, reason: "no_base_character"};
  return {ok: true, name, count: clusters.length};
}

export function messageFor(reason, count) {
  switch (reason) {
    case "empty":
      return "Enter a name so people know who made each change.";
    case "too_long":
      return `Keep it to ${NAME_MAX} characters. This one has ${count}.`;
    case "no_base_character":
      return "Include at least one letter or number.";
    case "name_unavailable":
      // Never names the person or the owner who already has it.
      return "That name is already taken here. Add an initial or a nickname.";
    case "forbidden_characters":
    case "too_many_marks":
    default:
      return "Use letters, numbers, spaces and simple punctuation ( . - ' ) only.";
  }
}

export const MARKS = ["Ember", "Coral", "Rose", "Orchid", "Iris", "Sky", "Lagoon", "Teal", "Mint", "Lime", "Sun", "Sand"];

export function suggestedMark(name) {
  let h = 2166136261;
  for (const c of name) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 12) + 1;
}

export function initials(name) {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// "mark-5" <-> 5. Anything else from the wire falls back to mark 1, so a hostile avatar value can never reach a style.
export const markId = (n) => `mark-${n}`;
export function markNumber(avatar) {
  const m = /^mark-(\d{1,2})$/.exec(String(avatar || ""));
  const n = m ? Number(m[1]) : 1;
  return n >= 1 && n <= 12 ? n : 1;
}
