---
name: master-detail-tabs
description: Record cards with tabs and related data — tabs that keep editor state, related-documents graph, history/audit panel, child lists inside a card, navigation between linked records and back. Load when a record card shows more than one block of related information.
---

# Record cards: tabs, related records, history

## Tabs

- One shared `RecordTabs` component: first tab = the main content (fields, lines, totals), then "Related (N)", "History", "Files"… The counter comes from the same query the tab renders (one cache key), so the label and content never disagree.
- **Never unmount editors**: tabs use `forceMount` + `hidden` (or state lifted above the tabs). Switching tabs must not lose unsaved edits.
- In create mode, tabs that need a saved id are disabled with a hint ("available after saving").
- Don't repeat the tab name as a heading inside the tab.
- The active tab lives in the URL (`?tab=related`) so links and reload land on it.

## Related records

- A server function returns the related set for a record (`linked_records(p_kind, p_id)`): parent chain up to the root and the tree below it, with edges (`parent_kind`, `parent_id`) and `is_current`. Adding a new linked type = one branch in that function + a label/href entry in one client map.
- Presentation: compact cards (type · number · date · status color · amount), grouped by depth, current one highlighted; click → the record with `?from=` so Close returns here.
- Child lists inside a card (payments of an invoice, items of a group) reuse the shared data table in a compact variant with their own empty state and a "+ Add" that navigates to the child's create route with the parent prefilled.

## History / audit

- One append-only audit table shape for all entities (`entity_type`, `entity_id`, `moment`, `author`, `event`, `diff jsonb` as `{ "Label": { "o": old, "n": new } }`); authors and timestamps are set by a DB trigger from the session, never from the client.
- The card header shows "Changed: <who> <when>"; clicking opens the history in a side `Sheet` (allowed exception to "no dialogs" when the decision log says so).
- The form writes an audit entry only after a successful save and only when the diff is non-empty.

## Navigation between records

- Links from one record to another carry `?from=<current path>`; the target validates it (internal paths only) and returns there on Close/back. Leaving a dirty form asks first (or saves first for "create from" actions).

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| tabs that unmount a component holding unsaved local state | BLOCKER |
| tab counter from a different query than the tab content | WARN |
| related-record links without `?from=` / without validation on the target | WARN |
| audit rows written from the client with client-provided author/time; UPDATE/DELETE allowed on the audit table | BLOCKER |
| a second history/audit UI implementation | WARN (Consistency Rule) |
