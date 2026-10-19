---
name: document-lines
description: Documents with a header and line items — orders, invoices, receipts, quotes, protocols, sample batches, any parent record edited together with child rows. Atomic save, computed columns, line editor, totals, snapshot semantics, "create from this document". Load together with crud-form whenever a form edits a parent with child rows.
---

# Documents with line items

Builds on `crud-form` (routes, shell, actions, submit lock). This skill adds what is specific to header + lines.

## Data model

- `<doc>` (header) + `<doc>_items` (`doc_id` FK `on delete cascade`, `position` int for order, `item_id`, `qty`, `price`, optional `discount`, `vat_rate`, `comment`).
- **Computed columns live in the DB**: `amount numeric generated always as (round(qty * price * (1 - coalesce(discount,0)/100), 2)) stored` (or a view). The client **never sends** generated columns in insert/update (Postgres rejects them).
- Header totals (`sum`, `vat_sum`, line count) are computed by the save function, not trusted from the client.
- Invariants as constraints: `qty >= 0`, `price >= 0` CHECKs; cross-row rules (e.g. "returned ≤ received") in the save function under `FOR UPDATE`.

## Saving — one transaction

```sql
create or replace function save_<doc>(p_id uuid, p_header jsonb, p_items jsonb)
returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
  if p_id is null then
    insert into <doc> (...) select ... from jsonb_to_record(p_header) as h(...) returning id into v_id;
  else
    update <doc> set ... from jsonb_to_record(p_header) as h(...) where id = p_id returning id into v_id;
    if v_id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  end if;
  -- replace lines inside the same transaction (or diff by line id to keep audit history)
  delete from <doc>_items where doc_id = v_id;
  insert into <doc>_items (doc_id, position, item_id, qty, price, discount)
  select v_id, ord, (x->>'item_id')::uuid, (x->>'qty')::numeric, (x->>'price')::numeric, coalesce((x->>'discount')::numeric, 0)
  from jsonb_array_elements(p_items) with ordinality as t(x, ord);
  update <doc> set sum = (select coalesce(sum(amount), 0) from <doc>_items where doc_id = v_id) where id = v_id;
  return v_id;
end $$;
```

- The client calls **only** this RPC: `supabase.rpc("save_<doc>", { p_id, p_header, p_items })`. Never `delete` + `insert` lines from the browser — a failure in between leaves a document without lines, and a double click duplicates them.
- Validation failures raise with a SQL state the UI maps to a message (23514 check, 23505 duplicate, 42501 forbidden); the whole save rolls back.

## Editor

- Header in react-hook-form; lines in local state (`useState<Line[]>` or `useFieldArray`) with a client-side `key` per row (not the index).
- Dense table: header row 32px (`h-8`), cells `py-1`, inputs `h-7`; columns: # · item · qty · (availability, if the domain has stock) · price · discount · amount · remove.
- **Add a line** with the project's shared entity picker in a trailing "add line" row: search by name/code + exact code/barcode match; Enter adds and focuses the qty of the new line. Same picker everywhere the same entity is chosen (Consistency Rule).
- Numeric cells follow the non-negative rule (parse/clamp on change, block `-`/`e`).
- Price on add = the item's price converted to the document currency once (shared helper); changing it later is the user's choice.
- **Totals** next to the comment, computed by ONE helper that mirrors the DB formula exactly (same rounding), e.g. `lineAmount(qty, price, discount)`; show subtotal · discount · tax · total · line count.

## Snapshot semantics

- A saved document is a historical snapshot: opening it never recalculates prices, rates, discounts or taxes from current reference data. Recalculation only through an explicit action ("Apply discount to all lines", "Refresh prices") that the user sees in the line values before saving.

## Related actions

- "Create X from this document" (invoice from order, receipt from purchase order, return from sale): **save first** if dirty → separate action lock → navigate to `/x/new?from=<id>`; the new form prefills from a server function that returns only what is still open (e.g. ordered − already shipped), and shows it as an unsaved draft the user can trim.
- Tabs on the card (Lines · Related documents · History) use `forceMount` (or keep state above the tabs): unmounting the lines editor loses unsaved edits.

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| `.delete()` on `*_items` followed by `.insert(` in the same handler (client-side line replace) | BLOCKER |
| a generated/computed column (`amount`, totals) present in an insert/update payload | BLOCKER |
| totals computed in the client with a formula different from the DB's (rounding, discount) | WARN |
| line editor keyed by array index | WARN |
| opening a saved document recalculates prices/discounts/rates in an effect | BLOCKER |
| "create from" action without saving the dirty source first, or without its own lock | BLOCKER |
| tabs unmount the lines editor (no `forceMount`/lifted state) | WARN |
| a line-item entity picker that differs from the project's shared picker for that entity | WARN |
