---
name: test-docs
description: Generate the testers' PDF from the Playwright e2e suite — what's new since the last release, entity & relationship map (from the DB schema + e2e/relations.yaml), business flows, test cases by module with steps, expected results and last-run status, regression tests for fixed bugs, and what is not covered. Load when the user asks for test documentation / a test plan / a PDF for QA, or after e2e tests were added or changed.
---

# Testers' document from e2e tests

The document is **generated, never hand-written**: a deterministic script reads the test suite, the DB schema snapshot, `e2e/relations.yaml` and git history, renders HTML (Mermaid diagrams) and prints a PDF. The model only checks the result and, when asked, adds a short human summary. Language = `policy.locale` (`uk` or `en`).

## Inputs

| Input | Source | Required |
|-------|--------|----------|
| test cases (titles, steps, tags, annotations) | `npx playwright test --list --reporter=json` in the project (no tests are run) | yes |
| last-run status + failure reasons | Playwright JSON report (`test-results/results.json` from CI or a local run) | no |
| DB relationships | `snapshots/db/schema.sql` (kept by `lovable-db-snapshot`) | no |
| business flows + UI labels | `e2e/relations.yaml` | no (strongly recommended) |
| "what's new" | git: tests added/removed since `--since <ref>` (default: the latest tag) | no |

Tests must follow the `e2e-crud` conventions (title `<action>: <expected>`, `test.step`, `@<entity>` tags, `relation`/`bug` annotations) — that is what makes the document readable.

## Run

```bash
QA=~/.cache/lovable-qa; mkdir -p "$QA"
SRC=$(find ~/.claude/plugins -path "*vlasnacrm-agents*/scripts/test-docs.mjs" 2>/dev/null | sort -V | tail -1)
[ -n "$SRC" ] && cp "$SRC" "$QA/" || curl -fsSL https://raw.githubusercontent.com/alsetsoft/vlasnacrm-agents-plugin/main/plugins/vlasnacrm-agents/scripts/test-docs.mjs -o "$QA/test-docs.mjs"
cd "$QA" && [ -f package.json ] || printf '{"name":"lovable-qa","private":true,"type":"module"}\n' > package.json
[ -d node_modules/yaml ] && [ -d node_modules/mermaid ] && [ -d node_modules/playwright ] || npm i --silent playwright yaml mermaid
npx playwright install chromium

P=/abs/path/to/project
node "$QA/test-docs.mjs" --project "$P" --out "$P/test-docs/test-docs.pdf" --lang uk \
  --title "<App> — тестова документація" \
  --results "$P/test-results/results.json" \
  --schema "$P/snapshots/db/schema.sql" \
  --relations "$P/e2e/relations.yaml" \
  [--since v1.4.0] [--html "$P/test-docs/test-docs.html"]
```

Omit inputs that don't exist. The project needs `@playwright/test` installed (`npm ci`) for `--list`. Output goes to `test-docs/` (gitignored) or a CI artifact; commit a PDF only when the team wants one per release.

In CI, after the e2e step:

```yaml
      - if: always()
        run: |
          mkdir -p ~/.cache/lovable-qa && cd ~/.cache/lovable-qa && echo '{"type":"module"}' > package.json
          curl -fsSL https://raw.githubusercontent.com/alsetsoft/vlasnacrm-agents-plugin/main/plugins/vlasnacrm-agents/scripts/test-docs.mjs -o test-docs.mjs
          npm i --silent playwright yaml mermaid && npx playwright install chromium
          node test-docs.mjs --project "$GITHUB_WORKSPACE" --out "$GITHUB_WORKSPACE/test-docs.pdf" --lang uk \
            --results "$GITHUB_WORKSPACE/test-results/results.json" --schema "$GITHUB_WORKSPACE/snapshots/db/schema.sql" \
            --relations "$GITHUB_WORKSPACE/e2e/relations.yaml"
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: test-docs, path: test-docs.pdf, retention-days: 30 }
```

## What the PDF contains

1. Header: counts (test cases, modules, passed/failed/skipped), generation and last-run time.
2. **What's new** since the reference (added/removed test cases by module) — the testers' context for this release.
3. **Entity & relationship map** (Mermaid): entities from `relations.yaml` (or the schema), solid arrows = business flows, dashed = DB foreign keys.
4. **Business flows** table: from · action · to · rule.
5. **DB relationships** table (foreign keys between mapped entities).
6. **Test cases by module**: stable ID (`id` annotation or a hash of module + title), test case + its relations, steps, expected result (+ failure reason in red), status.
7. **Regression tests**: bug · test case · expected · status.
8. **Not covered**: entities and flows with no test — the manual-testing checklist.

## After generating

- `Read` the PDF and check: diagrams rendered, no raw English in a `uk` document, no empty modules, failures show a human reason (if not, the test lacks an `expect` message — fix the test).
- Report: path, counts, failed cases, uncovered entities/flows. Don't paste the document into chat.
