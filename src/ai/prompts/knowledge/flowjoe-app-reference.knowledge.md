# FlowJoe App Reference Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: reference/keyboard-shortcuts.mdx, reference/status-bar.mdx, reference/settings-map.mdx, reference/limitations.mdx, reference/glossary.mdx
Generated: 2026-10-18 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe FlowJoe's quick-reference material — keyboard shortcuts, the Settings panel map, the bottom status bar, honest product limitations, and the glossary of FlowJoe terms.

Loading this knowledge is not evidence that the user pressed any shortcut or changed any setting.

## Keyboard Shortcuts

Hotkey reference aligned with the in-app Keyboard Shortcuts legend, plus a few extra app-wide keys.

This page follows the **Keyboard Shortcuts** legend in the app (tree toolbar **K**, status bar **Shortcuts**). A short **Also useful** section at the end lists a few extra keys that are real in the product but not every row in that legend.
> [!IMPORTANT] > **Open Joe:** `Cmd+Shift+A` / `Ctrl+Shift+A` toggles the Joe chat panel (open / minimize to a floating pill / restore). `Ctrl+J` copies node JSON — it does **not** open Joe. **New node:** `N` / `Ctrl+N` (not Enter or Tab). On Mac, `Cmd+N` is **New Flow**, not add node.

**Tree.**
- `Ctrl+F` — Tree search
- `Q` — Query by tags
- `N` / `Ctrl+N` — Add node (child of the selected node, or a root if none is selected).
- `Ctrl+P` — Unlock private nodes
- `↑` / `↓` — Previous / next visible node
- `←` / `→` — Collapse / expand (or previous / next node when already collapsed/expanded as appropriate)
- `Space` — Toggle node collapse
- `+` / `-` — Expand / collapse selected node
- `Shift+=` — Expand all nodes
- `Shift+-` — Collapse all nodes
- `/` or `\` — Hide / show tree

Also covered in the full docs for this area: Tree Nodes; Gallery; Gallery slots; Other shortcuts (legend); Rich-text editor; Also useful (not every row is on the legend card).

## Status Bar (Footer)

What the bottom status bar shows and what you can change without opening Settings.

The **status bar** is the thin strip pinned to the **bottom of the FlowJoe window**. It is always available while visible, so you can **monitor** the flow and **change a few common choices** without digging through Settings.
Show or hide it under **Settings → Appearance → Status Bar** (on by default).
Layout (left cluster, then right cluster):
**Left:** Stats · Save · Joe brain (plus short-lived notices such as "Outside change waiting" and "Also open on a computer" when they apply) **Right:** Scheduled tasks · Theme · Language · Shortcuts · Version

**What you can monitor.**
- **Stats** — Total **nodes** in the flow and total **gallery slots** (across the whole tree, not only the selected node). Read-only.

Also covered in the full docs for this area: What you can change quickly (click); Tips.

## Settings Map

A comprehensive breakdown of all application settings in FlowJoe.

Open Settings from the sidebar (gear) or the app rail. Sections appear as **tabs on the left** of the Settings panel. Cards inside each tab can be reordered with the grip handle (`⋮⋮`).
For **live monitoring and one-click changes** (save state, Joe brain, theme, language, scheduled tasks, shortcuts), use the bottom **Status Bar (Footer)** — it does not replace Settings, but it covers the most common switches without opening this panel.
Tab order matches the app (top to bottom):
- **Appearance**
- **Tree**
- **Gallery**
- **Audio**
- **Browser** (desktop / Electron only)
- **Joe AI**
- **APIs**
- **Data**
- **Tasks**

Also covered in the full docs for this area: Settings when you join someone else's Flow; Appearance; Language (localization); Layout; Theme & typography; Tree; Gallery; Audio; Browser (desktop); Joe AI; APIs; Data; Tasks; Tips.

## Honest Limitations

A transparent list of boundaries and unsupported behaviors in FlowJoe.

We believe in stating product limits clearly. Here are the boundaries and intentional limitations of FlowJoe.

**Hierarchical Tree Only.**
FlowJoe's **structure** is a tree: every node has exactly one parent.
- You cannot draw connections between **nodes** in the tree, or give a node two parents. The tree is a hierarchy, not a graph.

Also covered in the full docs for this area: Document Previews; Mobile Layout (In Development); Virtual Gallery Read-Only State; Local audio transcription.

## Glossary

Key terminology and concepts used throughout FlowJoe.

Use this list to familiarize yourself with the vocabulary of FlowJoe.

**Flow.**
The primary document workspace in FlowJoe. A Flow contains a tree structure, node metadata, summaries, tag lists, and references. It corresponds to a single project file.

**Node.**
A single unit in a Flow's hierarchical tree outline. Nodes are living containers that contain notes, themes, summaries, and media galleries.

Also covered in the full docs for this area: Slot; Stack; Meaning; Joe; Flow map; Token bar; Proposal Card; Virtual Gallery.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Keyboard Shortcuts](flowjoe-docs:reference/keyboard-shortcuts)
- [Status Bar (Footer)](flowjoe-docs:reference/status-bar)
- [Settings Map](flowjoe-docs:reference/settings-map)
- [Honest Limitations](flowjoe-docs:reference/limitations)
- [Glossary](flowjoe-docs:reference/glossary)
