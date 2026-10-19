# lovable-agents

Shared [Claude Code](https://docs.claude.com/en/docs/claude-code) agents for building **Lovable-style** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui apps — marketing sites and CRM/ERP back-offices.

This repo is a **Claude Code plugin marketplace**. Install it once in any project (or globally) and every project gets the same agents, commands and pattern skills. Edit an agent here, push, and all projects pull the update — no more copy-pasting between repos.

## What's new in 2.0 (breaking)

**Breaking:** project files moved from `.claude/lovable/` to **`.lovable/`** at the project root (`policy.json`, `conventions.md`, `qa/`, `qa.local.json`). Claude Code treats everything under `.claude/` as sensitive — each write needed a permission prompt and headless/CI runs failed. Agents read a legacy `.claude/lovable/` and `git mv` it to `.lovable/` on the next write; to migrate by hand: `git mv .claude/lovable .lovable` and update `.gitignore` entries (`.lovable/qa/`, `.lovable/qa.local.json`).

New in 2.0:
- **E2E tests** — `lovable-e2e-writer` writes Playwright tests for every feature (CRUD + relationships) and a **regression test, written first, for every bug fix**; `e2e-crud` skill (safe test env, naming that reads as test cases, CI on the GitHub free plan).
- **Testers' PDF** — `test-docs` skill + `scripts/test-docs.mjs`: what's new, entity & relationship map, flows, test cases with steps/status, regressions, gaps (uk/en).
- **Reliable orchestration** — agents are dispatched in the foreground; the orchestrator never returns mid-pipeline (headless/CI runs no longer get cut off).
- Since 1.x: Tailwind v4 / shadcn CLI / React 19 / Next 16 stack, consistency rule + `/lovable-fix`, `/lovable-adopt`, `/lovable-lesson`, `lovable-visual-qa`, keyboard & a11y, 8 pattern skills.

Verified end to end on a lab project (local Supabase): full `/lovable` build, `/lovable-fix`, `/lovable-lesson`, `/lovable-adopt` on a real ERP repo copy, and the testers' PDF.

After updating the plugin, run `/reload-plugins` (or restart Claude Code).

## What's inside

A single plugin, `lovable-agents`, bundling:

| Agent | Role |
|-------|------|
| `lovable-orchestrator` | Owns the full build workflow; delegates to the agents below. |
| `lovable-project-init` | Scaffolds a fresh Next.js 16 + React 19 + Tailwind v4 project; shadcn primitives via the shadcn CLI; Supabase via `@supabase/ssr` + `proxy.ts` auth gate (idempotent, never migrates an existing project). |
| `lovable-design-system` | Authors the design tokens in `globals.css` (CSS-first: OKLCH vars + `@theme inline`; legacy `tailwind.config.ts` projects keep their mode). |
| `lovable-component-builder` | Builds components and screens from the design system, the project canon and the pattern skills; owns shared primitives and app-wide pattern fixes. |
| `lovable-page-assembler` | Assembles pages, routes, the app shell and client-side data fetching (per the pattern skills) and, for marketing, SEO. |
| `lovable-db-snapshot` | Keeps an in-repo snapshot of the DB schema (`snapshots/db/schema.sql` + `SCHEMA.md`) for Supabase-like providers; runs after any schema change. |
| `lovable-design-reviewer` | Code audit: tokens & stack, policy, the pattern skills' *Audit* tables (CRUD hardening), canon, pattern consistency, keyboard & a11y, DB snapshot, (marketing) SEO. Fixes what it finds. |
| `lovable-visual-qa` | Opens the running app in headless Chromium: screenshots at 1366/1920/768 (light/dark), forms fit the laptop screen without scrolling, no horizontal overflow, console/HTTP errors, axe-core WCAG 2.2 AA; grades the screenshots. Report-only. |
| `lovable-e2e-writer` | Playwright e2e tests: CRUD + relationships for every feature, a regression test (written first) for every bug fix; titles/steps are test cases in the UI language; sets up Playwright + CI once. Never runs against production. |

Plus slash commands:

| Command | What it does |
|---------|--------------|
| `/lovable <what to build>` | Build a new app or a new feature/entity |
| `/lovable-adopt` | Connect the agents to an existing project: derive `policy.json` + `conventions.md` from its CLAUDE.md/AGENTS.md and code (no code changes) |
| `/lovable-fix <what's wrong>` | Apply a UI fix or behaviour change app-wide (see *Consistency*) |
| `/lovable-lesson <feedback>` | Turn client/QA feedback into a durable rule (project instruction file + conventions) |
| `/lovable-agents:<skill> <task>` | Do one task by a pattern skill's recipe (see *Pattern skills*) |

And 10 **skills** — recipes for data screens (lists, forms, documents with lines, bulk actions, filters, dashboards, tabbed cards, export/print) plus e2e tests and the testers' PDF, see below.

## Quick guide

**New project**

```text
/lovable backoffice CRM for a furniture store: clients, orders, payments
```

The orchestrator scaffolds the app, writes `.lovable/policy.json`, builds the first entity end-to-end and records it as the canon in `conventions.md`. Later entities copy it.

**Existing project** (once per repo)

```text
/lovable-adopt
```

Reads `CLAUDE.md` / `AGENTS.md` and the code and writes only `.lovable/policy.json` + `conventions.md`: inferred settings with evidence, the canonical list/form, shared primitives, the patterns registry, divergent clusters and the decision log. Check the "assumed" values it reports, then commit both files so the whole team's agents follow the same rules. Instruction files always win over the policy and the agents' defaults.

**Day to day**

| You want to… | Use |
|--------------|-----|
| add a screen / entity / feature | `/lovable add a suppliers list and form` (or just ask) |
| fix something that looks or behaves wrong | `/lovable-fix archived records still appear in pickers` — fixed everywhere, not just on one screen |
| make sure a client/QA remark never repeats | `/lovable-lesson QA: after saving, the form jumps back to the list; client wants to stay on the record` |
| keep it to a single screen | add "only on this screen" |
| build one thing by a known recipe | `/lovable-agents:document-lines purchase order form with lines` (see *Pattern skills*) |
| fix a bug | describe it (or `/lovable-fix …`) — a `@regression` e2e test is written first, then the fix |
| give QA the current test documentation | `/lovable-agents:test-docs` → PDF: what's new, relationship map, test cases with status, regressions, gaps |

Commit `.lovable/` together with the code changes it describes.

## Install

In any Claude Code session:

```text
/plugin marketplace add alsetsoft/lovable-agents
/plugin install lovable-agents@alsetsoft
```

That's it. Start a build with:

```text
/lovable landing page for an AI note-taking app
/lovable backoffice CRM for a furniture store: clients, orders, payments
```

Or just ask Claude to "build / create / design" an app — the orchestrator triggers automatically.

## Profiles

The orchestrator picks a **profile** first (or takes it from the first word of `/lovable`):

| | `marketing` | `backoffice` |
|---|---|---|
| For | landing pages, sites, promo/product pages | CRM, ERP, admin panels, internal tools |
| Look | gradients, motion, generous spacing | dense: `h-8` controls, restrained palette, no entrance animations |
| SEO | full (Metadata API, OG, canonical, JSON-LD) — reviewer BLOCKER | titles only, auth-gated `(app)` / `(auth)` route groups |
| Lists | table + mobile cards, 20 per page | shared data table, selectable 50/100/200, persisted |
| After "Save" | back to the list | stay on the record; create → the new record |

## Project policy — `.lovable/policy.json`

Project files live in `.lovable/` at the project root (not `.claude/`, which Claude Code treats as sensitive — every write there needs a permission prompt and fails in headless/CI runs; older `.claude/lovable/` folders are read and moved automatically).

Every decision that differs between projects lives in one committed file in the **target project**, not in these prompts. The orchestrator writes it on cold start (profile defaults + whatever the user/client asked for); every agent reads it first; the reviewer enforces it. Edit it by hand any time — agents never silently overwrite it.

```json
{
  "profile": "backoffice",
  "locale": "en-US",
  "timezone": "UTC",
  "currency": "USD",
  "ui": { "density": "compact", "mobileCards": false, "motion": "minimal", "darkModeToggle": false },
  "forms": { "afterSave": "stay", "afterCreate": "record", "actionsPlacement": "header", "submitLock": true },
  "lists": {
    "pageSizes": [50, 100, 200], "persistPageSize": true, "count": "exact",
    "searchDebounceMs": 500, "searchMode": "words", "highlightMatches": true, "archivedAtEnd": true
  },
  "data": { "supabaseKeys": "env" },
  "seo": { "enabled": false },
  "qa": { "enabled": true, "blocking": false },
  "e2e": { "enabled": true, "required": false }
}
```

| Key | Values | Effect |
|-----|--------|--------|
| `forms.afterSave` | `stay` / `list` | Where "Save" in edit mode lands |
| `forms.afterCreate` | `record` / `list` | Where a successful create lands |
| `forms.actionsPlacement` | `header` / `footer` | Form buttons in the shell header or a bottom footer |
| `lists.pageSizes` | number[] | One value = fixed; several = user-selectable |
| `lists.count` | `exact` / `estimated` | Supabase `count` mode for list totals |
| `lists.searchMode` | `words` / `phrase` | `words`: every word must match some field, any order |
| `ui.mobileCards` | bool | Table + card stack on mobile vs table only |
| `data.supabaseKeys` | `env` / `inline` | Where the public Supabase URL/key come from |
| `seo.enabled` | bool | Full SEO audit vs titles only |
| `qa.enabled` / `qa.blocking` | bool | Run visual QA after UI changes / let its BLOCKERs stop the build (start advisory) |
| `e2e.enabled` / `e2e.required` | bool | Write e2e tests for features / let the reviewer block a feature without tests (bug fixes always get a regression test) |

## Conventions & golden reference — `.lovable/conventions.md`

After the first complete entity (list + create/edit form) passes review, the orchestrator records it as the **canon**: the canonical list file, the canonical form file, shared primitives (data table, pagination, form shell, submit lock, search helper, formatters…) and a dated **decision log** of client requirements. Later lists/forms copy the canon instead of re-deriving layout from prose; the reviewer flags divergence and re-implemented primitives.

## Consistency — fix the pattern, not the instance

A fix noticed on one screen (archived records shown differently in a select, a filter and a list; a record picker that shows quantity on one form but not another) is applied to **every** place with the same kind of data or interaction, in the same change:

1. inventory all occurrences by data shape and behaviour (not just by component name);
2. one shared primitive (component / hook / helper / DB-generated field), every occurrence migrated, local variants deleted;
3. the rule recorded in `conventions.md` → `## Patterns` (rule · primitive · detection grep · date);
4. the reviewer (section 13) re-runs every registered pattern's grep and blocks stragglers, and flags unregistered divergence (the same thing solved twice).

Use `/lovable-fix <what's wrong>` or just describe the fix — the orchestrator applies this rule by default; say "only on this screen" to keep a change local.

## Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 App Router | `proxy.ts` (not `middleware.ts`), async `params`/`searchParams`/`cookies()`, no `next lint` — `tsc --noEmit` |
| UI runtime | React 19 | `ref` as a prop, no `forwardRef` in new code |
| Styling | Tailwind CSS v4, CSS-first | tokens = OKLCH vars + `@theme inline` in `globals.css`; no new `tailwind.config.ts` |
| Primitives | shadcn/ui via CLI (`radix` base, `nova` preset) | `npx shadcn@latest add <name> -y` — never hand-written; compact `h-8` default controls |
| Forms | react-hook-form + zod + @hookform/resolvers | majors pinned together in the scaffold |
| Data | Supabase (`@supabase/ssr`) + TanStack Query | browser + server clients, session refreshed in `proxy.ts` |

Existing projects are detected as `css-first` or `legacy-config` (Tailwind v4 + `@config` JS config + HSL vars) and keep their mode; migration is a separate, explicit task.

## Pattern skills

Detailed rules for data-heavy screens live once, as skills in `plugins/lovable-agents/skills/<name>/SKILL.md` — the agents load only the ones a task needs (the orchestrator names them in each delegation), and the reviewer runs each skill's *Audit* table. The project's `CLAUDE.md`, policy and canon override a skill wherever they differ.

| Skill | For |
|-------|-----|
| `crud-list` | record lists: shared table, server pagination/sort/search, states, archived rows, cells |
| `crud-form` | create/edit routes, navigation after save, header actions, compact layout, CRUD hardening |
| `document-lines` | header + line items: one-transaction save, generated columns, line editor, totals, snapshots |
| `bulk-actions` | selection vs "all matching the filter", server recount, set-based execution |
| `filters` | period filter, reference filters with archived values, URL state, saved views |
| `dashboard-charts` | server aggregates, KPI tiles, chart choice and tokens, report totals, invalidation |
| `master-detail-tabs` | tabs that keep editor state, related records, append-only history |
| `export-print` | typed Excel export, all-or-nothing import, print routes, sandboxed templates |
| `e2e-crud` | Playwright setup (safe test env, auth, CI on the free plan), CRUD/relationship tests that read as test cases, regression tests for bug fixes |
| `test-docs` | generates the testers' PDF from the e2e suite + DB schema + `e2e/relations.yaml` + git history |

To change a data-screen rule, edit the skill — not the agents.

### Using a skill yourself

Three ways, from most to least explicit:

```text
/lovable-agents:document-lines purchase order form: supplier, warehouse, date, currency; lines: product, qty, price, VAT
/lovable-agents:bulk-actions mass status change in the orders list
```

1. **Slash command** `/lovable-agents:<skill> <task>` — the skill is loaded and the task is done by its recipe (type `/lovable-agents:` to see the list).
2. **By name in a normal prompt** — "add Excel export to the payments list, use the export-print skill".
3. **Automatically** — Claude sees every skill's description and loads a matching one on its own; name it when you need a guarantee.

Write the prompt as **what and where**, not how: the entity, its fields, the screen it lives on, which existing file to mirror. The skill already says how (one-transaction save, server recount, URL filters…), and the project's CLAUDE.md/canon still apply.

### Skill vs a prompt you type

| | Prompt in chat | Skill |
|---|---|---|
| Lives | in one message, gone with the session | a file in git, versioned |
| Used by | you, once | the whole team, every agent, every project with the plugin |
| Loaded | you retype or paste it | by name, or automatically when a task matches its description |
| Result | varies with the wording | the same text → the same behaviour |
| Checked | nobody compares the result to it | the reviewer runs the same skill's *Audit* table |
| Improved | the lesson is lost | edit the file once — every next generation knows |

### Skills for one project

Rules that belong to one product (a domain workflow, a document type with its own business rules) go into that project, not this plugin:

```
<project>/.claude/skills/<name>/SKILL.md
```

```md
---
name: stock-document
description: New warehouse document that moves stock. Load when adding such a document.
---
- Save only through the atomic RPC save_<doc>(p_id, p_header, p_items)
- …
```

Commit it with the project — teammates get it too; call it as `/<name>` or let Claude pick it up. Rule of thumb: generic for any data app → a skill in this plugin (via PR); specific to one product → `.claude/skills/` of that project (or `/lovable-lesson`, which records it in the project's CLAUDE.md).

### Adding or changing a plugin skill

- One folder per skill: `skills/<name>/SKILL.md` with `name` and a `description` that says **when to load it** (that's what triggers it automatically).
- Structure: rules → recipe (code/SQL skeleton where it helps) → **Audit** table (`check | severity`) for the reviewer.
- Domain-agnostic: no project names, entities or business rules; examples use customer/product/sample/order.
- Link it from the agents only by name (the orchestrator's *Pattern skills* index); don't copy its text into prompts.

## Visual QA

`lovable-visual-qa` runs after the reviewer on every UI change. It installs Playwright + axe once into `~/.cache/lovable-qa` (never into your project), uses your running dev server (or starts and stops one), and writes screenshots + `results.json` to `.lovable/qa/<date>/` (gitignored).

- Logged-in screens need test credentials: `export LOVABLE_QA_EMAIL=… LOVABLE_QA_PASSWORD=…` or `.lovable/qa.local.json` (gitignored). Without them only public pages are checked.
- It is read-only: opens pages and clicks the first table row to reach a detail screen. No submits, no data writes.
- Findings are advisory until you set `"qa": { "blocking": true }`.

## E2E tests & the testers' document

- **Every feature** gets Playwright tests from `lovable-e2e-writer` (CRUD, relationships, `@smoke` for the core path); **every bug fix** gets a `@regression` test that reproduces the bug before the fix.
- Test titles and `test.step`s are written as real test cases in the app's UI language (`<action>: <expected result>`), tagged by entity, annotated with relationships and bug tickets.
- Tests run only against a test environment (separate test database / local stack); the config refuses forbidden (production) hosts. CI: smoke on every PR, full suite nightly — fits the GitHub free plan.
- `/lovable-agents:test-docs` (or a CI step) turns the suite into a PDF for QA: what's new since the last tag, entity & relationship map (DB schema + `e2e/relations.yaml`), business flows, test cases by module with steps/expected/status, regression tests, and what isn't covered. Generated by `scripts/test-docs.mjs`, never hand-written.

## Hardening

The builder implements and the reviewer greps for generic CRUD bugs: double submit (ref-based submit lock held through navigation), Radix `Select` spurious `onValueChange("")` wiping form values, negative numbers via paste, native date inputs in non-English locales, archived records offered in new selections, user search text interpolated into PostgREST filters, open redirects via `?from=`, out-of-range pages (416), truncated text without tooltips.

Keyboard & accessibility (backoffice): one `useHotkey` hook (letters matched by physical key, so shortcuts work on non-Latin layouts) — `Ctrl/⌘+S` saves through validation and the submit lock, `/` focuses search, `Esc` closes (first Esc leaves a field); clickable table rows contain a real link (Tab, Enter, Ctrl/⌘-click → new tab); `aria-sort` on sortable headers; skip link and focus to the page title after navigation; visible focus rings; status never shown by color alone. Reviewer section 14 audits it.

## Auto-install for a project (team-wide)

To make every collaborator on a project get these agents automatically, commit this to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "alsetsoft": {
      "source": { "source": "github", "repo": "alsetsoft/lovable-agents" }
    }
  },
  "enabledPlugins": {
    "lovable-agents@alsetsoft": true
  }
}
```

When anyone opens the project in Claude Code, the marketplace is registered and the plugin is enabled with no manual steps.

Scope: enabling the plugin in your **user** settings (`~/.claude/settings.json`) turns it on in every project you open. Project settings win over user settings — to switch it off in one project, commit `"enabledPlugins": { "lovable-agents@alsetsoft": false }` to that project's `.claude/settings.json`.

## Updating

After you push changes to this repo, pull them into any project:

```text
/plugin marketplace update alsetsoft
/plugin update lovable-agents@alsetsoft
/reload-plugins
```

From a terminal: `claude plugin marketplace update alsetsoft && claude plugin update lovable-agents@alsetsoft`, then restart Claude Code (or `/reload-plugins`).

## Managing versions

`plugins/lovable-agents/.claude-plugin/plugin.json` has a `version` field:

- **Keep bumping `version`** (e.g. `1.0.0` → `1.1.0`) for controlled releases — installs only update when you raise it.
- **Remove the `version` field** to use the commit SHA as the version — every push becomes a new version (handy for fast iteration).

## Editing the agents

Everything is plain Markdown with YAML frontmatter under `plugins/lovable-agents/`: agents in `agents/`, slash commands in `commands/`, pattern skills in `skills/<name>/SKILL.md`, plus the visual-QA runner in `scripts/visual-qa.mjs`. Agent markdown can reference plugin files as `${CLAUDE_PLUGIN_ROOT}/…` (substituted when the agent loads; not available as a Bash env var). Edit, bump the version, and push:

```bash
git add -A
git commit -m "tweak lovable-design-reviewer rules"
git push
```

### Local testing before publishing

```bash
# validate plugin structure
claude plugin validate ./plugins/lovable-agents

# load the plugin into a session straight from disk (no install)
claude --plugin-dir ./plugins/lovable-agents

# quick headless check that skills/agents load
claude -p "List every skill and agent whose name contains 'lovable'" --plugin-dir ./plugins/lovable-agents < /dev/null
```

## Contributing

Changes to these agents ship to every project that has the plugin installed, so they go through a pull request — no direct pushes to `main`, and **every PR needs at least one approval from another team member before it can be merged.** You may not merge your own PR unreviewed.

### Workflow

1. **Branch off `main`.**

   ```bash
   git clone https://github.com/alsetsoft/lovable-agents.git
   cd lovable-agents
   git checkout -b fix/design-reviewer-alt-text
   ```

2. **Make your change** under `plugins/lovable-agents/`:
   - Agents live in `agents/*.md` (Markdown + YAML frontmatter).
   - Slash commands live in `commands/*.md`.
   - Pattern skills live in `skills/<name>/SKILL.md` — change a data-screen rule there, not in the agents.

3. **Bump the version — REQUIRED.** Edit `plugins/lovable-agents/.claude-plugin/plugin.json` and raise `version` following [SemVer](https://semver.org/):
   - patch (`1.0.0` → `1.0.1`) — wording tweaks, small fixes;
   - minor (`1.0.0` → `1.1.0`) — new agent or capability;
   - major (`1.0.0` → `2.0.0`) — breaking change to how an agent behaves.

   > ⚠️ **This is not optional.** Installs are cached by version (`~/.claude/plugins/cache/alsetsoft/lovable-agents/<version>/`). If you don't bump it, `/plugin update` sees the same version and keeps serving the old agents — your change never reaches anyone. **A PR that edits an agent without bumping the version will be rejected.**

4. **Validate locally** before opening the PR:

   ```bash
   claude plugin validate ./plugins/lovable-agents
   # optional: try it in a session straight from disk, no install
   claude --plugin-dir ./plugins/lovable-agents
   ```

5. **Commit and push your branch:**

   ```bash
   git add -A
   git commit -m "design-reviewer: require alt text on all images"
   git push -u origin fix/design-reviewer-alt-text
   ```

6. **Open a pull request** against `main`:

   ```bash
   gh pr create --repo alsetsoft/lovable-agents --base main \
     --title "design-reviewer: require alt text on all images" \
     --body "What changed and why. Bumped version 1.0.0 -> 1.0.1."
   ```

   Or open it in the UI: https://github.com/alsetsoft/lovable-agents/pulls

7. **Get it reviewed — REQUIRED.** Request a reviewer and wait for **at least one approval from another team member**. Self-approval doesn't count; don't merge until someone else has signed off.

   ```bash
   gh pr edit --add-reviewer <teammate-github-username>
   # merge only after the PR shows an approving review from someone else:
   gh pr merge --squash
   ```

### PR checklist

- [ ] Change is scoped to `plugins/lovable-agents/`.
- [ ] **`version` in `plugin.json` is bumped** (SemVer).
- [ ] `claude plugin validate ./plugins/lovable-agents` passes.
- [ ] PR description says what changed and which version it bumps to.
- [ ] **At least one approval from another team member** (not the author).

### After merge

Once the PR is merged to `main`, anyone can pull the new version into their projects:

```text
/plugin marketplace update alsetsoft
/plugin update lovable-agents@alsetsoft
/reload-plugins
```

## Repository layout

```
lovable-agents/
├── .claude-plugin/
│   └── marketplace.json                # marketplace manifest (name: "alsetsoft")
├── plugins/
│   └── lovable-agents/
│       ├── .claude-plugin/
│       │   └── plugin.json             # plugin manifest (name: "lovable-agents")
│       ├── agents/                     # the 9 lovable-* agents (.md)
│       ├── skills/                     # pattern skills: <name>/SKILL.md
│       ├── scripts/
│       │   ├── visual-qa.mjs           # Playwright + axe runner used by lovable-visual-qa
│       │   └── test-docs.mjs           # e2e suite → testers' PDF generator (test-docs skill)
│       └── commands/
│           ├── lovable.md              # /lovable — build
│           ├── lovable-adopt.md        # /lovable-adopt — connect an existing project
│           ├── lovable-fix.md          # /lovable-fix — app-wide fixes
│           └── lovable-lesson.md       # /lovable-lesson — feedback → durable rule
└── README.md
```
