// preBootstrap.js — synchronous classic script loaded in <head> before <body> renders.
// FOUC prevention: theme class, font family, line height, tree width, and CSS link injection
// all run synchronously here. Do NOT convert to type="module"
// (module scripts are deferred and would cause flash-of-unstyled-content).

// Storage can throw (a browser with site data blocked, some embedded webviews). Every access goes
// through these guards so this script always reaches the stylesheet injection at the bottom — if
// it threw before that, the page would load with none of the app's stylesheets at all.
const storeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
};
const storeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
};
const storeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
};

// Block 1: Theme class stamp
// One-time hard reset (2026-08-17, user-directed): every user — existing or new — is moved to
// the new default global theme, Modern Ember, exactly once. Runs pre-paint so the reset theme
// is what boots; any theme the user picks afterwards sticks (the flag is never cleared).
if (storeGet("flowjoe_global_theme_reset_v1") !== "true") {
  storeSet("flowjoe-theme", "modern-ember");
  storeSet("flowjoe_global_theme_reset_v1", "true");
}
const t = storeGet("flowjoe-theme") || "modern-ember";
document.documentElement.classList.add("theme-" + t);

// Block 2: Appearance stamp (font family + size + line height, pre-paint)
// Theme-Owned Appearance: values live per-theme in flowjoe_theme_settings_v1
// (customization ?? shipped default); the appearance applier writes ONE derived
// cache of the last applied ACTIVE values — flowjoe_appearance_cache_v1 — for this
// synchronous pre-paint stamp (this classic script cannot import the store).
// One-time reset (Slice 2, 2026-08-17): the old "explicit pick" override keys are
// retired; the empty store IS the reset to theme defaults (pre-production call).
if (storeGet("flowjoe_theme_settings_reset_v1") !== "true") {
  storeRemove("flowjoe_font_family_user_override");
  storeRemove("flowjoe-confetti-style-override");
  storeRemove("flowjoe_font_default_migration_v1");
  storeRemove("flowjoe_font_default_migration_v2");
  storeSet("flowjoe_theme_settings_reset_v1", "true");
}
// Slice 4: the scattered legacy per-value cache keys are retired — nothing writes
// them anymore, so removal is idempotent and needs no marker.
["flowjoe_font_family", "flowjoe_fontSizeSetting", "flowjoe_line_height", "flowjoe-confetti-style", "confetti-style"].forEach((key) => storeRemove(key));
let appearanceCache = {};
try {
  appearanceCache = JSON.parse(storeGet("flowjoe_appearance_cache_v1") || "{}") || {};
} catch (_) {
  appearanceCache = {};
}
const f = appearanceCache.fontFamily || "system-ui";
const stacks = {
  "system-ui": 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  arial: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  georgia: 'Georgia, "Times New Roman", Times, serif',
  "courier-prime": '"Courier Prime", "Fira Mono", "Courier New", Courier, monospace',
  "ibm-plex-sans": '"IBM Plex Sans", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "ibm-plex-serif": '"IBM Plex Serif", "Source Serif 4", Georgia, "Times New Roman", serif',
  "source-serif-4": '"Source Serif 4", Georgia, "Times New Roman", serif',
  "source-sans-3": '"Source Sans 3", "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  inter: 'Inter, "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "space-grotesk": '"Space Grotesk", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "book-antiqua": '"Book Antiqua", Palatino, "Palatino Linotype", "URW Palladio L", serif',
  "dm-sans": '"DM Sans", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  roboto: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  "open-sans": '"Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  "noto-sans": '"Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  "fira-sans": '"Fira Sans", "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "work-sans": '"Work Sans", "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  montserrat: 'Montserrat, "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  poppins: 'Poppins, "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  nunito: 'Nunito, "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "playfair-display": '"Playfair Display", "Source Serif 4", Georgia, "Times New Roman", serif',
  merriweather: '"Merriweather", Georgia, "Times New Roman", serif',
  "eb-garamond": '"EB Garamond", Garamond, "Times New Roman", serif',
  "libre-baskerville": '"Libre Baskerville", Georgia, "Times New Roman", serif',
  "roboto-slab": '"Roboto Slab", "Source Serif 4", Georgia, "Times New Roman", serif',
  raleway: '"Raleway", "Space Grotesk", Inter, system-ui, sans-serif',
  "plus-jakarta-sans": '"Plus Jakarta Sans", "DM Sans", Inter, system-ui, sans-serif',
  lora: '"Lora", Georgia, "Times New Roman", serif',
  "josefin-sans": '"Josefin Sans", Raleway, Inter, system-ui, sans-serif',
  "cormorant-garamond": '"Cormorant Garamond", Garamond, "Times New Roman", serif',
  "jetbrains-mono": '"JetBrains Mono", "Fira Mono", "Courier Prime", monospace',
  "press-start-2p": '"Press Start 2P", "VT323", "Courier Prime", monospace',
  vt323: '"VT323", "Press Start 2P", "Courier Prime", monospace',
  "bodoni-moda": '"Bodoni Moda", "Playfair Display", Georgia, "Times New Roman", serif',
  fraunces: 'Fraunces, "Playfair Display", Georgia, "Times New Roman", serif',
  "ibm-plex-mono": '"IBM Plex Mono", "JetBrains Mono", "Courier Prime", monospace',
  spectral: 'Spectral, Lora, Georgia, "Times New Roman", serif',
  bitter: 'Bitter, "Roboto Slab", "Source Serif 4", Georgia, serif',
  "instrument-sans": '"Instrument Sans", "Work Sans", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  syne: 'Syne, "Space Grotesk", Inter, system-ui, sans-serif',
  "bricolage-grotesque": '"Bricolage Grotesque", "DM Sans", Inter, system-ui, sans-serif',
  sora: 'Sora, "Space Grotesk", Inter, system-ui, sans-serif',
  manrope: 'Manrope, "DM Sans", Inter, system-ui, sans-serif',
  "atkinson-hyperlegible": '"Atkinson Hyperlegible", Inter, "Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  newsreader: 'Newsreader, "Source Serif 4", Georgia, "Times New Roman", serif'
};
document.documentElement.style.setProperty("--app-font-family", stacks[f] || stacks["system-ui"]);
document.documentElement.setAttribute("data-font-family", f);
// Font-size scale stamp (new in Slice 4 — previously waited for the settings module).
const sizeVars = {"xx-small": "--font-size-xx-small", "x-small": "--font-size-x-small", small: "--font-size-small", normal: "--font-size-normal", large: "--font-size-large", "extra-large": "--font-size-extra-large"};
document.documentElement.style.setProperty("--font-scale", `var(${sizeVars[appearanceCache.fontSize] || sizeVars.normal})`);

