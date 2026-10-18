# FlowJoe Workbenches Knowledge

<!-- GENERATED FILE — do not edit by hand. Built from the mintlify user docs by
scripts/build-app-help-knowledge.js (deterministic digest; re-run it after editing any source page).
Source pages: workbenches/calendars.mdx, workbenches/spreadsheets.mdx, workbenches/rich-documents.mdx
Generated: 2026-10-18 from the current worktree copies (post Joe-audit 2026-07-28 wave-1 truth fixes).
Sync guard: tests/unit/appHelpKnowledgeSync.test.js fails when mintlify/**/*.mdx or this digest drifts
from scripts/app-help-knowledge.manifest.json. -->

This knowledge module teaches Joe FlowJoe's editable workbench slots — calendars, spreadsheets, and rich documents — including how they are created, edited, and imported.

Loading this knowledge is not evidence that any calendar, spreadsheet, or rich-document workbench exists in the current flow.

## Calendar Workbench

Manage timelines, schedules, and ICS files in a unified view.

The **Calendar Workbench** integrates FullCalendar into a slot, letting you schedule, drag, and structure events side-by-side with research materials.

**Intakes & Imports.**
You can import schedules in several shapes:
- **Import ICS/iCal:** Drag-and-drop a `.ics` or `.ical` calendar file. FlowJoe displays a prompt letting you import it as:
- A **Calendar Slot** (interactive FullCalendar workbench).
- A **Stack** of event cards.
- Individual **Event Nodes** created under the selected parent.
- **New Blank Calendar:** Click **New Calendar** from the gallery menu.

**Interactive Timeline Editing.**
Double-click a Calendar slot to open the FullCalendar workbench:
- **Multiple Views:** Switch between Month, Week, Day, and Agenda List views.
- **Manage Events:** Create new events, rename titles, or delete events.
- **Drag & Resize:** Drag event cards to change dates, or drag block edges to resize duration. Changes save in the FlowJoe calendar; download an `.ics` copy to use elsewhere.

Also covered in the full docs for this area: Joe Integration; Calendar boundaries.

## Spreadsheet Workbench

Live, formulas-ready spreadsheets running inside your gallery slots.

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

Also covered in the full docs for this area: Import and export limits; AI Access & Interactions.

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

Also covered in the full docs for this area: Collaborative AI Writing.

## Manual links

A FlowJoe manual reference chip linking the page(s) below is already attached under your reply for the user to click — do NOT also write a markdown link to any of them in your prose, and do NOT mention the chip; just answer normally. These are the only manual links that exist — never invent or alter one (no website URLs or paths like /joe/automation).

- [Calendar Workbench](flowjoe-docs:workbenches/calendars)
- [Spreadsheet Workbench](flowjoe-docs:workbenches/spreadsheets)
- [Rich Document Workbench](flowjoe-docs:workbenches/rich-documents)
