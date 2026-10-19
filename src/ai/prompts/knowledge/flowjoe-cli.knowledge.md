# FlowJoe CLI Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: cli/getting-started.mdx, cli/commands.mdx, cli/scripting.mdx, cli/approvals-and-troubleshooting.mdx
Generated: 2026-10-18 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe using flowjoe-cli to control the running desktop app: installation, show/search/apply/run, JSON scripts, action lists, --preview, --autoapprove including deletions, troubleshooting, and finding the everyday-task and complete live action/editing-verb references, bounded app-state/history/document/workbook/calendar reads.

Loading this knowledge is not evidence that the CLI is installed, the desktop supports it, or any command has run. The command reference is in the user manual, not a new app panel.

## Start using the CLI

Read, search, and change your open Flow from a terminal.

Install with npm install --global https://docs.flowjoe.app/downloads/flowjoe-cli-0.1.0.tgz (Node.js 22.12+). Keep FlowJoe open and turn on Settings → Joe AI → Agent Bridge (MCP). Commands act on the currently open Flow; they do not open or switch Flows.
For saved attachment evidence, first find the intended conversation with `query_history`, then use memory mode. The current native chat is not an external source selection.
With Read or Propose access, the CLI can read repository state and files from the current Flow. This works independently of native Joe’s chat setting and grants no repository edits or terminal access.

Also covered in the full docs for this area: Install; Connect to FlowJoe; Try a change; What is available.

## CLI commands

The commands and options available in flowjoe-cli.

Plain commands: flowjoe-cli status; show; search "words"; actions [name]; apply changes.json --preview; apply changes.json --autoapprove; run steps.json. Advanced: action NAME --file input.json. --json is for scripts; --wait SECONDS defaults to 120; --settings-file PATH chooses a profile; - reads stdin. --preview never applies, even with --autoapprove.
`read_chat_attachment` also supports retained attachment memory selected through an admitted history record; omitting `mode` keeps the connection-upload behavior.
Repository reads use `action read_repository` and `action read_repo_file`; see the repository inputs. Use one `run` connection for continuation.
Run `flowjoe-cli --help` whenever you need a reminder. Use `--version` to see the installed CLI version.
- `flowjoe-cli status` — Checks that the running desktop app is reachable.

Also covered in the full docs for this area: Shared options; Files of changes; Advanced actions; Results for scripts.

## CLI scripting and action lists

Use JSON, pipes and shared results in repeatable FlowJoe workflows.

run takes an ordered JSON array of {action,input?,saveAs?}. Later inputs may use {"$result":"saved-name","path":["field",0]}. Steps share one connection. On failure, earlier changes remain applied. Uploads/history/undo belong only to that command's connection (history here means connection changes).
Retained attachment memory uses exact history and memory revisions plus `nextStart`, rather than a session cursor. Both revisions are rechecked on every read, including a new command. Upload IDs remain connection-local.
Repository `nextCursor` values belong to the same `run` connection. Repeat the exact file/source or repository/view selectors; a different session, changed source, privacy or editor version refuses continuation.

Also covered in the full docs for this area: Run several actions together; Use an earlier result; Keep related work in one connection.

## CLI approvals and troubleshooting

Understand approval choices and resolve common connection or command problems.

--autoapprove explicitly bypasses approval cards INCLUDING DELETIONS, memory/task review holds, for this command only. It changes no global or saved setting and affects no other clients. Permissions, privacy, read-only protections and validation remain.
Older apps without support are refused before actions. Without the flag, follow existing app approval rules while CLI waits.
Timeout/disconnect is unconfirmed: check FlowJoe before retrying; a pending card may remain. No automatic edit retries.
Memory mode needs an admitted chat `recordId` and its `historyRevision`; `conversation_required` means those selectors are missing. A stale memory revision requires a fresh index. Neither a memory ID nor an upload ID grants access to the other namespace.

Also covered in the full docs for this area: Approve changes in the app; Skip approval cards for a command; Couldn't connect; Command not found after installing; Action unavailable or input rejected; Timed out, interrupted, or connection lost.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Start using the CLI](flowjoe-docs:cli/getting-started)
- [CLI commands](flowjoe-docs:cli/commands)
- [CLI scripting and action lists](flowjoe-docs:cli/scripting)
- [CLI approvals and troubleshooting](flowjoe-docs:cli/approvals-and-troubleshooting)
