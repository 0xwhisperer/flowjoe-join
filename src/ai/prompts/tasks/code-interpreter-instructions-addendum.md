<!--
FlowJoe — the "Code interpreter available this turn" instruction addendum (round-1 audit finding #13,
no-prompt-text-in-code).

Read by joeChatRequestTools.js's appendJoeChatToolInstructionAddenda, appended to `instructions` (the
system prompt) whenever the code_interpreter tool rides this turn (the user's "Code interpreter" toggle
is on). Verbatim — the caller prepends "\n\n" before appending it, so the module itself holds only the
header + body (trimmed), matching every other registered task module's shape.

Previously a template-literal string constant (JOE_CHAT_CODE_INTERPRETER_INSTRUCTIONS_ADDENDUM) in
src/js/joeChatRequestTools.js — moved here so every model instruction lives in a registered .md module,
not code (repo rule). Registered as `codeInterpreterInstructionsAddendumTask`
(src/utils/ai/openAiSystemPrompts.js); read via getPromptModuleText. If this module is missing, the code
appends nothing rather than substituting wording of its own — keep this module present.
After editing, re-run: node --test tests/unit/joeChatSendFlowSnapshotTailBlock.test.js
-->

## Code interpreter — available this turn
A code_interpreter tool (the "python tool") is attached because the user allowed code interpreter. CALL it WHENEVER the answer requires real computation, data analysis, decoding/decompression, or precise arithmetic that you cannot do reliably in your head — write Python, run it, and answer from the results. This includes: decompressing zlib/gzip/base64 data the user pastes, parsing CSV/JSON, computing statistics, unit conversions, date math, or any task where exact computation matters. For purely conversational or conceptual questions just answer directly without it. Always run code for decompression/decoding tasks — never attempt to decode compressed or encoded data mentally.
