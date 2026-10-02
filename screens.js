// The two guest screens that have no Flow behind them: owner unavailable (with a live retry) and invitation ended.
import {$, el, iso} from "./dom.js";
import {avatar} from "./people.js";

function setCommon(info) {
  for (const e of document.querySelectorAll("[data-cx=inviteFrom]")) e.textContent = info.ownerName ? `Invitation from ${iso(info.ownerName)}` : "Invitation";
  for (const e of document.querySelectorAll("[data-cx=ownerName]")) e.textContent = info.ownerName || "The owner";
}

export function createScreens({retryMs, onRetry, onForget}) {
  let timer = null;
  let left = 0;
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const text = (label) => {
    const t = $("#cxRetryText");
    t.replaceChildren(el("i", {cls: "fa-solid fa-rotate", attrs: {"aria-hidden": "true"}}), document.createTextNode(label));
  };
  const secs = () => Math.max(1, Math.round(retryMs / 1000));
  async function retryNow() {
    stop();
    text("Checking…");
    await onRetry();
  }
  $("#cxRetryBtn").addEventListener("click", () => retryNow());
  $("#cxEndedForget").addEventListener("click", () => {
    onForget();
    $("#cxEndedForget").disabled = true;
    $("#cxEndedForget").textContent = "Forgotten";
  });
  return {
    hideAll() {
      stop();
      $("#cxUnavailable").hidden = true;
      $("#cxEnded").hidden = true;
    },
    showUnavailable(info) {
      $("#modal").hidden = true;
      $("#cxEnded").hidden = true;
      setCommon(info);
      $("#cxLandTitle").textContent = info.flowName || "Shared Flow";
      $("#cxLandLede").textContent = `${info.ownerName ? iso(info.ownerName) + "'s" : "The owner's"} FlowJoe is offline. Keep this page open and it connects as soon as it's back.`;
      $("#cxLandRemember").textContent = info.remembered ? "Your mark and name are remembered on this browser" : "Your invitation link stays in this tab";
      const owner = $("#cxLandOwner");
      owner.replaceChildren(avatar(info.ownerName || "Owner", {mark: 8, state: "away"}));
      $("#cxUnavailable").hidden = false;
      stop();
      left = secs();
      text(`Checking again in ${left} s`);
      timer = setInterval(async () => {
        left -= 1;
        if (left <= 0) {
          stop();
          text("Checking…");
          await onRetry();
          return;
        }
        text(`Checking again in ${left} s`);
      }, 1000);
    },
    showEnded(info) {
      stop();
      $("#modal").hidden = true;
      $("#cxUnavailable").hidden = true;
      setCommon(info);
      $("#cxEndedLede").textContent = `${info.ownerName ? iso(info.ownerName) : "The owner"} turned it off, or it expired. Ask for a new link to join ${info.flowName ? iso(info.flowName) : "the shared Flow"} again.`;
      $("#cxEndedOwner").replaceChildren(avatar(info.ownerName || "Owner", {mark: 8, state: "away"}));
      $("#cxEnded").hidden = false;
    }
  };
}
