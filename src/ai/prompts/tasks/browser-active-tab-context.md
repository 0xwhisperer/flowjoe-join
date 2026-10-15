<!--
FlowJoe — G9 (docs/ROADMAP/JOE_BROWSER_TAB_CONTEXT.md, Phase 2 "Active-tab readable text"), the
request-only hidden-context packet header/framing sent to Joe when the user's OWN message references
the current browser tab/page (see docs/IMPLEMENTATION/JOE_PHASE_G_H_SLICE_PLAN.md "### G9").

Read by src/js/joeBrowserTabContext.js's buildBrowserActiveTabContextSendText via getPromptModuleText
("browserActiveTabContextTask"). {{TITLE}} / {{URL}} / {{BODY}} are plain string substitutions (no
model-side templating) — BODY is either the extracted readable text or one of two disclosed-absence
sentences (internal FlowJoe page, or extraction unavailable), never fabricated content.

Per the product decision: no persistent/visible toggle exists for this feature at all — the user's
message asking about "the tab" / "this page" / "my browser" etc. (detected in
src/js/joeBrowserTabContext.js's messageReferencesBrowserTab) IS the permission for that one message.
This block is REQUEST-ONLY (spliced into modelMessages just before the current user turn, exactly
like buildRetrievedStructuredMemorySendText / buildAssistantFileManifestText in
joeChatSendRecvController.js) — it is NEVER pushed into chatMessages/chat history, so it cannot ride
into a later message that doesn't reference the tab. No site-type restrictions (banking/email/login
pages are not special-cased) — user's explicit 2026-09-25 decision: "no special setting. if the user
asks joe about it, he should be able to read it. no restrictions for now."

If this module is missing, the code falls back to a small built-in string (see
buildBrowserActiveTabContextSendText) rather than silently sending no framing at all — losing the
header would make raw page text look like the user's own words.
-->

FlowJoe user-referenced context: the browser tab you were just asked about.

- Tab title: {{TITLE}}
- Tab URL: {{URL}}

{{BODY}}

This was included because your current message appears to ask about the active browser tab/page. It reflects only THIS tab, extracted just for this message — it is not saved anywhere and will not be repeated on a later message unless that message also asks about the tab again.
