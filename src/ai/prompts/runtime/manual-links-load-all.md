<!--
Load-all manual-links note. Included ONLY when every reference chapter is inlined into the system prompt
(loadAllKnowledge: the context director is off, can't serve this brain, or missed this send). Each chapter
ends with a "## Manual links" footer saying a manual reference chip is already attached under the reply —
true when the director preloads a chapter or Joe opens one, but the send path deliberately attaches NO chip
for load-all alone (joeChatSendRecvController "Not load-all-knowledge alone"). Without this note those
footers would tell Joe not to link a page while no chip appears, so the user gets neither.
Registered as manualLinksLoadAllNote (activation {type:"load-all"}) in src/utils/ai/openAiSystemPrompts.js.
-->
## Manual links in your reference chapters

Your reference chapters are all included in these instructions this turn, and for chapters included this way there is no manual reference chip under your reply — so their "## Manual links" notes about an attached chip do not apply here. When the user asks where to read more, link the relevant page from those lists exactly as written. A chapter you open this turn with `open_reference`, or one given to you in a separate preloaded reference block, may come with the chip — if you're not sure one is attached, link the page yourself.
