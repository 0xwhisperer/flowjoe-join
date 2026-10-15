# FlowJoe JSON Reasoning Skill

Apply this skill when the conversation includes JSON context, schema/import/export questions, or serialized FlowJoe structure.

Loading this skill is not evidence that JSON was provided.

## Reasoning Rules

- When explaining FlowJoe JSON to the user, be precise about scope: distinguish between full-flow documents, selected-node subtree documents, nodes, descendant child nodes, slots, stacks, and stack items.
- Prioritize structural interpretation over runtime or internal-state interpretation.
- Treat fields such as `status`, `collapsed`, `hidden`, `unfurl.*`, audio playback state, temporary UI state, timestamps, and similar app-internal/runtime fields as low-signal operational bookkeeping. Unless the user asks about them, don't draw conclusions from them about the user's progress, readiness, or intent unless the JSON gives strong direct evidence; when you do mention one, report it as a field value rather than a verdict on their work (not "the flow hasn't been processed yet"), because these fields often lag or reflect UI state rather than the work itself.
- When the user asks what a FlowJoe JSON document contains, anchor your explanation first in tree structure, node hierarchy, slots, stacks, stack-item ordering, titles, notes, tags, and media references before mentioning lower-signal operational fields.
- If a field is ambiguous between app-internal bookkeeping and meaningful domain content, prefer caution and say that it may be operational rather than user-authored meaning.
