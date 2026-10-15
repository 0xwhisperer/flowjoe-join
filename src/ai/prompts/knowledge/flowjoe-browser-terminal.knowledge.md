# FlowJoe Browser And Terminal Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: gallery/browser.mdx, gallery/terminal.mdx
Generated: 2026-09-25 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe the embedded web browser (browser slots and native tabs) and the Forge terminal that live inside gallery slots.

Loading this knowledge is not evidence that a browser slot, web page, or terminal session exists in the current flow.

## In-App Browser & Web Clipping

Research, bookmark, and clip web references directly into outline slots without leaving your workspace.

FlowJoe includes a fully featured, sandboxed **In-App Browser**. Because research shouldn't force you to toggle between your workspace and external browsers, FlowJoe embeds web browsing directly into the visual shell, allowing you to clip content, capture screenshots, and save bookmarks in one click.

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
- **Bookmark All Tabs:** Right-click the tab strip to bookmark all open tabs into a new folder instantly—perfect for packing up a research session.

Also covered in the full docs for this area: History & Retention Policies; Security & Privacy Gating.

## Integrated Terminal (Forge)

Run local shell sessions, manage multiple tabs, and drag-and-drop terminals directly inside the visual client.

FlowJoe includes **FlowJoe Forge**—a floating, draggable, and tabbed integrated terminal panel. Built using `xterm.js` and backed by real native shells in the desktop main process, the Forge allows you to run terminal tasks, execute build scripts, and run agent loopbacks side-by-side with your outline structure.

**Key Features.**
- **Draggable & Floating Windows:** The terminal panel floats above the visual workspace, allowing you to position it anywhere or drag it to secondary displays.
- **Fully Resizable:** Pull on any edge or corner to expand your command line view, or hit the Maximize button to go full-screen.
- **Tabbed Sessions:** Keep multiple terminals active at the same time in a single window panel, each maintaining its own environment and history.
- **Desktop Only:** The terminal panel opens local shell sessions inside the FlowJoe desktop app.

**Drag-and-Drop Tab Management.**
The tab strip in the terminal panel supports advanced visual window operations:
- **Reordering Tabs:** Click and drag any terminal tab tab-header within the strip to change its order.
- **Moving Tabs:** Drag a tab from one terminal panel window and drop it onto another terminal window's tab strip to merge them.
- **Tearing Off Tabs:** Drag a tab header out of the panel window and drop it in empty space to automatically tear it off into a **brand new independent floating terminal window**.

Also covered in the full docs for this area: Background Persistence & Shell Backend; Related Guides.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [In-App Browser & Web Clipping](flowjoe-docs:gallery/browser)
- [Integrated Terminal (Forge)](flowjoe-docs:gallery/terminal)
