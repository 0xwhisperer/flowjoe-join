<!--
  Jev (TypeSafe System One) questions that pick which GROUPS of Joe's tools a user message needs.
  The always-present core group (read/search/select/open + request_tools) is not asked about.

  One independent `noul` question per non-core group, answered in parallel against one shared
  state {user_message}. Selection is biased to INCLUDE: the caller uses a LOW threshold, because a
  false fire only attaches unneeded tools while a miss withholds a tool Joe needed.
  Every `.false` ends with a bias toward "when unsure, true" for the same reason -- note this is the
  OPPOSITE of the context director, whose false fires cost a rulebook; here a miss costs a tool.

  Measure with: node scripts/jevToolGroupsEval.mjs   (corpus: scripts/jev-evals/tool-groups.json)

  Parsed like jev-context-director.md: "## appContext" and "## <id>.instructions|true|false".
  The user message may be in ANY language, and may be a short follow-up that leans on the earlier
  conversation ("do the same for the next one", "yes go ahead"): judge what the request most
  plausibly needs, and when a follow-up could continue any kind of work, answer true.
-->

## appContext

The user is talking to Joe, the assistant inside FlowJoe — a visual workspace with a TREE of NODES (a nestable outline); each node has a GALLERY of SLOTS holding images, audio, video, documents, URLs or embeds. Joe answers by calling tools. The message may be in any language and may be a short follow-up that depends on the earlier conversation. You are deciding whether Joe will need a particular group of tools to handle it.

## edit.instructions

Will Joe need to CHANGE the flow or the app to handle this message? That means writing, renaming, moving, deleting, reorganizing, tagging or summarizing-into nodes, slots, notes or titles, undoing a change, opening an app workflow, or asking the user for a file.

## edit.true

The message asks Joe to add, write, put, save, rename, move, merge, split, reorder, delete, tag, fill in or update anything in the flow (including notes, summaries or titles), to undo something, to set up or change a schedule, or to do something that ends with its result placed into the flow. A short go-ahead ('yes do it', 'same for the next one') that may continue such work counts. When unsure, true.

## edit.false

It is only a question or a request to read, explain, find, list or summarize — with nothing to be written or changed in the flow. Greetings and general chat also count as false.

## media.instructions

Will Joe need to work with the actual MEDIA of the flow — audio, video, images, pictures — to handle this message?

## media.true

It asks to transcribe or listen to audio or video, to generate, create or draw an image, to look at, describe, compare or find pictures, to stage or import media into the flow, to read what is inside an image or video, or to play, pause or control playback. A follow-up that may continue such work ('and the next one too') counts. When unsure, true.

## media.false

It does not involve images, audio or video at all: it is about text, structure, notes, scheduling, memory or general chat.

## schedule.instructions

Will Joe need to look at or manage SCHEDULED or RECURRING automatic tasks to handle this message?

## schedule.true

It mentions a schedule or recurrence: every morning, daily, weekly, 'remind me at 5pm', 'run this automatically', or asks what is scheduled, to pause, change, enable or remove a scheduled task. When unsure, true.

## schedule.false

It is a one-off request happening now, with no recurring or timed element.

## memory.instructions

Will Joe need to look at his saved memories, earlier chat history, or files attached to a chat to handle this message?

## memory.true

It EXPLICITLY refers to a past conversation or to saved memory ('what did we discuss last week', 'what did I tell you about…', 'what do you remember about me'), asks Joe to remember or forget something for the future, or mentions a file or image attached to the chat. Ordinary short follow-ups ('yes', 'do the same for the next one') are NOT memory requests: the current conversation is already in front of Joe.

## memory.false

It stands on its own, or is a follow-up inside the current conversation, and concerns the current flow or general chat; no past chat, saved memory or attachment is named.

## devtools.instructions

Will Joe need to read the user's BROWSER TAB, TERMINAL, or a code REPOSITORY (including GitHub) to handle this message?

## devtools.true

It asks about a web page the user has open, about terminal or command-line output or an error there, about a code repository, its files or commits, a GitHub repo, a pull request or a bug in code. When unsure, true.

## devtools.false

It is not about code, a terminal, a repository, or a live web page — only about the flow's own content or general chat.

## delegate.instructions

Will Joe need to hand work to a BACKGROUND helper — a long independent research task or an independent review — to handle this message?

## delegate.true

It asks Joe to research something in depth or in the background, to investigate a topic and report back later, to get an independent or second-opinion review of a plan, text or change, or to check on or cancel such a background job. When unsure, true.

## delegate.false

It can be answered directly in the conversation without a separate long-running or independent job.
