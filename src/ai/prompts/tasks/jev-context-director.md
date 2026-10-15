<!--
  Jev (TypeSafe System One) form of the Context Director questions.

  This is the SAME job as tasks/context-director.md, asked in Jev's native shape: independent
  typed questions answered in parallel against one shared state, instead of one LLM producing a
  JSON object. Measured 2026-09-18 on tests/fixtures/contextDirectorCorpus.js (46 cases):
  100% accuracy / 100% recall / 0% false fire on `editing`, stable across 3 consecutive runs,
  ~186ms median vs ~1360ms for the gpt-5.6-luna director.

  🚨 THE ONE RULE THAT EARNED THE 100%: when two signals can BOTH be true of one message, the
  criteria must say WHICH ONE OWNS THE OVERLAP. The first draft scored 95.7% purely because
  "every morning add today's headlines to this node" is genuinely an edit AND a schedule, and the
  question never said how to resolve that. Naming the boundary in criteria.false fixed it.
  Do not remove the "RIGHT NOW" / "makes changes later rather than now" language — it IS the fix.

  Threshold: 0.5 (the middle of the 0.4–0.6 band that held 100%, so it is not perched on a cliff).

  After editing: re-run `node scripts/jevDirectorBaseline.js` and compare against
  `node scripts/directorBaseline.js`. Keep recall at 100% — a MISS means Joe answers an edit
  request without the editing rulebook attached, which is the user-visible failure this exists to
  prevent. A false fire only attaches an unneeded rulebook and is cheap.

  Parsed by src/utils/ai/jevContextDirector.js. Sections are delimited by the ## headings; the
  parser reads them by name, so renaming a heading breaks the binding.
-->

## appContext

The user is talking to Joe, the assistant inside FlowJoe — a visual workspace with a TREE of NODES (a nestable outline); the selected node has a GALLERY of SLOTS, where a slot holds one item (image / video / URL / document) or a STACK of items. The user also has TAGS, durable JOE MEMORIES (notes Joe keeps across chats), and can SCHEDULE recurring background tasks.

## editing.instructions

Does this message ask to change the flow's structure or content RIGHT NOW? Judge the INTENT, not the exact words — typos and loose phrasing are fine.

## editing.true

It asks to add / remove / rename / move / merge / split / replace / reorder / sort / stack / duplicate / undo a node, slot, stack item, or tag, as an immediate action.

## editing.false

It is a question, a request for advice, general chat, OR it asks to SET UP A RECURRING / SCHEDULED task that would make changes later rather than now ('every morning…', 'weekly…', 'automatically…') — those are scheduling requests, not edits. When unsure, false.

## scheduling.instructions

Is this message about a RECURRING or SCHEDULED background task?

## scheduling.true

It asks to create / change / pause / enable / list a schedule. Cues: 'every morning', 'daily', 'each week', 'schedule a task', 'run it automatically'.

## scheduling.false

It is a one-off request or unrelated to scheduling. When unsure, false.

## memory.instructions

Does this message ask Joe to REMEMBER, FORGET, or change what he durably remembers (a Joe Memory kept across chats)?

## memory.true

It asks Joe to remember / forget / keep in mind / note for next time. Cues: 'remember that…', 'forget…'.

## memory.false

It does not ask Joe to store or erase anything durable. Asking Joe what he already knows about something is NOT a memory command. When unsure, false.

## conversationRecall.instructions

Does answering this message require recalling something the user or Joe already said EARLIER IN THIS SAME CHAT?

## conversationRecall.true

It refers back to the conversation so far — a prior decision, a fact already stated, or where things were left off. Cues: 'remind me', 'earlier', 'so far', 'catch me up', 'where did we leave off', 'what did we decide'.

## conversationRecall.false

It is a brand-new question that stands on its own with no reference to earlier turns. This is NOT the same as asking Joe to remember something durably. When unsure, false.

## webSearch.instructions

Does answering this message require EXTERNAL, current, web-sourced facts?

## webSearch.true

It needs news, prices, real-world or up-to-date information from the internet, or explicitly asks to find something from the web.

## webSearch.false

It is about FlowJoe itself, the user's own flow (their nodes, slots, counts), arithmetic, or general conversation — all of which come from local context, never the web. When unsure, false.

## flowStructure.instructions

Does answering this message need the MAP of the user's flow — the other nodes and how they nest?

## flowStructure.true

It asks about the shape of the flow, other nodes, where something sits, how things are organized, or requires looking beyond the currently selected node.

## flowStructure.false

It is general chat, or a question about the current slot or current node only. When unsure, false.
