<!--
FlowJoe — the one-line prompt an Antigravity run is given when its whole request had to move into the
run's agent file (2026-10-19).

Why it exists: agy 1.4.2 cuts a --print prompt at about 190,000 characters and drops the rest (live: a
502,107-character prompt reached the model as its first 191,340 characters, losing the user's message at
the end), while the agent file is read whole (live: a 257,511-character body, read to its last line).
splitAgyPrompt (src/electron/joeBrainClaudeMain.js) keeps a chat's newest message in --print; when that
text is still too long, or the request is not a chat turn and is too long (compaction of a long chat),
the whole request goes into the agent file after Joe's instructions and --print carries only the text
below.

Keep it neutral and short: it must not restate or contradict Joe's own prompt. HTML comments are
stripped before use. After editing, re-run the "owner Antigravity" tests in
tests/unit/joeBrainStopAndPermissions.test.js.
-->

Your complete request is at the end of your instructions. Carry it out exactly as written there.
