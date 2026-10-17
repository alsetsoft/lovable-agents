---
name: crud-form
description: Create/edit screens for records in a Next.js + shadcn + react-hook-form + zod + Supabase app — dedicated routes (not modals), one form for both modes, navigation after save/create, header actions, compact layout, and the CRUD hardening rules (submit lock, Radix Select wipe, non-negative numbers, localized dates, archived references, returnTo). Load when building, changing or reviewing any form that creates or edits a record.
---

# Create / edit forms

Single source for record forms. `policy.json` → `forms.*` / `locale` parametrize it; the project's canonical form (`conventions.md`) wins on layout details. Documents with line items additionally follow the `document-lines` skill.

## Routes — never dialogs

```
src/app/<entity>/page.tsx        → /<entity>        (list)
src/app/<entity>/new/page.tsx    → /<entity>/new    (create)
src/app/<entity>/[id]/page.tsx   → /<entity>/:id    (edit)
```

- Route pages are thin: they render `<EntityForm id? returnTo? />` (a `"use client"` component in `src/components/<entity>/<entity>-form.tsx`). Server page: `const { id } = await params`; client: `useParams()`. Static `new` beats `[id]`.
- "+ New" and row click **navigate**; they never toggle a dialog/sheet. The **only** dialog in this flow is the destructive confirmation (`AlertDialog`); a side panel only where the decision log allows it (e.g. change history).
- New-form context (default type, parent, source document) comes via query params: `/<entity>/new?parent=<id>` → `await searchParams`.
- `returnTo`: a record opened from inside another record links with `?from=<current path>`; the page accepts it only if it is an internal path (starts with `/`, not `//`, no scheme) and passes it to the form; Close/back/archive return there, otherwise to the list.

## One form, two modes

- Optional `id`: edit → fetch via TanStack Query, `Skeleton` grid while loading; create → defaults.
- react-hook-form + zodResolver, inline field errors (`FormMessage`), the first invalid field focused.
- Shared form shell: back button + title (one line, truncated) + actions slot.
- **Actions** per `forms.actionsPlacement`:
  - `header` → in the shell header, compact buttons: archive/delete (ghost, via `ConfirmDialog`) · "create from this" actions · Close (outline) · Save/Create. Submit sits outside `<form>`: `<form id={FORM_ID}>` + `<Button type="submit" form={FORM_ID}>`. No footer.
  - `footer` → Cancel + Save (+ Delete in edit mode) at the bottom.
- **After success** (always `toast.success` + invalidate the entity's query keys and every aggregate that depends on it):
  - create → `forms.afterCreate`: `record` → insert with `.select("id").single()`, then `router.push("/<entity>/" + id)`; `list` → `router.push("/<entity>")`.
  - save in edit mode → `forms.afterSave`: `stay` → **no navigation**; `list` → `router.push("/<entity>")`.
  - delete / Close → the list or the validated `returnTo`.
- Errors: `toast.error(title, { description: error.message })` (or the project's error mapper).

## Layout (backoffice density)

- The whole card — fields and actions — fits a laptop screen (1366×768) without scrolling.
- Label-left rows; controls 32px (`h-8`), width by content: currency `w-28`, amount `w-40`, short select `w-64`, long `max-w-sm`; textarea `rows={2}`.
- Grid `gap-x-10 gap-y-2 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_16rem]`; the narrow third column is read-only "System info" (created/updated/author).

## Hardening (implement in every form)

1. **Submit lock.** `disabled={isSubmitting}` is not enough: same-tick clicks slip through before re-render, and after a successful insert the button re-enables while `router.push` is in flight → duplicate record. Ref-based `useSubmitLock`: `handleSubmit(lock.guard(onSubmit))`, button `disabled`/`aria-busy` = `isSubmitting || lock.locked`, `lock.hold()` before `router.push` in the create branch. A separate lock for each "create X from this" action.
2. **Radix `Select` + RHF.** Async options can fire a spurious `onValueChange("")` that wipes the value set by `reset()`: `onValueChange={(v) => v && field.onChange(v)}`, and render the selected label as `SelectValue` children (`options.find((o) => o.id === field.value)?.name`).
3. **Non-negative numbers.** `min={0}` doesn't stop a pasted `-105`: parse/clamp in `onChange` (≥ 0, ignore NaN), block `-`, `+`, `e` in `onKeyDown`, zod `.min(0)`, DB CHECK as the last line.
4. **Dates.** Native `<input type="date">`/`datetime-local` draws its calendar in the browser's language — with a non-English `locale` use the project's localized picker (week start, month names, typed input in the locale's format) emitting `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm`.
5. **Archived references.** New selections show only active records; an already-selected archived value stays visible ("… (archived)") and saveable. Prefer a DB-generated `display_name` over appending the suffix in UI.
6. **Option lists.** ≤ ~60 static options → `Select`; longer static → searchable select (keyboard highlight, scroll to selected); server-side tables → async combobox with server search (one shared picker per entity type).
7. **Identifiers.** Phones/IDs validated and normalized on blur in one shared input; unchanged legacy values are not re-validated (old records must stay saveable); codes with leading zeros stay strings.
8. **Unsaved changes.** A dirty form warns before in-app navigation and `beforeunload`; actions that leave the screen ("open linked record", "create from this") save first.

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| `Dialog`/`Sheet`/`Drawer` wrapping form fields / `useForm` / Save handlers; "+ New" wired to `setOpen(true)`; a list without `new/` and `[id]/` routes | BLOCKER |
| edit branch pushes to the list under `afterSave: "stay"`; create branch pushes to the list under `afterCreate: "record"` (or no `.select("id").single()`) | BLOCKER |
| footer actions under `actionsPlacement: "header"` (or the reverse) | BLOCKER |
| a form that inserts without the ref-based submit lock, or without `lock.hold()` before navigation; `disabled={isSubmitting}` alone | BLOCKER |
| `onValueChange={field.onChange}` / unguarded `(v) => field.onChange(v)` | BLOCKER |
| `type="number"` price/qty/amount with `Number(e.target.value)` straight into state, or `min={0}` alone | BLOCKER |
| `type="date"` / `type="datetime-local"` with a non-English `locale` | BLOCKER |
| `searchParams.get("from")` / `returnTo` used in `router.push` without the internal-path validator | BLOCKER |
| form selects from tables with `archived` offering archived options for new choices | WARN |
| `toLocaleString()` / `toLocaleDateString()` without the project's formatter/locale; hard-coded English strings under a non-English locale | WARN |
| no `Skeleton` while loading in edit mode | WARN |
