---
name: e2e-crud
description: Playwright end-to-end tests for a data app — one-time setup (config, auth, safe test environment, CI), how to write CRUD, relationship and regression tests whose titles and steps read as real test cases for QA (they feed the test-docs PDF). Load when adding e2e tests for a feature/entity, writing a regression test for a bug fix, or setting up e2e/CI in a project.
---

# E2E tests (Playwright)

Tests are the **single source of truth** for what is verified: their titles, steps, tags and annotations are turned into the testers' document by the `test-docs` skill. Write them so a tester can read them without opening the code.

## Safety first

- Tests run against a **test environment only**: a separate test database/project (e.g. a free Supabase project "test") or a local stack — never production, never the team's shared working database.
- `playwright.config.ts` refuses to start when `E2E_BASE_URL` points to a forbidden host (`E2E_FORBIDDEN_HOSTS`, comma-separated, set in CI and `.env.e2e.example`).
- A dedicated test user (`E2E_EMAIL` / `E2E_PASSWORD`) with normal (not admin) rights unless a test needs admin; credentials only from env/CI secrets, never committed.
- Every record a test creates has a unique prefix (`e2e-<runId>-…`) and is cleaned up (archived/deleted) in `afterAll` by that prefix.

## Setup (once per project)

```
e2e/
  auth.setup.ts        # logs in once, saves storageState
  fixtures.ts          # uniq(), api client as the test user, cleanup helpers
  relations.yaml       # business flows for the testers' document (see below)
  <module>.spec.ts     # one file per module/entity
playwright.config.ts
.env.e2e.example       # E2E_BASE_URL, E2E_EMAIL, E2E_PASSWORD, E2E_FORBIDDEN_HOSTS
```

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const forbidden = (process.env.E2E_FORBIDDEN_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);
if (forbidden.some((h) => new URL(baseURL).host.endsWith(h))) throw new Error(`E2E refused: ${baseURL} is a forbidden host`);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["json", { outputFile: "test-results/results.json" }], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", locale: "uk-UA", timezoneId: "Europe/Kyiv" }, // from policy.locale / policy.timezone
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 }, storageState: "e2e/.auth/user.json" }, dependencies: ["setup"] },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
```

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";
setup("login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-?mail|пошта/i).fill(process.env.E2E_EMAIL!);
  await page.getByLabel(/пароль|password/i).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /увійти|sign in|log in/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
```

- `package.json`: `"e2e": "playwright test"`, `"e2e:smoke": "playwright test --grep @smoke"`; dev dependency `@playwright/test`.
- `.gitignore`: `e2e/.auth/`, `test-results/`, `playwright-report/`, `.env.e2e`.
- Data helpers in `fixtures.ts`: `uniq(name)` → `e2e-${runId}-${name}`; an API client signed in as the test user (same RLS as the UI) to create **prerequisites** quickly and to clean up by prefix. The entity under test is created **through the UI**.

## How a test reads (it becomes a test case)

```ts
test.describe("Замовлення покупців", () => {                       // module = the UI section name
  test("Створити замовлення з 2 позиціями: після «Зберегти» лишаємось у картці, сума = Σ кількість × ціна", {
    tag: ["@orders", "@smoke"],                                      // @<entity table> + @smoke for the core path
    annotation: [{ type: "relation", description: "orders → order_items (1:N)" }],
  }, async ({ page }) => {
    await test.step("Відкрити «Замовлення» → «+ Замовлення»", async () => { … });
    await test.step("Обрати контрагента e2e-…, додати 2 товари з кількістю 2 і 3", async () => { … });
    await test.step("Натиснути «Зберегти»", async () => { … });
    await test.step("URL /orders/<id>, тост «Збережено», сума = 2×ціна₁ + 3×ціна₂", async () => {
      await expect(page, "після створення має відкритись картка нового замовлення").toHaveURL(/\/orders\/[\w-]+$/);
    });
  });
});
```

- **Title** = `<action>: <expected result>` in the project's UI language (`policy.locale`) — the part after `:` becomes "Expected result" in the document.
- **Steps** = `test.step("…")` in the same language, as a tester would do them, using the visible UI names in «».
- **Tags**: `@<entity>` (the DB table name, so the document maps tests to entities), `@smoke` for the critical path (runs on every PR), `@regression` for bug-fix tests.
- **Annotations**: `relation` (`"<from> → <to> (<1:N | flow>)"`) for every test that exercises a relationship; `bug` (`"<ticket>: <what was wrong>"`) for regression tests; optional `id` (`"TC-ORD-001"`) when QA needs fixed ids.
- **Assertions carry a human message** in the UI language: `expect(x, "сума має дорівнювати Σ кількість × ціна").toBe(…)` — it appears as the failure reason in the document.
- Locators by role/label/visible text (`getByRole`, `getByLabel`, `getByText`); `data-testid` only where there is no accessible name. No CSS-class selectors, no `waitForTimeout` — wait for a visible state or a response.
- Tests are independent (own data, any order, parallel-safe).

