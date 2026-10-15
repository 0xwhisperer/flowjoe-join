<!--
  Jev (TypeSafe System One) relevance scoring for Joe's automatic flow map.

  WHAT THIS IS FOR. When the user turns "Limit map to my location" OFF on a large flow, every send
  carries the whole tree. This scores each node against the user's message so only the most
  relevant ones are kept. It is NOT a replacement for that toggle — scoping is a DELIBERATE choice
  (the user picks a branch); this is AUTOMATIC (relevance picks for them). Both exist.

  🚨 THE 42% FINDING — DO NOT SHIP A HARD THRESHOLD. Measured 2026-09-18: a node titled
  "Setting: the lighthouse" scored 0.42 against a lighthouse-keeper question — genuinely relevant,
  and a 0.5 cutoff would have binned it. Confirmed at scale 2026-09-21 on a real 270-node flow
  (10 questions x 270 nodes): a 0.5 cutoff loses 46% of labeled-relevant nodes, and the 0.30-0.60
  band is a coin flip (49.2% of 528 borderline pairs are relevant). There is NO natural gap in the
  distribution to cut at. RANKING, however, is strong — the correct branch scored top on 10/10
  questions at 0.95-1.00 and survived keep-top-20/40/60 every time.
  => The consumer keeps the TOP N by score until a budget fills. It must never apply a cutoff.

  🚨 CONTAINERS SCORE LOW ON THEIR OWN TITLES. "Armchair" scored 0.04 while its children scored
  high. Without an ancestor-path rule, up to 17 of 40 kept nodes arrived as ORPHANS. Keeping a node
  means keeping its parents — that is the consumer's job, not this prompt's, but the scoring
  behaviour is WHY the rule exists. Do not "fix" low container scores by rewording this prompt to
  reward parents; a container genuinely is not the relevant node, its child is.

  Failure contract: any null/partial/errored answer means the FULL, UNFILTERED map is sent. The
  filter may only ever remove nodes on a real answer. Degrade to MORE knowledge, never less.

  🚨 THE WHOLE-FLOW ESCAPE HATCH. Some questions cannot be answered from a subset at all: counting
  ("how many nodes are under Projects?"), surveying ("what am I not making progress on?"), and
  absence ("do I have anything about X?" — a filtered map cannot distinguish "not in your flow"
  from "not in this map"). The ## wholeFlow* sections below ask Jev that as a SEPARATE question in
  the SAME call, and a true answer skips filtering entirely. This is the same fix that took the
  context director from 95.7% to 100%: when two readings of a message compete, say which one wins
  rather than hoping the model guesses the convention.

  MEASURED ON THIS SHAPE (2026-09-21, live api.typesafe.ai): 274 nodes in one call, 150,292 chars →
  38,294 input tokens, HTTP 200 in 908ms. Asked "what did I decide about the lighthouse keeper's
  backstory?" against a tree of three unrelated branches, it kept 41 nodes — 39 from the novel
  branch plus its 2 ancestors, and ZERO from the other two. Top five all "Keeper backstory" at 0.95;
  the whole-flow question correctly answered 0.09. 🚨 The app context and both criteria live in the
  SHARED state, not in each question — repeating them per node was ~90% of the request body and put
  a 270-node flow over TypeSafe's 64k limit. If that structure changes, RE-MEASURE: an accuracy
  figure taken on one request shape does not transfer to another.

  Parsed by src/utils/ai/jevFlowRelevance.js. Sections are delimited by the ## headings; the parser
  reads them by name, so renaming a heading breaks the binding.
-->

## appContext

The user is talking to Joe, the assistant inside FlowJoe — a visual workspace with a TREE of NODES (a nestable outline); the selected node has a GALLERY of SLOTS, where a slot holds one item (image / video / URL / document) or a STACK of items. Each node has a title, and may have a short summary. A node is often a CONTAINER whose own title is generic ("Projects", "Imported Files") while the specific material lives in its children.

## instructions

Would this node's contents plausibly help answer the user's message? Judge by TOPIC OVERLAP, not by wording — the user will not use the node's exact words. Score generously at the low end: a node that is merely POSSIBLY relevant should still outrank one that is clearly unrelated.

## criteriaTrue

The node's subject matter overlaps what the user is asking about — it names the same thing, is part of the same project or story, holds the same kind of material, or is a container whose children plainly cover that subject. A node the user would be annoyed to find missing from the answer.

## criteriaFalse

The node belongs to an unrelated area of the user's life or work — different project, different subject, no shared material. Administrative or archival nodes are NOT automatically irrelevant; they are irrelevant only when the message is about something else entirely. When genuinely unsure, lean slightly TRUE — a kept-but-unneeded node costs a few tokens, while a dropped-but-needed node makes Joe answer without knowing something the user expected him to know.

## wholeFlowInstructions

Does answering this message require seeing the user's ENTIRE flow, rather than just the parts related to its topic?

## wholeFlowCriteriaTrue

It asks to COUNT or TOTAL anything ("how many nodes", "how many are done"), to SURVEY or REVIEW the whole flow ("what am I neglecting", "give me an overview", "what's left", "summarise my flow"), to FIND or CHECK WHETHER something exists ("do I have anything about X", "is there a node for Y", "where did I put Z") — a search cannot report an absence from a partial list — or to compare, sort, or reorganise across the flow. Also true when the message names no particular topic at all, so there is nothing to narrow toward.

## wholeFlowCriteriaFalse

It is about one identifiable subject, place, or piece of work, and the parts of the flow unrelated to that subject could not change the answer. Ordinary conversation, advice, and questions about the node the user is looking at are all false. When unsure, lean TRUE — sending the whole flow costs some tokens, while answering a counting or absence question from a partial map produces a confidently WRONG answer the user has no way to spot.
