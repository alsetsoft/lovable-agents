---
name: bulk-actions
description: Mass operations on records from a list — row selection, "select all matching the filter", confirmation with a server-counted total, set-based server execution, progress and result feedback. Load when a list needs to change, archive, export or assign many records at once.
---

# Bulk actions

## Selection model

Two distinct modes — never mix them silently:

1. **Explicit ids** — row checkboxes + a header checkbox that selects **the current page only**. State: `Set<id>`, kept across pages.
2. **All matching the filter** — a separate, explicit button that appears after selecting the page ("Select all 12 384 matching the filter"). State: the filter snapshot (`{ search, filters… }`), not ids.

- Changing search/filters cancels mode 2 (back to explicit ids); manually toggling a checkbox while in mode 2 switches back to explicit ids.
- A sticky selection bar (above or below the table) shows "N selected · Clear" and the available actions; it never covers the pagination.
- Options that change the scope (include archived, only in stock, etc.) are explicit toggles with safe defaults (off).

## Server side

- One function per action, two entry points: `<action>_by_ids(p_ids uuid[], p_params jsonb)` and `<action>_by_filter(p_filter jsonb, p_params jsonb, p_expected_count int)`.
- `*_by_filter` recomputes the set on the server with the **same** filter logic as the list (reuse the list's search/filter function) and **refuses** when the count differs from `p_expected_count` ("the selection changed, review it again").
- Set-based: one `UPDATE … WHERE id = ANY(…)` / `WHERE <filter>` + one `INSERT … SELECT` into the audit/history table. No per-row loops, no per-row client calls.
- Heavy actions raise the function's own `statement_timeout` (`alter function … set statement_timeout = '120s'`) instead of the role's.
- Permissions are checked inside the function.

## Flow in the UI

1. Choose an action → a dialog with the parameters (e.g. "+10 %", new owner, new status).
2. **Confirmation step** with the server-counted scope: "Apply to 12 384 records (including 0 archived)?" — counts from a `<action>_scope_stats(p_filter)` function, not from the client page.
3. Run with the action lock (no double submit), show progress (indeterminate if the server can't report it), keep the dialog open until done.
4. Result toast: "Updated 12 384 · skipped 3 (archived)"; invalidate the list and every aggregate that depends on it; clear the selection.
5. Irreversible actions (delete, hard archive) state that in the confirmation and use the destructive variant; prefer archive over delete.

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| "select all" that silently means "all pages" without the explicit filter-mode button | BLOCKER |
| bulk action implemented as a client loop of single updates (`for … await supabase…update`) | BLOCKER |
| filter-mode action without server-side recount / `expected_count` check | BLOCKER |
| no confirmation step with the scope count | WARN |
| selection not cleared / list not invalidated after the action | WARN |
| filter change keeps a filter-mode selection active | BLOCKER |
