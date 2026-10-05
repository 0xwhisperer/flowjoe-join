// dictationEngine.js — shared renderer-side dictation abstraction for FlowJoe.
//
// WHY THIS EXISTS: dictation surfaces used to each `new (window.SpeechRecognition ||
// window.webkitSpeechRecognition)()` directly. That Web Speech path works in a real browser
// (server.js dev / web build) but FAILS in Electron: Chromium exposes webkitSpeechRecognition,
// yet it has no Google speech endpoint wired up, so every attempt ends with
// `Speech dictation stopped: network`. This engine keeps Web Speech as the BROWSER backend and
// adds an Electron-native backend (macOS SFSpeechRecognizer via a helper process, bridged through
// preload IPC), choosing per-environment. All four dictation surfaces (Joe chat / image-prompt,
// the image modal title+notes+markdown fields, gallery notes, and the rich-document workbench)
// route through this one module instead of scattering platform logic.
//
// BACKEND SELECTION (resolveBackend):
//   - Electron + native helper available  -> "electron-native"
//   - Non-Electron browser + Web Speech    -> "web-speech"
//   - otherwise                            -> "none"
//   In Electron we deliberately DO NOT fall back to webkitSpeechRecognition (its `network`
//   failure is the whole reason this exists) unless FLOWJOE_ALLOW_WEBSPEECH_FALLBACK is set true.
//
// EVENT MODEL: a single active session at a time. Backends report raw partial/final segments;
// the engine accumulates finalized text per session and emits normalized events carrying BOTH a
// per-segment `text` delta AND the full accumulated visible `transcript`:
//   onResult -> { type:"partial"|"final", text, transcript, sessionId }
//   onError  -> { type:"error", code, message, sessionId }
//   onState  -> { type:"state", listening, sessionId }
// The three textarea surfaces re-apply `transcript` (matching their old "rebuild the field from
// all finals + current interim" behavior); the contenteditable workbench inserts `text` on final
// events only (matching its old "insert each finalized segment" behavior). `sessionId` lets each
// surface ignore events from a session it does not own.
const global = typeof window !== "undefined" ? window : globalThis;

const resultSubs = new Set();
const errorSubs = new Set();
const stateSubs = new Set();

let currentSession = null;
let sessionCounter = 0;

function defaultLang() {
  const nav = typeof global.navigator !== "undefined" ? global.navigator : null;
  return String((nav && nav.language) || "en-US");
}

function getWebSpeechCtor() {
  return global.SpeechRecognition || global.webkitSpeechRecognition || null;
}

function isElectronContext() {
  return !!global.electronAPI;
}

// The native bridge is only usable when preload exposed the full dictation surface.
function getNativeBridge() {
  const api = global.electronAPI;
  if (api && typeof api.dictationIsAvailable === "function" && typeof api.dictationStart === "function" && typeof api.dictationStop === "function" && typeof api.onDictationResult === "function" && typeof api.onDictationError === "function" && typeof api.onDictationState === "function") {
    return api;
  }
  return null;
}

function allowWebSpeechFallback() {
  return global.FLOWJOE_ALLOW_WEBSPEECH_FALLBACK === true;
}

async function resolveBackend() {
  const native = getNativeBridge();
  if (native) {
    try {
      const res = await native.dictationIsAvailable();
      const available = res && typeof res === "object" ? res.available !== false : !!res;
      if (available) return "electron-native";
    } catch (_) {}
    // Native bridge present but the helper is unavailable on this machine. Avoid the
    // network-erroring webkit path unless fallback was explicitly opted into.
    if (allowWebSpeechFallback() && getWebSpeechCtor()) return "web-speech";
    return "none";
  }
  if (isElectronContext()) {
    // Electron without the dictation bridge (older preload). webkitSpeechRecognition would
    // just throw `network`, so treat as unsupported unless fallback was opted into.
    if (allowWebSpeechFallback() && getWebSpeechCtor()) return "web-speech";
    return "none";
  }
  return getWebSpeechCtor() ? "web-speech" : "none";
}

function safeInvoke(callback, payload) {
  try {
    callback(payload);
  } catch (err) {
    try {
      console.warn("[FlowJoe Dictation] subscriber threw:", err);
    } catch (_) {}
  }
}

