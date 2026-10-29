<!-- Model-facing text of the request-only app-context blocks spliced next to the user turn (joeChatSendRecvController.js and the builders it calls). One ## section per string; {{name}} marks a value filled by code (appContextBlocks.js). Text is trimmed per section; leading or trailing spaces, line joins and field punctuation stay in code. A missing section omits its block. -->

## memories-header

FlowJoe background context update: Joe Memories

## memories-intro

These are user-saved FlowJoe Memories selected for the current request because their scope applies. Treat them as durable, high-priority user guidance and project context. Use them to shape the response even when they are not repeated in the visible chat. Do not list, restate, or repeat them back unless they are directly relevant to what the user asked, or the user explicitly asks what you remember.

## datetime-heading

FlowJoe background context update: current date and time

## datetime-local

- Current date & time on the user's computer: {{local}} ({{zone}}).

## datetime-utc

- The same instant in UTC: {{utc}}.

## datetime-use

- This is the real current time as of this message — use it when asked the date or time, and convert to any timezone the user names (e.g. UTC-6) from these values. Never guess or invent the time.

## datetime-recurring

- For a recurring task that should show a LIVE clock/date, each scheduled run is given its OWN fresh current time, so the task instruction (not this chat value) is what produces the time at run time.

## flow-totals-branch

the leading totals line is authoritative for THIS BRANCH ONLY — it does NOT cover the whole flow, read it, do NOT recount

## flow-totals-whole

the leading 'Flow totals' line is authoritative for WHOLE-FLOW count questions — read it, do NOT recount

## flow-complete-scoped

This is a SCOPED map (current branch only, see the disclosure line at the top) — it is complete for the branch it shows, never truncated within that branch, but it does NOT cover the whole flow. Call get_flow_snapshot with no rootId if you need the whole tree.

## flow-complete-ranked

This map is RANKED BY RELEVANCE to the user's message: it shows {{shown}} of the flow's {{total}} nodes — the ones most likely to matter for this question, plus the parents they hang from, plus any nodes the ranker could not score (unscored nodes are kept, never dropped). It is NOT the whole flow and NOT a truncation. A node you cannot see here still EXISTS; it was judged less relevant to this message, so never tell the user a node is missing or absent on the strength of this map. Call get_flow_snapshot with no rootId whenever a question needs the whole tree, or when a node the user mentions is not listed here.

## flow-complete-full

The map is COMPLETE and never truncated.

## flow-structure-heading

FlowJoe background context update: flow structure (target nodes by id; {{totals_scope_note}}. PER-NODE counts are on each node line: slots:N (gallery slots), stacks:N (slot slots that are stacks), stackItems:M (ALL items across that node's stacks). For 'how many stack items in THIS node' read that node's stackItems:M — never the current slot's count, and never sum by hand. A NODE is the whole node; the current SLOT is just one slot inside it. Locked Private and Hidden from Joe nodes are redacted; an unlocked owner can use Private content through normal Joe actions. LAYOUT — read the INDENTATION, it carries the whole hierarchy: two spaces per level. A node at column 0 is a root; a node indented one level deeper than the node above it is that node's CHILD; nodes at equal indentation under the same parent are siblings. That is why lines carry no parent: or depth: field — the position already states both, so never say a node's parent, depth, or place is unknown. Under each node, indented one level deeper, are its SLOTS as '- s<n> "title" [entryId] (itemCount)', and under a stack slot, one level deeper again, its ITEMS as '- i<n> "title" [entryId]'. The s/i prefix tells them apart from child NODES, which sit at the SAME indentation but start with a node id — a line is a child node if it starts with an id, a slot if it starts with s<number>, an item if it starts with i<number>. The number after s/i is that slot's/item's 1-based position in its parent, and the bracketed value is a SHORT FORM of that slot's/item's stable entryId — the last 12 characters of it. Pass the short form straight through as slotEntryId/itemEntryId (or any *EntryId arg): it resolves exactly like the full id, and it is stable (it is part of the id, not a position). A short form is unique WITHIN ONE NODE for slots, and within ONE STACK for items (that is the scope the resolver checks), so two slots on DIFFERENT nodes can display the same short form without being the same slot — never merge two lines on the strength of a matching short id alone; the owning node is what distinguishes them. If get_flow_snapshot hands you a FULL entryId on THAT node ending with the short form you see here, it is the same slot. In the rare case a short form is not unique within its node the patch fails cleanly with ambiguous_slot_id; recover by calling get_flow_snapshot with includeGallery:true (that flag is what returns each slot's full entryId — without it you get no ids) and passing the full id instead. SIBLING ORDER IS THE LINE ORDER: nodes at the same indentation under the same parent appear top-to-bottom in their real tree order, so you can reorder them (alphabetically or otherwise) with moveNode/moveNodes using position before/after and a sibling's id. {{completeness_note}} An ancestor-branch line (marked '(ancestor branch, not expanded in this scoped view)') is a real node in the tree — visible, editable, not sealed — just not expanded in today's scoped view; it is a completely different thing from a private/hidden-from-Joe redacted node.)

## manifest-files-header

[Hidden context — files the user has handed you in this session. Image files ride alongside this
message as real attached pictures — look at them directly, no extra step needed. Non-image files
(pdf/document/audio/video) you can NOT see the contents of, only these handles. To add ANY of them
to the flow (images included): stage_media({ nodeId: "<destination-node-id>", attachmentId: "<id>", kind: <kind for its MIME —
image/pdf/document/audio/video> }), then place the returned entry with a propose_flow_patch op
(addImageSlots / insertEntriesIntoStack). Use the nodeId for the node where the file will be placed.
Never invent ids; never ask the user to re-upload or paste file contents. An id marked 'you've already
seen this one' has its description on the message it was first shown on, not here. If the user references
an earlier image and more than one is in play, don't guess which — ask which one they mean using what
you remember of each, then use its id.]

## manifest-generated-header

[Hidden context — images you already GENERATED in this chat (most recent first; still stored and
placeable WITHOUT regenerating). Place one with a propose_flow_patch add-verb whose entries item
is { "src": "<key>" } — use these EXACT keys, never retype or invent one.
If a placement fails with missing_blob, that image is genuinely gone: SAY SO and offer to
regenerate. Never regenerate silently and report it as the placement the user asked for —
they approved a specific picture and would receive a different one without being told.]

## browser-truncated

[Readable text truncated to FlowJoe's per-message size cap.]

## browser-internal

This tab is FlowJoe's own internal start page, not a real web page, so there is no external page content to read here.

## browser-unreadable

The page's readable text could not be extracted for this message (unsupported page type or a live read failure) — you have only the title/URL above for this tab.

## browser-empty

The page appears to have no readable text content.

## appstate-label

[App-provided state for Joe, not typed by the user]

## shared-conversation

[Shared conversation context: This is one conversation shared by {{authors}}. User messages are labeled with their author's name. Continue the discussion across participants and answer the person who sent the latest message.]

## manifest-recovery

— you've already seen this one; for a fresh look call read_chat_attachment({ attachmentId: "{{id}}" }).

## manifest-stage-kind

— stage with kind "{{kind}}"

## manifest-unknown-type

unknown type

## browser-readable

Readable text from the page:

## browser-untitled

(untitled)

## browser-unknown-url

(unknown)

## reference-intro

The following FlowJoe reference is relevant to this message and has been loaded for you (no need to call open_reference for these topics):

## reference-block-header

[FlowJoe reference — {{label}}]

## reference-label-manual

{{topic}} — from the user manual{{partial}}

## reference-label-partial

(partial; not included: {{topics}})

## reference-label-summary

{{topic}} — summary
