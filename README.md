# lovable-agents

Claude Code plugin that builds Next.js 16 + React 19 + Tailwind v4 + shadcn + Supabase apps — landing pages (`marketing`) and CRM/ERP back-offices (`backoffice`) — and keeps every screen consistent, tested and reviewed.

> **2.0 is breaking:** project files moved from `.claude/lovable/` to `.lovable/`. Agents move it on the next write, or run `git mv .claude/lovable .lovable`.

## Install

```text
/plugin marketplace add alsetsoft/lovable-agents
/plugin install lovable-agents@alsetsoft
```

Update: `/plugin marketplace update alsetsoft` → `/plugin update lovable-agents@alsetsoft` → `/reload-plugins`.

For the whole team on a project, commit to its `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": { "alsetsoft": { "source": { "source": "github", "repo": "alsetsoft/lovable-agents" } } },
  "enabledPlugins": { "lovable-agents@alsetsoft": true }
}
```

## Use

| You want to… | Run |
|--------------|-----|
| build a new app | `/lovable backoffice CRM for a furniture store: clients, orders, payments` |
| connect an existing project (once) | `/lovable-adopt` — writes `.lovable/policy.json` + `conventions.md` from your CLAUDE.md and code; review and commit them |
| add a screen / entity | `/lovable add a suppliers list and form` |
| fix UI or a bug | `/lovable-fix archived records still appear in pickers` — fixed app-wide, `@regression` e2e test first |
| make a client/QA remark a rule | `/lovable-lesson after saving, stay on the record` |
| one task by a recipe | `/lovable-agents:<skill> <task>`, e.g. `/lovable-agents:document-lines purchase order with lines` |
| PDF of test cases for QA | `/lovable-agents:test-docs` |

Your `CLAUDE.md` / `AGENTS.md` always win over `.lovable/policy.json`, which wins over the agents' defaults. Commit `.lovable/` with the code.

**Skills:** `crud-list`, `crud-form`, `document-lines`, `bulk-actions`, `filters`, `dashboard-charts`, `master-detail-tabs`, `export-print`, `e2e-crud`, `test-docs`.

**Tests:** e2e and visual QA run only against a test environment (local stack or a separate test DB), never production. For logged-in screens set `E2E_EMAIL` / `E2E_PASSWORD` (e2e) and `LOVABLE_QA_EMAIL` / `LOVABLE_QA_PASSWORD` (visual QA).

## Structure

```
.claude-plugin/marketplace.json          marketplace "alsetsoft"
plugins/lovable-agents/
  .claude-plugin/plugin.json             name + version
  agents/     orchestrator → project-init, design-system, component-builder, page-assembler,
              db-snapshot, design-reviewer, e2e-writer, visual-qa
  commands/   /lovable, /lovable-adopt, /lovable-fix, /lovable-lesson
  skills/     <name>/SKILL.md — rules for data screens and tests (+ an Audit table for the reviewer)
  scripts/    visual-qa.mjs, test-docs.mjs
```

Agents read rules from skills by name; change a data-screen rule in its skill, not in the agents. Keep everything generic — no project-specific names or business rules (those go into the project's CLAUDE.md or `.claude/skills/`).

## Contribute

1. Branch off `main`, edit under `plugins/lovable-agents/`.
2. **Bump `version`** in `plugin.json` (SemVer) — without it `/plugin update` keeps serving the old version.
3. Check locally:
   ```bash
   claude plugin validate ./plugins/lovable-agents
   claude --plugin-dir ./plugins/lovable-agents   # try it without installing
   ```
4. Open a PR to `main`; merge after one approval from another team member.
