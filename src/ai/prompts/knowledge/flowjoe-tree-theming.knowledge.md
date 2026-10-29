# FlowJoe Tree Status And Theming Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: tree/status-theming.mdx
Generated: 2026-10-27 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe node status markers, node colors and icons, and how the tree and the app are themed.

Loading this knowledge is not evidence that any node carries a status, color, icon, or custom theme.

## Status, Themes & Protection

Visual status indicators, branch theming, and the four orthogonal node protection states.

FlowJoe provides native visual indicators and safety features to help you categorize work, organize outlines, and secure sensitive information.

**Node Status.**
Every node in FlowJoe can display a status badge. This is useful for project tracking:
- **Status Options:** Choose **Not Started**, **In Progress**, **Completed**, or **Neutral**. Number keys 1–4 set these in that order when the tree has focus.
- **Bulk changes:** A parent status change updates editable nodes and skips frozen or password-locked branches. Unlocked siblings still change. The parent badge reflects all children, so a mix of changed and protected children can leave it **In Progress**.
- **Tree Filtering:** Use the tree filter controls to choose a status. The tree search box searches node names.
- **Undo:** When **Delete Undo (5s)** is enabled, Undo after a parent status change restores each child’s previous status, including mixed statuses inside nested groups. The restored values are saved.
- **Joe Awareness:** Joe is aware of node statuses and will use them to prioritize suggestions.

**Branch Theming & Inheritance.**
To help organize different zones of a large workspace (e.g. distinguishing personal logs from client tasks), FlowJoe supports custom branch themes:
- **Color Coding:** Right-click a node, select **Theme**, and choose a color profile.
- **Inheritance:** By default, children nodes inherit their parent's color theme. This lets you color-code an entire branch (and its gallery slots) in one click.
- **Theme Profiles:** Global styling themes (Dark, Light, Cozy, Sepia) are managed in Settings.
- **Joe:** You can ask Joe to set a node's Theme-menu look by its menu name, such as Clay Roast, or ask for a calming, earthy, light, or dark look. He is shown each look's colors and uses those, not the name alone. A name that is not on the list is refused.
- **Bulk theme clearing:** **Remove All**, resetting node themes to the global theme, and resetting preferences leave frozen or password-locked branches unchanged while clearing editable nodes’ overrides.
- **Clear or app theme:** Clearing that look lets the node inherit from its parent again. Asking for the app theme uses the app-wide look on that node and stops inheritance. A frozen or private node refuses the change.

**The Four Node Protection States.**
FlowJoe supports four independent (orthogonal) node states that can be toggled via the **Set Visibility / Privacy…** context-menu flyout. These states inherit down the tree, meaning freezing or privatizing a parent applies to the entire subtree.
- **Hidden** — Declutter the tree sidebar — No (filtered out) — n/a until shown — No — `node.hidden` boolean toggle
- **Private (password)** — Access control / privacy — **No** until unlocked — No until unlocked — **No** (Verifier-only; not encrypted at rest) — Durable `lockKey` verifier + temporary memory unlock session
- **Frozen** — Prevent accidental edits — **Yes** (fully readable) — **No** (read-only) — No — `node.frozen` boolean toggle
- **Hidden from Joe** — Seal content from AI assistant — **Yes** to the human — **Yes** to the human — No — `node.hiddenFromJoe` boolean toggle

**Hidden Nodes.**
Hiding a node filters it out of the tree view sidebar without deleting it.
- To view or edit hidden nodes, toggle **Show Hidden Nodes** from the tree panel menu.
- Hidden nodes remain fully editable and unprotected once revealed.

**Frozen (Read-Only) Nodes.**
Marking a node as Frozen (padlock icon) keeps its gallery content from being changed by accident. Flows saved earlier with a node "locked" now show that node as frozen, and it works the same way:
- **What is Allowed:** You can still reorder/move the node on the tree, copy/export content, and duplicate the branch (the duplicate is created as a new, fully editable, unfrozen sibling).

Also covered in the full docs for this area: Private (Password-Protected) Nodes; Hidden from Joe Nodes.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Status, Themes & Protection](flowjoe-docs:tree/status-theming)
