<!--
FlowJoe — the model-visible record of how an app workflow Joe handed to the user ended (request_app_workflow,
import_flow; contract docs/IMPLEMENTATION/JOE_WORKFLOW_HANDOFF_SLICE.md "Slice 5"). Written by
joePatchApprovalController.js (persistWorkflowOutcomeRecord) as the content of the settled handoff card's chat
record (role "assistant"), so it rides later requests, is summarized by compaction and survives reload, while
the chat shows only the card's one-line status.

Why it exists: Joe's request_app_workflow call returns "opened" when the user opens the workflow; without this
record Joe never learns how the import went. Written only while the Flow document is still the one the card was
opened on — an overwrite import replaces the Flow and ends the conversation, and its receipt is the app's own
notification.

No placeholders: the record never carries the file name or the file's contents. One section per outcome; if the
module or the needed section is missing, the record stays hidden from Joe — the code never substitutes wording
of its own.
-->

## import_completed_merge_root

[FlowJoe app record — written by the app, not by Joe or the user] Import finished: the user imported a Flow file and merged it at the root of this Flow. You did not see the file. Do not offer to import it again unless the user asks.

## import_completed_merge_selected

[FlowJoe app record — written by the app, not by Joe or the user] Import finished: the user imported a Flow file and merged it into the selected node. You did not see the file. Do not offer to import it again unless the user asks.

## import_cancelled

[FlowJoe app record — written by the app, not by Joe or the user] Import cancelled: the user did not import a file. Nothing changed in the Flow.

## import_failed

[FlowJoe app record — written by the app, not by Joe or the user] Import did not complete: no success was reported. A merge can fail after some imported nodes were already added, so do not assume the Flow is unchanged — check the tree (or ask the user) before offering the import again.
