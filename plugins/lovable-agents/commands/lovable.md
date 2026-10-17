---
description: Build a Lovable-style Next.js (App Router)+TS+Tailwind+shadcn web app from a single prompt — a marketing site or a CRM/ERP back-office. Dispatches the lovable-orchestrator agent.
argument-hint: [marketing|backoffice] <what to build, e.g. "landing page for an AI note-taking app" or "backoffice CRM for a furniture store">
---

Invoke the `lovable-orchestrator` agent with the user's request below. Pass the request verbatim. Reply in the user's language. If the request starts with `marketing` or `backoffice`, that is the profile — don't infer it.

User request: $ARGUMENTS

Expected flow (the orchestrator will run this):
1. Profile & policy: read the project instruction files (CLAUDE.md/AGENTS.md…), `.claude/lovable/policy.json` + `.claude/lovable/conventions.md` if present; an existing app without a policy → Adopt mode first (as `/lovable-adopt`); only an empty project picks the profile (`marketing` / `backoffice`) and write the policy with its defaults plus the user's stated requirements.
2. Restate the goal in 1 sentence + the profile + a design direction.
3. List v1 features (3–6 bullets).
4. Pick palette / fonts (and, for marketing, gradients/animations).
5. Dispatch in order: `lovable-project-init` → `lovable-design-system` → (`lovable-component-builder` ∥ `lovable-page-assembler`) → `lovable-db-snapshot` (only if the DB schema was touched) → `lovable-design-reviewer` → `lovable-visual-qa` (UI changes; report-only unless `qa.blocking`).
6. After the first complete entity (list + form) passes review, record it as the canon in `.claude/lovable/conventions.md`.
7. Close with a 1–2 line summary.

If the user's request is a question, greeting, or ambiguous on scope, the orchestrator should discuss + clarify instead of building.
