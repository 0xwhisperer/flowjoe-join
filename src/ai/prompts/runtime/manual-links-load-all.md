<!--
Load-all note. Included ONLY when every reference chapter is inlined into the system prompt (loadAllKnowledge:
the context director is off, can't serve this brain, or missed this send).
Since 2026-10-20 (owner choice C, JOE_PROMPT_CONTEXT_ARCHITECTURE.md) the inlined chapters are the short
generated digests, not the full manual pages, so this note says so and points Joe at open_reference for the
full chapter. It never claims the tool exists: guest API prompts and Antigravity outside macOS also take
the load-all path without it, so the pointer is conditional ("when you have it").
It also keeps its original job: each chapter ends with a "## Manual links" footer saying a manual reference
chip is already attached under the reply — true when the director preloads a chapter or Joe opens one, but
the send path deliberately attaches NO chip for load-all alone (joeChatSendRecvController "Not
load-all-knowledge alone"). Without this note those footers would tell Joe not to link a page while no chip
appears, so the user gets neither.
Registered as manualLinksLoadAllNote (activation {type:"load-all"}) in src/utils/ai/openAiSystemPrompts.js.
-->
## Reference chapters in these instructions

Every FlowJoe reference chapter is included in these instructions this turn as a short digest of the user manual, not the full chapter. When a digest does not settle a question about how FlowJoe works and you have the `open_reference` tool, call it for that topic and answer from the full chapter; do not guess app behavior you can check that way.

For chapters included this way there is no manual reference chip under your reply, so their "## Manual links" notes about an attached chip do not apply here. When the user asks where to read more, link the relevant page from those lists exactly as written. A chapter you open this turn with `open_reference`, or one given to you in a separate preloaded reference block, may come with the chip — if you're not sure one is attached, link the page yourself.
