<!--
FlowJoe — the corrective tool output for a patch that places NONE of the turn's staged/generated media
(round-1 audit finding #13, no-prompt-text-in-code).

Read by src/utils/ai/flowMutationTools.js as the staged-media-placement backstop: generate_image /
stage_media stage media for the model to place, and this hint fires when a propose_flow_patch call
references none of it. Worded so the model can also legitimately PASS on retry (the media was deliberately
chat-only) — the host's consume-once latch lets the SAME patch through the second time, so a deliberate
skip costs exactly one corrective round (same philosophy as flow-reply-compliance-nudge.md).

Previously a string constant (STAGED_MEDIA_UNPLACED_HINT) in src/utils/ai/flowMutationTools.js — moved
here so every model instruction lives in a registered .md module, not code (repo rule). Registered as
`stagedMediaUnplacedHintTask` (src/utils/ai/openAiSystemPrompts.js); read via getPromptModuleText. If this
module is missing, the code sends an empty hint rather than substituting wording of its own — keep this
module present.
After editing, re-run: node --test tests/unit/flowMutationTools.test.js
-->

You staged/generated media this turn (keys in detail.stagedKeys) but this patch places NONE of it. If the user asked for that media in the flow, re-propose WITH a placement op (addImageSlots / insertEntriesIntoStack / replaceImageSlot) whose entries reference the staged entry (or {"src": "<key>"}). For a node this same patch creates: declare an alias on the create op, target it as nodeId, and set values.skipPlaceholder true so the media lands in slot 1 instead of after a default placeholder. If the media was deliberately chat-only, re-send this exact patch unchanged and it will go through.
