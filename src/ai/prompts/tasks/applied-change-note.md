<!--
FlowJoe — the model-visible record of a change the user approved and FlowJoe applied (Joe audit 2026-09-23, S6).
Written by joePatchApprovalController.js when the edit loop reports an approved patch as applied. It becomes
the `content` of the settled card's chat record (role "assistant"), so it rides every later request, is
summarized by compaction, and survives reload exactly like any other visible turn — while the chat still
shows the collapsed approval card, never this text as a bubble.

Why it exists: before S6 the applied card's record was hidden from Joe. When the user pressed Stop (or the
turn timed out) after approving, the user's message and the stop notice are also never sent, so the next
turn had NO trace of the change — Joe re-proposed it and the change landed twice.

Placeholder: {{changes}} — the applied ops, described from the ops themselves before the apply (node names
as the user knew them), joined with " | "; the card headline when no description is available. The text is
data written by the app, not an instruction from the user.
Sections (one per `## <id>` heading; everything under it up to the next heading, trimmed):
  saved   — the change was applied AND saved.
  unsaved — applied in the flow but the save failed (persist_failed): it may be gone after a restart, so the
            note must not claim it is durably done.
{{changes}} is capped by the code (the first few op descriptions plus a count of the rest).
If this module or the needed section is missing, the record stays hidden from Joe (the pre-S6 behaviour) —
the code never substitutes wording of its own.
After editing, re-run: node --test tests/unit/joePatchApprovalSettle.test.js tests/unit/joeFlowMutationLoopTruth.test.js
-->

## saved

[FlowJoe app record — written by the app, not by Joe or the user] Applied: the user approved this change and FlowJoe made it in the flow: {{changes}}
It is already done. Do not propose it again unless the user asks for it again.

## unsaved

[FlowJoe app record — written by the app, not by Joe or the user] Applied but NOT saved: the user approved this change and FlowJoe made it in the flow, but saving it to disk failed: {{changes}}
It may be missing after the app restarts. If the user says it is gone, propose it again; otherwise do not repeat it.
