# FlowJoe Repo Nodes Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: tree/repositories.mdx
Generated: 2026-10-14 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe Repo Nodes — making an individual node a Git repository, managing its files and history, connecting HTTPS or SSH remotes, and using source control.

Loading this knowledge is not evidence that the current node is a repository or that any remote, SSH key, or agent is configured.

## Repo nodes and Git

Keep a project in its own Git repository inside FlowJoe, review changes, create commits, and work with branches and Git remotes.

SSH setup (macOS and Linux only; on Windows SSH is not supported yet, use an https:// address): add or unlock your key in the SSH agent available to FlowJoe; if the agent starts after FlowJoe, restart FlowJoe. The host must already be in your OpenSSH `known_hosts` file. Unknown or changed host keys are rejected, and FlowJoe never trusts a new host from inside the app.
A **repo node** gives one project its own Git history inside a Flow. It is still part of your normal Flow tree: folders are child nodes, files are gallery items, and you edit them in FlowJoe.
Explorer supports inline file/folder/tab Rename, folder Delete, Cut/Copy/Paste, and Move to Folder. Moves preserve drafts. Copy Saved Contents keeps source drafts; Save and Copy saves first. Folder Quick Open and Find in Folder stay inside that folder; search includes open drafts and opens results at their matching line. Historical tabs stay read-only.
A repo node is the Git boundary for a project. A **Workspace Folder** chooses where the whole Flow is stored. They are separate features: do not make the whole Workspace Folder your project repository. See Workspace Folders.

**Create or open a repo node.**
Use the **New Node** window to create an empty repository or clone from a Git remote. To import an existing local Git folder, drag the folder onto the Flow tree and choose **Import as Repository**.
For a remote, use its HTTPS address or, on macOS and Linux, either SSH form shown by the Git host, such as `https://host/owner/project.git`, `ssh://git@host/owner/project.git`, or `git@host:owner/project.git`. FlowJoe uses one remote named `origin` for each repo node. A repository imported from a local Git folder can keep its existing SSH origin on macOS and Linux.
When you open a repo node, choose **Source Control** in the app rail. The repository appears with its current branch and any changes waiting to pull or push. The panel is available in the desktop app; browser guests can see repository nodes but cannot run Git actions.
Repo files use a separate Explorer/editor workbench. **Save** updates working files; **Commit** is separate in Source Control. **New File** and **New Folder** put an inline name field at the target folder: **Enter** creates, **Escape** or blur cancels. Rename uses a transparent, theme-underlined field.
**Diff** compares **Last commit** on the left with editable **Current file** on the right.
For private GitHub HTTPS, use Git Credential Manager and choose **Sign in with GitHub**.
Timeline **Open Changes** opens a separate read-only tab labeled with filename, **Diff**, and revision. Exact comparisons reuse their tab; another commit gets a separate one. The working tab, draft, undo, and dirty state stay available. Both historical sides are read-only; choose the working tab or **Edit** to return.

**Browse and edit repository files.**
Choose **Switch to File Explorer** in the repository gallery to show its folder tree and editor. Select a file row to open it in the workbench. Resize the Explorer divider by dragging it or using the keyboard, and use the file tabs to move between files. Each file keeps its own draft and undo history while you switch tabs.
Choose **Switch to Canvas** to return to the repository’s normal gallery.
Paths are relative to the repository root (`.`), such as `src/main.js`; FlowJoe does not create a checkout folder on your computer. From a folder or the Explorer background, use **New File…**, **New Folder…**, or **Quick Open…**. New File and New Folder place a name field in the Explorer at the target directory.
For JavaScript and TypeScript, the workbench can use nearby repository files for limited editor assistance. It does not run a separate language server or a project-wide code service.

**Use an SSH remote (macOS and Linux).**
Unknown or changed host keys are rejected. FlowJoe never offers a prompt that trusts a new host automatically.

**Preview repository files.**
**Preview File** shows text/code, Markdown/HTML, images, audio/video, PDFs, Office text, and ZIP listings. HTML/Markdown block scripts, app access and network; same-repository resources are bounded. It runs no Node/server. Custom fonts may not render.

Also covered in the full docs for this area: Review and commit files; Keyboard controls; Work with branches; Sync with a Git remote; Sign in to GitHub over HTTPS; Set changes aside (Stash).

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Repo nodes and Git](flowjoe-docs:tree/repositories)
