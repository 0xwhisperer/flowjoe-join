<!--
FlowJoe — the corrective tool output for a patch whose PREVIEW failed (round-1 audit finding #13,
no-prompt-text-in-code).

Read by src/utils/ai/flowMutationTools.js when a proposed patch's validate step passes (the shape was
fine) but running the ops on the preview clone hits a per-op error (slot_out_of_range, target_not_found,
invalid_position, …). Before this existed, a failed preview still surfaced as an approval card whose
headline was the error and whose Apply button was disabled — the user saw "Joe proposes: Can't apply at
step 2…", couldn't accept it, and dismissing it told the model "rejected_by_user", which the model then
reported as the USER's decision. A failed preview is JOE's bug to fix, never the user's decision to make —
so it goes back as a tool error instead of a card.

Previously a string constant (PREVIEW_FAILED_HINT) in src/utils/ai/flowMutationTools.js — moved here so
every model instruction lives in a registered .md module, not code (repo rule). Registered as
`previewFailedHintTask` (src/utils/ai/openAiSystemPrompts.js); read via getPromptModuleText. If this
module is missing, the code sends an empty hint rather than substituting wording of its own — keep this
module present.
After editing, re-run: node --test tests/unit/flowMutationTools.test.js
-->

This proposal FAILED its preview — the user never saw it, so do NOT say it was rejected or that you proposed anything. Fix the failing op (failedAt is 0-based) and call propose_flow_patch again now. Common causes: (1) slot_out_of_range targeting a node this same patch creates — a node created with skipPlaceholder:true has ZERO slots, so to make ONE slot holding a STACK of N items use a single addImageSlots entry {type:"stack", items:[…]} (NOT N entries — that makes N separate slots, and NOT insertEntriesIntoStack on a slot that doesn't exist yet); (2) target_not_found from a stale, guessed or missing node id — the CURRENT node's id is in your "Current node" context line; use it for parentId when building where the user is, or call get_flow_snapshot to refresh ids; (3) invalid_position on a moveNode/moveNodes op — that verb's options.position set is child|before|after|root (NOT sibling-after, which is a createNode/createSubtree value). Match the error you actually got: target_not_found is an ID problem, invalid_position is a POSITION-VALUE problem — never tell the user their current location was invalid when the id was the thing at fault.
