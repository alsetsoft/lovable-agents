// lovable test-docs generator: Playwright e2e suite → PDF for testers.
// Run from a dir that has playwright, yaml and mermaid installed (~/.cache/lovable-qa):
//   node test-docs.mjs --project <app dir> --out <file.pdf> [--lang uk|en] [--title "…"]
//     [--results <playwright json report>] [--schema <schema.sql>] [--relations <relations.yaml>]
//     [--since <git ref>] [--e2e-dir e2e] [--html <file.html>]
// Read-only for the project: lists tests (`playwright test --list`), reads files and git history.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import YAML from "yaml";

const require = createRequire(import.meta.url);
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1]]] : acc), []),
);
const project = path.resolve(args.project ?? ".");
const out = path.resolve(args.out ?? path.join(project, "test-docs.pdf"));
const lang = args.lang ?? "uk";
const e2eDir = args["e2e-dir"] ?? "e2e";

const T = {
  uk: {
    title: "Тестова документація", generated: "Згенеровано", tests: "тест-кейсів", modules: "модулів",
    passed: "пройдено", failed: "впало", skipped: "пропущено", notRun: "не запускались",
    whatsNew: "Що нового", since: "з", added: "Додано", removed: "Видалено", noChanges: "Змін у тест-кейсах немає.",
    map: "Карта сутностей і зв'язків", flows: "Бізнес-потоки (що з чого створюється)", from: "Звідки", to: "Куди", action: "Дія", rule: "Правило",
    fk: "Зв'язки в базі даних", table: "Таблиця", column: "Поле", refs: "Посилається на",
    byModule: "Тест-кейси за модулями", id: "ID", testCase: "Тест-кейс", steps: "Кроки", expected: "Очікуваний результат", status: "Статус",
    regression: "Регресійні тести (виправлені баги)", bug: "Баг", gaps: "Що не покрито автотестами (перевірити вручну)",
    gapsNone: "Усі сутності з карти мають автотести.", lastRun: "Останній прогін", none: "—",
    legend: "✅ пройдено · ❌ впало · ⏭ пропущено · ⚪ не запускався", page: "Сторінка",
  },
  en: {
    title: "Test documentation", generated: "Generated", tests: "test cases", modules: "modules",
    passed: "passed", failed: "failed", skipped: "skipped", notRun: "not run",
    whatsNew: "What's new", since: "since", added: "Added", removed: "Removed", noChanges: "No test case changes.",
    map: "Entity & relationship map", flows: "Business flows (what is created from what)", from: "From", to: "To", action: "Action", rule: "Rule",
    fk: "Database relationships", table: "Table", column: "Column", refs: "References",
    byModule: "Test cases by module", id: "ID", testCase: "Test case", steps: "Steps", expected: "Expected result", status: "Status",
    regression: "Regression tests (fixed bugs)", bug: "Bug", gaps: "Not covered by automated tests (check manually)",
    gapsNone: "Every entity on the map has automated tests.", lastRun: "Last run", none: "—",
    legend: "✅ passed · ❌ failed · ⏭ skipped · ⚪ not run", page: "Page",
  },
}[lang] ?? null;
if (!T) throw new Error(`unsupported --lang ${lang} (uk|en)`);

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const mm = (s) => String(s ?? "").replace(/"/g, "#quot;").replace(/[<>]/g, "");
const sh = (cmd, a, opts = {}) => execFileSync(cmd, a, { cwd: project, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"], ...opts });

// ---------- 1. test cases ----------
function loadReport(json) {
  const specs = [];
  const walk = (suite, titles, file) => {
    const f = suite.file ?? file;
    const t = suite.title && suite.title !== f && !suite.title.endsWith(".ts") && !suite.title.endsWith(".js") ? [...titles, suite.title] : titles;
    for (const s of suite.specs ?? []) {
      const tst = s.tests?.[0] ?? {};
      const res = tst.results?.at(-1);
      specs.push({
        id: s.id, file: s.file ?? f, line: s.line, title: s.title, describe: t,
        tags: (s.tags ?? []).map((x) => (x.startsWith("@") ? x : "@" + x)),
        annotations: tst.annotations ?? [],
        status: tst.status, // expected | unexpected | flaky | skipped
        runSteps: (res?.steps ?? []).map((x) => x.title),
        error: (res?.error?.message ?? res?.errors?.[0]?.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n").find((l) => l.trim()) ?? "",
      });
    }
    for (const c of suite.suites ?? []) walk(c, t, f);
  };
  for (const s of json.suites ?? []) walk(s, [], s.file);
  return specs;
}

let listed;
try {
  listed = JSON.parse(sh("npx", ["playwright", "test", "--list", "--reporter=json"], { env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: "" } }));
} catch (e) {
  throw new Error("`npx playwright test --list --reporter=json` failed in " + project + ":\n" + (e.stderr || e.message));
}
let specs = loadReport(listed);
// one entry per spec (several projects/browsers list the same spec)
specs = [...new Map(specs.map((s) => [`${s.file}|${s.describe.join(">")}|${s.title}`, s])).values()];

const results = args.results && fs.existsSync(args.results) ? loadReport(JSON.parse(fs.readFileSync(args.results, "utf8"))) : [];
const runAt = args.results && fs.existsSync(args.results) ? fs.statSync(args.results).mtime : null;
const byKey = new Map(results.map((r) => [`${r.file}|${r.describe.join(">")}|${r.title}`, r]));

const testRoot = listed.config?.rootDir ?? path.join(project, e2eDir);
const sourceCache = new Map();
const src = (file) => {
  const p = path.isAbsolute(file) ? file : path.join(testRoot, file);
  if (!sourceCache.has(p)) sourceCache.set(p, fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n") : []);
  return sourceCache.get(p);
};
const STEP_RE = /test\.step\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
for (const s of specs) {
  const r = byKey.get(`${s.file}|${s.describe.join(">")}|${s.title}`);
  s.status = r?.status ?? null;
  s.error = r?.status === "unexpected" ? r.error : "";
  // steps: from the last run if available, else statically from the source between this test and the next one
  if (r?.runSteps?.length) s.steps = r.runSteps.filter((x) => !/^(Before|After) Hooks$|^(fixture|attach)/i.test(x));
  else {
    const lines = src(s.file);
    const next = Math.min(...specs.filter((o) => o.file === s.file && o.line > s.line).map((o) => o.line), lines.length + 1);
    const body = lines.slice(s.line - 1, next - 1).join("\n");
    s.steps = [...body.matchAll(STEP_RE)].map((m) => m[2]);
  }
  const m = s.title.match(/^(.*?)(?::\s|\s[—–-]\s)(.+)$/);
  s.action = m ? m[1] : s.title;
  s.expected = m ? m[2] : "";
  s.module = s.describe[0] ?? path.basename(s.file).replace(/\.(spec|test)\.[jt]sx?$/, "");
  s.bug = s.annotations.find((a) => a.type === "bug")?.description ?? null;
  s.relations = s.annotations.filter((a) => a.type === "relation").map((a) => a.description);
  s.regression = s.tags.includes("@regression") || !!s.bug;
}

// ---------- 2. relationships ----------
const fks = [];
if (args.schema && fs.existsSync(args.schema)) {
  const sql = fs.readFileSync(args.schema, "utf8");
  const tn = (x) => x.replace(/"/g, "").replace(/^public\./, "");
  for (const m of sql.matchAll(/ALTER TABLE (?:ONLY )?([\w."]+)\s+ADD CONSTRAINT [\w"]+ FOREIGN KEY \(([^)]+)\) REFERENCES ([\w."]+)\s*\(([^)]+)\)/gi))
    fks.push({ table: tn(m[1]), column: m[2].replace(/"/g, ""), ref: tn(m[3]) });
  for (const t of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([\w."]+)\s*\(([\s\S]*?)\);/gi))
    for (const col of t[2].split(/,(?![^(]*\))/)) {
      const c = col.match(/^\s*"?(\w+)"?\s+[\s\S]*?REFERENCES\s+([\w."]+)/i);
      if (c && !/^\s*(constraint|foreign|primary|unique|check)\b/i.test(col)) fks.push({ table: tn(t[1]), column: c[1], ref: tn(c[2]) });
    }
}
const rel = args.relations && fs.existsSync(args.relations) ? YAML.parse(fs.readFileSync(args.relations, "utf8")) ?? {} : {};
const entities = rel.entities ?? {}; // { orders: { label, module } }
const flows = rel.flows ?? []; // [{ from, to, action, rule }]
const label = (k) => entities[k]?.label ?? k;

// ---------- 3. what's new (git) ----------
let since = typeof args.since === "string" ? args.since : null;
try { if (!since) since = sh("git", ["describe", "--tags", "--abbrev=0"]).trim(); } catch { since = null; }
const whatsNew = { added: [], removed: [], ref: since };
if (since) {
  try {
    const titleRe = /\btest(?:\.(?:only|skip|fixme|fail))?\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
    const files = [...new Set(specs.map((s) => s.file))];
    const oldFiles = sh("git", ["ls-tree", "-r", "--name-only", since, "--", e2eDir]).split("\n").filter(Boolean);
    const rel2 = (f) => path.relative(project, path.isAbsolute(f) ? f : path.join(testRoot, f));
    const oldTitles = new Set();
    for (const f of oldFiles) {
      const txt = sh("git", ["show", `${since}:${f}`]);
      for (const m of txt.matchAll(titleRe)) oldTitles.add(`${f}|${m[2]}`);
    }
    const nowTitles = new Set(specs.map((s) => `${rel2(s.file)}|${s.title}`));
    for (const s of specs) if (!oldTitles.has(`${rel2(s.file)}|${s.title}`)) whatsNew.added.push(s);
    for (const k of oldTitles) if (!nowTitles.has(k)) whatsNew.removed.push({ file: k.split("|")[0], title: k.split("|").slice(1).join("|") });
    void files;
  } catch { whatsNew.ref = null; }
}

// ---------- 4. coverage gaps ----------
const mentioned = new Set();
for (const s of specs) {
  s.tags.forEach((t) => mentioned.add(t.slice(1)));
  s.relations.forEach((r) => r.split(/[^\w-]+/).forEach((w) => w && mentioned.add(w)));
}
const mapEntities = Object.keys(entities).length ? Object.keys(entities) : [...new Set(fks.flatMap((f) => [f.table, f.ref]))];
const gaps = mapEntities.filter((e) => !mentioned.has(e));
const flowGaps = flows.filter((f) => !specs.some((s) => s.relations.some((r) => r.includes(f.from) && r.includes(f.to))));

// ---------- 5. html ----------
const icon = (st) => ({ expected: "✅", unexpected: "❌", flaky: "⚠️", skipped: "⏭" })[st] ?? "⚪";
const count = (st) => specs.filter((s) => s.status === st).length;
const modules = [...new Set(specs.filter((s) => !s.regression).map((s) => s.module))];
// stable ids: explicit annotation { type: "id" } wins, else a short hash of module + title (survives reordering)
const ids = new Map(specs.map((s) => [s, s.annotations.find((a) => a.type === "id")?.description
  ?? "TC-" + createHash("sha1").update(`${s.module}|${s.title}`).digest("hex").slice(0, 6).toUpperCase()]));

const mapNodes = new Set(mapEntities.slice(0, 40));
const mapEdges = [
  ...flows.filter((f) => mapNodes.has(f.from) && mapNodes.has(f.to)).map((f) => `  ${f.from} -->|"${mm(f.action ?? "")}"| ${f.to}`),
  ...(mapEntities.length <= 40 ? fks.filter((f) => mapNodes.has(f.table) && mapNodes.has(f.ref) && f.table !== f.ref).map((f) => `  ${f.table} -.->|"${mm(f.column)}"| ${f.ref}`) : []),
];
const mermaidMap = mapNodes.size
  ? `flowchart LR\n${[...mapNodes].map((e) => `  ${e}["${mm(label(e))}"]`).join("\n")}\n${[...new Set(mapEdges)].join("\n")}`
  : null;

const row = (s) => `<tr class="${s.status === "unexpected" ? "fail" : ""}">
  <td class="id">${ids.get(s)}</td>
  <td><b>${esc(s.action)}</b>${s.relations.length ? `<div class="rel">${s.relations.map(esc).join(" · ")}</div>` : ""}</td>
  <td>${s.steps.length ? `<ol>${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : T.none}</td>
  <td>${esc(s.expected) || T.none}${s.error ? `<div class="err">${esc(s.error.slice(0, 300))}</div>` : ""}</td>
  <td class="st">${icon(s.status)}</td></tr>`;
const table = (list) => `<table><thead><tr><th>${T.id}</th><th>${T.testCase}</th><th>${T.steps}</th><th>${T.expected}</th><th>${T.status}</th></tr></thead><tbody>${list.map(row).join("")}</tbody></table>`;

const title = args.title ?? `${T.title}`;
const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  body { font: 10.5px/1.45 Inter, "Segoe UI", Roboto, "DejaVu Sans", Arial, sans-serif; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; break-after: avoid; }
  h3 { font-size: 12px; margin: 12px 0 4px; break-after: avoid; }
  .meta { color: #555; margin-bottom: 8px; } .kpi { display: flex; gap: 14px; margin: 6px 0 2px; } .kpi div { border: 1px solid #ddd; border-radius: 6px; padding: 4px 8px; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; } th, td { border: 1px solid #ddd; padding: 3px 5px; vertical-align: top; text-align: left; }
  th { background: #f3f3f3; font-weight: 600; } tr { break-inside: avoid; } tr.fail td { background: #fdecec; }
  td.id { white-space: nowrap; font-variant-numeric: tabular-nums; color: #555; } td.st { text-align: center; width: 34px; }
  ol { margin: 0; padding-left: 16px; } .rel { color: #555; font-size: 9.5px; margin-top: 2px; }
  ul { margin: 2px 0 6px; padding-left: 18px; } .muted { color: #666; } .mermaid { margin: 6px 0 10px; text-align: center; }
  .err { color: #b42318; font-size: 9.5px; margin-top: 3px; } .plus { color: #0a7a32; } .minus { color: #b42318; }
</style></head><body>
<h1>${esc(title)}</h1>
<div class="meta">${T.generated}: ${new Date().toLocaleString(lang === "uk" ? "uk-UA" : "en-GB")}${runAt ? ` · ${T.lastRun}: ${runAt.toLocaleString(lang === "uk" ? "uk-UA" : "en-GB")}` : ""}</div>
<div class="kpi"><div><b>${specs.length}</b> ${T.tests}</div><div><b>${modules.length}</b> ${T.modules}</div>
${results.length ? `<div>✅ ${count("expected") + count("flaky")} ${T.passed}</div><div>❌ ${count("unexpected")} ${T.failed}</div><div>⏭ ${count("skipped")} ${T.skipped}</div>` : `<div>⚪ ${T.notRun}</div>`}</div>
<div class="muted">${T.legend}</div>

${whatsNew.ref ? `<h2>${T.whatsNew} (${T.since} ${esc(whatsNew.ref)})</h2>
${whatsNew.added.length || whatsNew.removed.length ? `
${whatsNew.added.length ? `<h3 class="plus">+ ${T.added}: ${whatsNew.added.length}</h3><ul>${whatsNew.added.map((s) => `<li><b>${esc(s.module)}</b> — ${esc(s.title)} <span class="muted">${ids.get(s)}</span></li>`).join("")}</ul>` : ""}
${whatsNew.removed.length ? `<h3 class="minus">− ${T.removed}: ${whatsNew.removed.length}</h3><ul>${whatsNew.removed.map((r) => `<li>${esc(r.title)} <span class="muted">${esc(r.file)}</span></li>`).join("")}</ul>` : ""}` : `<p class="muted">${T.noChanges}</p>`}` : ""}

${mermaidMap ? `<h2>${T.map}</h2><pre class="mermaid">${esc(mermaidMap)}</pre>` : ""}

${flows.length ? `<h2>${T.flows}</h2><table><thead><tr><th>${T.from}</th><th>${T.action}</th><th>${T.to}</th><th>${T.rule}</th></tr></thead><tbody>
${flows.map((f) => `<tr><td>${esc(label(f.from))}</td><td>${esc(f.action ?? "")}</td><td>${esc(label(f.to))}</td><td>${esc(f.rule ?? "") || T.none}</td></tr>`).join("")}</tbody></table>` : ""}

${fks.length ? `<h2>${T.fk}</h2><table><thead><tr><th>${T.table}</th><th>${T.column}</th><th>${T.refs}</th></tr></thead><tbody>
${fks.filter((f) => !Object.keys(entities).length || entities[f.table] || entities[f.ref]).map((f) => `<tr><td>${esc(label(f.table))}</td><td>${esc(f.column)}</td><td>${esc(label(f.ref))}</td></tr>`).join("")}</tbody></table>` : ""}

<h2>${T.byModule}</h2>
${modules.map((m) => `<h3>${esc(m)}</h3>${table(specs.filter((s) => s.module === m && !s.regression))}`).join("")}

${specs.some((s) => s.regression) ? `<h2>${T.regression}</h2><table><thead><tr><th>${T.id}</th><th>${T.bug}</th><th>${T.testCase}</th><th>${T.expected}</th><th>${T.status}</th></tr></thead><tbody>
${specs.filter((s) => s.regression).map((s) => `<tr class="${s.status === "unexpected" ? "fail" : ""}"><td class="id">${ids.get(s)}</td><td>${esc(s.bug ?? T.none)}</td><td><b>${esc(s.action)}</b><div class="rel">${esc(s.module)}</div></td><td>${esc(s.expected) || T.none}</td><td class="st">${icon(s.status)}</td></tr>`).join("")}</tbody></table>` : ""}

${mapEntities.length || flows.length ? `<h2>${T.gaps}</h2>${gaps.length || flowGaps.length ? `<ul>
${gaps.map((g) => `<li>${esc(label(g))} <span class="muted">(${esc(g)})</span></li>`).join("")}
${flowGaps.map((f) => `<li>${esc(label(f.from))} → ${esc(label(f.to))}: ${esc(f.action ?? "")}</li>`).join("")}</ul>` : `<p class="muted">${T.gapsNone}</p>`}` : ""}
</body></html>`;

if (args.html) fs.writeFileSync(path.resolve(args.html), html);

// ---------- 6. pdf ----------
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: "chrome" }); }
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
if (mermaidMap) {
  await page.addScriptTag({ path: require.resolve("mermaid/dist/mermaid.min.js") });
  await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    mermaid.initialize({ startOnLoad: false, theme: "neutral", flowchart: { useMaxWidth: true } });
    // eslint-disable-next-line no-undef
    await mermaid.run({ querySelector: ".mermaid" });
  });
}
await page.pdf({
  path: out, format: "A4", printBackground: true, displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font:8px Inter,'Segoe UI',Roboto,'DejaVu Sans',Arial,sans-serif;width:100%;text-align:center;color:#777">${esc(title)} · ${T.page} <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
  margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
});
await browser.close();
console.log(`test-docs: ${specs.length} test cases, ${modules.length} modules, ${fks.length} FKs, ${flows.length} flows, ${gaps.length + flowGaps.length} gaps → ${out}`);
