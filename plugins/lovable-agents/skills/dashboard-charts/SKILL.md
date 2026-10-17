---
name: dashboard-charts
description: Dashboards, KPI tiles, reports and charts in a data app — server-side aggregates, KPI cards with comparison, chart choice and tokens, report tables with totals, invalidation after writes. Load when building or changing a dashboard, a report screen, a KPI row or any chart.
---

# Dashboards, reports and charts

## Data

- **Aggregates are computed on the server** — an RPC/view per widget (`sales_by_day(p_from, p_to, p_bucket, …filters)`), never fetch-all-rows + reduce in the browser. Filters (period, owner, channel…) are parameters of the same function the report table uses, so the chart and the table always agree.
- Buckets (hour/day/week/month) are computed in `policy.timezone` on the server; the client never re-buckets.
- Comparison period (previous period / same period last year) comes from the same function with shifted bounds.
- Money in several currencies is never summed raw: convert at the document's date rate on the server, label converted totals "≈".
- Query keys start with a shared prefix (`["dashboard", …]`, `["report", name, …]`). **Every write that changes the underlying data invalidates those prefixes** (keep a small `invalidationMap` next to the query-key factory).

## KPI tiles

- Value (big, `tabular-nums`), label, comparison delta (▲/▼ + % with semantic color **and** sign — never color alone), period caption. Click → the filtered list/report behind the number.
- Loading: skeleton of the same size; zero is `0`, unknown is `—`.

## Charts

- Use shadcn charts (Recharts) with the `--chart-1…5` tokens; never raw palette colors. Validate both themes.
- Pick the form by the question: trend over time → line/area; comparison of categories → horizontal bar (sorted); part of whole with ≤ 5 parts → stacked bar (avoid pies beyond that); two measures with different units → two axes, clearly labelled, or two small charts.
- Comparison period → dashed line of the same hue. Tooltips show the exact value with the shared formatter and the bucket's date range.
- Axes: localized dates, abbreviated numbers (`12,4 k`) via `Intl.NumberFormat(locale, { notation: "compact" })`.
- Empty range → an explicit "No data for this period" state inside the chart frame, not an empty axis.

## Report tables

- Built on the shared data table: column groups for related measures, a pinned totals row (footer) computed by the server function (not by summing the visible page), share-of-total column where it helps, export (see `export-print`).
- Drill-down: clicking a row opens the next level (group → items, person → their documents) with the filter carried in the URL.

## Layout

- Desktop grid: KPI row on top, the main chart full width, secondary widgets in 2–3 columns; nothing scrolls horizontally at 1366 px. Each widget has a title, the period it shows, and its own loading/error state (one failing widget doesn't blank the page).

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| aggregation in the browser over fetched rows (`.reduce` over a `select` without server grouping) | BLOCKER |
| a write path that changes reported data without invalidating the dashboard/report keys | WARN |
| raw palette colors in charts; delta shown by color only | WARN |
| currency amounts summed without conversion | BLOCKER |
| totals row computed from the visible page | BLOCKER |
| chart and table of the same report fed by different queries/filters | WARN |
