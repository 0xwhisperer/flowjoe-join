# FlowJoe Gallery And Media Knowledge

This knowledge module teaches Joe the baseline gallery and media model.

Loading this knowledge is not evidence that any specific gallery item, media file, document, stack, or slot content has been provided.

## Gallery Model

- Each node can have a gallery.
- A gallery is an ordered set of slots.
- A slot can hold one item or a stack.
- A stack is a group of items inside one slot, with one active/current item at a time.
- Reorder, copy, move, replace, merge, remove, stack, unstack, flatten, and extract are real gallery actions. When this request includes flow tools, Joe proposes them and they apply only after the approval card. That includes copying a slot or one stack item while leaving the original, cropping a picture in its slot, turning a picture or a note into a PDF beside the original, setting or clearing album art, coloring a canvas slot, and drawing or removing a canvas line. Without those tools, tell the user how to do it in the gallery.
- Gallery multi-select is used for bulk slot actions.
- The gallery toolbar has per-node "Collapse all" toggles for media, tag bins, and notes — each folds that part of every slot down at once and expands it back on a second click. State is per node; an untouched node always opens expanded.
- Gallery layout modes in the shipped app: canvas (infinite 2D board with pan/zoom and free slot placement; the default) and Theatre Mode (experimental immersive panoramic view — drag to look around, tap to open the normal preview, leave Theatre Mode to restore canvas). The public layout toggle cycles canvas ↔ Theatre Mode. Canvas positions stay on the slot when you leave canvas for Theatre Mode and come back.
- Canvas view state (pan/zoom, grid arrangement, last Fit, snap-to-grid, the add-card spot, and the colour filter) is saved per node and travels with the flow on export/import, not just locally.
- A slot's notes with formatting (bold, lists, links, etc.) now display that formatting at rest in canvas, matching the other layouts, instead of showing raw markdown text. Clicking into the note to edit it in canvas still opens the plain text box for now — the rich-text editor for editing gallery notes has not reached canvas yet.
- Clicking a slot opens its full-size Preview view — see the Preview cross-reference below and the Rich-Text Editing section of the app-model chapter for what the Preview notes editor can do.
- Earlier FlowJoe versions also had Horizontal (row/filmstrip), Vertical Notes (media + notes columns), and Masonry (packed multi-column wall) layouts. These are retired and no longer reachable from the layout control; do not suggest switching to them. Any saved preference for one of them now opens canvas instead.
- Gallery titles, slot titles, slot notes, tags, and media metadata are separate from the actual media/file bytes.

## Media Families

- FlowJoe supports images, audio, video, PDFs, documents, URL/link items, embeds, placeholders, and fallback file/package entries.
- Native text and code documents edit in the Preview view with a full code editor (syntax highlighting, format, find, session diff, Save/Preview). Word-processor, spreadsheet, and calendar content use separate workbench islands when those slot types apply. For detail on document/code editing, the documents-urls chapter and the Supported Media & Slots manual page are the home.
- Images, audio, video, PDFs, documents, and URL preview assets are stored by reference where possible so large bytes do not bloat the main flow JSON.
- Audio files can include extracted metadata such as ID3 data and cover art.
- Audio can be played from gallery surfaces and through the header/global audio player and playlist popover.
- Header audio controls handle common playback actions such as play/pause and track movement; playlist keyboard shortcuts mainly apply while the playlist popover is open.
- Joe can turn the header player on, play or pause immediately, and hide it (which stops the sound), with no approval card. A plain “play music” request starts the loaded queue (the target defaults to All audio nodes); if it is empty, the player starts the first accessible saved playlist in flow-map order. He can set sequential queue repeat, shuffle, repeat-one, play one audio file from a node/slot once, or play accessible audio carrying a visible user tag. He can save the current queue under a user-provided playlist name, or save audio directly from a visible tag without playing it or changing the current queue. Mood/vibe matching uses tag names or descriptions, never filenames. He can also load a requested playlist by its exact name or a node's audio. After playback succeeds, he tells the user the source name, never track titles.
- Video and audio items use custom inline media controls when rendered in the gallery.
- Fallback file/package entries may be preserved even when FlowJoe cannot preview or analyze their internal contents directly.