// Block 3: Line height stamp
const lh = appearanceCache.lineHeight || "normal";
const map = {compact: 1.2, normal: 1.35, relaxed: 1.5};
document.documentElement.style.setProperty("--notes-line-height", String(map[lh] || map.normal));

// Block 4: Tree width + resizer width stamp (CSS only — first paint before modules load).
// Runtime "width locked until hydration" lives in dataManagement.js (__flowjoeStartupWidthLocked
// module export), not on window. Do not reintroduce a window flag here.
const root = document.documentElement;
// This script runs BEFORE the bundle, so it cannot import storage/localStorageKeys.js and
// runs before migrateLegacyLocalStorageKeys(). Read the canonical name first, then fall
// back to the pre-normalization name so an existing profile paints at its saved width.
// Keep these literals in sync with LEGACY_TO_CANONICAL_KEYS —
// tests/unit/localStorageKeyRegistry.test.js pins them.
const readSetting = (canonical, legacy) => {
  const current = storeGet(canonical);
  return current !== null ? current : storeGet(legacy);
};
// Stamp the persisted collapsed state before <body> paints. The runtime event-listener module
// applies the same state later, but waiting for the deferred module leaves the tree navigation
// visible for one frame on reload even though the user left it collapsed.
if (readSetting("flowjoe_treeCollapsed", "treeCollapsed") === "true") {
  root.classList.add("tree-collapsed-startup");
}
const autoResizeEnabled = readSetting("flowjoe_treeResizerEnabled", "treeResizerEnabled") !== "false";
let width = storeGet("flowjoe_current_tree_width") || storeGet("flowjoe_last_tree_width") || (!autoResizeEnabled ? readSetting("flowjoe_manualTreeWidth", "manualTreeWidth") : null) || "280px";
if (!/^\d+(\.\d+)?(px|%|em|rem|vh|vw)$/.test(width)) {
  width = "280px";
}
root.style.setProperty("--startup-tree-width", width);
let resizerWidthSetting = storeGet("flowjoe_tree_resizer_width") || "small";
if (resizerWidthSetting === "medium") resizerWidthSetting = "grande";
if (resizerWidthSetting === "large") resizerWidthSetting = "venti";
let resizerPx = 8;
if (resizerWidthSetting === "grande") resizerPx = 12;
if (resizerWidthSetting === "venti") resizerPx = 16;
root.style.setProperty("--tree-resizer-width", resizerPx + "px");

