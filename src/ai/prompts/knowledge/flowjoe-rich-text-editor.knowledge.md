# FlowJoe Rich-Text Editor Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: reference/rich-text-editor.mdx
Generated: 2026-10-18 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe FlowJoe's shared rich-text editor — the writing surface behind Node Summary, Flow Summary, slot Preview notes, and gallery slot/stack notes: slash commands, the emoji picker and its word-boundary rule, the bubble menu, Joe's AI actions, markdown shortcuts as you type, the toolbar, links, highlighting, and editor keyboard shortcuts.

Loading this knowledge is not evidence that any summary or note is currently open or being edited.

## Rich-Text Editor

The shared writing surface behind Node Summary, Flow Summary, slot Preview notes, and gallery slot notes — slash commands, emoji, the bubble menu, AI actions, and markdown shortcuts.

FlowJoe uses one rich-text editor everywhere you write more than a title. It stores what you write as Markdown, so nothing is locked into a proprietary format, and it behaves the same way on every surface that uses it.

**Where you'll find it.**
- Node Summary — Top-bar Summary button (or `S` with a node selected) — Yes
- Flow Summary — Top-bar Flow Summary button — Yes
- Slot Preview notes — Click a gallery slot to open it full-size — Yes
- Gallery slot & stack notes — Click into the note on the card itself — No — bubble menu only
The three modal surfaces (Node Summary, Flow Summary, Preview) get the full toolbar. Gallery notes on the board are deliberately chrome-free: you get the same slash commands, emoji picker, markdown shortcuts, and floating bubble menu, just without a toolbar taking up room on the card.
> [!TIP] > Every modal surface has a **Keyboard Shortcuts & Formatting Guide** button in its toolbar. It's the same list as this page, available without leaving the app.

**Slash commands.**
Type `/` and a menu of blocks opens. Keep typing to filter, `↑`/`↓` to move, `Enter` to insert, `Escape` to dismiss.
`/` only opens the menu at a **word boundary** — the start of a line, or right after a space. Typing `and/or` mid-word does nothing, which is intentional.
On the modal surfaces the full list is:
- Heading 1, Heading 2, Heading 3
- Task List
- Bullet List
- Numbered List
- Blockquote
- Code Block
- Table of Contents
- Insert Table
- Divider
- Collapsible Details
- Insert Image
- Image Upload Box
- Embed YouTube
- Reset Formatting
- Ask Joe AI
Gallery slot notes carry a deliberate subset — Heading 1–3, Task List, Bullet List, Numbered List, Blockquote, and Text (reset formatting). Images, tables, code blocks, and the AI item aren't on the card-level menu.

**Emoji picker.**
Type `:` followed by a few letters — `:smi`, `:fire`, `:rocket` — and a searchable emoji menu appears. Pick one and it replaces what you typed.
`:` follows the same **word-boundary** rule as `/`. It has to be at the start of a line or directly after a space. Typing a colon mid-word (`ratio:2`, `10:30`) will not open the menu — this is the single most common source of "the emoji thing isn't working".
The picker matches on emoji name and keywords, and shows up to eight results at a time.

**The bubble menu.**
- **B** — Bold
- *I* — Italic
- **U** — Underline
- ~~S~~ — Strikethrough
- Highlighter — Highlight the selection

**Decide what to do with it.**
AI actions use your selected Joe connection: an API key or a supported signed-in command-line brain. Shared guests use the owner’s enabled connection. See Bring Your Own Brain.

**Markdown shortcuts as you type.**
**Block triggers**, typed at the start of a line: `# `, `## `, `### ` for headings 1–3; `- ` or `* ` for a bullet list; `1. ` for a numbered list; `[ ] ` for a checklist item; `> ` for a blockquote; ` ``` ` then Enter for a code block; `--- ` then Enter for a horizontal divider.
**Inline triggers**, anywhere: `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, and `==highlight==`.

**Keyboard shortcuts.**
There are **no** text-alignment keyboard shortcuts. `Cmd+Shift+R` collided with the browser's hard-reload, so the whole `Cmd+Shift+L/E/R/J` set was removed rather than leaving an inconsistent three. Use the toolbar's **Text Alignment** dropdown instead.

**Links.**
A link in a note **at rest** (not being edited) is clickable. On the desktop app it opens in the in-app browser panel in a new tab, so following a reference doesn't pull you out of FlowJoe.

**Highlighting.**
Three ways to highlight, all producing the same result: the **highlighter** button in the bubble menu, typing `==your text==`, or `Cmd/Ctrl+Shift+H`.

Also covered in the full docs for this area: AI actions (Joe); Select some text, or just place your cursor in a paragraph; Pick an action; Watch it stream in; The toolbar; See also; Node Summaries; Flow Summary; Slot Preview; Keyboard Shortcuts.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Rich-Text Editor](flowjoe-docs:reference/rich-text-editor)
