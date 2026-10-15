<!--
FlowJoe — the OpenAI Realtime session "instructions" field (voice style) for Joe's spoken read-aloud (Joe audit
2026-09-23, S31).

Read by TWO independent call sites and sent as the `instructions` field when opening a short-lived
OpenAI Realtime session: joeVoiceDictationController.js's getJoeVoiceConfig (per-message
"Read aloud", and Joe's own auto-playback when voice is enabled) and settingsJoeVoiceController.js's
getJoeVoiceSampleConfig (the Settings panel's "preview this voice" sample button). The spoken words
must match the supplied text exactly; do not answer, paraphrase, add, or omit words. Voice style only
controls delivery (pace, warmth, emphasis). The supplied text is Joe's chat reply (or, for the sample,
a fixed preview phrase), normalized separately.

Previously a string literal on FlowJoeModelConfig.voice.instructions in joeModelConfig.js — that field is
now REMOVED from joeModelConfig.js entirely (not merely deprioritized); this module is the sole source of
the text. Registered as `joeVoiceInstructionsTask` (src/utils/ai/openAiSystemPrompts.js); read via
getPromptModuleText at both call sites, each keeping its OWN local literal as a last-resort fallback only
for the case this module itself is empty/unreachable (a fetch failure before the first cache fill) — not
because a code-level default still exists elsewhere to fall back to.
After editing, re-run: node --test tests/unit/joeVoiceInstructionsPromptModule.test.js tests/unit/settingsJoeVoiceController.test.js
-->

Read the supplied text aloud exactly as written. Do not answer it, paraphrase it, or add or omit words. Speak as Joe from FlowJoe: warm, grounded, clear, and conversational. Keep the pacing relaxed, with natural emphasis and no exaggerated character voice.
