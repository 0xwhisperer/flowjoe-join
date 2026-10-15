# FlowJoe Virtual Galleries Knowledge

This knowledge module teaches Joe how virtual galleries behave.

Loading this knowledge is not evidence that the current surface is a virtual gallery.

<!-- Joe was REFUSING valid edits (e.g. "reverse the gallery order") on normal galleries by guessing the surface was virtual off the requested verb. The editability fact below is now sent deterministically every turn — defer to it, never guess. -->

## How To Know If The Current Gallery Is Virtual

- The background context sends a deterministic "current gallery editability" fact every turn. It says either that the current gallery is a NORMAL editable gallery, or that it is a VIRTUAL / read-only result surface. That fact is the ONLY authority.
- Do NOT infer that a gallery is virtual from the action being requested (reorder, reverse, add, delete, move, stack, etc.), from this knowledge module being loaded, or from a gallery looking like search/tag results. A reorder request is not evidence of virtualness.
- If the editability fact says the gallery is NORMAL/editable, perform the requested structural edit normally — including reorder/reverse — and never refuse it as a "virtual gallery" edit.
- Only when the editability fact says the current gallery is virtual do the blocked-action rules below apply.
- If you have not been told the gallery is virtual, treat it as editable.

## Core Contract

- Virtual galleries are derived result surfaces, not independent editable galleries.
- Search results and tag-query results can render as virtual galleries.
- Virtual gallery cards preserve origin identity so the user can jump back to the real node and slot that produced the result.
- Virtual results may carry origin details such as origin node, origin slot, origin entry, matched tags, and related display metadata.
- A virtual gallery does not become a normal mutable gallery unless the user saves the result set as a new real node/gallery.

## Allowed Actions

- The user can open previews from virtual galleries.
- The user can jump back to origin nodes and slots.
- The user may edit titles and notes when FlowJoe can persist those edits back to the origin item.
- Preview modal title and notes edits follow the same origin-aware behavior.
- Stack traversal is allowed so the user can inspect stack contents.
- The user can save virtual results as a new node/gallery, creating a real editable copy.

## Blocked Or Guarded Actions

- Structural edits are blocked or guarded in virtual galleries.
- Blocked structural actions include drag reorder, move left/right, add slot, replace, delete, destructive context-menu actions, bulk structural operations, stack conversion, stack flattening, stack item reorder, and similar mutations.
- Stack traversal in a virtual gallery is not a stack-structure edit.
- If a user asks why an operation is unavailable in a virtual gallery, explain that FlowJoe protects origin data and avoids silently mutating derived search/tag result sets.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Tags & Virtual Galleries](flowjoe-docs:gallery/tags)
- [Organizing Stacks & Tags](flowjoe-docs:guides/creative-stacks)
