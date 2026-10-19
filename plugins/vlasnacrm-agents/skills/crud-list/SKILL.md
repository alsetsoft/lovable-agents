---
name: crud-list
description: Record list / registry screens in a Next.js + shadcn + TanStack Query + Supabase app — shared data table, server-side pagination/sort/search, loading/empty/error states, archived rows, cell conventions. Load when building, changing or reviewing any screen that lists records.
---

# Record lists

Single source for list screens. `policy.json` → `lists.*` / `ui.*` parametrize it; the project's canonical list (`conventions.md`) wins on layout details. Skip anything a registered pattern in `conventions.md` already covers with its own primitive.

## Layout

- Root `flex flex-col gap-4`: page header (title + total count + actions on the right: "+ New" navigates to `/<entity>/new`), toolbar row (debounced search input, filter selects — see the `filters` skill), error banner, the shared data table, pagination.
- **One shared data-table component** (shadcn `Table` underneath) for every list — never a hand-rolled `<table>` per page.
- `ui.mobileCards: true` → table inside `hidden md:block`, a stack of `Card`s inside `md:hidden`, same data; never a horizontally scrolling table on phones in that mode. `false` → table only.
- Row click navigates to `/<entity>/[id]` (never opens a dialog). Keyboard/new-tab behaviour per the project's accessibility rules.

## Data

The page/hook owns paging, sort, search and filter state; the presentational table receives rows, `isLoading`, total and callbacks. Interactive pages are `"use client"`. Fetchers live **outside** components; every parameter is in the query key.

```ts
// page size: policy.lists.pageSizes — several values = user-selectable; persistPageSize = one shared
// value for all lists kept in localStorage (a usePageSize() hook). Never a PAGE_SIZE constant per page.
async function fetchContacts({ page, pageSize, sort, search, showArchived }: ContactsQuery) {
  const from = (page - 1) * pageSize;
  let q = supabase.from("contacts").select("id, name, phone, archived, created_at", { count: "exact" });
  if (!showArchived) q = q.eq("archived", false);
  if (search) q = q.or(wordsFilter(["name", "phone"], search)); // shared, sanitized helper
  if (showArchived) q = q.order("archived", { ascending: true }); // archivedAtEnd: archived block last
  q = sort ? q.order(sort.column, { ascending: sort.dir === "asc" }) : q.order("created_at", { ascending: false });
  const { data, count, error } = await q.range(from, from + pageSize - 1);
  if (error && !isRangeError(error)) throw error; // 416 / PGRST103 = page past the end → empty
  return { rows: data ?? [], total: count ?? 0 };
}

export function useContacts(query: ContactsQuery) {
  return useQuery({
    queryKey: ["contacts", "list", query],
    queryFn: () => fetchContacts(query),
    placeholderData: (prev) => prev, // keep the last page visible while the next loads
  });
}
```

- **Pagination at the database**: `.range()` + `{ count: policy.lists.count }`; never fetch-all + `.slice()`. Out-of-range page (a filter shrank the result, a row was archived) = empty, and the UI clamps `page` back to the last page with data — no red banner, no dead empty page.
- **Pagination control**: page-size selector from `lists.pageSizes`, page-number input (Enter/blur, clamped 1…N), first/prev/next/last. Changing page size resets to page 1.
- **Sorting** is server-side: header click cycles asc → desc → default (`null`).
- **Search**: debounced with one shared constant (`lists.searchDebounceMs`). `searchMode: "words"` → split into words; a row matches when **every** word is in at least one searched column, any order ("small knife" finds "Small folding knife"); one shared helper builds the filter for all lists. User text is never interpolated raw into PostgREST filter syntax in the URL (commas/parentheses → 400, SQL-looking strings → WAF 403): sanitize per word in the helper, or move heavy search (joins, phone normalization) into an RPC that takes the text in the POST body. `highlightMatches` → every searched column is a visible column and the match is highlighted.
- **Archived rows**: hidden by default; a "Show archived" toggle shows them after active ones (`archivedAtEnd`).

## States

- Loading: `Skeleton` rows; never a full-screen spinner once the shell is painted. Total count hidden while loading (not `0`).
- Empty: one short line; with no filters, also the primary action. With filters: "Nothing found" + a way to reset them.
- Error: a visible banner with the message (`border-destructive/40 bg-destructive/10 text-destructive`), the table keeps its last data.

## Cells

- Dates: `whitespace-nowrap` + the shared date formatter. Money: right-aligned, `tabular-nums`, shared money formatter (or amount + separate currency column). Codes/numbers: `tabular-nums`; identifiers with leading zeros stay strings.
- Long text: `block max-w-* truncate`; the full value in a tooltip from **one** global mechanism (no hand-added `title` on top of it).
- Empty value: `—`. Status: the shared status badge.

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| hand-rolled `<table>` in a page instead of the shared table | BLOCKER |
| `useQuery`/`supabase.from(` list without loading (`Skeleton`), empty and error branches | BLOCKER |
| client paging over a fetched array (`.slice(`, manual page math) / no `.range(` | BLOCKER |
| `count` option differs from `lists.count`; fetcher defined inside the component; no `placeholderData` on the main list query | WARN |
| unconditional `if (error) throw error` after `.range(` (no range-error tolerance) | WARN |
| hard-coded `PAGE_SIZE` or per-page `useState(50)` when `pageSizes` has several values | BLOCKER |
| debounce literals (`useDebounce(…, 300)`) instead of the shared constant | WARN |
| template literals inside `.or(` / `.ilike(` / `.filter(` with user input; a single `%${q}%` pattern under `searchMode: "words"` | BLOCKER |
| a searched column not visible, or no highlight under `highlightMatches` | WARN |
| "show archived" without `.order("archived"…)` first (when `archivedAtEnd`) | WARN |
| `ui.mobileCards: true` but the table relies on `overflow-x-auto` on phones; `false` but cards were added | WARN |
| `truncate` without the tooltip mechanism, or a manual `title` on top of it | WARN |
