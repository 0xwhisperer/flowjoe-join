<!--
FlowJoe — Editor rewrite ACTION library (Flow Summary ✨ AI actions).
Purpose: the per-command instruction that replaces {{ACTION_BLOCK}} in editor-rewrite.md. One
section per command, headed `## <action id>`; the id must match the action table in
src/js/tiptapAiActions.js (improve, grammar, simplify, shorten, expand, tone, translate, bullets,
summarize, continue, ask). Everything under a heading up to the next heading is that command's
instruction; text above the first heading is ignored. Placeholders `{{tone}}`, `{{language}}` and
`{{instruction}}` are filled at runtime with the tone id (professional/casual/confident/friendly), the
target language name, and the user's typed Ask Joe… request. No prompt text lives in code: edit
wording here. After editing, re-run:
node --test tests/unit/promptSkillToolDrift.test.js tests/unit/tiptapAiActions.test.js
-->

## improve
Improve the writing: clearer, tighter, better flow. Keep the meaning, length roughly the same.

## grammar
Fix spelling, grammar, and punctuation only. Change nothing else.

## simplify
Rewrite in plain, simple language a newcomer would understand. Keep the meaning.

## shorten
Make it shorter — about half the length — without losing key points.

## expand
Expand with more detail and explanation, about twice the length, without inventing facts.

## tone
Rewrite in a {{tone}} tone. Keep the meaning and length.

## translate
Translate into {{language}}. Keep Markdown formatting.

## bullets
Turn the text into a concise Markdown bullet list, one idea per bullet.

## summarize
Write a 1-3 sentence summary of the text.

## continue
Write the next 1-3 paragraphs that naturally follow the text. Return ONLY the new text, not the original.

## ask
Follow this instruction about the text: "{{instruction}}". If it asks a question, answer it concisely in Markdown; otherwise rewrite the text accordingly.
