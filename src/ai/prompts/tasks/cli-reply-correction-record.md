<!--
FlowJoe — the record of what the first run of a terminal-brain turn already did, appended to the correction note
when FlowJoe's reply check sends the SAME turn back for one corrective run (src/js/joeBrainReplyCompliance.js).

A terminal brain's corrective run is a fresh process: it sees the conversation and the first reply, but none of the
tool calls the first run made. This record is built from FlowJoe's own facts about that run (never from the reply's
words) so the second run does not propose, read or start again what already happened. Each section is added only
when its fact holds; {count} and {topics} are filled by the code.

Registered as `cliReplyCorrectionRecordTask` (src/utils/ai/openAiSystemPrompts.js), read by section. If the module is
missing, the correction note goes out without a record.
-->

## header

What the first run of this same turn already did (recorded by FlowJoe, not taken from the reply):

## pending

- {count} change proposal(s) are already waiting for the user's approval on a card in the chat. They have been proposed: do not propose them again, and do not say they were applied.

## applied

- {count} change(s) were already applied to the flow this turn. Do not propose them again.

## rejected

- The user declined {count} proposal(s) this turn. Do not propose them again unless the user asks.

## read

- Content was already read this turn with the read tools. Read it again if you need it for your answer.

## launched

- {count} background specialist job(s) were already started this turn. Do not start them again.

## chapters

- FlowJoe manual chapters already opened this turn: {topics}.
