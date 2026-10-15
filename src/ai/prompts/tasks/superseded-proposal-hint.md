<!--
FlowJoe — the model-facing hint that rides a propose_flow_patch tool output refused as
`superseded_by_earlier_proposal` (Joe audit 2026-09-23, S8).

The model's tool calls in one reply are written together, before any of them runs, but the loop runs them
one after another. Once an earlier propose_flow_patch in the same reply has been decided by the user
(applied, rejected, or sent back for revision), every later proposal from that same reply was written
against a flow that no longer matches what the user just decided — it would target stale positions and
ids, or re-propose something the user just refused. joeFlowMutationLoopController therefore returns
{applied:false, error:"superseded_by_earlier_proposal"} for those later calls WITHOUT validating, previewing
or showing a card, and attaches this hint so Joe re-proposes on fresh state instead of reporting a failure.

Registered as `supersededProposalHintTask` (src/utils/ai/openAiSystemPrompts.js); the loop reads the
`superseded` section through getPromptModuleText. If this module or its section is missing, the tool output
carries the error code alone — the code never substitutes wording of its own.
After editing, re-run: node --test tests/unit/joeFlowMutationLoopSuperseded.test.js
-->

## superseded

This proposal was NOT shown to the user and nothing was applied: an earlier propose_flow_patch call in this same reply was already decided (applied, rejected, or sent back for revision), so this one was written against a flow that no longer matches. Do not describe it as failed or rejected. If the change is still wanted after that decision, read the current state (the applied result you just received, or get_flow_snapshot) and call propose_flow_patch again — one proposal per reply, then stop and wait for the user's decision.
