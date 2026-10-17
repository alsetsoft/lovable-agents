---
description: Apply a UI fix or behaviour change across the whole app — find every place with the same kind of data/interaction, unify it behind one shared primitive, record the rule in conventions.md. Dispatches the lovable-orchestrator agent.
argument-hint: <what is wrong / what should change, e.g. "archived records show up in the customer picker" or "the item picker should show available quantity">
---

Invoke the `lovable-orchestrator` agent with the request below and the instruction to follow its **Consistency Rule** (fix the pattern, not the instance). Reply in the user's language.

Request: $ARGUMENTS

Expected flow:
1. Read `.claude/lovable/policy.json`, `.claude/lovable/conventions.md` (canon + `## Patterns`) and the project's CLAUDE.md / AGENTS.md if present.
2. Classify: pattern-wide (default) or explicitly screen-specific.
3. Inventory every occurrence of the same data shape / interaction (`file:line — current behaviour`) and show it in 3–10 lines; ask once only if it's very large or needs a product decision.
4. `lovable-component-builder`: one shared primitive, migrate all occurrences, delete local variants.
5. `lovable-design-reviewer`: section 13 must find zero stragglers; `tsc --noEmit` passes.
6. Add/update the pattern's entry in `conventions.md` → `## Patterns` and a dated line in the Decision log.
7. Summary: pattern, N sites unified, primitive path.
