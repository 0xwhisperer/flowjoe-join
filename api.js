// The only network code in the page: calls to the owner address. Every call sends the session cookie (credentials) and,
// for POSTs, the CSRF header. A network failure rejects with {network:true}; an HTTP answer resolves {status, json}.

const CSRF_HEADER = "x-flowjoe-csrf";
const REFERRER = "no-referrer"; // the media chunk fetch below uses this; call() spells the same policy out
const joeRequestId = (requestId) => ({"x-flowjoe-request-id": requestId}); // G5

// timeoutMs bounds every call except the held live poll (which has its own AbortController): a hung owner cannot stall the page.
export function createApi(ownerBase, {timeoutMs = 15000} = {}) {
  let csrf = "";
  async function call(method, path, body, {keepalive = false, signal, headers: extra} = {}) {
    if (!signal) signal = AbortSignal.timeout(timeoutMs);
    const headers = {...(extra || {})};
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      if (csrf) headers[CSRF_HEADER] = csrf;
    }
    let res;
    try {
      res = await fetch(ownerBase + path, {method, headers, credentials: "include", cache: "no-store", referrerPolicy: "no-referrer", body: body === undefined ? undefined : JSON.stringify(body), keepalive, signal});
    } catch (err) {
      const e = new Error("network");
      e.network = true;
      e.aborted = !!(signal && signal.aborted);
      throw e;
    }
    let json = null;
    try {
      json = await res.json();
    } catch (err) {
      // The deadline (or stop) aborted while the body was still arriving: that is a network failure, not a refusal.
      if (signal && signal.aborted) {
        const e = new Error("network");
        e.network = true;
        e.aborted = true;
        throw e;
      }
      /* a non-JSON answer is treated as a refusal */
    }
    return {status: res.status, json, retryAfter: Number(res.headers.get("retry-after")) || 0}; // G6b: seconds the owner asked us to wait (429 / busy), 0 when absent
  }
  // G6b: one generated picture, fetched as bytes (credentialed, no-store) for an in-memory Blob URL. 200 JSON = an explicit state (unavailable).
  async function imageBytes(id, signal) {
    let res;
    try {
      res = await fetch(`${ownerBase}/flow/image-history/image?id=${encodeURIComponent(id)}`, {method: "GET", credentials: "include", cache: "no-store", referrerPolicy: REFERRER, signal: signal || AbortSignal.timeout(timeoutMs)});
    } catch (err) {
      const e = new Error("network");
      e.network = true;
      throw e;
    }
    const ctype = res.headers.get("content-type") || "";
    if (res.status === 200 && !/^application\/json/.test(ctype)) return {status: 200, bytes: new Uint8Array(await res.arrayBuffer()), type: ctype};
    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      /* a non-JSON refusal */
    }
    return {status: res.status, json, retryAfter: Number(res.headers.get("retry-after")) || 0};
  }
  // G3: the media routes. The index is JSON; a chunk is a ranged GET (credentialed, no-store) answered 206 with at most 1 MiB.
  async function mediaChunk(id, start, end, signal) {
    let res;
    try {
      res = await fetch(`${ownerBase}/media?id=${encodeURIComponent(id)}`, {method: "GET", headers: {Range: `bytes=${start}-${end}`}, credentials: "include", cache: "no-store", referrerPolicy: REFERRER, signal: signal || AbortSignal.timeout(timeoutMs)});
    } catch (err) {
      const e = new Error("network");
      e.network = true;
      throw e;
    }
    const ctype = res.headers.get("content-type") || "";
    if (res.status === 206 || res.status === 200) {
      if (/^application\/json/.test(ctype)) {
        const j = await res.json().catch(() => null); // 200 JSON = an explicit state (local_only / unavailable), not bytes
        return {status: res.status, state: j && typeof j.state === "string" ? j.state : "unavailable"};
      }
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(res.headers.get("content-range") || "");
      return {status: res.status, bytes: new Uint8Array(await res.arrayBuffer()), type: ctype, total: range ? Number(range[3]) : null};
    }
    return {status: res.status, retryAfter: Number(res.headers.get("retry-after")) || 0};
  }
  // G7: ONE audio upload for transcription. The body is the raw recording (Content-Type = its audio type); the owner turns it into text on the owner's
  // own key. A long deadline: the owner's own limit is shorter, so its answer (or its refusal) normally arrives first.
  async function transcribe(blob, {nodeId, requestId, mime, signal, timeoutMs: ms = 110000}) {
    const headers = {"Content-Type": mime, "x-flowjoe-node-id": nodeId, "x-flowjoe-request-id": requestId};
    if (csrf !== "") headers[CSRF_HEADER] = csrf;
    let res;
    try {
      res = await fetch(`${ownerBase}/flow/transcribe`, {method: "POST", headers, credentials: "include", cache: "no-store", referrerPolicy: REFERRER, body: blob, signal: signal || AbortSignal.timeout(ms)});
    } catch (err) {
      const e = new Error("network");
      e.network = true;
      e.aborted = !!(signal && signal.aborted);
      throw e;
    }
    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      /* a non-JSON answer is treated as a refusal */
    }
    return {status: res.status, json};
  }
  return {
    mediaIndex: (query) => call("GET", `/media/index${query ? "?" + query : ""}`),
    mediaChunk,
    mediaUrl: (id) => `${ownerBase}/media?id=${encodeURIComponent(id)}`,
    setCsrf: (v) => {
      csrf = typeof v === "string" ? v : "";
    },
    precheck: (token) => call("POST", "/invite/precheck", {token}),
    join: (payload) => call("POST", "/session", payload),
    readFlow: () => call("GET", "/flow"),
    poll: ({resume, wait, signal}) => call("GET", `/flow/live?${resume ? "resume=1&" : ""}wait=${wait}`, undefined, {signal}),
    presence: (body, opts) => call("POST", "/flow/live/presence", body, opts),
    // Edit-guest writes. requestId makes a retry of the SAME op idempotent on the owner; a different op always gets a new id.
    op: (body, requestId) => call("POST", "/flow/op", body, {headers: {"x-flowjoe-request-id": requestId}}),
    flowSummary: () => call("GET", "/flow/summary"), // G4
    nodeSummary: (id) => call("GET", `/flow/node-summary?id=${encodeURIComponent(id)}`), // G4
    history: () => call("GET", "/flow/history"), // G9
    undo: (changeId) => call("POST", "/flow/live/undo", {changeId}),
    // G5 Joe chat. A chat turn can take a while on the owner's computer, so it gets a longer deadline than the other calls.
    joeHistory: () => call("GET", "/flow/joe/history"),
    joeChat: (body, requestId, opts) => call("POST", "/flow/joe", body, {headers: joeRequestId(requestId), signal: AbortSignal.timeout(opts && opts.timeoutMs ? opts.timeoutMs : 90000)}),
    joeApply: (proposalId) => call("POST", "/flow/joe/apply", {proposalId}),
    joeReject: (proposalId) => call("POST", "/flow/joe/reject", {proposalId}),
    // G6b guest image generation. A generation can take a while on the owner's computer (its own deadline is 120 s), so it gets a longer deadline here.
    imageHistory: () => call("GET", "/flow/image-history"),
    imageGen: (body, requestId, opts) => call("POST", "/flow/image-gen", body, {headers: joeRequestId(requestId), signal: AbortSignal.timeout(opts && opts.timeoutMs ? opts.timeoutMs : 130000)}),
    imageSend: (id) => call("POST", "/flow/image-gen/send", {id}),
    imageUndo: (id) => call("POST", "/flow/image-gen/undo", {id}),
    imageBytes,
    // G7 spell check: ONE field's text (a spelling check can take a few seconds on the owner's computer, so a longer deadline than the other calls).
    spell: (body, requestId, opts) => call("POST", "/flow/spell", body, {headers: joeRequestId(requestId), signal: AbortSignal.timeout(opts && opts.timeoutMs ? opts.timeoutMs : 60000)}),
    transcribe
  };
}
