<!--
FlowJoe — Joe chat compaction REQUEST parts (the per-call instructions around compaction.md).
Purpose: every model-facing sentence the compaction engine (src/js/joeChatCompactionEngine.js) adds to a
compaction / merge request, plus the request-time blocks it hands Joe in chat (the protected
attachment memory note, the remembered-items header, and the hidden compacted-memory packet's title
and framing, built by joeCompactionController.js). Moved here from string literals in the engine
on 2026-09-23 — no model instruction lives in code.

Format: one section per part, headed `## <partId>` (lowercase-first id, no spaces — the engine's parser
only treats that shape as a heading, so a content line like "## Protected Attachment Memories" is TEXT).
Everything under a heading up to the next heading is that part, trimmed. The engine splices parts into
its own line layout, so a part's LINE BREAKS are significant: keep one sentence per line where it is one
today, and don't add blank lines unless you mean them to reach the model. Placeholders: {{instruction}}
(the user's compaction instruction), {{protectedMemories}} (serialized protected records),
{{summaryCap}} (token budget number).
After editing, re-run: node --test tests/unit/joeChatCompactionEngine.test.js
-->

## systemFallback
Summarize the older conversation faithfully and concisely.

## mergeSystemFallback
Combine the partial summaries faithfully and concisely.

## userInstruction
Optional user compaction instruction:
{{instruction}}

Follow this instruction as a preservation priority while staying faithful to the supplied source. Do not invent unsupported facts, ignore the compaction rules, or rewrite protected attachment memories.

## mergeUserInstruction
Optional user compaction instruction:
{{instruction}}

Follow this instruction as a preservation priority while staying faithful to the segment memories. Do not invent unsupported facts.

## protectedMemories
Protected attachment memories (carry forward verbatim; do not summarize, rewrite, deduplicate, or shorten these records):
{{protectedMemories}}

Use the protected attachment memories as context when updating the conversation memory, but do not copy or paraphrase them into your narrative summary. FlowJoe stores and sends them separately.

## rollupCapped
The previous compacted memory has exceeded its size budget (~{{summaryCap}} tokens) and is being rolled up.
Rebuild ONE consolidated memory from the supplied source turns: merge and tighten aggressively, drop redundancy and superseded detail, and keep the result within about {{summaryCap}} tokens.
Preserve every still-relevant goal, decision, constraint, correction, open question, name, and id — compress wording, never drop substance.

## rollupUncapped
The previous compacted memory has exceeded its size budget and is being rolled up.
Rebuild ONE consolidated memory from the supplied source turns: merge and tighten aggressively, drop redundancy and superseded detail, and keep the result within about the size budget.
Preserve every still-relevant goal, decision, constraint, correction, open question, name, and id — compress wording, never drop substance.

## existingMemoryHeader
Existing compacted memory (current canonical memory to update):

## newTurnsHeader
Newly older conversation turns:

## rollingTask
Task: return the FULL replacement compacted memory.
Preserve still-relevant goals, decisions, constraints, corrections, open questions, names, ids, and FlowJoe context.
Deduplicate repeated material. If a new turn supersedes an older decision, mark the older decision as superseded rather than silently dropping it.
Do not merely summarize the new turns. Do not shorten by sacrificing important context.
Return only the compacted conversation memory; protected attachment memories are carried separately by FlowJoe.

## firstPassLead
Summarize the following older conversation turns:

## returnOnly
Return only the compacted conversation memory; protected attachment memories are carried separately by FlowJoe.

## mergeIntro
The older conversation was summarized in consecutive segments because it was too large to compact in one pass.
Merge these segment memories, in order, into ONE consolidated compacted memory:

## mergeRules
Preserve still-relevant goals, decisions, constraints, corrections, open questions, names, ids, and FlowJoe context across all segments.
Deduplicate repeated material; if a later segment supersedes an earlier decision, mark the earlier one superseded rather than silently dropping it.

## mergeCap
Keep the consolidated memory within about {{summaryCap}} tokens.

## mergeReturnOnly
Return only the consolidated compacted conversation memory; protected attachment memories are carried separately by FlowJoe.

## levelledMergeIntro

This is one intermediate step of a multi-level merge: the segments below are themselves already-merged summaries of earlier segments, not raw conversation turns. Combine them, in order, into ONE consolidated intermediate memory that will be merged again with sibling intermediate memories at the next level. Do not mention "levels" or "segments" in the output — just merge the content faithfully.

## truncatedTurnNote

[FlowJoe note: this turn was too large to include in full. The text below is a truncated excerpt of its start; treat it as an incomplete transcript of this one turn, not a full account.]

## attachmentMemoryOnlyNote

[FlowJoe note: this turn's attachment was too large to include in full for one compaction pass. The text below is FlowJoe's stored memory of that attachment, not the original file or image bytes.]

## structuredMemory
After the compacted conversation memory, append EXACTLY ONE fenced code block labeled
`flowjoe-memory-structured` containing a JSON object with string arrays "facts", "decisions",
"openQuestions", "entities" — short, durable, deduplicated items distilled from the conversation
(use empty arrays when a category has none). Put nothing after that block.
```flowjoe-memory-structured
{"facts":[],"decisions":[],"openQuestions":[],"entities":[]}
```

## sendProtectedMemories
## Protected Attachment Memories
These attachment memories are preserved verbatim by FlowJoe and were not rewritten by compaction.
They are textual memories/deconstructions, not live attachment payloads. Do not claim direct visual or file access from this block alone; say you have FlowJoe's stored attachment memory unless the current request also includes an actual image/file attachment.
If the user asks about an old/previous/last attachment and a matching protected memory is present, answer from that stored memory. Do not say the old attachment is unavailable unless the requested detail is absent from the memory; ask for reattachment only for fresh pixel/file inspection or missing details.

## rememberedItems
## Relevant Remembered Items
These are FlowJoe's stored memory items distilled from earlier in this conversation — not a re-read of the original messages, and not live image/file payloads. Use them only if they help with the user's current request; the current message takes priority. Do not claim you re-read the original turns.

## compactedMemoryPacketTitle
FlowJoe background context update: compacted memory of older turns

## compactedMemoryPacketFraming
The older turns of this conversation have been summarized to save space. Treat this as an accurate memory of what came before; the most recent turns follow verbatim.
If the compacted memory includes protected attachment memories, those are stored textual memories/deconstructions, not live image/file payloads. Do not say you can directly see an old image or read an old file from those memories alone; say you have FlowJoe's stored visual/file memory unless an actual attachment is present in the current request.
When the user asks about an old/previous/last image or file, answer from the stored attachment memory if it is present. Do not tell the user to reattach just to hear what the stored memory says; ask for reattachment only for a fresh inspection or a detail not captured in memory.
