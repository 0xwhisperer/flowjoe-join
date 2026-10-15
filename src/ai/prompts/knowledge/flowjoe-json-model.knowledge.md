# FlowJoe JSON Model Knowledge

This knowledge module teaches Joe FlowJoe's serialized JSON model.

Loading this knowledge is not evidence that JSON was provided.

## Serialized JSON Structure

- Treat FlowJoe JSON as an importable document model, not an ad hoc debug dump.
- The canonical import/export document wrapper uses fields like `json_file_version`, `data_schema_version`, `treeName`, `tags`, and `roots`.
- A selected-node export or "Current node + child nodes JSON" is the same document shape, but with one selected subtree in `roots`.
- Rebuildable tree structure lives in the normal schema fields, especially `roots`, node `children`, node `images`, stack-slot `images`, and `activeIndex`.
- In serialized JSON, a node's descendants are only what appears recursively under that node's `children`.
- In serialized JSON, a node's slots are what appears in that node's `images` array, in order.
- In serialized JSON, a stack is a slot object whose own `images` field contains stack items in order.
- If selected-node or subtree JSON is shared, it does not include parents, sibling branches outside the subtree, or the rest of the flow unless those structures appear in `roots`.
- "Selected item JSON" contains only the selected item metadata.
- "Current stack JSON" contains the current slot/stack metadata and its items.
- "Current node JSON" is a selected-node document for the current node with child nodes removed. It can include that node's summary, slots, stacks, and items, but no descendants.
- "Current node + child nodes JSON" includes the current node plus recursive child nodes.
- None of these JSON modes include parents or siblings unless those structures are explicitly present in the provided JSON.
- Chat JSON attachments are scrubbed before sending: blank strings, nulls, empty arrays/objects, raw blobs, data URLs, UI-only helper fields, and circular parent/tree references are omitted. Two never-populated session blocks are omitted too: an `audioPlayback` whose settings are all false (no playback preference was ever set), and an `unfurl` link-preview skeleton that was never fetched (`status: "idle"` with no title, description or image). A populated one of either rides in full — with one exception inside `unfurl`, below — so their absence means "unset", never "hidden". The exception: a populated `unfurl` keeps its `error`/`screenshotError` key but its text is replaced with `(a fetch error was recorded — details not shared)`, because the raw message can name a local file path or a private hostname. It means the app could not build a full preview (or could not capture a screenshot) — the link itself may open perfectly well, and often does. Do not tell the user the link is broken or dead, and do not speculate about the cause.
<!-- The two session-block rules were added 2026-09-21 alongside the prune in sanitizeChatJsonValue
     (joeChatContextService.js). This bullet is a promise Joe is given every chat — if the scrub
     rules change again, this line MUST change with them or Joe reasons under a false guarantee.
     Deliberately NOT adopting the export compactor's blanket false/0 dropping: it deletes whole
     stack items and shifts itemIndex, and Joe targets stack items by index. -->

- FlowJoe helper metadata is namespaced under `_flowJoeMeta`. Use it as interpretive guidance, but never as the authoritative source of structure if the core schema fields disagree.
- `_flowJoeMeta` is ignored by import. It exists to clarify entity type, node path/depth, slot numbering, stack ordering, JSON origin, and related context.
- Packaged `.fj` exports can include binary media payloads. JSON shared in chat may be structurally complete while still excluding packaged media blobs. "Minus blobs" means structure and media references are present, but binary payloads are excluded.
