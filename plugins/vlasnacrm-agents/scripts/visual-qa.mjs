// visual-qa runner. Run from a dir that has playwright + @axe-core/playwright installed:
//   node visual-qa.mjs <config.json>
// Read-only: it only opens pages, clicks the first table row to resolve detail routes, and takes screenshots.
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const cfg = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = cfg.outDir;
fs.mkdirSync(out, { recursive: true });
const viewports = cfg.viewports ?? [
  { name: "laptop", width: 1366, height: 768, budget: true },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "tablet", width: 768, height: 1024 },
];
const themes = cfg.dark ? ["light", "dark"] : ["light"];

let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: "chrome" }); } // system Chrome fallback

let storageState;
if (cfg.auth) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const a = cfg.auth;
  await page.goto(cfg.baseUrl + (a.loginPath ?? "/login"));
  await page.locator(a.emailSelector ?? 'input[type="email"], input[name="email"]').first().fill(a.email);
  await page.locator(a.passwordSelector ?? 'input[type="password"]').first().fill(a.password);
  await page.locator(a.submitSelector ?? 'button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith(a.loginPath ?? "/login"), { timeout: 20000 });
  storageState = await ctx.storageState();
  await ctx.close();
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  // wait for skeletons / spinners to disappear (max 10 s)
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="skeleton"], .animate-pulse, [aria-busy="true"]'),
    null, { timeout: 10000 },
  ).catch(() => {});
}

async function resolvePath(page, r) {
  if (!r.firstRowOf) return r.path;
  await page.goto(cfg.baseUrl + r.firstRowOf);
  await settle(page);
  const row = page.locator("tbody tr").first();
  if (!(await row.count())) return null;
  const before = page.url();
  await row.click();
  await page.waitForURL((u) => u.href !== before, { timeout: 10000 }).catch(() => {});
  return page.url() === before ? null : new URL(page.url()).pathname + new URL(page.url()).search;
}

const results = [];
const slug = (s) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";

for (const r of cfg.routes) {
  for (const vp of viewports) {
    for (const theme of themes) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, storageState });
      const page = await ctx.newPage();
      const consoleErrors = [];
      const failed = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
      page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 300)));
      page.on("response", (res) => {
        if (res.status() >= 400 && !res.url().includes("favicon")) failed.push(`${res.status()} ${res.request().method()} ${res.url().slice(0, 200)}`);
      });
      const p = await resolvePath(page, r);
      const item = { route: r.path, resolved: p, kind: r.kind ?? "page", viewport: vp.name, theme };
      if (!p) { item.error = "could not resolve route (empty list?)"; results.push(item); await ctx.close(); continue; }
      const t0 = Date.now();
      await page.goto(cfg.baseUrl + p, { waitUntil: "domcontentloaded" });
      await settle(page);
      item.settleMs = Date.now() - t0;
      if (theme === "dark") {
        await page.evaluate(() => document.documentElement.classList.add("dark"));
        await page.waitForTimeout(200);
      }
      const m = await page.evaluate(() => {
        const se = document.scrollingElement;
        return { scrollH: se.scrollHeight, innerH: innerHeight, scrollW: se.scrollWidth, clientW: se.clientWidth };
      });
      item.verticalScroll = m.scrollH > m.innerH + 4;
      item.horizontalScroll = m.scrollW > m.clientW + 1;
      item.overflowPx = Math.max(0, m.scrollH - m.innerH);
      item.loginRedirect = new URL(page.url()).pathname.startsWith(cfg.auth?.loginPath ?? "/login") && !p.startsWith(cfg.auth?.loginPath ?? "/login");
      const base = path.join(out, `${slug(r.path)}__${vp.name}__${theme}`);
      await page.screenshot({ path: base + ".png" });
      if (item.verticalScroll) await page.screenshot({ path: base + "__full.png", fullPage: true });
      item.screenshot = base + ".png";
      if (vp === viewports[0] && theme === "light") {
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        item.axe = axe.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, target: v.nodes[0]?.target?.join(" ") }));
      }
      item.consoleErrors = consoleErrors;
      item.failedRequests = failed;
      results.push(item);
      await ctx.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(results, null, 2));

// one line per check; BLOCKER/WARN per the agent's rules
for (const it of results) {
  const flags = [];
  if (it.error) flags.push("ERROR " + it.error);
  if (it.loginRedirect) flags.push("REDIRECTED-TO-LOGIN");
  if (it.kind === "form" && it.verticalScroll && viewports.find((v) => v.name === it.viewport)?.budget) flags.push(`SCROLL +${it.overflowPx}px`);
  if (it.horizontalScroll) flags.push("H-SCROLL");
  if (it.consoleErrors?.length) flags.push(`CONSOLE x${it.consoleErrors.length}`);
  if (it.failedRequests?.length) flags.push(`HTTP x${it.failedRequests.length}`);
  if (it.axe?.length) flags.push(`AXE ${it.axe.map((a) => a.id).join(",")}`);
  console.log(`${it.route} [${it.viewport}/${it.theme}] ${it.settleMs ?? "-"}ms ${flags.length ? flags.join(" | ") : "OK"}`);
}
