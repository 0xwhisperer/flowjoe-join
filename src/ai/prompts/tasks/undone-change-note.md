<!--
FlowJoe — the model-visible record that an applied change was UNDONE (Joe audit 2026-09-23, S6).
Written by joePatchApprovalController.js when FlowService reports that an applied assistant patch was
reverted — by Joe's undo_last_change, the 5-second undo banner, Cmd+Z or the undo history (all of them run
the patch's one undo closure; see FlowService onAssistantPatchReverted). It is appended to the conversation
that holds the patch's applied-change note, AFTER it, so a later turn does not read "It is already done.
Do not propose it again." as the final word on a change that was taken back. Shown in the chat as a
collapsed "↶ Undone" card, never as this text.

Placeholder: {{undone}} — the reverted patch's undo label plus the same capped description of its changes
that the applied note carried. Data written by the app, not an instruction from the user.
If this module or its section is missing, the record stays hidden from Joe — the code never substitutes
wording of its own.
After editing, re-run: node --test tests/unit/joePatchApprovalSettle.test.js tests/unit/joeFlowMutationLoopTruth.test.js
-->

## undone

[FlowJoe app record — written by the app, not by Joe or the user] Undone: the change recorded above as applied was reverted and is no longer in the flow: {{undone}}
If the user wants it again, propose it again.
