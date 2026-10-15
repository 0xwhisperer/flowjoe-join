<!--
FlowJoe — the tool-output hint for the "applied but not saved" case (persist_failed) (round-1 audit
finding #13, no-prompt-text-in-code).

Read by joeFlowMutationLoopController.js's tool loop: when a patch applies in memory but the save to disk
fails (storage may be full — applied.ok === false alongside appliedInMemory === true), this hint rides
alongside `persisted: false` in the tool's function_call_output. Distinct from the CHAT-VISIBLE
applied-change-note.md's "unsaved" section (which becomes the settled card's chat record for the NEXT
turn) — this is the tool result Joe reads THIS turn, telling him not to re-propose and how to describe the
state honestly.

Previously a string literal inline in joeFlowMutationLoopController.js — moved here so every model
instruction lives in a registered .md module, not code (repo rule). Registered as
`persistFailedHintTask` (src/utils/ai/openAiSystemPrompts.js); read via getPromptModuleText. If this
module is missing, the code sends an empty hint rather than substituting wording of its own — keep this
module present.
After editing, re-run: node --test tests/unit/joeFlowMutationLoopTruth.test.js
-->

The change IS applied and visible in the flow, but saving it to disk failed (storage may be full). Do NOT re-propose these ops — tell the user the change is applied but unsaved and to free up storage.
