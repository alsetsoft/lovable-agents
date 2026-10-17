---
description: Connect the lovable agents to an EXISTING project — read its instruction files (CLAUDE.md/AGENTS.md…) and code, derive `.claude/lovable/policy.json` and `conventions.md` (canon, primitives, patterns, decision log). Read-only except those two files. Dispatches the lovable-orchestrator agent.
argument-hint: [optional notes, e.g. "the canonical list is src/components/clients/clients-view.tsx"]
---

Invoke the `lovable-orchestrator` agent in **Adopt mode** (see its *Existing projects → Adopt mode* section). Reply in the user's language.

Notes from the user: $ARGUMENTS

Expected flow:
1. Read the project instruction files (CLAUDE.md, AGENTS.md, .cursorrules, .github/copilot-instructions.md…).
2. Detect stack + styling mode (read-only).
3. Infer every `policy.json` key from instruction files and code, with evidence; mark the rest as assumed.
4. Pick the canonical list/form, list shared primitives, build the Patterns registry and the Divergent clusters, and the dated Decision log with sources.
5. Write only `.claude/lovable/policy.json` and `.claude/lovable/conventions.md` (merge if they exist). No code changes.
6. Report ≤ 12 lines: inferred vs assumed keys, canon, counts, divergent clusters → suggest `/lovable-fix` for each.
