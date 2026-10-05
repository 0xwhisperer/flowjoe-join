/**
 * Rich Document Workbench island controller (Phase 0.5 spike).
 *
 * Runs INSIDE the workbench iframe. Owns the Univer DOCS lifecycle and speaks to the parent
 * (src/js/richDocuments/richDocumentWorkbench.js) exclusively via postMessage:
 *
 *   island -> parent : { type: "flowjoe:rich-document-ready" }                 (UMD loaded, awaiting a snapshot)
 *   parent -> island : { type: "flowjoe:rich-document-load", snapshot }        (mount + load this document)
 *   island -> parent : { type: "flowjoe:rich-document-loaded" }                (document mounted)
 *   parent -> island : { type: "flowjoe:rich-document-request-save" }          (e.g. on modal close)
 *   island -> parent : { type: "flowjoe:rich-document-save", snapshot }        (debounced on edit, or on request)
 *   parent -> island : { type: "flowjoe:rich-document-dispose" }               (teardown)
 *   island -> parent : { type: "flowjoe:rich-document-error", message, phase } (init/load/save failure)
 *
 * The snapshot ENVELOPE (schema/version/engine + document.title) is owned by the model on the
 * parent side (RichDocumentSlotModel). The island echoes the envelope it was loaded with and
 * swaps in:
 *   - document.blocks    — the engine-neutral paragraph list the Phase 0 validator/fingerprint
 *                          read (derived from Univer's text), so the envelope stays valid and
 *                          Univer-agnostic.
 *   - document.engineData — the FULL Univer IDocumentData (for high-fidelity reload). This is an
 *                          opaque, engine-specific field; the model's validator and content
 *                          fingerprint deliberately ignore it.
 *
 * That keeps RichDocumentSlotModel the single source of truth for the snapshot contract while
 * Univer details stay sealed in here. Univer is never imported on the parent side.
 */

import FlowJoeDictationEngine from "../js/dictationEngine.js";
import {normalizeTranscript, createTextEdit} from "../js/dictationUtils.js";

// Expose for the e2e test surface (page.evaluate reads contentWindow.FlowJoeDictationEngine).
window.FlowJoeDictationEngine = FlowJoeDictationEngine;

const SAVE_DEBOUNCE_MS = 800;
const ENGINE = "univer-docs";
const DOC_UNIT_ID = "fj-doc";
const DOCUMENT_FLAVOR_TRADITIONAL = 1;
const DEFAULT_PAGE_MIN_WIDTH = 640;
const DEFAULT_PAGE_MIN_HEIGHT = 900;
const CSS_PX_PER_INCH = 96;
const DEFAULT_DOCUMENT_MARGIN_PX = Math.round(CSS_PX_PER_INCH * 0.75);
const DEFAULT_DOCUMENT_STYLE = Object.freeze({
  documentFlavor: DOCUMENT_FLAVOR_TRADITIONAL,
  marginTop: DEFAULT_DOCUMENT_MARGIN_PX,
  marginBottom: DEFAULT_DOCUMENT_MARGIN_PX,
  marginRight: DEFAULT_DOCUMENT_MARGIN_PX,
  marginLeft: DEFAULT_DOCUMENT_MARGIN_PX,
  // Header/footer baseline offsets (px from the page edge). Headers/footers render inside the
  // page margins; without these Univer falls back to 0 and the text hugs the page edge.
  marginHeader: 30,
  marginFooter: 30
});

let univer = null;
let univerAPI = null;
let loadedEnvelope = null; // { schema, version, engine, engineVersion, title } from the load message
// The non-text document structure from the loaded snapshot that the live Univer editor cannot
// yet edit (tables, images) or that lives at document level (page layout, headers, footers).
// currentSnapshot() RE-MERGES these on save so an imported .docx does not lose them the moment
// a user makes a text edit. { blocks, layout, headers, footers } — deep-cloned at load.
let loadedDocStructure = null;
let saveTimer = null;
let disposed = false;
let dictationSession = null; // { id, unsubs }
let dictationListening = false;
// True once the user has made a REAL content mutation (text OR formatting/style) since the
// document was loaded or last emitted. This is the authoritative save/no-save signal — the
// parent's neutral document.blocks fingerprint cannot see format-only edits (they live in
// document.engineData), so the parent must NOT gate persistence on blocks alone. Reset on
// each emit; never set during load because onCommandExecuted is registered AFTER createUniverDoc.
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
    // IMAGE paste: Univer 0.10.x docs has NO clipboard-image integration — its text-paste path
    // half-inserts a bare custom-block char with no drawing (image neither renders nor saves).
    // Intercept image-bearing pastes here (document capture runs before Univer's handler) and
    // route them through Univer's REAL insert command instead (doc.command.insert-doc-image),
    // which writes body customBlocks + drawings + drawingsOrder into the document model — so the
    // pasted image renders, counts as a mutation, and rides getSnapshot() into the saved snapshot.
    const imageFiles = collectClipboardImageFiles(e.clipboardData);
    if (imageFiles.length && univerAPI) {
      e.preventDefault();
      e.stopPropagation();
      void insertPastedImages(imageFiles);
    }
  },
  true
);

function collectClipboardImageFiles(clipboardData) {
  const files = [];
  const seen = new Set();
  const push = (file) => {
    if (
      !file ||
      !String(file.type || "")
        .toLowerCase()
        .startsWith("image/")
    )
      return;
    // The same image often appears in both .files and .items — dedupe by identity-ish signature.
    const sig = `${file.name}|${file.size}|${file.type}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    files.push(file);
  };
  try {
    Array.from(clipboardData?.files || []).forEach(push);
    Array.from(clipboardData?.items || []).forEach((item) => {
      if (item && item.kind === "file") push(item.getAsFile());
    });
  } catch (_) {}
  return files;
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    try {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => resolve("");
      fr.readAsDataURL(file);
    } catch (_) {
      resolve("");
    }
  });
}

function imageSizeFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => resolve({width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0});
      img.onerror = () => resolve({width: 0, height: 0});
      img.src = dataUrl;
    } catch (_) {
      resolve({width: 0, height: 0});
    }
  });
}

async function insertPastedImages(files) {
  try {
    const drawings = [];
    // Fit pasted images inside the editable page body (page width minus the margins),
    // preserving aspect ratio; never upscale.
    const root = document.getElementById("fj-doc-root");
    const maxWidth = Math.max(200, (Number(root && root.clientWidth) || DEFAULT_PAGE_MIN_WIDTH) - DEFAULT_DOCUMENT_MARGIN_PX * 2 - 16);
    const maxHeight = 900;
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl.startsWith("data:")) continue;
      const natural = await imageSizeFromDataUrl(dataUrl);
      let width = natural.width > 0 ? natural.width : 200;
      let height = natural.height > 0 ? natural.height : 150;
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      // drawingId doubles as the FlowJoe sidecar key: the parent persists the base64 bytes to
      // IndexedDB under this key on save and dehydrates the stored snapshot to indexeddb:<key>.
      const drawingId = `img_paste_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      drawings.push({
        unitId: DOC_UNIT_ID,
        subUnitId: DOC_UNIT_ID,
        drawingId,
        drawingType: 0, // DrawingTypeEnum.DRAWING_IMAGE
        imageSourceType: "BASE64",
        source: dataUrl,
        title: "",
        description: String(file.name || ""),
        docTransform: {size: {width, height}, positionH: {relativeFrom: 0, posOffset: 0}, positionV: {relativeFrom: 0, posOffset: 0}, angle: 0},
        layoutType: 0, // PositionedObjectLayoutType.INLINE
        transform: {left: 0, top: 0, width, height, angle: 0}
      });
    }
    if (!drawings.length || !univerAPI) return;
    await univerAPI.executeCommand("doc.command.insert-doc-image", {drawings});
  } catch (error) {
    reportError("paste-image", error);
  }
}

