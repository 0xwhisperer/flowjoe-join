# FlowJoe Settings Storage Import Export Knowledge

This knowledge module teaches Joe user-facing settings, storage, import, and export behavior.

Loading this knowledge is not evidence that an export, import, API key, browser setting, or preference file has been provided.

## Settings And Preferences

- FlowJoe has settings and preferences for app behavior, AI behavior, document import behavior, browser behavior, layout, display chrome, theme, language, and related workflows.
- **Language / localization:** FlowJoe translates the full user interface in **20 languages** (Arabic, Bengali, German, English, Spanish, French, Hindi, Indonesian, Italian, Japanese, Korean, Polish, Portuguese, Russian, Thai, Turkish, Urdu, Vietnamese, Simplified Chinese, Traditional Chinese). Change language via **Settings → Language** (Language card) or the language control in the status footer. A fresh install starts in English. Language changes UI chrome only — not the user's notes, files, or flow content. For settings-map detail, the app-reference / Settings Map manual page is authoritative.
- Joe AI settings include OpenAI API key configuration.
- AI and Data settings can change document import behavior, including whether FlowJoe creates Markdown copies and whether converted originals are retained.
- Settings and modal surfaces can block global keyboard shortcuts while open so background gallery/tree actions do not fire accidentally.
- Some preferences are global or session-level; some presentation state belongs to a node, gallery, or slot surface.

## Storage

- FlowJoe is local-first.
- Flow structure, nodes, notes, summaries, tags, and many preferences are stored locally by FlowJoe.
- Large media blobs are stored in IndexedDB and referenced from the flow data.
- URL preview assets such as Open Graph images, screenshots, and favicons are stored in IndexedDB when captured.
- OpenAI API keys use Electron secure storage when available. Browser/dev mode falls back to localStorage.
- API keys are not ordinary flow data and are included in export/import only through explicit opt-in paths.
- Private node locks protect app access to private nodes, but they are not API-key vaults and should not be described as full content encryption.
- Joe Memories are stored locally by FlowJoe, separate from chat history, and are keyed to the current flow. "Local memory" means FlowJoe keeps the canonical copy locally; a memory is sent to OpenAI only when it is included in a Joe request.

## Import And Export

- FlowJoe can export a full flow or selected subtree as data-only JSON.
- FlowJoe can export a full package as `.fj`, including media needed to move a complete flow between machines or profiles.
- `.fj` packages are best for moving complete FlowJoe projects. JSON is best for readable/importable structure and AI discussion.
- Drag import supports loose files, multiple files, folders, nested folders, ZIP archives, `.fj` packages, browser tabs, and some creative-app package formats.
- Import is additive and target-aware unless the user chooses an explicit destructive/replace action.
- Import shape prompts can choose whether files become separate gallery slots, stacks per folder, original structure, or similar arrangements.
- Joe can discuss `.fj` files conceptually, but raw `.fj` package files are not the same as extracted AI-readable FlowJoe JSON.
- Joe Memories travel with the flow on export. A full-flow export includes all of the flow's memories; a selected-node export includes the node/slot memories within that branch (flow-wide memories travel only with a full-flow export). On import, FlowJoe re-targets memories to the destination flow's nodes and slots; a memory whose target cannot be resolved is imported disabled so user data is preserved rather than lost or mis-attached.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Export & Import](flowjoe-docs:portability/export-import)
- [Storage & Preferences](flowjoe-docs:portability/storage-diagnostics)
- [Data Portability & Backups](flowjoe-docs:guides/portability)
- [Local-First Storage](flowjoe-docs:concepts/local-first)
- [Security & Privacy](flowjoe-docs:concepts/security)
