# FlowJoe CLI Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: cli/getting-started.mdx, cli/commands.mdx, cli/scripting.mdx, cli/approvals-and-troubleshooting.mdx
Generated: 2026-10-18 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe using flowjoe-cli to control the running desktop app: installation, show/search/apply/run, JSON scripts, action lists, --preview, --autoapprove including deletions, troubleshooting, and finding the everyday-task and complete action/59-verb references.

Loading this knowledge is not evidence that the CLI is installed, the desktop supports it, or any command has run. The command reference is in the user manual, not a new app panel.

## Start using the CLI

Read, search, and change your open Flow from a terminal.

Install with npm install --global https://docs.flowjoe.app/downloads/flowjoe-cli-0.1.0.tgz (Node.js 22.12+). Keep FlowJoe open and turn on Settings → Joe AI → Agent Bridge (MCP). Commands act on the currently open Flow; they do not open or switch Flows.
The FlowJoe CLI lets you work with your open Flow from a terminal or a script. FlowJoe stays running and saves the changes. The command reference lives here in the manual; no extra command panel is added to the app. You can also ask Joe for help with the commands.

**Install.**
Install **Node.js 22.12 or newer**, which includes npm. Install the CLI with `npm install --global https://docs.flowjoe.app/downloads/flowjoe-cli-0.1.0.tgz`, then check its version:

Also covered in the full docs for this area: Connect to FlowJoe; Try a change; What is available.

## CLI commands

The commands and options available in flowjoe-cli.

Plain commands: flowjoe-cli status; show; search "words"; actions [name]; apply changes.json --preview; apply changes.json --autoapprove; run steps.json. Advanced: action NAME --file input.json. --json is for scripts; --wait SECONDS defaults to 120; --settings-file PATH chooses a profile; - reads stdin. --preview never applies, even with --autoapprove.
Run `flowjoe-cli --help` whenever you need a reminder. Use `--version` to see the installed CLI version.
- `flowjoe-cli status` — Checks that the running desktop app is reachable.
- `flowjoe-cli show` — Shows the current Flow's node names and IDs.
- `flowjoe-cli search "words"` — Finds visible matching Flow text.
- `flowjoe-cli actions` — Lists the actions your running app offers.
- `flowjoe-cli actions search_flow` — Shows one action's description and expected input.

Also covered in the full docs for this area: Shared options; Files of changes; Advanced actions; Results for scripts.

## CLI scripting and action lists

Use JSON, pipes and shared results in repeatable FlowJoe workflows.

run takes an ordered JSON array of {action,input?,saveAs?}. Later inputs may use {"$result":"saved-name","path":["field",0]}. Steps share one connection. On failure, earlier changes remain applied. Uploads/history/undo belong only to that command's connection; a later command cannot reuse them.
Use `--json` when another program will read a command's result:
Use a JSON file with `apply`, or send the file through standard input:
The pipe example uses a macOS/Linux shell. In PowerShell, use `Get-Content -Raw changes.json | flowjoe-cli apply - --autoapprove --json`. Passing the filename directly works on all three platforms.

**Run several actions together.**
Save an array of steps in `steps.json`. Each step names an `action` and can supply an `input` object:

Also covered in the full docs for this area: Use an earlier result; Keep related work in one connection.

## CLI approvals and troubleshooting

Understand approval choices and resolve common connection or command problems.

--autoapprove explicitly bypasses approval cards INCLUDING DELETIONS, memory/task review holds, for this command only. It changes no global or saved setting and affects no other clients. Permissions, privacy, read-only protections and validation remain.
Older apps without support are refused before actions. Without the flag, follow existing app approval rules while CLI waits.
Timeout/disconnect is unconfirmed: check FlowJoe before retrying; a pending card may remain. No automatic edit retries.

**Approve changes in the app.**
The app's existing **Auto-apply agent edits** setting can already let ordinary edits apply without a card. Its extra review holds still apply unless the CLI command explicitly uses `--autoapprove`.

Also covered in the full docs for this area: Skip approval cards for a command; Couldn't connect; Command not found after installing; Action unavailable or input rejected; Timed out, interrupted, or connection lost.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Start using the CLI](flowjoe-docs:cli/getting-started)
- [CLI commands](flowjoe-docs:cli/commands)
- [CLI scripting and action lists](flowjoe-docs:cli/scripting)
- [CLI approvals and troubleshooting](flowjoe-docs:cli/approvals-and-troubleshooting)
