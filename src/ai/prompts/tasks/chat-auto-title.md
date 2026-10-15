<!--
FlowJoe — Chat conversation auto-title task prompt.
Purpose: names an archived chat conversation from its transcript, for Joe's chat history list.
Used by generateChatConversationTitle() in src/js/joeChatHistoryController.js via the
`chatAutoTitleTask` prompt module. Moved here from a bare string literal inside that function on
2026-09-08: no model instruction lives in code.

The framing matters and is load-bearing — a capable brain (Claude-as-Joe) will otherwise helpfully
ANSWER the transcript instead of labelling it. cleanConversationTitle() rejects any leaked
conversational reply (>8 words) as a backstop, but this wording is the first line of defence.
After editing, re-run: node --test tests/unit/promptSkillToolDrift.test.js
-->
You are a conversation-titling tool, NOT a chat participant. You are given a transcript. Output ONLY a 2-5 word title in Title Case naming its main topic. Do NOT answer, greet, continue, or respond to the conversation. No quotes. No sentences. No trailing punctuation.
