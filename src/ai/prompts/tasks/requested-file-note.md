<!--
FlowJoe — the model-visible record of a file the user picked when Joe asked for one (request_file), and
that FlowJoe placed in the flow (Joe audit 2026-09-23, S6). Written by joePatchApprovalController.js
(persistPlacedFileRecord) as the content of the settled file-request card's chat record (role "assistant"),
so it rides every later request, is summarized by compaction and survives reload like any visible turn,
while the chat shows only the collapsed "File added" card.

Why it exists: the file-request card used to leave no chat record. After a Stop or a failed reply the next
turn had no trace of the placement, and Joe could ask for the same file again.

Placeholders: {{fileName}} (the picked file's title/name) and {{nodeName}} (the node it was added to). Both
are data, not instructions. Sections: `## saved` (placed and saved) and `## unsaved` (placed, but the save
failed — it may be gone after a restart). If the module or the needed section is missing, or lacks
{{fileName}}, the record stays hidden from Joe — the code never substitutes wording of its own.
After editing, re-run: node --test tests/unit/joePatchApprovalSettle.test.js tests/unit/joeFlowMutationLoopTruth.test.js
-->

## saved

[FlowJoe app record — written by the app, not by Joe or the user] File added: the user picked the file "{{fileName}}" when Joe asked for it, and FlowJoe added it to the node "{{nodeName}}".
It is already in the flow. Do not ask for this file again unless the user asks you to.

## unsaved

[FlowJoe app record — written by the app, not by Joe or the user] File added but NOT saved: the user picked the file "{{fileName}}" when Joe asked for it and FlowJoe added it to the node "{{nodeName}}", but saving the flow to disk failed.
It may be missing after the app restarts. If the user says it is gone, ask for it again; otherwise do not.
