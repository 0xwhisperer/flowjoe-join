# FlowJoe Documents And URLs Knowledge

This knowledge module teaches Joe FlowJoe's document, code-file, and URL behavior.

Loading this knowledge is not evidence that a document, URL, website, PDF, extracted text, or code file has been provided.

## Code And Text Editor (Preview view)

Ordinary gallery text and code items open in a full **code editor** in the Preview view. Repository-owned files use a separate repository workbench. This is first-class product behavior. (Under the hood it uses the same editor engine as VS Code — mention that only if it helps set expectations; do **not** call the feature "Monaco" or lead with the engine name.)

**How the user opens it.**
- Open a text or code slot (Markdown, plain text, JSON, HTML/CSS, JavaScript/TypeScript, Python, YAML, shell, logs, config, and similar native text types).
- Use **Edit** in the preview (or the document edit path for that item).

**What the editor provides.**
- Syntax highlighting by language.
- Toolbar: theme (auto/light/dark), word wrap, undo/redo, format, find, compare against the last-saved version for this edit session, and a **more tools** menu (line numbers, minimap, show whitespace, font size, go to line, select all, copy all, download, discard changes).
- **Save** writes back to the gallery item; **Preview** returns to the readable view.

**What it is not.**
- The gallery editor has no repository tree, terminal, or separate project language-server service; repository files have the separate workbench described above.
- Not the **Rich Document**, **Spreadsheet**, or **Calendar** workbenches — those are separate islands for word-processor / sheet / schedule content. Point users at workbenches when they mean `.docx` editing, formulas, or calendars; point them here when they mean Markdown, source code, JSON, HTML, or other native text/code slots.

When the user asks how to edit code or text files in FlowJoe, first distinguish an ordinary gallery item from a repository-owned file. For repository previews, HTML and Markdown are static sandboxed views: scripts, app access, and network requests are blocked; relative CSS/images may load from the same repository within limits. They do not run Node or start a development server, and custom fonts are not promised. For gallery items, describe this **code editor** (Edit in the preview, toolbar, Save/Preview) and offer Supported Media & Slots. For repository files, describe the separate Explorer/workbench in a repo node: selecting a row opens a file tab; **Save** updates the repository working file, while committing is a separate Source Control action. A repository-backed gallery slot’s **Edit** hands off to that workbench for the exact selected stack item after unsaved notes are saved, discarded, or canceled. Offer Repo nodes and Git. Do not send a repo file to the ordinary gallery editor instructions.

## Documents

- Native text formats such as Markdown, plain text, JSON, XML, YAML, logs, HTML/CSS, common source-code extensions, and similar text files can remain editable as their original file type (via the code/text editor above).
- Many structured document formats are imported as an editable Markdown copy plus the retained original source file.
- Common Markdown-copy formats include CSV, TSV, DOCX, ODT, ODS, ODP, XLSX, EPUB, RTF, and readable Scrivener projects (when not taken over by a native workbench import path).
- The generated Markdown copy is the preferred editable/searchable representation when FlowJoe can preserve useful structure.
- The original source file is retained for provenance unless the user enables the setting to discard originals after Markdown conversion.
- PDFs stay as PDF items. Text PDFs can have search companion text, but scanned PDFs need OCR support before their page text is reliably searchable.
- When flow tools are present, Joe can add a PDF beside a picture or a note and leave the original. Audio, video, a link, and an existing PDF are not converted that way. It waits for the approval card.
- Legacy Office and iWork formats may stay as originals with search companion text when Electron/native extraction can find useful text.
- Electron mode can use native extraction and LibreOffice when available. Browser mode depends on JavaScript-readable formats and has fewer extraction options.
- The AI and Data settings can prevent Markdown-copy creation or discard retained originals after conversion.

## Document Search And Joe AI

- Gallery search has an Include document text option.
- Searchable document text can come from native text blobs, generated Markdown copies, search text companions, or lazy PDF/text extraction.
- Joe AI document analysis and gallery search are related but not identical.
- When selected for chat or analysis, PDFs may be sent to Joe as native file inputs when possible.
- Text-like files and generated Markdown copies are sent to Joe as text when selected for chat or analysis.

## URL Items

- Saved URLs become URL/link gallery items with URL metadata.
- FlowJoe decides whether to show a provider embed, a rich card, a loading card, metadata, favicon, screenshot, or fallback link presentation.
- Supported provider behavior can include common services such as YouTube, Vimeo, Spotify, Instagram, TikTok, X, Figma, Google Docs, and similar embedded/card sources.
- Electron can capture URL screenshots when available. Browser mode usually relies on Open Graph data, metadata, and favicons.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Supported Media & Slots](flowjoe-docs:gallery/slot-types)
- [Repo nodes and Git](flowjoe-docs:tree/repositories)
- [Build a Research Board](flowjoe-docs:guides/research-board)