## Canvas Connections

<!-- Canvas-only. Every claim here is behaviour a user can verify in the app; keep it that
     way so Joe never promises something the canvas does not do. -->

- Canvas mode can draw relationship lines between slots in the SAME node's gallery. A connection is directional (A points at B) and renders with an arrowhead at the target end.
- Make one: hover a slot, drag the small round handle on its right edge onto another slot, release. A dashed preview follows the cursor and the target slot is outlined during the drag. Releasing on empty canvas cancels.
- Remove one: click the line then press Delete/Backspace (Shift/Cmd/Ctrl-click to select several); or lasso it — a selection box catches connections alongside slots; or repeat the same handle-drag on that pair, which toggles it off. Escape clears the selection without deleting.
- Deleting connections is undoable through the standard 5-second undo banner, and the undo restores exactly the removed links (not a blanket revert).
- Slot colour: right-click a slot → Slot Color (six colours + None). The colour tints the slot's EDGE and every line leaving that slot, which is what makes one branch traceable on a dense board.
- Joe can set that slot color (red, green, blue, violet, pink, cyan, or none) and can draw or remove one canvas line between two slots on the same node. Both wait for the approval card when flow tools are present.
- Show/hide: right-click the gallery background → Show Connections, alongside the other show/hide toggles. Hidden lines are removed entirely (they cannot intercept clicks), not merely faded, and the preference persists.
- Cross-node behaviour: MOVING a slot to another node severs its connections — both its own outgoing links and any pointing at it from slots left behind — and reports the count; that move is undoable and restores them. COPYING to another node does not carry connections; the copy starts unconnected and the original keeps its own.
- A connection whose target no longer exists is simply not drawn; it never breaks the slot's other connections.
- Connections and canvas positions are ordinary flow data: every export includes them and every import restores them, including entryId remapping on collision. Nothing is opt-in.

## Canvas Coordinate HUD

<!-- Canvas-only. Mirrors the same behaviour documented in mintlify/gallery/layouts.mdx and
     docs/REFERENCE/KEYBOARD_SHORTCUTS.md — keep the three descriptions in step if this changes. -->

- Moving the mouse over the canvas board (or dragging a slot) shows a small coordinate readout next to the zoom-percentage badge in the top-right corner.
- It reads "V" and "C": V is the viewport position (raw on-screen pixel location of the pointer); C is the canvas position (the slot's actual saved placement, independent of current zoom/pan).
- Hovering empty canvas shows both V and C. Dragging a single slot shows C plus how far it has moved and whether Snap to Grid is on. Dragging several slots shows the slot count and a shared movement delta instead of individual coordinates.
- This readout is optional/reference information for precise placement — nothing about ordinary canvas use depends on reading it.

## User Guidance

- If the user asks what Joe can see, distinguish app capability from request context: Joe only sees item content, extracted representations, or metadata when the user or FlowJoe's managed background context sends them.
- If this request has no flow tools, a gallery or stack change stays advice the user performs. When the tools are present, propose it. Do not say Joe cannot do a change the tools cover.
- If the user asks about unsupported or package-like files, explain that FlowJoe can store/preserve many files, but preservation is not the same as AI-readable extraction.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Gallery & Slot Anatomy](flowjoe-docs:gallery/anatomy)
- [Gallery Layouts & Slot Notes](flowjoe-docs:gallery/layouts)
- [Slot Preview](flowjoe-docs:gallery/preview)
- [Canvas Connections](flowjoe-docs:gallery/connections)
- [Adding Media & Local Files](flowjoe-docs:gallery/adding-media)
- [Supported Media & Slots](flowjoe-docs:gallery/slot-types)
- [Media Stacks](flowjoe-docs:gallery/stacks)
- [Global Audio Player & Soundtrack](flowjoe-docs:gallery/audio-player)
