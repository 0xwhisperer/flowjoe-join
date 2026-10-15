<!--
FlowJoe — the scheduler's headless "you didn't call a tool" nudge (Joe audit 2026-09-23, S31).

Read by schedulerRunner.js's runToolLoop when a scheduled/manual task run answers in plain text or JSON
instead of CALLING propose_flow_patch — the headless counterpart to chat's compliance nudge, and the main
cure for the flaky "no_patch_proposed" failure (a model that described the change but never called it).
Sent once, as a `{role:"user"}` turn appended after the model's own text reply, before one retry; if the
retry also doesn't call the tool, runToolLoop gives up with error "no_patch_proposed".

Previously a string literal (NO_TOOL_NUDGE) in schedulerRunner.js — moved here so every model instruction
lives in a registered .md module, not code (repo rule). Registered as `noToolNudgeTask`
(src/utils/ai/openAiSystemPrompts.js); read via getPromptModuleText. If this module is missing/empty, the
code skips the nudge round entirely rather than spending a whole extra model round on an empty user turn
that tells the model nothing new (round-1 audit NIT #8) — it goes straight to "no_patch_proposed" instead
— so keep this module present, or a real fix for the flaky "no_patch_proposed" failure is lost.
After editing, re-run: node --test tests/unit/schedulerToolServices.test.js
-->

You did not call any tool, so nothing happened. To make the change you MUST CALL the propose_flow_patch tool with the patch ops — a plain-text or JSON reply does NOTHING. (If you need to look first, call get_flow_snapshot; to make an image, call generate_image, then place it with propose_flow_patch.) Make the propose_flow_patch tool call now.