function emitResult(event) {
  for (const cb of resultSubs) safeInvoke(cb, event);
}
function emitError(event) {
  for (const cb of errorSubs) safeInvoke(cb, event);
}
function emitState(event) {
  for (const cb of stateSubs) safeInvoke(cb, event);
}

function emitSessionEvent(session, channel, event) {
  if (session && session.deferEvents) {
    session.pendingEvents.push({channel, event});
    return;
  }
  if (channel === "result") emitResult(event);
  else if (channel === "error") emitError(event);
  else if (channel === "state") emitState(event);
}

function flushPendingSessionEvents(session) {
  if (!session) return;
  const pending = Array.isArray(session.pendingEvents) ? session.pendingEvents.slice() : [];
  session.pendingEvents = [];
  session.deferEvents = false;
  for (const item of pending) {
    if (!item || !item.channel) continue;
    emitSessionEvent(session, item.channel, item.event);
  }
}

function composeTranscript(session, interim) {
  const parts = [];
  if (session.finalText) parts.push(session.finalText);
  const trimmedInterim = String(interim || "").trim();
  if (trimmedInterim) parts.push(trimmedInterim);
  return parts.join(" ");
}

// Build the session-scoped callbacks a backend reports through. Everything is keyed to one
// session object so a superseded/aborted backend can never leak partials into a newer session,
// while still letting the owning surface receive exactly one terminal state event.
function makeHandlers(session) {
  return {
    onPartial(text) {
      if (session.cancelled || session.ended) return;
      emitSessionEvent(session, "result", {type: "partial", text: String(text || ""), transcript: composeTranscript(session, text), sessionId: session.id});
    },
    onFinal(text) {
      if (session.cancelled || session.ended) return;
      const segment = String(text || "").trim();
      if (segment) session.finalText = session.finalText ? `${session.finalText} ${segment}` : segment;
      emitSessionEvent(session, "result", {type: "final", text: segment, transcript: composeTranscript(session, ""), sessionId: session.id});
    },
    onError(code, message) {
      if (session.cancelled || session.ended) return;
      emitSessionEvent(session, "error", {type: "error", code: String(code || ""), message: String(message || ""), sessionId: session.id});
    },
    onState(listening) {
      if (listening) {
        if (session.cancelled || session.ended) return;
        emitSessionEvent(session, "state", {type: "state", listening: true, sessionId: session.id});
        return;
      }
      if (session.ended) return;
      session.ended = true;
      emitSessionEvent(session, "state", {type: "state", listening: false, sessionId: session.id});
      if (currentSession === session) currentSession = null;
    }
  };
}

function abortCurrent() {
  const session = currentSession;
  if (!session) return;
  session.cancelled = true;
  try {
    if (session.backend && typeof session.backend.abort === "function") session.backend.abort();
  } catch (_) {}
  // Guarantee the owning surface is told its session ended (sets ended + clears currentSession).
  session.handlers.onState(false);
}

// --- Web Speech backend (the existing browser path, relocated unchanged in spirit) ---
function createWebSpeechBackend(session) {
  const Ctor = getWebSpeechCtor();
  let recognition = null;
  let done = false;

  function detach() {
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }

  function finish() {
    if (done) return;
    done = true;
    detach();
    session.handlers.onState(false);
  }

  return {
    start() {
      recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = String(session.lang || "en-US");

      recognition.onstart = () => {
        session.handlers.onState(true);
      };

      recognition.onresult = (event) => {
        const results = (event && event.results) || [];
        const startIndex = Math.max(0, Number(event && event.resultIndex) || 0);
        const interimParts = [];
        for (let i = startIndex; i < results.length; i += 1) {
          const result = results[i];
          const transcript = String((result && result[0] && result[0].transcript) || "").trim();
          if (!transcript) continue;
          if (result.isFinal) session.handlers.onFinal(transcript);
          else interimParts.push(transcript);
        }
        session.handlers.onPartial(interimParts.join(" "));
      };

      recognition.onerror = (event) => {
        const code = String((event && event.error) || "").trim();
        session.handlers.onError(code, mapWebSpeechErrorMessage(code));
        finish();
      };

      recognition.onend = () => {
        finish();
      };

      try {
        recognition.start();
      } catch (err) {
        detach();
        recognition = null;
        throw err;
      }
    },
    stop() {
      try {
        if (recognition && typeof recognition.stop === "function") recognition.stop();
      } catch (_) {}
    },
    abort() {
      try {
        if (recognition && typeof recognition.abort === "function") recognition.abort();
      } catch (_) {}
    }
  };
}

