/**
 * Spreadsheet Workbench island controller (shipped — the app opens this page in the preview
 * modal/fullscreen host).
 *
 * Runs INSIDE the workbench iframe. Owns the Univer lifecycle and speaks to the parent
 * (src/js/spreadsheets/spreadsheetWorkbench.js) exclusively via postMessage:
 *
 *   island -> parent : { type: "flowjoe:spreadsheet-ready" }                 (UMD loaded, awaiting a snapshot)
 *   parent -> island : { type: "flowjoe:spreadsheet-load", snapshot }        (mount + load this workbook)
 *   island -> parent : { type: "flowjoe:spreadsheet-loaded" }                (workbook mounted)
 *   parent -> island : { type: "flowjoe:spreadsheet-request-save" }          (e.g. on modal close)
 *   island -> parent : { type: "flowjoe:spreadsheet-save", snapshot }        (debounced on edit, or on request)
 *   parent -> island : { type: "flowjoe:spreadsheet-dispose" }               (teardown)
 *   island -> parent : { type: "flowjoe:spreadsheet-error", message, phase } (init/load/save failure)
 *
 * The snapshot ENVELOPE (schema/version/engine) is owned by the model on the parent side;
 * the island echoes the envelope it was loaded with and only swaps in a fresh workbook body
 * from Univer's save(). That keeps SpreadsheetSlotModel the single source of truth for the
 * snapshot contract while Univer details stay sealed in here.
 */
