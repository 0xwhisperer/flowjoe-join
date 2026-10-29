# FlowJoe Browser And Terminal Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: gallery/browser.mdx, gallery/terminal.mdx
Generated: 2026-10-28 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe the embedded web browser (browser slots and native tabs) and the Forge terminal that live inside gallery slots.

Loading this knowledge is not evidence that a browser slot, web page, or terminal session exists in the current flow.

## In-App Browser & Web Clipping

Research, bookmark, and clip web references directly into outline slots without leaving your workspace.

The desktop app includes an **In-App Browser**. Browser guests open web links in their own browser rather than using the owner’s browser panel. Because research shouldn't force you to toggle between your workspace and external browsers, FlowJoe embeds web browsing directly into the visual shell, allowing you to clip content, capture screenshots, and save bookmarks in one click.

**The Browser Interface.**
The in-app browser is powered by a secure, sandboxed Electron runtime and features standard browser controls:
- **Tab Management:** Open multiple tabs, reorder them, pin tabs to save space, and organize tabs into color-coded **Tab Groups**.
- **The Start Page (`flowjoe://start`):** Your launchpad containing a Google/web search bar, lists of recent tabs, history logs, and your bookmarks.
- **Persistent Session Restore:** If you close FlowJoe, reopening the app automatically restores all your open tabs, their tab groups, and their complete back/forward navigation stacks.

**One-Click Web Clipping (Send-to-Gallery).**
The main superpower of the embedded browser is its tight integration with the gallery:
- **Send to Gallery:** From any active web page, click the **Send to Gallery** button (or right-click and choose **Send Tab to Gallery**).
- **Metadata Extraction:** FlowJoe automatically extracts the page title, description, favicon, and canonical URL.
- **Full-Page screenshots:** Electron opens a background renderer to take a clean screenshot of the web page, saving it as a high-fidelity visual card directly in your active node's gallery.
- **Branded Fallbacks:** If you save empty placeholders or documentation domains (e.g. `example.com`), FlowJoe automatically renders them as branded cards (using the signature coffee-mug logo), preventing clutter.

**Bookmarks & Favorites.**
Organize your web references with a powerful bookmarks system:
- **Quick Bookmark:** Click the star icon in the address bar to add a page to your favorites.
- **Bookmark Folders:** Save pages into custom folders. You can right-click a folder to open all links at once, turn a folder into a tab group, or send a folder's URLs directly to your outlines.
- **Bookmark All Tabs:** Right-click the tab strip to bookmark all open tabs into a new folder instantly—perfect for packing up a research session.
- **Import/Export:** Sync bookmarks, tab groups, and history between devices. You can choose to **merge** new imports or **replace** existing local databases.

**History & Retention Policies.**
FlowJoe records a chronological log of all your visits, saved locally in IndexedDB:
- **Retention Controls:** Configure history cleanup intervals in Settings (keep visits forever, or prune after 30, 90, or 365 days).

Also covered in the full docs for this area: Security & Privacy Gating; Asking Joe about the page; Unsaved web changes.

## Integrated terminal (Forge)

Keep shell sessions and connected coding assistants beside your workspace.

Joe sees terminal output only when you share it: select the lines in the terminal, ask Joe, and press Share with Joe on the card in his chat (Cancel shares nothing). Revoke future access on that card stops Joe re-reading it. Joe can never type, run commands, or read other tabs or later output. Desktop owner chat only.
Forge brings a real terminal into the desktop app, so your command-line work can sit beside the ideas, references, and notes that explain it. Open **Terminal** from the app rail.

**Arrange your sessions.**
Use **+** to open another tab. Double-click a tab to rename it.
Drag tabs to reorder them, move them between panels, or drop them in empty space to create another panel. Move and resize panels within the FlowJoe window. Maximize expands a panel inside that window.

**Keep work running.**
Minimizing a panel keeps its shells running. Closing the main panel hides it and preserves its sessions for reopening.
Closing a detached panel or an individual tab ends its shells. Quitting or reloading FlowJoe also ends sessions.
Screen readers can navigate the terminal's visible rows and receive announcements as output arrives. For a very large burst of output, xterm limits live announcements while keeping the rows available to read.

Also covered in the full docs for this area: Connect a coding assistant; Share terminal output with Joe.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [In-App Browser & Web Clipping](flowjoe-docs:gallery/browser)
- [Integrated terminal (Forge)](flowjoe-docs:gallery/terminal)