const PASTE_CACHE_TTL_MS = 2000;
function _recentPasteText() {
  return Date.now() - _pasteCache.ts < PASTE_CACHE_TTL_MS ? _pasteCache.text : "";
}

// ---- parent clipboard bridge -------------------------------------------------
// Univer's context-menu Paste calls navigator.clipboard.read() with NO preceding native paste
// event, so the paste-event cache can't help it — and on Windows Chromium's async clipboard
// read is notoriously flaky (DataError on clipboard HTML written by other apps). The parent
// window has the Electron-native clipboard (main-process, platform-solid) via electronAPI;
// this bridge asks the parent for it as the last-resort fallback. In a plain browser the
// parent replies empty and behavior is unchanged.
let _clipboardReqSeq = 0;
const _clipboardWaiters = new Map();
window.addEventListener("message", (event) => {
  const data = event && event.data;
  if (!data || data.type !== "flowjoe:rich-document-clipboard-data") return;
  const waiter = _clipboardWaiters.get(data.id);
  if (!waiter) return;
  _clipboardWaiters.delete(data.id);
  waiter({
    text: String(data.text || ""),
    imageBytes: data.imageBytes && data.imageBytes.length ? data.imageBytes : null
  });
});
function requestParentClipboard(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const id = `cb-${++_clipboardReqSeq}`;
    const timer = setTimeout(() => {
      _clipboardWaiters.delete(id);
      resolve(null);
    }, timeoutMs);
    _clipboardWaiters.set(id, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
    postToParent({type: "flowjoe:rich-document-clipboard-request", id});
  });
}

// Items containing an image type are routed to OUR insert path (Univer 0.10.x docs cannot
// paste images — its converter half-inserts a bare custom-block char). Pass everything else
// through to Univer untouched.
async function routeClipboardItemsForUniver(items) {
  const passThrough = [];
  const imageFiles = [];
  for (const item of Array.isArray(items) ? items : []) {
    const types = Array.from((item && item.types) || []);
    const imageType = types.find((t) => String(t).toLowerCase().startsWith("image/"));
    if (imageType && typeof item.getType === "function") {
      try {
        const blob = await item.getType(imageType);
        if (blob) {
          imageFiles.push(new File([blob], "pasted-image", {type: imageType}));
          continue; // the image wins for this item — never hand Univer an image to mangle
        }
      } catch (_) {}
    }
    passThrough.push(item);
  }
  if (imageFiles.length) void insertPastedImages(imageFiles);
  return passThrough;
}