(function () {
  "use strict";

  const SAVE_DEBOUNCE_MS = 800;

  let univer = null;
  let univerAPI = null;
  let loadedEnvelope = null; // { schema, version, engine, engineVersion } from the load message
  let saveTimer = null;
  let disposed = false;
  // "Real mutation since load/last-emit" signal, mirroring the rich-document island. Handed to
  // the parent with every save message so a flush that follows NO edits (e.g. modal close or
  // stack traversal over an untouched sheet) is a no-op the parent must not persist or restage.
  let mutatedSinceEmit = false;

  // ---- clipboard fallback for browser iframes --------------------------------
  // Univer's BrowserClipboardService uses navigator.clipboard.readText() / .read()
  // which require the clipboard-read permission. In Electron the permission is
  // granted implicitly; in a browser iframe it is typically denied, so paste
  // silently returns "". We capture the synchronous event.clipboardData from the
  // native paste event (available without permission) and patch the async API to
  // fall back to it when the native call throws.
  const _pasteCache = {text: "", html: "", ts: 0};
  document.addEventListener(
    "paste",
    (e) => {
      _pasteCache.text = e.clipboardData?.getData("text/plain") || "";
      _pasteCache.html = e.clipboardData?.getData("text/html") || "";
      _pasteCache.ts = Date.now();
    },
    true
  );

  const PASTE_CACHE_TTL_MS = 2000;
  function _recentPasteText() {
    return Date.now() - _pasteCache.ts < PASTE_CACHE_TTL_MS ? _pasteCache.text : "";
  }

  if (navigator.clipboard) {
    const _origReadText = navigator.clipboard.readText?.bind(navigator.clipboard);
    if (_origReadText) {
      navigator.clipboard.readText = async function () {
        try {
          return await _origReadText();
        } catch (_) {
          return _recentPasteText();
        }
      };
    }
    const _origRead = navigator.clipboard.read?.bind(navigator.clipboard);
    if (_origRead) {
      navigator.clipboard.read = async function () {
        try {
          return await _origRead();
        } catch (_) {
          const items = [];
          if (Date.now() - _pasteCache.ts < PASTE_CACHE_TTL_MS) {
            const parts = {};
            if (_pasteCache.html) parts["text/html"] = new Blob([_pasteCache.html], {type: "text/html"});
            if (_pasteCache.text) parts["text/plain"] = new Blob([_pasteCache.text], {type: "text/plain"});
            if (Object.keys(parts).length) items.push(new ClipboardItem(parts));
          }
          return items;
        }
      };
    }
  }

  function postToParent(message) {
    // Same-origin local island; for file:// the parent origin is "null", so target "*" is
    // required. The parent authenticates by event.source identity, not origin.
    try {
      window.parent.postMessage(message, "*");
    } catch (_) {
      /* parent may already be gone during teardown */
    }
  }

  function reportError(phase, error) {
    postToParent({
      type: "flowjoe:spreadsheet-error",
      phase: String(phase || ""),
      message: String((error && error.message) || error || "unknown error")
    });
  }

  function ensureWorkbookData(snapshot) {
    const workbook = snapshot && typeof snapshot === "object" && snapshot.workbook && typeof snapshot.workbook === "object" ? snapshot.workbook : {};
    // Univer needs a unit id; a fresh blank from the model has none at the top level.
    if (!workbook.id) workbook.id = "fj-workbook";
    return workbook;
  }

  function currentSnapshot() {
    if (!univerAPI) return null;
    const workbook = univerAPI.getActiveWorkbook();
    if (!workbook) return null;
    const body = workbook.save(); // Univer IWorkbookData
    const envelope = loadedEnvelope && typeof loadedEnvelope === "object" ? loadedEnvelope : {};
    return Object.assign({}, envelope, {workbook: body});
  }

  function emitSave() {
    if (disposed) return;
    const snapshot = currentSnapshot();
    if (!snapshot) return;
    // Hand the parent the "real mutation since load/last-emit" signal, then clear it. A flush
    // with mutated:false (e.g. close/traverse without editing) is a no-op the parent must not
    // persist — mirrors the rich-document island's contract.
    const mutated = mutatedSinceEmit;
    mutatedSinceEmit = false;
    postToParent({type: "flowjoe:spreadsheet-save", snapshot, mutated});
  }

  function scheduleSave() {
    if (disposed) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      emitSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function commandId(commandInfo) {
    if (typeof commandInfo === "string") return commandInfo;
    if (!commandInfo || typeof commandInfo !== "object") return "";
    return String(commandInfo.id || commandInfo.commandId || commandInfo.type || commandInfo.command || "");
  }

  function isWorkbookMutationCommand(commandInfo) {
    const id = commandId(commandInfo).toLowerCase();
    if (!id) return false;
    // formula.mutation.set-formula-calculation-* is Univer's OWN internal recalculation-engine
    // bookkeeping — it fires on mount/recalc with no user edit involved, and its "set-formula-
    // calculation" text matches the "set"/"formula" mutation terms below. Exclude it explicitly
    // or a freshly-mounted, untouched sheet reports mutatedSinceEmit:true on its own.
    if (/formula-calculation/.test(id)) return false;
    if (/(selection|scroll|zoom|focus|hover|cursor|activate|pointer|navigation|render|resizeobserver)/.test(id)) return false;
    return /(set|insert|delete|remove|move|copy|paste|cut|clear|update|resize|rename|sort|filter|merge|unmerge|format|style|border|row|column|sheet|cell|range|formula|undo|redo)/.test(id);
  }

  function mountAndLoad(snapshot) {
    if (univer) return; // already mounted — load is one-shot per island instance
    const presets = window.UniverPresets;
    const core = window.UniverCore;
    const sheetsCore = window.UniverPresetSheetsCore;
    const enUS = window.UniverPresetSheetsCoreEnUS;
    if (!presets || !core || !sheetsCore) {
      reportError("init", new Error("Univer UMD globals missing (presets/core/preset-sheets-core)"));
      return;
    }

    try {
      const {createUniver} = presets;
      const {LocaleType, mergeLocales} = core;
      const {UniverSheetsCorePreset} = sheetsCore;

      const created = createUniver({
        locale: LocaleType.EN_US,
        locales: {[LocaleType.EN_US]: mergeLocales(enUS || {})},
        presets: [UniverSheetsCorePreset({container: "fj-sheet-root"})]
      });
      univer = created.univer;
      univerAPI = created.univerAPI;
      // Automation/debug seam, scoped to THIS isolated island window only (never the main
      // renderer). Lets e2e tests drive real Univer Sheets commands (e.g. setValue) to prove the
      // edit→mutation→save path — mirrors the rich-document island's __flowjoeRichDocWorkbench.
      try {
        window.__flowjoeSpreadsheetWorkbench = {getUniverAPI: () => univerAPI};
      } catch (_) {}

      // Remember the envelope so save() round-trips the model's schema/version/engine.
      loadedEnvelope = snapshot && typeof snapshot === "object" ? {schema: snapshot.schema, version: snapshot.version, engine: snapshot.engine, engineVersion: snapshot.engineVersion} : {};

      univerAPI.createWorkbook(ensureWorkbookData(snapshot));

      // Auto-persist on edits (debounced). The pragmatic "snapshot the whole workbook on
      // change" model from the roadmap — deep per-cell undo integration is deferred.
      if (typeof univerAPI.onCommandExecuted === "function") {
        univerAPI.onCommandExecuted((commandInfo) => {
          if (isWorkbookMutationCommand(commandInfo)) {
            mutatedSinceEmit = true;
            scheduleSave();
          }
        });
      }

      postToParent({type: "flowjoe:spreadsheet-loaded"});
    } catch (error) {
      reportError("load", error);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    try {
      if (univer && typeof univer.dispose === "function") univer.dispose();
    } catch (_) {
      /* best-effort */
    }
    univer = null;
    univerAPI = null;
  }

  window.addEventListener("message", (event) => {
    // Only trust messages from our parent window.
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;

    switch (data.type) {
      case "flowjoe:spreadsheet-load":
        mountAndLoad(data.snapshot);
        break;
      case "flowjoe:spreadsheet-request-save":
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        emitSave();
        break;
      case "flowjoe:spreadsheet-dispose":
        dispose();
        break;
      default:
        break;
    }
  });

  // Tell the parent we're ready for a snapshot once the UMD bundles have executed.
  postToParent({type: "flowjoe:spreadsheet-ready"});
})();
