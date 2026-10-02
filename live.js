// The live loop: one held GET /flow/live at a time. First call has no resume (hello); then resume=1. The answers are FACTS:
// "reread" means fetch GET /flow again; nothing is replayed. superseded => another tab took over, stop. A dropped
// connection => the owner is offline: tell the page, keep trying (a fresh hello each time).

export function startLive({api, waitMs, graceMs = 10000, retryMs, hooks}) {
  let stopped = false;
  let resume = false;
  let controller = null;
  let wake = null;
  let backoff = 1000; // held-poll backoff after a non-200 answer: 1 s, doubling, capped at retryMs; reset by any good answer
  const sleep = (ms) =>
    new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      wake = () => {
        clearTimeout(t);
        resolve();
      };
    });

  async function run() {
    while (!stopped) {
      controller = new AbortController();
      let r;
      // Client-side deadline for the held poll (the owner answers within waitMs): a half-open connection would otherwise hang forever.
      // A deadline abort is a network failure (offline + backoff), never an ended invitation; only stop() ends the loop.
      const deadline = setTimeout(() => controller.abort(), waitMs + graceMs);
      try {
        r = await api.poll({resume, wait: waitMs, signal: controller.signal});
        clearTimeout(deadline);
      } catch (e) {
        clearTimeout(deadline);
        if (stopped) return;
        resume = false;
        hooks.onNetworkFailure();
        await sleep(retryMs);
        continue;
      }
      if (stopped) return;
      if (r.status === 401) {
        stopped = true;
        hooks.onEnded();
        return;
      }
      const j = r.json;
      if (r.status === 503 && j && j.error === "paused") {
        resume = false;
        hooks.onNetworkFailure(); // the owner is in another Flow: nothing to show until they are back
        await sleep(retryMs);
        continue;
      }
      if (r.status !== 200 || !j || (j.ok === false && !j.timeout)) {
        await sleep(backoff);
        backoff = Math.min(backoff * 2, Math.max(1000, retryMs));
        continue;
      }
      backoff = 1000;
      if (hooks.onAlive) hooks.onAlive(); // any good answer, even a quiet held-poll timeout, proves the owner is reachable
      if (j.superseded) {
        stopped = true;
        hooks.onSuperseded();
        return;
      }
      if (j.timeout) {
        resume = true;
        continue;
      }
      hooks.onOnline(j);
      if (j.presence) hooks.onPresence(j.presence);
      if (j.hello || j.reread) {
        const ok = await hooks.onReread();
        if (stopped) return;
        if (ok === "ended") {
          stopped = true;
          return;
        }
      }
      resume = true;
    }
  }
  run();
  return {
    stop() {
      stopped = true;
      if (controller) controller.abort();
      if (wake) wake();
    },
    tryNow() {
      if (wake) wake();
    }
  };
}
