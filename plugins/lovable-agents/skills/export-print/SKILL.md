---
name: export-print
description: Exporting lists and documents to Excel/CSV and printing documents with user-editable templates (invoices, receipts, labels, price tags) — column typing, what gets exported, print routes, safe template rendering. Load when adding export/import buttons or a print/PDF feature.
---

# Export and print

## Excel / CSV export

- Library: SheetJS (`xlsx`) loaded with a dynamic `import()` on click (keeps the bundle small).
- **What is exported**: lists → the current filter/search/sort over **all pages** (fetched server-side in batches, with a confirmation above ~10 000 rows); documents → exactly what is on screen, including unsaved lines.
- Sheet 1 = a **flat table**: one header row, autofilter, frozen header, column widths by content. Extra metadata (document header, totals, filters used) goes to a second sheet — never above the header row, it breaks re-import and pivoting.
- **Types**: codes, article numbers, barcodes, phones, IDs → text cells (`t: "s"`, leading zeros survive); numbers and money → numbers with a number format; dates → real dates (`t: "d"`) in `policy.timezone`. Never export formatted strings like `"1 234,50 ₴"` into numeric columns.
- File name: `<entity>_<YYYY-MM-DD>.xlsx` (localized entity name allowed); the button is disabled when there is nothing to export.

## Import (if offered)

- Validate the whole file first and reject it as a whole with row numbers for every error (negative/non-numeric prices, invalid phones, missing required columns) — no partial imports.
- Upsert through one server function with explicit match rules (by code, else by a normalized natural key); empty cells don't overwrite existing values; the result toast says "created N · updated M · unchanged K"; changes go to the audit log.

## Printing

- A print route outside the app shell: `src/app/(print)/print/[type]/[id]/page.tsx` (auth-checked, no menu) → the browser's print dialog / "Save as PDF". The card's header has a Print menu (template list).
- One loader builds the same print context for every document type (`doc`, `org`, `counterparty`, `items`, `totals`, `amountInWords`…), documented in one `PRINT_FIELDS` list kept in sync with the loader.
- Built-in templates live in code (copy-only); user templates are HTML with `{{field}}` placeholders stored in the DB with one default per type, edited with a live preview on the latest real document.
- **User-editable HTML is rendered in a sandboxed `<iframe sandbox>` without `allow-scripts`** (and placeholders are HTML-escaped) — otherwise it's a stored XSS.
- Print CSS: `@page { size: A4; margin: 12mm }`, black on white regardless of theme, page-break rules for tables (`break-inside: avoid` on rows), totals never orphaned on a new page.

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| export of only the visible page of a paginated list (without saying so) | WARN |
| codes/IDs/phones exported as numbers; formatted money strings in numeric columns | BLOCKER |
| metadata rows above the header row on the data sheet | WARN |
| user-editable template HTML rendered via `dangerouslySetInnerHTML` in the app or an iframe with `allow-scripts` | BLOCKER |
| partial import (some rows saved when others fail) | BLOCKER |
