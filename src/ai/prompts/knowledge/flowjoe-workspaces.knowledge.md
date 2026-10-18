# FlowJoe Workspaces Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: workspaces/folders.mdx, workspaces/recovery.mdx
Generated: 2026-10-18 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe FlowJoe's Workspace Folder mode — saving a Flow as a normal folder on disk, backup and Git workflows, restore points, History, and workspace recovery.

Loading this knowledge is not evidence that a workspace folder is open, converted, shared, or being synced.

## Workspace Folders

Save a Flow as a normal folder on your drive, so your work sits in plain files you can back up, version, and see.

Status note: if an older Workspace backup contains private text, FlowJoe protects it automatically by replacing that text with a placeholder (the private notes stay on this computer), removes any backup too damaged to check, and then lets saving resume.
**Settings → Data** → **Workspace Folder**; no File/context menu.
Workspace Folders are available in the desktop app.

**Why use a Workspace Folder?**
**Older backups are protected automatically.** When a Flow already contains private nodes, FlowJoe preserves their full content in owner-only storage, replaces it in the Workspace with redacted placeholders, and verifies the saved file before resuming saves. A copy shared or backed up before migration cannot be recalled.

**Move a Flow to another computer.**
A **Workspace Folder** chooses where the Flow's data is stored. A **repo node** gives one node its own Git repository for project files. Those are separate choices: repo-node files appear in the node tree and galleries and are saved through FlowJoe's normal storage, while Git history is kept as FlowJoe-managed hidden data.
To bring a project into Git in FlowJoe, create or clone a repo node from the New Node window. Do not make the whole Flow's Workspace Folder the project repository. Each repo node has its own hidden Git history; its files remain in the Flow's tree and galleries. See Repo nodes and Git for HTTPS and SSH remotes.

Also covered in the full docs for this area: Where to find it; Setting one up; What lands on disk; Backups, Git, and syncing; iCloud Drive, Dropbox, and Google Drive; Network and shared drives; When something changes outside FlowJoe; When the workspace file can't be read; Open on another computer; Missing, retained, and changed media; Using one Workspace on two computers; When saving pauses; Switch between Workspace and Local storage; Reconnect after working locally; Private nodes; Quitting FlowJoe; Exports still work; Related; Placeholder.

## History & Recovery

Restore points that let you jump back to an earlier version of your Flow, plus the safety nets that keep your work when something goes wrong.

Restore points and History work; Local Recovery Copy is Workspace-only.
**History** in the app rail: **Versions**, **Chats**, **Images**. Guests read shared nonprivate history.
**Chats**: this Flow’s conversations; search/filter, **Open** in Joe. Deleted places: **No longer in your flow**, read-only.
Implemented source; release not implied.
Ordinary chats/backups travel with the Workspace. **Keep on this computer only** applies per conversation. Private-node/computer-only chats, chat-only pictures and image-history prompts stay out of folders, exports and shares; moving a slot privately applies immediately.
Each Flow owns its chats/summary; the old global summary is adopted once by the open Flow. Exports carry history for that Flow/branch. Failed reads block overwrite; switching Flows cancels deletion; New Chat cannot clear another target.
Image History is local; gallery media travels. **Images**: Open, Send to slot, Copy prompt. Eligible chat pictures export after deleting Image History rows. Restores keep their prompt/details; failed generation keeps the prior draft. Failed deletion keeps card/picture; private destinations stay hidden.
Trash deletes a row (unowned older read-only conversations have none); **Delete all shown** deletes shown eligible rows. Deletes confirm the count and cannot be undone.

**Going back.**
A restore point includes your **whole Flow, galleries too**, so restoring puts images, files, links and slot notes back as they were — including one you mark on an older version. A restore point made before this update, still sitting in a Flow you haven't touched since, is the one exception and holds only the tree and text.

**What restore points do not cover.**
**Importing a Flow over the current one, and starting a New Flow, do not take a restore point.** Both replace your Flow completely, so a restore point taken then would not survive.

Also covered in the full docs for this area: A connected Workspace temporarily stops saving; Restore points; Opening History; Ask Joe about a saved version; Chat History and Image History; Making one; How many are kept; The Local Recovery Copy (Workspace mode); When the folder and Local copy disagree; When a workspace file was changed elsewhere; Related.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Workspace Folders](flowjoe-docs:workspaces/folders)
- [History & Recovery](flowjoe-docs:workspaces/recovery)
