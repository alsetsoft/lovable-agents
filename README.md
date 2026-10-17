# lovable-agents

Shared [Claude Code](https://docs.claude.com/en/docs/claude-code) agents for building **Lovable-style** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui apps — marketing sites and CRM/ERP back-offices.

This repo is a **Claude Code plugin marketplace**. Install it once in any project (or globally) and every project gets the same agents. Edit an agent here, push, and all projects pull the update — no more copy-pasting between repos.

## What's inside

A single plugin, `lovable-agents`, bundling:

| Agent | Role |
|-------|------|
| `lovable-orchestrator` | Owns the full build workflow; delegates to the agents below. |
| `lovable-project-init` | Scaffolds a fresh Next.js + TS + Tailwind + shadcn project (idempotent). |
| `lovable-design-system` | Authors the design system: `globals.css` tokens + `tailwind.config.ts`. |
| `lovable-component-builder` | Builds individual React + TS components from the design system. |
| `lovable-page-assembler` | Assembles full pages, routes, client-side data fetching (pagination/sort/search) and, for marketing, SEO. |
| `lovable-db-snapshot` | Keeps an in-repo snapshot of the DB schema (`snapshots/db/schema.sql` + `SCHEMA.md`) for Supabase-like providers; runs after any schema change. |
| `lovable-design-reviewer` | Final pass: design tokens, policy compliance, CRUD hardening, canon conformance, DB snapshot, and (marketing) SEO. Fixes what it finds. |

Plus two slash commands: `/lovable` kicks off a build from a single prompt; `/lovable-fix` applies a UI fix or behaviour change app-wide (see *Consistency*).

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

## Project policy — `.claude/lovable/policy.json`

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
  "seo": { "enabled": false }
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

## Conventions & golden reference — `.claude/lovable/conventions.md`

After the first complete entity (list + create/edit form) passes review, the orchestrator records it as the **canon**: the canonical list file, the canonical form file, shared primitives (data table, pagination, form shell, submit lock, search helper, formatters…) and a dated **decision log** of client requirements. Later lists/forms copy the canon instead of re-deriving layout from prose; the reviewer flags divergence and re-implemented primitives.

## Consistency — fix the pattern, not the instance

A fix noticed on one screen (archived records shown differently in a select, a filter and a list; a record picker that shows quantity on one form but not another) is applied to **every** place with the same kind of data or interaction, in the same change:

1. inventory all occurrences by data shape and behaviour (not just by component name);
2. one shared primitive (component / hook / helper / DB-generated field), every occurrence migrated, local variants deleted;
3. the rule recorded in `conventions.md` → `## Patterns` (rule · primitive · detection grep · date);
4. the reviewer (section 13) re-runs every registered pattern's grep and blocks stragglers, and flags unregistered divergence (the same thing solved twice).

Use `/lovable-fix <what's wrong>` or just describe the fix — the orchestrator applies this rule by default; say "only on this screen" to keep a change local.

## Hardening

The builder implements and the reviewer greps for generic CRUD bugs: double submit (ref-based submit lock held through navigation), Radix `Select` spurious `onValueChange("")` wiping form values, negative numbers via paste, native date inputs in non-English locales, archived records offered in new selections, user search text interpolated into PostgREST filters, open redirects via `?from=`, out-of-range pages (416), truncated text without tooltips.

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

## Updating

After you push changes to this repo, pull them into any project:

```text
/plugin marketplace update alsetsoft
/plugin update lovable-agents@alsetsoft
```

## Managing versions

`plugins/lovable-agents/.claude-plugin/plugin.json` has a `version` field:

- **Keep bumping `version`** (e.g. `1.0.0` → `1.1.0`) for controlled releases — installs only update when you raise it.
- **Remove the `version` field** to use the commit SHA as the version — every push becomes a new version (handy for fast iteration).

## Editing the agents

Agents are plain Markdown files with YAML frontmatter under
`plugins/lovable-agents/agents/`. Edit them, bump the version, and push:

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
   - The slash command lives in `commands/lovable.md`.

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
│       ├── agents/                     # the 7 lovable-* agents (.md)
│       └── commands/
│           ├── lovable.md              # the /lovable command
│           └── lovable-fix.md          # the /lovable-fix command (app-wide fixes)
└── README.md
```
