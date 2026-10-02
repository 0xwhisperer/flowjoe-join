// G7 · Pure rules for the guest's Spelling, Transcribe and dictation: the word diff shown before Accept, how an owner answer is understood, the
// plain-language copy for every refusal, the recorder type, and how a transcript is added to notes. No DOM and no network here, so tests run in Node.

export const MAX_TEXT_CHARS = 2000; // a guest's own write cap for a name or notes (the owner enforces it too)
export const MAX_AUDIO_BYTES = 6 * 1024 * 1024; // = guestImageLimits.MAX_AUDIO_BYTES on the owner's side
export const MAX_RECORD_SECONDS = 120; // = guestImageLimits.MAX_RECORD_SECONDS
export const TRANSCRIBE_TIMEOUT_MS = 110000; // longer than the owner's own deadline (95 s), so the owner's answer arrives first

// ---- word diff ----------------------------------------------------------------------------------------------------------------
// Splits into words and the whitespace between them, so the diff keeps every space and line break of both texts.
const tokens = (s) => String(s).match(/\s+|[^\s]+/g) || [];

// Returns [{type: "same" | "removed" | "added", text}] covering both texts: joining "same"+"removed" gives the original, "same"+"added" the corrected.
export function wordDiff(before, after) {
  const a = tokens(before);
  const b = tokens(after);
  const n = a.length;
  const m = b.length;
  // longest common subsequence of tokens; texts are at most MAX_TEXT_CHARS so the table stays small
  const w = m + 1;
  const table = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) table[i * w + j] = a[i] === b[j] ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
  const out = [];
  const push = (type, text) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({type, text});
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (table[(i + 1) * w + j] >= table[i * w + j + 1]) push("removed", a[i++]);
    else push("added", b[j++]);
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);
  return out;
}
export const hasChanges = (diff) => diff.some((d) => d.type !== "same");

// ---- what may be saved ----------------------------------------------------------------------------------------------------------
// A corrected value for a field, or null when it cannot be saved (empty name, a name with a line break, too long).
export function checkedValue(field, text) {
  const v =
    field === "name"
      ? String(text)
          .replace(/\s*\n+\s*/g, " ")
          .trim()
      : String(text).replace(/\r\n?/g, "\n").trimEnd();
  if (field === "name" && !v) return null;
  if (v.length > MAX_TEXT_CHARS) return null;
  return v;
}

// Adds a transcript to the end of a node's notes without replacing what is there. {ok:false, over} when the notes would pass the cap.
export function appendTranscript(notes, transcript) {
  const base = String(notes || "").trimEnd();
  const text = String(transcript || "").trim();
  if (!text) return {ok: false, over: 0, empty: true};
  const next = base ? `${base}\n\n${text}` : text;
  return next.length <= MAX_TEXT_CHARS ? {ok: true, text: next} : {ok: false, over: next.length - MAX_TEXT_CHARS};
}

// ---- audio ----------------------------------------------------------------------------------------------------------------------
const ALLOWED = ["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"];
const ALIASES = {"audio/x-wav": "audio/wav", "audio/wave": "audio/wav", "audio/vnd.wave": "audio/wav", "audio/mp3": "audio/mpeg", "audio/x-m4a": "audio/mp4", "audio/m4a": "audio/mp4"};
// The type the owner accepts for a media item's or recording's type, or null.
export function sendableAudioType(mime) {
  const base = String(mime || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const m = ALIASES[base] || base;
  return ALLOWED.includes(m) ? m : null;
}
// The first recorder type this browser can make (isTypeSupported injected), as the full type for MediaRecorder; null = dictation unavailable.
export function pickRecorderType(isTypeSupported) {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    try {
      if (isTypeSupported(t)) return t;
    } catch (_) {
      /* a throwing probe is "no" */
    }
  }
  return null;
}
export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export const secondsWord = (n) => `${n} ${n === 1 ? "second" : "seconds"}`;

