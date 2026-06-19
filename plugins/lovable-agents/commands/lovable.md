---
description: Build a Lovable-style Next.js (App Router)+TS+Tailwind+shadcn web app from a single prompt. Dispatches the lovable-orchestrator agent.
argument-hint: <what to build, e.g. "landing page for an AI note-taking app">
---

Invoke the `lovable-orchestrator` agent with the user's request below. Pass the request verbatim. Reply in the user's language.

User request: $ARGUMENTS

Expected flow (the orchestrator will run this):
1. Restate the goal in 1 sentence + name a design inspiration.
2. List v1 features (3–6 bullets).
3. Pick palette / fonts / animations.
4. Dispatch in order: `lovable-project-init` → `lovable-design-system` → (`lovable-component-builder` ∥ `lovable-page-assembler`) → `lovable-design-reviewer`.
5. Close with a 1–2 line summary.

If the user's request is a question, greeting, or ambiguous on scope, the orchestrator should discuss + clarify instead of building.
