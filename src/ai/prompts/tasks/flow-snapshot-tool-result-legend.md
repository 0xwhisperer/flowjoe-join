<!--
FlowJoe — the reading guide that heads every SUCCESSFUL get_flow_snapshot tool result.

The result used to be the raw JSON snapshot. It is now rendered in the flow map's line format (see
src/shared/flowSnapshotText.cjs) so the same facts cost fewer tokens: every field is still there, only the JSON
keys, braces and quotes are gone. This guide travels INSIDE the tool result (a task module: it never joins the
system prompt or the cached prefix), so it is correct whether or not the map is in context, and for a scoped or
rootId read.

Read by src/utils/ai/flowMutationTools.js (buildToolTurnInputItems, registry key flowSnapshotToolResultLegendTask)
and by src/electron/mcpBridgeMain.js for Joe's own CLI-brain run. If this module is missing the code returns the
JSON snapshot unchanged rather than an undocumented format, and never substitutes wording of its own.
Error and refusal results (target_not_found, unchanged_since_last_snapshot, ...) stay JSON.
After editing, re-run the flowSnapshotToolText unit test file.
-->

Flow snapshot, in line format (same as the flow map). One line per node, indented by depth: - <nodeId> "name" [status] then key:value fields. Strings with spaces are JSON-quoted (\n is a newline); a bare key (frozen, hidden, collapsed) is a true flag. A node's slots follow it as s1, s2, ... and a stack's items as i1, i2, ...: labels are 1-based but every tool argument (slotIndex, itemIndex) is 0-based, and so are the printed values active, idx and masterSlotIndex, so s3 is slotIndex 2. [id] is the FULL entryId: pass it as-is wherever a tool takes an entryId. A slot line with (n) is a stack of n items (active:K is the shown item); a sealed stack shows only the bare word stack; no (n) means a plain slot, so omit itemIndex. parent: and idx: appear only when the parent or sibling position is not already implied by indentation and order. tags:<ids> are tag ids; the tags: section is the tag dictionary (id, name, and color/description when set). A node marked (private — sealed) or (hidden from Joe) is an opaque box: name and place only. A missing field means the node/slot does not have it.
