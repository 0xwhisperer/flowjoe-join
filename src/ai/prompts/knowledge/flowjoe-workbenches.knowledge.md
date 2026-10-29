# FlowJoe Workbenches Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: workbenches/calendars.mdx, workbenches/spreadsheets.mdx, workbenches/rich-documents.mdx
Generated: 2026-10-29 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe FlowJoe's editable workbench slots — calendars, spreadsheets, and rich documents — including how they are created, edited, and imported.

Loading this knowledge is not evidence that any calendar, spreadsheet, or rich-document workbench exists in the current flow.

## Calendar Workbench

Manage timelines, schedules, and ICS files in a unified view.

The **Calendar Workbench** uses FullCalendar to schedule events beside your research.

**Intakes & Imports.**
You can import schedules in several shapes:
- **Import ICS/iCal:** Drop a `.ics` or `.ical` file onto the tree or gallery to create a calendar slot directly. To choose its shape, use **Add Slot → Image or File** and select the calendar file.
- **New Blank Calendar:** Click **New Calendar** from the gallery menu.

**Interactive Timeline Editing.**
Open a Calendar slot to use the FullCalendar workbench:
- **Multiple Views:** Switch between Month, Week, Day, and Agenda List views.
- **Manage Events:** Tab to **New event**, Enter, then Save; Cancel/Close returns. Edit or delete existing events.
- **Drag & Resize:** Drag event cards to change dates, or drag block edges to resize duration. Changes save in the FlowJoe calendar; download an `.ics` copy to use elsewhere.
- **Exporting:** Save calendars back to a standard `.ics` file.

**Joe Integration.**
Joe receives calendar agendas as parsed, readable text:
- **Planning:** Ask Joe *"Find conflicts in my schedule next week"* or *"Draft an itinerary for Tuesday."*

Also covered in the full docs for this area: Calendar boundaries; Correcting an event date.

## Spreadsheet Workbench

Live, formulas-ready spreadsheets running inside your gallery slots.

Press **F6** or **Ctrl+F6** in either editor to focus Preview’s **Close** control without closing it; Tab and Escape keep their editor actions and autosave continues.
Desktop close or quit waits for editor saving: **Stay open** keeps the draft; **Retry save** tries again; **Close anyway** or **Quit anyway** may lose unsaved changes.
Preview also waits for the latest edit, even while an older autosave finishes.
**Download Original** keeps source bytes unchanged and uses an **_orig** filename.
Mac screen-reader access to cell values and document text remains unverified; tested native text APIs returned no content.
The **Spreadsheet Workbench** is an interactive, editable island powered by Univer Sheets. It lets you manage tabular data directly alongside your outlines and research notes.

**Creating & Importing Spreadsheets.**
- **New Spreadsheet:** Click **Add Slot** (or **Add First Slot** on an empty node) in the gallery and select **New Spreadsheet**. This initializes an empty slot running the Univer Sheets engine.
- **Importing Files:** Drag and drop `.csv`, `.tsv`, `.xlsx`, `.ods`, or `.xls` files directly onto the gallery. FlowJoe turns each one into an editable spreadsheet slot automatically (there is no prompt), and keeps your untouched original file hidden behind it so you can download it again.

**Workbench Features.**
- **Formulas & Math:** Supports standard spreadsheet formulas (SUM, IF, etc.).
- **Multi-Tab Sheets:** Add, rename, and delete multiple tabs inside a single spreadsheet slot.
- **Formatting:** Edit font styling, backgrounds, borders, alignment, and column widths.
- **Exporting:** Download the sheet from the slot's menu. It saves in the same format you imported (`.csv`, `.tsv`, `.xlsx` or `.ods`); a new spreadsheet, or an imported `.xls`, downloads as `.xlsx`.
- **Appearance:** The spreadsheet always uses a light look, even when the app is in a dark theme.

Also covered in the full docs for this area: Import and export limits; AI Access & Interactions; Saving and retrying; Toolbar names; Mac screen-reader access.

## Rich Document Workbench

Real word-processing islands for drafting documents.

The **Rich Document Workbench** utilizes Univer Docs to provide a real word-processing engine inside individual gallery slots.

**Workflows.**
- **Create Blank Document:** Click **Add Slot**, choose **New Document...**, then pick **Rich Text Document**.
- **Importing Text:** Drag and drop `.docx`, `.odt`, or `.rtf` files to import them. They open as editable document slots with styled text, lists, and embedded images; your untouched original stays hidden behind the slot so you can download it again.

**Editor Features.**
- **Typography styling:** Change headers, font weights, colors, text alignment, and spacing.
- **Image Integration:** Paste images directly from your clipboard into the body of the document.
- **Headers & Footers:** Double-click the top or bottom margin of a page to edit its header or footer. Tables from imported files are kept when you save, but they cannot be edited in the editor yet.
- **Exporting:** Download your edited copy from the slot's menu. It always saves as a `.docx` file (`.odt` and `.rtf` files are imported but not written back).

Also covered in the full docs for this area: Collaborative AI Writing; Saving and retrying; Toolbar names; Mac screen-reader access.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Calendar Workbench](flowjoe-docs:workbenches/calendars)
- [Spreadsheet Workbench](flowjoe-docs:workbenches/spreadsheets)
- [Rich Document Workbench](flowjoe-docs:workbenches/rich-documents)
