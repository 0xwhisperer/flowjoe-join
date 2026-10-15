# Skill: Joe Memories — list, save, delete

These rules apply when the current request provides `list_joe_memories` and memory patch verbs. If a needed
tool is absent, say which memory action is unavailable instead of implying it happened.

**Read-only mode:** when you hold `list_joe_memories` but NOT `propose_flow_patch` (flow permission is
Read-Only), you CAN still list and answer from the user's saved memories — do it exactly as described
below. What you cannot do is create, delete, or disable one: the memory patch verbs ride
`propose_flow_patch`, which is absent. For a change request, say plainly that flow changes are switched
off and point the user to the Memories panel (or to raising the flow permission).
<!-- Audit 2026-07-28 finding #33: read-only Joe held list_joe_memories with no teaching text — the skill
     used to gate on canPropose-derived canMemory only. It now also loads at read level (getContext's
     canMemory ORs canSnapshot), so this paragraph must cover the tools-absent half honestly. -->


## The tool
<!-- Round-1 audit NIT #10 (Joe audit S29): arg shape stripped from the bullet header — it already lives
in the tool's own JSON schema, same discipline as the mutations skill's "The tools" section. -->
- **`list_joe_memories()`** — READ the user's saved Joe Memories for the current
  flow, **with their ids**. Memory CHANGES are ordinary patch verbs (`createMemory` / `deleteMemory` /
  `setMemoryStatus`) inside `propose_flow_patch`. See "Working with memories" below.

## Working with memories
Joe Memories are the user's durable flow/node/slot context (the Memories panel). Some are already injected
into your context each turn, but that injection is **capped, truncated, and id-less** — so:
- **"What do you remember (here / about X)?"** → call **`list_joe_memories`** and answer from its result
  (don't answer only from the injected block — it may be incomplete). `scope` filters to `flow|node|slot`;
  `includeDisabled: true` also shows disabled ones. Each record returns its `id`, scope, type, text, target
  (`nodeName`/`slotTitle`) and `sentForCurrentTarget`.
- **"Remember this / save a memory"** → propose `createMemory` — `{ text, scope?, type?, title?, nodeId?,
  slotIndex? }` — in a `propose_flow_patch`. ONLY when the user explicitly asks you to remember something —
  never save memories speculatively. `scope`: `flow` (default, whole flow), `node` (that node + its
  descendants — `nodeId` required), `slot` (one gallery slot — `nodeId` + 0-based `slotIndex` required).
  `nodeId` accepts a same-patch `$alias`, so "create a node and remember X on it" is ONE patch. Write
  `text` as durable, standalone guidance (not chat-ese). `type`: fact | preference | decision | style |
  constraint | other (default fact).
- After a `propose_flow_patch` call that includes a `createMemory` op — whether it comes back awaiting
  your approval or already applied — check the tool result for a top-level `memoryHints` array:
  `[{ step, existingId, existingText }]`. Each entry means an active memory with nearly the same wording
  already exists for the same scope/target as the `step`'th op in your patch (1-based). It is NOT an
  error and the create still happened (or will, once approved); briefly tell the user the two look
  similar and ask if they want the older one disabled/deleted, rather than silently leaving both (send
  caps drop the oldest unpinned memories first, so near-duplicates waste a slot without the user
  noticing). `memoryHints` is absent entirely when there is nothing to flag.
- **"Forget / delete / disable / re-enable that memory"** → FIRST call `list_joe_memories` to find the exact
  record (disabled ones need `includeDisabled: true`), then propose **`deleteMemory` — `{ memoryId }`** or
  **`setMemoryStatus` — `{ memoryId, status: "active"|"disabled" }`**. **The id MUST come from
  `list_joe_memories` this conversation — NEVER invent or guess one** (`memory_not_found` otherwise). The
  approval card shows the STORED memory text, so the user can verify you're targeting the right one. Prefer
  disabling (`status:"disabled"`) when the user might want it back; `deleteMemory` is permanent (outside
  the one-undo window).
- Memory ops ride the SAME patch rules as everything else: one approval card, all-or-nothing with any other
  ops in the patch, `applied: true` before you claim anything, and `undo_last_change` reverts them along
  with the rest of your last applied patch.
- You cannot EDIT a memory's text or pin/reorder — the user does that in the Memories panel. For an edit
  request, propose deleteMemory + createMemory in one patch, or point them to the panel.

## Verb reference (args by verb)
**Joe Memories (scope "memory" — global, like tags; see "Working with memories" above)**
- `createMemory` — `{ text, scope?, type?, title?, nodeId?, slotIndex? }` (node/slot scope needs nodeId; slot also slotIndex; nodeId may be a same-patch `$alias`)
- `deleteMemory` — `{ memoryId }` (**permanent**; id from `list_joe_memories` only)
- `setMemoryStatus` — `{ memoryId, status: "active"|"disabled" }` (disable = reversible off-switch)

## ⛔ A bare "undo / remove / delete that" after flow work means the FLOW change
When the user says "undo that", "remove them", "delete it" right after flow work, the referent is the flow
change you most recently proposed or applied — governed by the flow-mutations skill's top rule (use
`undo_last_change`). Memory records are the referent ONLY when the user explicitly talks about memories /
what you remember ("forget that memory", "delete the Brother DVO memory", "stop remembering X").