function mapWebSpeechErrorMessage(code) {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "Microphone access was blocked. Allow microphone access for FlowJoe, then try again.";
  }
  return code ? `Speech dictation stopped: ${code}` : "Speech dictation stopped.";
}

// --- Electron-native backend (helper process bridged through preload IPC) ---
function createNativeBackend(session) {
  const api = getNativeBridge();
  let unsubscribes = [];
  let done = false;

  function cleanup() {
    unsubscribes.forEach((unsub) => {
      try {
        if (typeof unsub === "function") unsub();
      } catch (_) {}
    });
    unsubscribes = [];
  }

  function finish() {
    if (done) return;
    done = true;
    cleanup();
    session.handlers.onState(false);
  }

  return {
    async start() {
      unsubscribes.push(
        api.onDictationResult((payload) => {
          if (!payload) return;
          if (payload.type === "final") session.handlers.onFinal(String(payload.text || ""));
          else session.handlers.onPartial(String(payload.text || ""));
        })
      );
      unsubscribes.push(
        api.onDictationError((payload) => {
          const code = String((payload && payload.code) || "");
          const message = String((payload && payload.message) || "") || `Speech dictation stopped${code ? `: ${code}` : "."}`;
          session.handlers.onError(code, message);
          finish();
        })
      );
      unsubscribes.push(
        api.onDictationState((payload) => {
          const listening = !!(payload && payload.listening);
          if (listening) session.handlers.onState(true);
          else finish();
        })
      );

      let res = null;
      try {
        res = await api.dictationStart({lang: session.lang});
      } catch (err) {
        cleanup();
        throw err;
      }
      if (res && res.success === false) {
        cleanup();
        throw new Error(res.error || "Native dictation could not start.");
      }
    },
    stop() {
      try {
        api.dictationStop();
      } catch (_) {}
    },
    abort() {
      cleanup();
      try {
        api.dictationStop();
      } catch (_) {}
    }
  };
}

// --- Public API ---
async function isAvailable() {
  return (await resolveBackend()) !== "none";
}

async function getBackendName() {
  return resolveBackend();
}

async function start(options = {}) {
  const lang = String(options.lang || defaultLang());
  const backendName = await resolveBackend();
  if (backendName === "none") {
    throw new Error("Dictation is not available in this environment.");
  }

  abortCurrent();

  const session = {
    id: `dictation-${(sessionCounter += 1)}`,
    lang,
    backendName,
    finalText: "",
    cancelled: false,
    ended: false,
    deferEvents: true,
    pendingEvents: [],
    backend: null,
    handlers: null
  };
  session.handlers = makeHandlers(session);
  session.backend = backendName === "electron-native" ? createNativeBackend(session) : createWebSpeechBackend(session);
  currentSession = session;

  try {
    await session.backend.start();
  } catch (err) {
    if (currentSession === session) currentSession = null;
    session.cancelled = true;
    throw err;
  }
  setTimeout(() => flushPendingSessionEvents(session), 0);
  return session.id;
}

async function stop(options = {}) {
  const session = currentSession;
  if (!session || !session.backend) return;
  try {
    if (options.abort) {
      session.cancelled = true;
      if (typeof session.backend.abort === "function") session.backend.abort();
    } else if (typeof session.backend.stop === "function") {
      session.backend.stop();
    }
  } catch (_) {}
}

function getActiveSessionId() {
  return currentSession ? currentSession.id : null;
}

function onResult(callback) {
  if (typeof callback !== "function") return () => {};
  resultSubs.add(callback);
  return () => resultSubs.delete(callback);
}
function onError(callback) {
  if (typeof callback !== "function") return () => {};
  errorSubs.add(callback);
  return () => errorSubs.delete(callback);
}
function onState(callback) {
  if (typeof callback !== "function") return () => {};
  stateSubs.add(callback);
  return () => stateSubs.delete(callback);
}

const api = {
  isAvailable,
  getBackendName,
  getActiveSessionId,
  start,
  stop,
  onResult,
  onError,
  onState
};

export default api;
// Named exports mirror the members the unit test reads off the required namespace.
export {isAvailable, getBackendName, getActiveSessionId, start, stop, onResult, onError, onState};