// Block 5: Asset URL helper (cache-busting) + CSS link injection via document.write.
// document.write here is correct and necessary — it must run synchronously in <head>
// to inject CSS <link> tags before <body> renders. Do NOT replace with appendChild.
const cacheToken = "4d1e7099a4716be7"; // join-site guest build: stylesheets carry the build id (scripts/build-join-site-app.js)
window.__flowjoeAssetUrl = function (path) {
  const safePath = String(path || "");
  if (!cacheToken || !safePath) return safePath;
  return safePath + (safePath.indexOf("?") === -1 ? "?" : "&") + "cache=" + encodeURIComponent(cacheToken);
};
const localStyles = [
  "src/css/00-layer-order.css",
  "src/css/z-index-tokens.css",
  "src/css/themes.css",
  "src/css/node-themes.css",
  "src/css/styles-variables.css",
  "src/css/styles-layout.css",
  "src/css/styles-search.css",
  "src/css/appRail.css",
  "src/css/styles-tree.css",
  "src/css/styles-gallery-horizontal.css",
  "src/css/repoFileExplorerView.css",
  "src/css/sourceControlPanel.css",
  "src/css/repoMergeConflictEditor.css",
  "src/css/styles-gallery-vertical.css",
  "src/css/styles-gallery-notes.css",
  "src/css/styles-settings.css",
  "src/css/styles-themes.css",
  "src/css/styles-browser.css",
  "src/css/tags.css",
  "src/css/gallery-scrubber.css",
  "src/css/stack-styles.css",
  "src/css/buttons.css",
  "src/css/tooltip.css",
  "src/css/confetti.css",
  "src/css/z-index-fix.css",
  "src/css/onboarding.css",
  "src/components/AIComponents.css",
  "src/css/AIAssistModal.css",
  "src/css/AIAssistModalSendToSlot.css",
  "src/css/AIAssistModalSpellCheckShell.css",
  "src/css/AIAssistModalChatImageGenCard.css",
  "src/css/AIAssistModalChatHistoryPopup.css",
  "src/css/AIAssistModalResizeJsonContext.css",
  "src/css/AIAssistModalChatConversationActions.css",
  "src/css/AIAssistModalChatMisc.css",
  "src/css/AIAssistModalChatInput.css",
  "src/css/AIAssistModalJoePet.css",
  "src/css/AIAssistModalPill.css",
  "src/css/AIAssistModalSchedulerRunnow.css",
  "src/css/AIAssistModalImageRedirect.css",
  "src/css/AIAssistModalTreePreview.css",
  "src/css/AIAssistModalChatHeaderControls.css",
  "src/css/AIAssistModalApprovalCard.css",
  "src/css/AIAssistModalFileChips.css",
  "src/css/AIAssistModalMemories.css",
  "src/css/AIAssistModalSpellcheckReview.css",
  "src/css/AIAssistModalImageHistory.css",
  "src/css/AIAssistModalFontScale.css",
  "src/css/AIAssistModalImageModalButtons.css",
  "src/css/AIAssistModalMultiAttach.css",
  "src/css/AIAssistModalChatAttachment.css",
  "src/css/AIAssistModalMessageAttachment.css",
  "src/css/AIAssistModalJsonPreview.css",
  "src/css/AIAssistModalGeneratePrompt.css",
  "src/css/AIAssistModalGenerateOptions.css",
  "src/css/AIAssistModalGenerateReference.css",
  "src/css/AIAssistModalGeneratePreview.css",
  "src/css/AIAssistModalGeneratePromptHistory.css",
  "src/css/AIAssistModalTranscribeSource.css",
  "src/css/AIAssistModalTranscribeOptions.css",
  "src/css/AIAssistModalTranscribeResult.css",
  "src/css/AIAssistModalGenerateTranscribeResponsive.css",
  "src/css/joeDock.css",
  "src/css/joeDockChat.css",
  "src/css/joeDockTabs.css",
  "src/css/tiptap-editor.css",
  "src/css/fj-rail-collapse.css",
  "src/css/terminalPanel.css",
  "src/css/mcpBridgeSettings.css",
  "src/css/statusFooter.css",
  "src/css/fa-interop.css",
  "src/css/activityPanel.css",
  "src/css/shareModal.css",
  "src/css/guestJoin.css",
  "src/css/presentPill.css",
  "src/css/guestPresence.css",
  "src/css/dropin/01-density-compact.css",
  "src/css/dropin/02-density-rules.css",
  "src/css/dropin/03-shape-soft.css",
  "src/css/dropin/04-theme-modern.css",
  "src/css/dropin/05-shape-modern-density.css",
  "src/css/dropin/06-joe-dock-density.css"
];
document.write(
  localStyles
    .map(function (path) {
      return '<link rel="stylesheet" href="' + window.__flowjoeAssetUrl(path) + '" />';
    })
    .join("")
);