// ---- how an owner answer is understood ------------------------------------------------------------------------------------------
// kind: ok | ended | rate_limited | daily_cap | busy | off | role | not_set_up | scope | locked | too_big | type | failed | unavailable
export function classifyAnswer(status, json) {
  const err = json && typeof json === "object" ? json.error : undefined;
  if (status === 200 && json && json.ok === true) return {kind: "ok"};
  if (status === 401) return {kind: "ended"};
  if (status === 429) return err === "daily_cap" ? {kind: "daily_cap"} : {kind: "rate_limited", retryAfter: Math.min(300, Math.max(1, Number(json && json.retryAfter) || 5))};
  if (status === 503 && err === "busy") return {kind: "busy"};
  if (status === 503 && err === "joe_not_configured") return {kind: "not_set_up"};
  if (status === 403 && err === "joe_unavailable") return {kind: "off"};
  if (status === 403 && err === "role_forbidden") return {kind: "role"};
  if (status === 403) return {kind: "scope"};
  if (status === 423) return {kind: "locked"};
  if (status === 409 && err === "request_id_reused") return {kind: "failed"};
  if (status === 400) return {kind: "too_big"};
  if (status === 415) return {kind: "type"};
  if (status === 502) return {kind: "failed"};
  return {kind: "unavailable"}; // 503 and anything unexpected
}

// Calm copy for a refused or failed attempt. `what` is "spell" | "transcribe" | "dictate"; `owner` is the owner's isolated name or "the owner".
export function refusalCopy(kind, {what = "spell", owner = "the owner", retryAfter = 5} = {}) {
  const act = what === "spell" ? "spelling check" : what === "dictate" ? "dictation" : "transcription";
  if (kind === "rate_limited") return {tone: "info", title: `You're going quickly. You can try again in ${secondsWord(retryAfter)}.`, sub: "Nothing was changed."};
  if (kind === "daily_cap") return {tone: "info", title: `You've used today's ${act} allowance for this shared Flow.`, sub: "Try again tomorrow. Nothing was changed."};
  if (kind === "busy") return {tone: "info", title: "Joe is busy with another request.", sub: "Try again in a moment. Nothing was changed."};
  if (kind === "off") return {tone: "warning", title: `${owner} hasn't turned Joe on for this shared Flow.`, sub: "Ask them if you need it. Nothing was changed."};
  if (kind === "role") return {tone: "warning", title: "You can only view this Flow now.", sub: `Ask ${owner} for edit access. Nothing was changed.`};
  if (kind === "not_set_up") return {tone: "warning", title: `Joe isn't set up on ${owner}'s computer yet.`, sub: "Nothing was changed."};
  if (kind === "scope") return {tone: "warning", title: "That part of the Flow isn't open to you any more.", sub: "Nothing was changed."};
  if (kind === "locked") return {tone: "warning", title: "That part of the Flow is locked now.", sub: "Nothing was changed."};
  if (kind === "too_big") return {tone: "warning", title: what === "spell" ? "That text is too long to check." : "That recording is too long to transcribe.", sub: what === "spell" ? "Shorten it and try again." : `Keep it under ${Math.floor(MAX_RECORD_SECONDS / 60)} minutes.`};
  if (kind === "type") return {tone: "warning", title: "That kind of audio can't be transcribed here.", sub: "Nothing was changed."};
  if (kind === "failed") return {tone: "warning", title: `The ${act} didn't work this time.`, sub: "Nothing was changed. Try again in a moment."};
  return {tone: "warning", title: `Couldn't reach ${owner}'s FlowJoe.`, sub: `The ${act} needs it. Nothing was changed.`};
}

// Microphone errors (getUserMedia / MediaRecorder), by the error name the browser gives.
export function micErrorCopy(name) {
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return {kind: "denied", title: "Microphone access is turned off for this page.", sub: "Allow the microphone in your browser's site settings, then press the microphone again. Nothing was recorded."};
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return {kind: "none", title: "No microphone was found.", sub: "Plug one in or choose one in your browser, then try again."};
  if (name === "NotReadableError" || name === "AbortError") return {kind: "busy", title: "Your microphone is in use by another app.", sub: "Close the other app and try again."};
  if (name === "unsupported") return {kind: "unsupported", title: "This browser can't record audio.", sub: "Try a current version of Chrome, Edge, Firefox or Safari."};
  return {kind: "error", title: "Couldn't start the microphone.", sub: "Nothing was recorded. Try again."};
}