## What to cover for each entity / feature

From the project's policy and the pattern skills — test the behaviour users rely on, not implementation details:

| Area | Tests |
|------|-------|
| List (`crud-list`) | opens with rows; search by two words in any order finds the created record; new record appears; archived hidden by default and shown (at the end) with "Show archived" |
| Create (`crud-form`) | required-field validation messages; create → lands per `forms.afterCreate` + success toast; **double click on Create → exactly one record** |
| Edit | change a field → Save → stays per `forms.afterSave`, toast, value persists after reload |
| Archive / delete | confirm dialog; archived record disappears from new selections in other forms but still opens |
| Relationships | every FK the UI exposes: pick the parent in the child's form, see the child from the parent's card; "create X from Y" flows from `relations.yaml` incl. their limits (cannot exceed what's left) |
| Documents with lines (`document-lines`) | totals = formula; reopening a saved document doesn't change its numbers; removing a line updates totals |
| Bulk actions (`bulk-actions`) | confirmation shows the server count; result toast; only the selected scope changed |
| Permissions | a non-admin can't do the admin-only action (UI hidden/disabled and the server refuses) |

Keep `@smoke` small (one create + one edit per core entity, ~2–4 min total).

## Regression tests for bug fixes (always)

Every bug fix comes with a regression test, **written first**:

1. Reproduce the bug as a test (it fails on the current code — run it and see the failure, when the environment allows).
2. Fix the code; the test passes.
3. Title describes the **correct** behaviour ("Пошук «/» не друкує символ у поле: курсор у пошуку, поле порожнє"); tag `@regression` + the entity tag; annotation `bug` = `"<ticket>: <what was wrong>"`.
4. Put it in the module's spec file (not a separate "bugs" file) so it lives next to related cases.

If the bug can't be reproduced end-to-end (pure data/SQL issue), add the closest e2e check of the visible symptom and say so in the report.

## `e2e/relations.yaml` (for the testers' document)

```yaml
entities:                      # DB table → label in the UI language, module
  orders: { label: "Замовлення покупців", module: "Продажі" }
  shipments: { label: "Відвантаження", module: "Склад" }
flows:                         # what is created from what — the business view of relationships
  - from: orders
    to: shipments
    action: "Створити відвантаження із замовлення"
    rule: "Не більше, ніж замовлено − вже відвантажено"
```

Add an entity/flow whenever you add tests for it; the document marks entities/flows without tests as "not covered".

## CI (GitHub Actions, fits the free plan)

```yaml
# .github/workflows/e2e.yml
name: e2e
on:
  pull_request: { paths-ignore: ["**/*.md", "docs/**"] }
  schedule: [{ cron: "0 2 * * *" }]   # full suite nightly
  workflow_dispatch:
concurrency: { group: e2e-${{ github.ref }}, cancel-in-progress: true }
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}            # test deployment, or omit to use webServer (npm run dev)
      E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
      E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
      E2E_FORBIDDEN_HOSTS: ${{ vars.E2E_FORBIDDEN_HOSTS }}
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.TEST_SUPABASE_PUBLISHABLE_KEY }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }                            # tags for "what's new" in the testers' document
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/cache@v4
        with: { path: ~/.cache/ms-playwright, key: pw-${{ hashFiles('package-lock.json') }} }
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test ${{ github.event_name == 'pull_request' && '--grep @smoke' || '' }}
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: e2e-report, path: "playwright-report/\ntest-results/results.json", retention-days: 14 }
```

The testers' PDF can be built in the same job (see `test-docs`). Only Linux runners (macOS minutes cost 10×).

## Audit (reviewer)

| Check | Severity |
|-------|----------|
| a new entity/feature merged without e2e tests (create + edit at least) | WARN (BLOCKER when `policy.e2e.required`) |
| a bug fix without a `@regression` test (or a stated reason it can't be e2e) | BLOCKER |
| test titles/steps not in the UI language, or a title without `:` expected result | WARN |
| missing `@<entity>` tag / `relation` annotation on a relationship test | WARN |
| CSS-class selectors, `waitForTimeout`, tests depending on other tests' data | WARN |
| production URL/keys reachable from the e2e config, credentials in the repo | BLOCKER |
| created records not prefixed/cleaned up | WARN |
