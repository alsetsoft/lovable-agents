---
description: Turn client/QA feedback or a bug into a durable rule — recorded in the project's instruction file and `.lovable/conventions.md` (decision log / patterns registry), with existing violations listed and, for domain-agnostic bugs, a proposal for the vlasnacrm-agents plugin. Dispatches the lovable-orchestrator agent.
argument-hint: <what happened + the client's/QA's words, e.g. "QA: archived customers still offered in the order form; client wants them hidden everywhere">
---

Invoke the `lovable-orchestrator` agent and follow its *Lessons* section. Reply in the user's language. Dispatch it in the **foreground** (`run_in_background: false`) and don't reply until it returns its final report; if it ever hands back an interim "still running" message, resume it (SendMessage) until the pipeline is done.

Lesson: $ARGUMENTS

Expected flow:
1. Classify: project decision · pattern · generic hardening.
2. Record it: the project's CLAUDE.md/AGENTS.md (its language and format) + `conventions.md` (Decision log or `## Patterns`) + `policy.json` if a key maps.
3. List existing violations `file:line`; fix only if asked — otherwise suggest `/lovable-fix`.
4. A bug (not just a preference) → a `@regression` e2e test for it via `lovable-e2e-writer`, so it can't come back.
5. Generic hardening → also draft a domain-agnostic proposal for vlasnacrm-agents (rule + reviewer grep), as text.
6. Short report of what was recorded where.
