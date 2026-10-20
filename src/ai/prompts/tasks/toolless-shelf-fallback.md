<!--
FlowJoe — the shelf fallback a CLI-brain turn carries while the context director is operational (Joe audit
2026-07-28 findings #3/#29). Built by joeContextDirectorController.js buildToollessShelfFallbackText from
the sections below; this text used to live as string literals in that file ("no prompt text in code",
moved 2026-10-20).

Which instruction rides depends on what the run can really call (2026-10-20): a bridged CLI brain holds
`open_reference` at every Flow access level (Off through the bridge's manual-only level, Read-Only and
Propose with the rest of their tools), so it gets `with-open-reference`; only a run with no FlowJoe
connection at all (Antigravity outside macOS, or no shelf to open) gets `no-tools`, which teaches the
[open_reference: topic-id] marker that the controller turns into a preloaded chapter on the next turn.

Placeholders: {{index}} — the shelf topics with their "when to grab" hints.
Sections (one per `## <id>` heading):
  loaded-header       — introduces chapters the brain's previous reply named with the marker.
  with-open-reference — the run has the open_reference tool.
  no-tools            — the run has no FlowJoe tools at all.
A missing section is simply omitted by the code — never replaced with wording from code.
Guarded by tests/unit/joeToollessShelfFallback.test.js.
-->

## loaded-header

The following FlowJoe reference chapters were loaded because your previous reply requested them:

## with-open-reference

FlowJoe reference chapters you can open with your `open_reference` tool: {{index}}. If answering a FlowJoe question needs one of these chapters and it is not already in your context, do NOT guess — call `open_reference` with that topic id and answer from the chapter. If that call fails, you may instead include the exact marker [open_reference: topic-id] on its own line at the END of your reply; that chapter will then be loaded for your next turn.

## no-tools

FlowJoe reference chapters available on request (no tools are available on this model): {{index}}. If answering a FlowJoe question needs one of these chapters and it is not already in your context, do NOT guess — say you are checking the FlowJoe reference and include the exact marker [open_reference: topic-id] on its own line at the END of your reply; that chapter will be loaded for your next turn, so ask the user to continue (e.g. "ask me again" or any follow-up).
