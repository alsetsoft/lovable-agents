---
name: filters
description: List filters — period/date-range filter with presets, filters by reference tables (with archived values), status/boolean filters, filter state in the URL, reset, saved views. Load when adding or changing filters on a list, report or dashboard.
---

# Filters

## Placement and look

- In the list toolbar after the search input: `flex flex-wrap items-center gap-3`, controls 32px (`h-8`), widths `w-36`…`w-44` (period picker may be wider). The toolbar stays on one line at 1366 px for the typical set; more → a "More filters" popover.
- Active filters are visible (the control shows the value, not the placeholder) and a "Reset" link appears when any filter differs from the default.

## State in the URL

- Search, filters, sort and page live in the URL query (`?q=&status=&from=&to=&sort=name.asc&page=3`) via one small hook (`useListParams`) — reload, back/forward and shared links restore the view. Debounced search writes with `router.replace` (no history spam); explicit filter changes reset `page` to 1.
- The query key is built from the parsed params, so the URL is the single source of truth.

## Period filter (one shared component)

- From–to, both inclusive, in `policy.timezone`; presets: yesterday · today · this week · this month (+ last 7/30 days if useful). Week starts per locale.
- Bounds are computed by ONE helper (`periodBounds(preset | {from,to}, tz)` → `[fromInclusiveUtc, toExclusiveUtc)`); never `new Date("YYYY-MM-DD")` in components (midnight off-by-one).
- Uses the project's localized date picker (no native date inputs under a non-English locale).
- Every report/list with a period uses this component.

## Reference-table filters (customers, owners, warehouses, categories…)

- One shared component (`RecordFilterSelect`): active records by default; archived ones behind a "Show archived (N)" toggle **inside** the dropdown (the page's own "show archived" checkbox is about the listed records, not the filter options); a selected archived value is always visible.
- Labels come from the data layer (`display_name` with the "(archived)" suffix generated in the DB) — never appended in UI.
- Extra service options as explicit props (`extraOptions={[{ id: "__none__", label: "Without owner" }]}`).
- > ~60 options → searchable; server-sized tables → async combobox.

## Saved views (optional, for heavy users)

- A view = name + the URL query string, per user (table `saved_views(user_id, list_key, name, query)`); the default view per list is a user setting. Never store filter state only in `localStorage` when the user expects it on another device.

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| filter/page/sort state only in `useState` on a list users share or reload (no URL sync) | WARN |
| date range bounds computed inline with `new Date(...)` instead of the shared helper / timezone | BLOCKER |
| a second period-filter implementation | BLOCKER (Consistency Rule) |
| reference filter offering archived records by default, or "(archived)" appended in UI | WARN |
| filter change doesn't reset the page to 1 | WARN |
| no reset affordance when filters are active | WARN |
