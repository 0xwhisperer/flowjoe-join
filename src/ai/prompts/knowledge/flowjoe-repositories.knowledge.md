# FlowJoe Repo Nodes Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: tree/repositories.mdx
Generated: 2026-10-20 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe Repo Nodes — making an individual node a Git repository, managing its files and history, connecting HTTPS or SSH remotes, and using source control.

Loading this knowledge is not evidence that the current node is a repository or that any remote, SSH key, or agent is configured.

## Repo nodes and Git

Keep a project in its own Git repository inside FlowJoe, review changes, create commits, and work with branches and Git remotes.

A repo node gives one project its own Git history inside a Flow. Drag the folder onto the Flow tree and choose Import as Repository. For private GitHub HTTPS, use Git Credential Manager and Sign in with GitHub.
SSH setup (macOS and Linux only; on Windows SSH is not supported yet, use an https:// address): add or unlock your key in the SSH agent available to FlowJoe; if the agent starts after FlowJoe, restart FlowJoe. The host must already be in your OpenSSH `known_hosts` file. Unknown or changed host keys are rejected, and FlowJoe never trusts a new host from inside the app.
A **repo node** brings a coding project into the same workspace as its plans, research, screenshots, and conversations with Joe. Browse files, edit several at once, compare changes, make commits, and explore branches without losing the project’s visual context.
Folders become child nodes and files become gallery items. Switch between the Canvas and File Explorer to see the project as a reference board or as a code workspace.

**A quick tour of the coding workspace.**
- Work across several files — **File Explorer** and editor tabs; each file keeps its draft and undo history.
- See what you changed — **Diff** compares your current file with its last commit.
- Save a milestone — **Source Control → Changes**: stage files, write a message, and **Commit**.
- Explore earlier work — **Timeline** for a file, or **Graph** for commits and branches.
- Try a different direction — Create a branch and **Open Branch as Node** to give it a place in the tree.
- Work with a teammate — Share the repository; permitted browser guests use its Explorer, editor, and Source Control through your computer.
**Save** updates the working file. **Commit** records a chosen set of saved changes in Git history. **Push** sends commits to the linked remote repository.
A repo node is the Git boundary for a project. A **Workspace Folder** chooses where the whole Flow is stored. They are separate features: do not make the whole Workspace Folder your project repository. See Workspace Folders.

**Shared repositories.**
Guests use the same Explorer, editor and Source Control surfaces. **Can view** allows reading shared files and their associated history. **Can edit** allows creating, editing, renaming, saving and committing shared files through the owner's computer. Saving and committing are separate actions.
The Graph includes branches in the shared repository, including branches not yet open as Flow nodes. A branch represented by a private or unshared node stays unavailable. Guests can read admitted branch history, tags and stashes.
Discarding working changes, saving a stash that puts files back to their last commit, applying or popping a stash over existing work, rewriting the last commit, renaming or deleting branches, deleting tags or stashes, and replacing or removing a remote require the owner's additional removal permission. Linking a new remote does not.

**Use an SSH remote (macOS and Linux).**
SSH remotes work on macOS and Linux. On Windows they are not supported yet; FlowJoe tells you so and asks you to use an `https://` address.
Unknown or changed host keys are rejected. FlowJoe never offers a prompt that trusts a new host automatically.

**Preview repository files.**
HTML and Markdown previews show saved content without running scripts or contacting websites. Images and styles from the same repository can load within preview limits. A preview does not start your app or development server, and custom fonts may not appear.

Also covered in the full docs for this area: Create or open a repo node; Browse and edit repository files; Review and commit files; Private folders in a repository; What goes into the repository; Explore history and ask Joe; Keyboard controls; Work with branches; Sync with a Git remote; Sign in to GitHub over HTTPS; Set changes aside (Stash); Bring FlowJoe into your IDE; What Joe can read; Ask Joe to change a file.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Repo nodes and Git](flowjoe-docs:tree/repositories)