if (navigator.clipboard) {
  const _origReadText = navigator.clipboard.readText?.bind(navigator.clipboard);
  if (_origReadText) {
    navigator.clipboard.readText = async function () {
      try {
        const value = await _origReadText();
        if (value) return value;
      } catch (_) {}
      const cached = _recentPasteText();
      if (cached) return cached;
      const bridged = await requestParentClipboard();
      return bridged && bridged.text ? bridged.text : "";
    };
  }
  const _origRead = navigator.clipboard.read?.bind(navigator.clipboard);
  if (_origRead) {
    navigator.clipboard.read = async function () {
      let items = null;
      try {
        items = await _origRead();
      } catch (_) {
        items = null;
      }
      if (items && items.length) return routeClipboardItemsForUniver(items);
      // Fallback 1: the synchronous paste-event cache (keyboard paste path).
      if (Date.now() - _pasteCache.ts < PASTE_CACHE_TTL_MS && (_pasteCache.text || _pasteCache.html)) {
        const parts = {};
        if (_pasteCache.html) parts["text/html"] = new Blob([_pasteCache.html], {type: "text/html"});
        if (_pasteCache.text) parts["text/plain"] = new Blob([_pasteCache.text], {type: "text/plain"});
        if (Object.keys(parts).length) return [new ClipboardItem(parts)];
      }
      // Fallback 2: the parent's Electron-native clipboard (context-menu Paste, Windows).
      const bridged = await requestParentClipboard();
      if (bridged) {
        if (bridged.imageBytes) {
          void insertPastedImages([new File([bridged.imageBytes], "pasted-image.png", {type: "image/png"})]);
          return [];
        }
        if (bridged.text) return [new ClipboardItem({"text/plain": new Blob([bridged.text], {type: "text/plain"})})];
      }
      return [];
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

function playWorkbenchUiSound(key) {
  const soundKey = String(key || "").trim();
  if (!soundKey) return;
  postToParent({type: "flowjoe:ui-sound", key: soundKey});
}

// Apply the app-theme chrome tokens posted by the parent (mirrors calendar-workbench's
// applyTheme). Only the workbench CHROME tokens used by #fj-doc-dictate in workbench.css —
// these override the hardcoded fallbacks declared there. Univer / document content untouched.
function applyTheme(theme) {
  if (!theme || typeof theme !== "object") return;
  const root = document.documentElement;
  const set = (name, value) => {
    const text = String(value || "").trim();
    if (text) root.style.setProperty(name, text);
  };
  set("--bg-tertiary", theme.bgTertiary);
  set("--border-color", theme.borderColor);
  set("--hover-bg", theme.hoverBg);
  set("--accent-color", theme.accentColor);
  set("--text-muted", theme.textMuted);
}

function reportError(phase, error) {
  postToParent({
    type: "flowjoe:rich-document-error",
    phase: String(phase || ""),
    message: String((error && error.message) || error || "unknown error")
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeDocumentStyle(style) {
  const input = isPlainObject(style) ? style : {};
  const output = {
    ...DEFAULT_DOCUMENT_STYLE,
    ...input
  };
  const root = document.getElementById("fj-doc-root");
  const rootWidth = Number(root && root.clientWidth) || Number(window.innerWidth) || DEFAULT_PAGE_MIN_WIDTH;
  const rootHeight = Number(root && root.clientHeight) || Number(window.innerHeight) || DEFAULT_PAGE_MIN_HEIGHT;
  output.pageSize = {
    width: Math.max(DEFAULT_PAGE_MIN_WIDTH, Math.floor(rootWidth)),
    height: Math.max(DEFAULT_PAGE_MIN_HEIGHT, Math.floor(rootHeight))
  };
  ["marginTop", "marginBottom", "marginRight", "marginLeft"].forEach((key) => {
    const value = Number(output[key]);
    output[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_DOCUMENT_STYLE[key];
  });
  // Univer's MODERN documentFlavor currently replaces caller-provided page/margin style with
  // a narrow centered default before rendering. Force the workbench editor to an adaptive
  // TRADITIONAL canvas so the editable body starts near the left margin and resizes with the
  // preview modal, matching the spreadsheet workbench behavior.
  output.documentFlavor = DEFAULT_DOCUMENT_STYLE.documentFlavor;
  return output;
}

// ---- engine-neutral blocks <-> Univer IDocumentBody conversion -------------
// Univer's document text lives in body.dataStream where each paragraph ends with "\r" and the
// section ends with "\n". A blank doc is exactly "\r\n" (one empty paragraph). Inline run
// formatting (bold/italic/…) is preserved via the full engineData. STRUCTURE (heading level,
// bullet/ordered lists) is carried on each paragraph so an imported .docx's headings/lists
// survive an edit → save → reopen instead of degrading to plain paragraphs: headings map to
// Univer's native paragraphStyle.namedStyleType (HEADING_1..5 === enum 4..8), lists map to
// paragraph.bullet. bodyToFlowBlocks reads both back.
const NAMED_STYLE_HEADING_BASE = 3; // NamedStyleType.HEADING_1 === 4

function paragraphMetaForBlock(block, startIndex) {
  const meta = {startIndex};
  const type = isPlainObject(block) ? String(block.type || "paragraph").toLowerCase() : "paragraph";
  if (type === "heading") {
    const level = Math.min(5, Math.max(1, Math.floor(Number(block.level) || 1)));
    meta.paragraphStyle = {namedStyleType: NAMED_STYLE_HEADING_BASE + level};
  } else if (type === "bullet" || type === "bullet-list" || type === "unordered-list") {
    meta.bullet = {listType: "BULLET_LIST", listId: "fj-bullet-list", nestingLevel: 0};
  } else if (type === "ordered" || type === "ordered-list" || type === "number-list") {
    meta.bullet = {listType: "ORDER_LIST", listId: "fj-order-list", nestingLevel: 0};
  }
  return meta;
}

function blockTypeFromParagraphMeta(meta) {
  const named = Number(isPlainObject(meta) && isPlainObject(meta.paragraphStyle) ? meta.paragraphStyle.namedStyleType : 0);
  if (named >= 4 && named <= 8) return {type: "heading", level: named - NAMED_STYLE_HEADING_BASE};
  const bullet = isPlainObject(meta) ? meta.bullet : null;
  if (isPlainObject(bullet)) {
    const listType = String(bullet.listType || "").toUpperCase();
    if (listType.includes("ORDER")) return {type: "ordered", level: 0};
    return {type: "bullet", level: 0};
  }
  return {type: "paragraph", level: 0};
}

// ---- inline run styling <-> Univer ITextRun/customRange (Phase 2) ----
// Univer text styles: ts.bl (bold), ts.it (italic), ts.ul.s (underline), ts.st.s (strike),
// ts.cl.rgb (foreground color), ts.bg.rgb (background/highlight). Hyperlinks live in
// body.customRanges[].properties.url over [st, ed]. Mapping highlight to the real Univer
// background style (rather than dropping it) is what lets an imported DOCX highlight survive a
// live edit→save: bodyToFlowBlocks reads ts.bg back out, so export still sees run.highlight.
function tsForRun(run) {
  const ts = {};
  if (run.b) ts.bl = 1;
  if (run.i) ts.it = 1;
  if (run.u) ts.ul = {s: 1};
  if (run.s) ts.st = {s: 1};
  if (run.color) ts.cl = {rgb: String(run.color)};
  if (run.highlight) ts.bg = {rgb: String(run.highlight)};
  return ts;
}

// Block-kind predicates. TABLES are not durably round-trippable in the non-Pro Univer build
// (the capability spike proved getSnapshot drops body.tables/tableSource), so they are kept OUT
// of the editable body and re-merged on save. IMAGES, by contrast, ARE first-class now: with the
// docs-drawing preset an image block with a base64 source renders as a real inline Univer drawing
// and round-trips through getSnapshot (drawings + customBlocks). An image WITHOUT a renderable
// (base64) source — e.g. when the parent has not hydrated the sidecar bytes — falls back to the
// preserve-and-re-merge path so it is never lost.
const CUSTOM_BLOCK_CHAR = "\b"; // Univer DataStreamTreeTokenType.CUSTOM_BLOCK (0x08) — image placeholder
function isTableBlock(block) {
  return isPlainObject(block) && String(block.type || "").toLowerCase() === "table";
}
function isImageBlock(block) {
  return isPlainObject(block) && String(block.type || "").toLowerCase() === "image";
}
function imageHasRenderableSource(block) {
  if (!isImageBlock(block)) return false;
  const src = isPlainObject(block.image) ? String(block.image.src || "") : "";
  return src.startsWith("data:");
}
// Blocks rendered inline in the editable body (so reconstructed FROM the body on save).
function isBodyRenderedBlock(block) {
  return imageHasRenderableSource(block);
}
// Blocks the body does NOT own — preserved verbatim and re-merged on save (tables always;
// images only when not renderable).
function isPreservedStructuralBlock(block) {
  return isTableBlock(block) || (isImageBlock(block) && !imageHasRenderableSource(block));
}

// FlowJoe image block → Univer inline image drawing (IDocImage). drawingId === image.key so the
// save path can map the drawing back to the FlowJoe sidecar key (the parent dehydrates base64 →
// indexeddb:key before storing). Inline layout so the image flows with the text.
function drawingFromImageBlock(block) {
  const img = isPlainObject(block.image) ? block.image : {};
  const drawingId = String(img.key || `fjimg-${Math.abs(hashString(String(img.src || ""))) || 1}`);
  const width = Number(img.width) > 0 ? Number(img.width) : 200;
  const height = Number(img.height) > 0 ? Number(img.height) : 150;
  return {
    drawingId,
    drawing: {
      unitId: DOC_UNIT_ID,
      subUnitId: DOC_UNIT_ID,
      drawingId,
      drawingType: 0, // DrawingTypeEnum.DRAWING_IMAGE
      imageSourceType: "BASE64",
      source: String(img.src || ""),
      title: "",
      description: String(img.alt || ""),
      docTransform: {size: {width, height}, positionH: {relativeFrom: 0, posOffset: 0}, positionV: {relativeFrom: 0, posOffset: 0}, angle: 0},
      layoutType: 0, // PositionedObjectLayoutType.INLINE
      transform: {left: 0, top: 0, width, height, angle: 0}
    }
  };
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function flowBlocksToBody(blocks) {
  // Keep renderable images (rendered inline as drawings) + editable text; drop tables and
  // non-renderable images (preserved + re-merged on save).
  const kept = (Array.isArray(blocks) ? blocks : []).filter((block) => !isPreservedStructuralBlock(block));
  const list = kept.length ? kept : [{text: ""}];
  let dataStream = "";
  const paragraphs = [];
  const textRuns = [];
  const customRanges = [];
  const customBlocks = [];
  let linkSeq = 0;
  list.forEach((block) => {
    const paragraphStart = dataStream.length;
    // Renderable image → its own paragraph holding a single CUSTOM_BLOCK char, linked to a
    // document-level drawing (built in toUniverDocumentData) by blockId === image.key.
    if (isBodyRenderedBlock(block)) {
      const drawingId = String((isPlainObject(block.image) ? block.image.key : "") || `fjimg-${Math.abs(hashString(String((block.image && block.image.src) || ""))) || 1}`);
      dataStream += CUSTOM_BLOCK_CHAR;
      customBlocks.push({startIndex: paragraphStart, blockType: 0, blockId: drawingId});
      paragraphs.push({startIndex: paragraphStart});
      dataStream += "\r";
      return;
    }
    const runs = isPlainObject(block) && Array.isArray(block.runs) && block.runs.length ? block.runs : null;
    if (runs) {
      runs.forEach((run) => {
        const runText = isPlainObject(run) ? String(run.text == null ? "" : run.text) : "";
        if (!runText) return;
        const st = dataStream.length;
        dataStream += runText;
        const ed = dataStream.length; // exclusive
        const ts = tsForRun(run);
        if (run.link) {
          // Make links visible even without the hyperlink plugin, and preserve the URL.
          if (!ts.ul) ts.ul = {s: 1};
          if (!ts.cl) ts.cl = {rgb: "#0563c1"};
          customRanges.push({startIndex: st, endIndex: ed - 1, rangeId: `fj-link-${(linkSeq += 1)}`, rangeType: 0, properties: {url: String(run.link)}});
        }
        if (Object.keys(ts).length) textRuns.push({st, ed, ts});
      });
    } else {
      dataStream += isPlainObject(block) ? String(block.text == null ? "" : block.text) : "";
    }
    paragraphs.push(paragraphMetaForBlock(block, paragraphStart));
    dataStream += "\r";
  });
  dataStream += "\n";
  const body = {
    dataStream,
    textRuns,
    paragraphs,
    sectionBreaks: [{startIndex: dataStream.length - 1}]
  };
  if (customRanges.length) body.customRanges = customRanges;
  if (customBlocks.length) body.customBlocks = customBlocks;
  return body;
}

function styleFlagsAt(index, textRuns) {
  const flags = {};
  for (let i = 0; i < textRuns.length; i += 1) {
    const run = textRuns[i];
    if (!isPlainObject(run)) continue;
    if (index >= Number(run.st) && index < Number(run.ed)) {
      const ts = isPlainObject(run.ts) ? run.ts : {};
      if (ts.bl === 1 || ts.bl === true) flags.b = true;
      if (ts.it === 1 || ts.it === true) flags.i = true;
      if (ts.ul && (ts.ul === 1 || ts.ul === true || (isPlainObject(ts.ul) && ts.ul.s !== 0))) flags.u = true;
      if (ts.st && (ts.st === 1 || ts.st === true || (isPlainObject(ts.st) && ts.st.s !== 0))) flags.s = true;
      if (isPlainObject(ts.cl) && ts.cl.rgb) flags.color = String(ts.cl.rgb).toLowerCase();
      if (isPlainObject(ts.bg) && ts.bg.rgb) flags.highlight = String(ts.bg.rgb).toLowerCase();
    }
  }
  return flags;
}

function linkAt(index, customRanges) {
  for (let i = 0; i < customRanges.length; i += 1) {
    const cr = customRanges[i];
    if (!isPlainObject(cr)) continue;
    if (index >= Number(cr.startIndex) && index <= Number(cr.endIndex)) {
      const url = isPlainObject(cr.properties) ? cr.properties.url : cr.url || "";
      if (url) return String(url);
    }
  }
  return "";
}

function bodyToFlowBlocks(body, drawings) {
  const dataStream = isPlainObject(body) ? String(body.dataStream || "") : "";
  const paragraphMeta = isPlainObject(body) && Array.isArray(body.paragraphs) ? body.paragraphs : [];
  const textRuns = isPlainObject(body) && Array.isArray(body.textRuns) ? body.textRuns : [];
  const customRanges = isPlainObject(body) && Array.isArray(body.customRanges) ? body.customRanges : [];
  const customBlocks = isPlainObject(body) && Array.isArray(body.customBlocks) ? body.customBlocks : [];
  const drawingMap = isPlainObject(drawings) ? drawings : {};
  const trimmed = dataStream.replace(/\n$/, ""); // drop the trailing section break
  const blocks = [];
  let cursor = 0;
  let paraIndex = 0;
  while (cursor <= trimmed.length) {
    let end = trimmed.indexOf("\r", cursor);
    if (end === -1) end = trimmed.length;
    const segment = trimmed.slice(cursor, end);
    if (!(cursor === trimmed.length && segment === "")) {
      // An inline image: the paragraph is a single CUSTOM_BLOCK char linked to a drawing. Rebuild
      // the FlowJoe image block from the drawing (key === drawingId; src is the base64 the parent
      // will dehydrate back to indexeddb:key before storing).
      if (segment.indexOf(CUSTOM_BLOCK_CHAR) !== -1) {
        const cb = customBlocks.find((b) => isPlainObject(b) && Number(b.startIndex) >= cursor && Number(b.startIndex) < (end || cursor + 1));
        const blockId = cb ? String(cb.blockId || "") : "";
        const drawing = blockId ? drawingMap[blockId] : null;
        if (drawing) {
          const size = isPlainObject(drawing.docTransform) && isPlainObject(drawing.docTransform.size) ? drawing.docTransform.size : {};
          const image = {key: blockId, src: String(drawing.source || "")};
          if (drawing.description) image.alt = String(drawing.description);
          if (Number(size.width) > 0) image.width = Number(size.width);
          if (Number(size.height) > 0) image.height = Number(size.height);
          blocks.push({id: `block-${blocks.length + 1}`, type: "image", text: String(drawing.description || ""), image});
          paraIndex += 1;
          if (end >= trimmed.length) break;
          cursor = end + 1;
          continue;
        }
      }
      const structure = blockTypeFromParagraphMeta(paragraphMeta[paraIndex]);
      const block = {id: `block-${blocks.length + 1}`, type: structure.type, text: segment};
      if (structure.type === "heading") block.level = structure.level;
      // Reconstruct inline runs by coalescing same-style adjacent characters.
      const runs = [];
      let current = null;
      for (let offset = 0; offset < segment.length; offset += 1) {
        const absolute = cursor + offset;
        const flags = styleFlagsAt(absolute, textRuns);
        const link = linkAt(absolute, customRanges);
        const key = `${flags.b ? 1 : 0}${flags.i ? 1 : 0}${flags.u ? 1 : 0}${flags.s ? 1 : 0}${flags.color || ""}:${flags.highlight || ""}|${link}`;
        if (!current || current.key !== key) {
          current = {key, run: {text: segment[offset], ...flags, ...(link ? {link} : {})}};
          runs.push(current);
        } else {
          current.run.text += segment[offset];
        }
      }
      const styled = runs.some((r) => r.run.b || r.run.i || r.run.u || r.run.s || r.run.color || r.run.highlight || r.run.link);
      if (styled && segment.length) block.runs = runs.map((r) => r.run);
      blocks.push(block);
    }
    paraIndex += 1;
    if (end >= trimmed.length) break;
    cursor = end + 1;
  }
  if (!blocks.length) blocks.push({id: "block-1", type: "paragraph", text: ""});
  return blocks;
}

// ---- headers & footers ---------------------------------------------------------
// Univer's header/footer entry (double-click the page's top/bottom margin, or the panel's
// checkboxes) applies JSONX insertOp(["headers", id]) / (["footers", id]) — with no `headers`/
// `footers` containers on the mounted IDocumentData the op throws "Cannot insert into missing
// item" INSIDE Univer's async dblclick handler (silently swallowed), so header editing looked
// completely dead. toUniverDocumentData always mounts both containers, and this helper mounts
// the FlowJoe-neutral imported header/footer sets ({default|first|even: blocks[]}) as real
// Univer headers/footers so imported DOCX headers render and are editable.
const HF_STYLE_KEYS = {
  header: {default: "defaultHeaderId", first: "firstPageHeaderId", even: "evenPageHeaderId"},
  footer: {default: "defaultFooterId", first: "firstPageFooterId", even: "evenPageFooterId"}
};
function applyNeutralHeaderFooters(docData, neutralDoc) {
  const ds = docData.documentStyle;
  [
    {set: isPlainObject(neutralDoc.headers) ? neutralDoc.headers : null, target: docData.headers, kind: "header"},
    {set: isPlainObject(neutralDoc.footers) ? neutralDoc.footers : null, target: docData.footers, kind: "footer"}
  ].forEach(({set, target, kind}) => {
    if (!set) return;
    ["default", "first", "even"].forEach((variant) => {
      const blocks = set[variant];
      if (!Array.isArray(blocks) || !blocks.length) return;
      const id = `fj-${kind}-${variant}`;
      target[id] = {[`${kind}Id`]: id, body: flowBlocksToBody(blocks)};
      ds[HF_STYLE_KEYS[kind][variant]] = id;
      if (variant === "first") ds.useFirstPageHeaderFooter = 1;
      if (variant === "even") ds.evenAndOddHeaders = 1;
    });
  });
}

// Save side: rebuild the FlowJoe-neutral header/footer sets from the LIVE engine snapshot, so
// headers typed in the editor reach the stored snapshot's neutral fields (fingerprint + export).
function neutralHeaderFootersFromEngine(docData) {
  const ds = isPlainObject(docData.documentStyle) ? docData.documentStyle : {};
  const pick = (mapObj, id) => {
    if (!id || !isPlainObject(mapObj) || !isPlainObject(mapObj[id]) || !isPlainObject(mapObj[id].body)) return null;
    const blocks = bodyToFlowBlocks(mapObj[id].body, docData.drawings);
    const hasContent = blocks.some((b) => String((b && b.text) || "").trim().length || (b && b.type === "image"));
    return hasContent ? blocks : null;
  };
  const build = (mapObj, kind) => {
    const out = {};
    ["default", "first", "even"].forEach((variant) => {
      const blocks = pick(mapObj, ds[HF_STYLE_KEYS[kind][variant]]);
      if (blocks) out[variant] = blocks;
    });
    return Object.keys(out).length ? out : null;
  };
  return {headers: build(docData.headers, "header"), footers: build(docData.footers, "footer")};
}

// Univer renders mounted inline images ONLY via the resource-manager channel: the docs-drawing
// plugin registers a "DOC_DRAWING_PLUGIN" plugin resource whose onLoad feeds the drawing
// manager (registerDrawingData → render). A bare `drawings` field on IDocumentData populates
// the document MODEL (getSnapshot echoes it, insert ops apply) but the RENDERER never hears
// about it — which is exactly the "image saves but doesn't display after reload" bug. Always
// mirror drawings/drawingsOrder into that plugin resource on the mounted data.
function withDocDrawingResource(docData) {
  const drawings = isPlainObject(docData.drawings) ? docData.drawings : {};
  const order = Array.isArray(docData.drawingsOrder) ? docData.drawingsOrder : Object.keys(drawings);
  const resources = (Array.isArray(docData.resources) ? docData.resources : []).filter((r) => !(isPlainObject(r) && r.name === "DOC_DRAWING_PLUGIN"));
  resources.push({name: "DOC_DRAWING_PLUGIN", data: JSON.stringify({data: drawings, order})});
  docData.resources = resources;
  return docData;
}

/** Build the Univer IDocumentData to mount, from a FlowJoe snapshot. */
function toUniverDocumentData(snapshot) {
  const doc = isPlainObject(snapshot) && isPlainObject(snapshot.document) ? snapshot.document : {};
  // Prefer a full Univer body from a previous save (high fidelity), else synthesize from blocks.
  // Guard: the engineData body must have real content (more than just "\r\n" — Univer's empty-doc
  // dataStream). If a prior save captured a blank body (e.g. Univer failed to render on the first
  // open), fall through to the blocks synthesis so the imported content isn't permanently lost.
  const engineData = isPlainObject(doc.engineData) ? doc.engineData : null;
  const engineBody = engineData && isPlainObject(engineData.body) ? engineData.body : null;
  const engineDataStream = String((engineBody && engineBody.dataStream) || "");
  const engineHasContent = engineDataStream.replace(/[\r\n]/g, "").length > 0;
  if (engineData && engineBody && engineHasContent) {
    const fromEngine = {
      id: engineData.id || DOC_UNIT_ID,
      body: engineData.body,
      documentStyle: normalizeDocumentStyle(engineData.documentStyle)
    };
    // Carry inline image drawings (the parent re-hydrates their base64 source before sending).
    // ALWAYS mount the containers, even empty: Univer's insert-doc-image applies JSONX
    // insertOp(["drawings", id]) — with no `drawings` object on the mounted document the op
    // silently fails and a pasted image half-inserts (custom-block char, no drawing).
    if (isPlainObject(engineData.drawings) && Object.keys(engineData.drawings).length) {
      fromEngine.drawings = engineData.drawings;
      fromEngine.drawingsOrder = Array.isArray(engineData.drawingsOrder) ? engineData.drawingsOrder : Object.keys(engineData.drawings);
    } else {
      fromEngine.drawings = {};
      fromEngine.drawingsOrder = [];
    }
    // Header/footer containers must ALWAYS exist (JSONX insertOp needs the parent — see the
    // headers & footers note above). Engine-owned headers win; a legacy engineData that
    // predates header support falls back to the neutral imported sets so they finally render.
    fromEngine.headers = isPlainObject(engineData.headers) ? engineData.headers : {};
    fromEngine.footers = isPlainObject(engineData.footers) ? engineData.footers : {};
    if (!Object.keys(fromEngine.headers).length && !Object.keys(fromEngine.footers).length) {
      applyNeutralHeaderFooters(fromEngine, doc);
    }
    return withDocDrawingResource(fromEngine);
  }
  // Imported page layout (pageSize/margins in px) maps onto Univer's documentStyle so a
  // converted .docx opens with its real page geometry. Additive: blank docs (no layout) keep
  // the default style, so modal resize/dirty behavior is unchanged.
  const layout = isPlainObject(doc.layout) ? doc.layout : null;
  let layoutStyle = null;
  if (layout) {
    layoutStyle = {};
    const ps = isPlainObject(layout.pageSize) ? layout.pageSize : {};
    if (Number(ps.width) > 0 && Number(ps.height) > 0) layoutStyle.pageSize = {width: Number(ps.width), height: Number(ps.height)};
    const m = isPlainObject(layout.margins) ? layout.margins : {};
    if (Number(m.top) > 0) layoutStyle.marginTop = Number(m.top);
    if (Number(m.bottom) > 0) layoutStyle.marginBottom = Number(m.bottom);
    if (Number(m.left) > 0) layoutStyle.marginLeft = Number(m.left);
    if (Number(m.right) > 0) layoutStyle.marginRight = Number(m.right);
  }
  const out = {
    id: DOC_UNIT_ID,
    body: flowBlocksToBody(doc.blocks),
    documentStyle: normalizeDocumentStyle(layoutStyle)
  };
  // Build inline image drawings from renderable image blocks (base64 source hydrated by parent).
  const drawings = {};
  const drawingsOrder = [];
  (Array.isArray(doc.blocks) ? doc.blocks : []).forEach((block) => {
    if (!isBodyRenderedBlock(block)) return;
    const {drawingId, drawing} = drawingFromImageBlock(block);
    drawings[drawingId] = drawing;
    drawingsOrder.push(drawingId);
  });
  // Containers always present (even empty) — see the fromEngine note: insert-doc-image's
  // JSONX insertOp needs an existing `drawings`/`drawingsOrder` parent to land in.
  out.drawings = drawings;
  out.drawingsOrder = drawingsOrder;
  // Same for headers/footers (header creation insertOps into these), plus mount the imported
  // neutral header/footer sets so they render and are editable.
  out.headers = {};
  out.footers = {};
  applyNeutralHeaderFooters(out, doc);
  return withDocDrawingResource(out);
}

// Re-insert the blocks the editable body does NOT own (tables always; non-renderable images)
// back into the edited block stream, at their original positions relative to the body blocks.
// Renderable images are NOT preserved here — they round-trip through the body as real drawings
// (bodyToFlowBlocks reconstructs them). Tables stay preserved-not-editable (the non-Pro Univer
// build can't round-trip them). If the user added body blocks they are appended; if they deleted
// some, the preserved blocks still survive.
function remergeStructuralBlocks(editedBlocks) {
  const edited = Array.isArray(editedBlocks) ? editedBlocks : [];
  const original = loadedDocStructure && Array.isArray(loadedDocStructure.blocks) ? loadedDocStructure.blocks : [];
  if (!original.some(isPreservedStructuralBlock)) return edited; // nothing to preserve — common case
  const result = [];
  let ei = 0;
  original.forEach((block) => {
    if (isPreservedStructuralBlock(block)) {
      result.push(block);
    } else if (ei < edited.length) {
      result.push(edited[ei]);
      ei += 1;
    }
  });
  while (ei < edited.length) {
    result.push(edited[ei]);
    ei += 1;
  }
  return result;
}

function currentSnapshot() {
  if (!univerAPI) return null;
  const doc = typeof univerAPI.getActiveDocument === "function" ? univerAPI.getActiveDocument() : null;
  if (!doc || typeof doc.getSnapshot !== "function") return null;
  const docData = doc.getSnapshot(); // Univer IDocumentData
  const envelope = isPlainObject(loadedEnvelope) ? loadedEnvelope : {};
  const editedBlocks = remergeStructuralBlocks(bodyToFlowBlocks(docData && docData.body, docData && docData.drawings));
  // Guard: if the live editor body is effectively empty but the loaded snapshot had real
  // content (blocks with non-empty text), preserve the original blocks instead of
  // overwriting them with blanks. This protects against a save capturing an empty Univer
  // canvas (e.g. if Univer failed to render the imported content on this open).
  const editedTextLength = editedBlocks.reduce((sum, b) => sum + String((b && b.text) || "").length, 0);
  const loadedBlocks = loadedDocStructure ? loadedDocStructure.blocks : [];
  const loadedTextLength = loadedBlocks.reduce((sum, b) => sum + String((b && b.text) || "").length, 0);
  const useOriginalBlocks = editedTextLength === 0 && loadedTextLength > 0;
  const document = {
    title: envelope.title || "",
    blocks: useOriginalBlocks ? loadedBlocks : editedBlocks,
    engineData: useOriginalBlocks ? undefined : docData
  };
  // Page layout is still not editable in the island — re-attach the imported value verbatim.
  if (loadedDocStructure && isPlainObject(loadedDocStructure.layout)) {
    document.layout = loadedDocStructure.layout;
  }
  // Headers/footers ARE editable now (mounted into Univer, created/edited via the page-margin
  // double-click). When the live engine owns them (containers mounted — any post-fix session),
  // derive the neutral sets from the ENGINE so typed headers reach the stored snapshot and a
  // live deletion clears them. Legacy engineData without containers (or the preserve-original
  // guard) falls back to the imported sets verbatim, exactly as before.
  const engineOwnsHF = !useOriginalBlocks && (isPlainObject(docData && docData.headers) || isPlainObject(docData && docData.footers));
  if (engineOwnsHF) {
    const liveHF = neutralHeaderFootersFromEngine(docData);
    if (liveHF.headers) document.headers = liveHF.headers;
    if (liveHF.footers) document.footers = liveHF.footers;
  } else if (loadedDocStructure) {
    if (isPlainObject(loadedDocStructure.headers)) document.headers = loadedDocStructure.headers;
    if (isPlainObject(loadedDocStructure.footers)) document.footers = loadedDocStructure.footers;
  }
  return {
    schema: envelope.schema,
    version: envelope.version,
    engine: envelope.engine || ENGINE,
    engineVersion: envelope.engineVersion || "",
    document
  };
}

function emitSave() {
  if (disposed) return;
  const snapshot = currentSnapshot();
  if (!snapshot) return;
  // Hand the parent the "real mutation since load/last-emit" signal, then clear it. A flush
  // with mutated:false (e.g. close without editing) is a no-op the parent must not persist.
  const mutated = mutatedSinceEmit;
  mutatedSinceEmit = false;
  postToParent({type: "flowjoe:rich-document-save", snapshot, mutated});
}

function scheduleSave() {
  if (disposed) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    emitSave();
  }, SAVE_DEBOUNCE_MS);
}

function syncDictationButton() {
  const button = document.getElementById("fj-doc-dictate");
  if (!(button instanceof HTMLButtonElement)) return;
  button.setAttribute("aria-pressed", dictationListening ? "true" : "false");
  button.setAttribute("aria-label", dictationListening ? "Stop dictation" : "Dictate document text");
  button.title = dictationListening ? "Stop dictation" : "Dictate document text";
  button.innerHTML = dictationListening ? `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 8h8v8H8z"></path></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"></path><path d="M19 11a7 7 0 0 1-14 0"></path><path d="M12 18v4"></path><path d="M8 22h8"></path></svg>`;
}

function normalizeDictationTranscript(text) {
  return normalizeTranscript(String(text || ""));
}

function createDictationTextEdit(text) {
  return createTextEdit({prefix: "", suffix: "", transcript: text});
}

function deleteDictationCharacters(count) {
  const targetCount = Math.max(0, Math.min(10, Number(count) || 0));
  if (!targetCount) return false;
  let changed = false;
  for (let i = 0; i < targetCount; i += 1) {
    try {
      changed = document.execCommand("delete", false, null) || changed;
    } catch (_) {}
  }
  return changed;
}

function insertDictationText(text) {
  const edit = createDictationTextEdit(text);
  let changed = false;
  if (edit.deleteBefore > 0) {
    changed = deleteDictationCharacters(edit.deleteBefore) || changed;
  }
  const transcript = String(edit.text || "");
  if (!transcript) {
    if (changed) {
      mutatedSinceEmit = true;
      scheduleSave();
    }
    return changed;
  }
  const editorRoot = document.getElementById("fj-doc-root");
  if (editorRoot instanceof HTMLElement && document.activeElement === document.body) {
    editorRoot.focus({preventScroll: true});
  }
  const insertText = /\n$/.test(transcript) ? transcript : `${transcript} `;
  let inserted = false;
  try {
    inserted = document.execCommand("insertText", false, insertText);
  } catch (_) {
    inserted = false;
  }
  changed = inserted || changed;
  if (!changed) return false;
  mutatedSinceEmit = true;
  scheduleSave();
  return true;
}

function releaseDictationSubscriptions(session) {
  if (!session || !Array.isArray(session.unsubs)) return;
  session.unsubs.forEach((unsub) => {
    try {
      if (typeof unsub === "function") unsub();
    } catch (_) {}
  });
  session.unsubs = [];
}

function stopDictation({abort = false} = {}) {
  const session = dictationSession;
  dictationSession = null;
  dictationListening = false;
  syncDictationButton();
  if (!session) return;
  releaseDictationSubscriptions(session);
  try {
    FlowJoeDictationEngine?.stop?.({abort});
  } catch (_) {}
}

async function startDictation() {
  const engine = FlowJoeDictationEngine;
  const backendName = engine ? await engine.getBackendName() : "none";
  if (!engine || backendName === "none") {
    console.warn("[FlowJoe Rich Document] Speech dictation is not available in this editor.");
    return;
  }

  stopDictation({abort: true});

  const session = {id: null, unsubs: []};
  dictationSession = session;
  dictationListening = false;

  session.unsubs.push(
    engine.onState((event) => {
      if (dictationSession !== session || event.sessionId !== session.id) return;
      if (event.listening) {
        dictationListening = true;
        syncDictationButton();
        return;
      }
      dictationSession = null;
      dictationListening = false;
      releaseDictationSubscriptions(session);
      syncDictationButton();
    })
  );

  session.unsubs.push(
    engine.onResult((event) => {
      if (dictationSession !== session || event.sessionId !== session.id) return;
      // The workbench inserts each finalized segment incrementally into the contenteditable.
      if (event.type === "final" && event.text) insertDictationText(event.text);
    })
  );

  session.unsubs.push(
    engine.onError((event) => {
      if (dictationSession !== session || event.sessionId !== session.id) return;
      const errorName = String(event.code || "").trim();
      dictationSession = null;
      dictationListening = false;
      releaseDictationSubscriptions(session);
      syncDictationButton();
      if (errorName && errorName !== "aborted") {
        console.warn(`[FlowJoe Rich Document] Speech dictation stopped: ${errorName}`);
      }
    })
  );

  try {
    const sessionId = await engine.start({lang: String(navigator?.language || "en-US")});
    if (dictationSession !== session) return;
    session.id = sessionId;
    syncDictationButton();
  } catch (error) {
    if (dictationSession === session) dictationSession = null;
    dictationListening = false;
    releaseDictationSubscriptions(session);
    syncDictationButton();
    reportError("dictation", error);
  }
}

function bindDictationButton() {
  const button = document.getElementById("fj-doc-dictate");
  if (!(button instanceof HTMLButtonElement) || button.dataset.boundDictation === "1") return;
  button.dataset.boundDictation = "1";
  button.addEventListener("mouseenter", () => playWorkbenchUiSound("ui_hover"));
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (event.button === 0 || event.button == null) playWorkbenchUiSound("move_nudge");
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (dictationListening || dictationSession) stopDictation();
    else startDictation();
  });
  syncDictationButton();
}

function commandId(commandInfo) {
  if (typeof commandInfo === "string") return commandInfo;
  if (!commandInfo || typeof commandInfo !== "object") return "";
  return String(commandInfo.id || commandInfo.commandId || commandInfo.type || commandInfo.command || "");
}

// Decide whether a Univer command is a real CONTENT mutation. FAIL-SAFE by design: this is a
// DENYLIST of clearly read-only / navigation / selection / rendering / UI-chrome commands, and
// everything else is treated as a mutation. An allowlist would silently drop any edit whose
// command id we failed to anticipate (the Phase 0.75 bug class). Audited against the real
// Univer Docs command set (doc.command.*): formatting lives in set-inline-format-bold/italic/
// underline/…, structure in insert-/delete-/merge-/break-line/create-table/*-list/*-heading/
// align-*; cut/paste/delete ARE mutations and are intentionally NOT denied. Only selection,
// cursor/caret, scroll/zoom/viewport, focus/pointer, navigation, render/skeleton/resize,
// recalc, copy (read-only), select-all, theme/locale, and panel-open/close are denied.
// Note: this only ever runs for commands fired AFTER load (onCommandExecuted is registered
// after createUniverDoc), so document-initialization commands never reach it.
// The docs-drawing/drawing-ui preset (inline images) fires UI/render init operations on load
// that are NOT content edits — observed: `sheet.operation.close-image-crop` (shared drawing-ui
// infra). `image-crop` and drawing select/arrange/refresh UI ops are denied so merely rendering
// an imported image does not falsely dirty the flow. Real image edits (insert/remove/update a
// drawing) are not in this list and still count as mutations.
const READ_ONLY_COMMAND = /(selection|cursor|caret|scroll|zoom|viewport|focus|blur|hover|pointer|mouse|navigat|render|skeleton|rebuild|resize|recalc|calculate|select-all|switch-mode|theme|locale|tooltip|context-menu|header-footer-panel|close-header-footer|image-crop|drawing-visible|set-drawing-selected|drawing-arrange|refresh-drawing|\bcopy\b)/;

function isDocumentMutationCommand(commandInfo) {
  const id = commandId(commandInfo).toLowerCase();
  if (!id) return false;
  if (READ_ONLY_COMMAND.test(id)) return false;
  return true;
}

function mountAndLoad(snapshot) {
  if (univer) return; // already mounted — load is one-shot per island instance
  const presets = window.UniverPresets;
  const core = window.UniverCore;
  const docsCore = window.UniverPresetDocsCore;
  const enUS = window.UniverPresetDocsCoreEnUS;
  if (!presets || !core || !docsCore) {
    reportError("init", new Error("Univer UMD globals missing (presets/core/preset-docs-core)"));
    return;
  }

  try {
    const {createUniver} = presets;
    const {LocaleType, mergeLocales} = core;
    const {UniverDocsCorePreset} = docsCore;

    // Inline images render via the docs-drawing preset (optional — absent in older bundles, so
    // feature-detect). Without it, image blocks stay preserved-not-rendered (current behavior).
    const docsDrawing = window.UniverPresetDocsDrawing;
    const drawingEnUS = window.UniverPresetDocsDrawingEnUS;
    const extraPresets = [];
    if (docsDrawing && typeof docsDrawing.UniverDocsDrawingPreset === "function") {
      extraPresets.push(docsDrawing.UniverDocsDrawingPreset());
    }

    const created = createUniver({
      locale: LocaleType.EN_US,
      locales: {[LocaleType.EN_US]: mergeLocales(enUS || {}, drawingEnUS || {})},
      presets: [UniverDocsCorePreset({container: "fj-doc-root"}), ...extraPresets]
    });
    univer = created.univer;
    univerAPI = created.univerAPI;
    // Automation/debug seam, scoped to THIS isolated island window only (never the main
    // renderer). Lets e2e tests drive real Univer Docs commands (e.g. set-inline-format-bold)
    // to prove the command→mutation→save path, without the parent reaching into Univer.
    try {
      window.__flowjoeRichDocWorkbench = {getUniverAPI: () => univerAPI};
    } catch (_) {}

    // Remember the envelope so save() round-trips the model's schema/version/engine + title.
    const doc = isPlainObject(snapshot) && isPlainObject(snapshot.document) ? snapshot.document : {};
    loadedEnvelope = isPlainObject(snapshot) ? {schema: snapshot.schema, version: snapshot.version, engine: snapshot.engine, engineVersion: snapshot.engineVersion, title: doc.title || ""} : {};

    // Snapshot the non-editable structure (tables/images + page layout/headers/footers) so save
    // can re-merge it. Deep-cloned so a later parent mutation of the loaded object can't bleed in.
    const cloneStructure = (value) => {
      try {
        return value == null ? null : JSON.parse(JSON.stringify(value));
      } catch (_) {
        return null;
      }
    };
    loadedDocStructure = {
      blocks: Array.isArray(doc.blocks) ? cloneStructure(doc.blocks) || [] : [],
      layout: isPlainObject(doc.layout) ? cloneStructure(doc.layout) : null,
      headers: isPlainObject(doc.headers) ? cloneStructure(doc.headers) : null,
      footers: isPlainObject(doc.footers) ? cloneStructure(doc.footers) : null
    };

    univerAPI.createUniverDoc(toUniverDocumentData(snapshot));

    // Auto-persist on edits (debounced). Pragmatic "snapshot the whole document on change"
    // model; deep per-keystroke undo integration is deferred.
    if (typeof univerAPI.onCommandExecuted === "function") {
      univerAPI.onCommandExecuted((commandInfo) => {
        // Mark formatting/style mutations dirty too — they only change document.engineData,
        // not the neutral blocks, so this flag is the only thing that can save them.
        if (isDocumentMutationCommand(commandInfo)) {
          mutatedSinceEmit = true;
          scheduleSave();
        }
      });
    }

    postToParent({type: "flowjoe:rich-document-loaded"});
  } catch (error) {
    reportError("load", error);
  }
}

function dispose() {
  if (disposed) return;
  disposed = true;
  stopDictation({abort: true});
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
    case "flowjoe:rich-document-load":
      applyTheme(data.theme);
      mountAndLoad(data.snapshot);
      break;
    case "flowjoe:rich-document-theme":
      applyTheme(data.theme);
      break;
    case "flowjoe:rich-document-request-save":
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      emitSave();
      break;
    case "flowjoe:rich-document-dispose":
      dispose();
      break;
    default:
      break;
  }
});

// Tell the parent we're ready for a snapshot once the UMD bundles have executed.
bindDictationButton();
postToParent({type: "flowjoe:rich-document-ready"});
