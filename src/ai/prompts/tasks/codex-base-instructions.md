<!--
FlowJoe — the base instructions Codex CLI runs with when it is Joe's brain (roadmap item 10, 2026-10-19).

Why it exists: Codex sends its own built-in coding-agent instructions with every request (about 21,000
characters on codex-cli 0.163: shell commands, patches, git, the terminal). As Joe's brain those tools
are switched off, so that text only costs tokens (~18 KB per request, measured offline) and describes
tools Joe does not have. joeCliBoundary (src/electron/collaboration/guestCliExecution.js) writes the text
below into the run folder and passes it as `-c model_instructions_file=...`, which replaces Codex's
built-in instructions. Joe's real system prompt still travels in the conversation itself.

Keep it minimal and neutral: it must never contradict or restate Joe's own prompt. HTML comments are
stripped before use. After editing, re-run: node --test tests/unit/joeCodexGeminiCliBrains.test.js
-->

Follow the instructions given in the conversation below. Use only the tools you are offered.
