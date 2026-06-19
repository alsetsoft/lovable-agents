# lovable-agents

Shared [Claude Code](https://docs.claude.com/en/docs/claude-code) agents for building **Lovable-style** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui apps.

This repo is a **Claude Code plugin marketplace**. Install it once in any project (or globally) and every project gets the same agents. Edit an agent here, push, and all projects pull the update — no more copy-pasting between repos.

## What's inside

A single plugin, `lovable-agents`, bundling:

| Agent | Role |
|-------|------|
| `lovable-orchestrator` | Owns the full build workflow; delegates to the agents below. |
| `lovable-project-init` | Scaffolds a fresh Next.js + TS + Tailwind + shadcn project (idempotent). |
| `lovable-design-system` | Authors the design system: `globals.css` tokens + `tailwind.config.ts`. |
| `lovable-component-builder` | Builds individual React + TS components from the design system. |
| `lovable-page-assembler` | Assembles full pages, SEO metadata, semantic landmarks, routes. |
| `lovable-design-reviewer` | Audits and fixes design-system / SEO violations as the final step. |

Plus the `/lovable` slash command, which kicks off the orchestrator from a single prompt.

## Install

In any Claude Code session:

```text
/plugin marketplace add alsetsoft/lovable-agents
/plugin install lovable-agents@alsetsoft
```

That's it. Start a build with:

```text
/lovable landing page for an AI note-taking app
```

Or just ask Claude to "build / create / design" an app — the orchestrator triggers automatically.

## Auto-install for a project (team-wide)

To make every collaborator on a project get these agents automatically, commit this to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "alsetsoft": {
      "source": { "source": "github", "repo": "alsetsoft/lovable-agents" }
    }
  },
  "enabledPlugins": {
    "lovable-agents@alsetsoft": true
  }
}
```

When anyone opens the project in Claude Code, the marketplace is registered and the plugin is enabled with no manual steps.

## Updating

After you push changes to this repo, pull them into any project:

```text
/plugin marketplace update alsetsoft
/plugin update lovable-agents@alsetsoft
```

## Managing versions

`plugins/lovable-agents/.claude-plugin/plugin.json` has a `version` field:

- **Keep bumping `version`** (e.g. `1.0.0` → `1.1.0`) for controlled releases — installs only update when you raise it.
- **Remove the `version` field** to use the commit SHA as the version — every push becomes a new version (handy for fast iteration).

## Editing the agents

Agents are plain Markdown files with YAML frontmatter under
`plugins/lovable-agents/agents/`. Edit them, bump the version, and push:

```bash
git add -A
git commit -m "tweak lovable-design-reviewer rules"
git push
```

### Local testing before publishing

```bash
# validate plugin structure
claude plugin validate ./plugins/lovable-agents

# load the plugin into a session straight from disk (no install)
claude --plugin-dir ./plugins/lovable-agents
```

## Contributing

Changes to these agents ship to every project that has the plugin installed, so they go through a pull request — no direct pushes to `main`, and **every PR needs at least one approval from another team member before it can be merged.** You may not merge your own PR unreviewed.

### Workflow

1. **Branch off `main`.**

   ```bash
   git clone https://github.com/alsetsoft/lovable-agents.git
   cd lovable-agents
   git checkout -b fix/design-reviewer-alt-text
   ```

2. **Make your change** under `plugins/lovable-agents/`:
   - Agents live in `agents/*.md` (Markdown + YAML frontmatter).
   - The slash command lives in `commands/lovable.md`.

3. **Bump the version — REQUIRED.** Edit `plugins/lovable-agents/.claude-plugin/plugin.json` and raise `version` following [SemVer](https://semver.org/):
   - patch (`1.0.0` → `1.0.1`) — wording tweaks, small fixes;
   - minor (`1.0.0` → `1.1.0`) — new agent or capability;
   - major (`1.0.0` → `2.0.0`) — breaking change to how an agent behaves.

   > ⚠️ **This is not optional.** Installs are cached by version (`~/.claude/plugins/cache/alsetsoft/lovable-agents/<version>/`). If you don't bump it, `/plugin update` sees the same version and keeps serving the old agents — your change never reaches anyone. **A PR that edits an agent without bumping the version will be rejected.**

4. **Validate locally** before opening the PR:

   ```bash
   claude plugin validate ./plugins/lovable-agents
   # optional: try it in a session straight from disk, no install
   claude --plugin-dir ./plugins/lovable-agents
   ```

5. **Commit and push your branch:**

   ```bash
   git add -A
   git commit -m "design-reviewer: require alt text on all images"
   git push -u origin fix/design-reviewer-alt-text
   ```

6. **Open a pull request** against `main`:

   ```bash
   gh pr create --repo alsetsoft/lovable-agents --base main \
     --title "design-reviewer: require alt text on all images" \
     --body "What changed and why. Bumped version 1.0.0 -> 1.0.1."
   ```

   Or open it in the UI: https://github.com/alsetsoft/lovable-agents/pulls

7. **Get it reviewed — REQUIRED.** Request a reviewer and wait for **at least one approval from another team member**. Self-approval doesn't count; don't merge until someone else has signed off.

   ```bash
   gh pr edit --add-reviewer <teammate-github-username>
   # merge only after the PR shows an approving review from someone else:
   gh pr merge --squash
   ```

### PR checklist

- [ ] Change is scoped to `plugins/lovable-agents/`.
- [ ] **`version` in `plugin.json` is bumped** (SemVer).
- [ ] `claude plugin validate ./plugins/lovable-agents` passes.
- [ ] PR description says what changed and which version it bumps to.
- [ ] **At least one approval from another team member** (not the author).

### After merge

Once the PR is merged to `main`, anyone can pull the new version into their projects:

```text
/plugin marketplace update alsetsoft
/plugin update lovable-agents@alsetsoft
/reload-plugins
```

## Repository layout

```
lovable-agents/
├── .claude-plugin/
│   └── marketplace.json                # marketplace manifest (name: "alsetsoft")
├── plugins/
│   └── lovable-agents/
│       ├── .claude-plugin/
│       │   └── plugin.json             # plugin manifest (name: "lovable-agents")
│       ├── agents/                     # the 6 lovable-* agents (.md)
│       └── commands/
│           └── lovable.md              # the /lovable command
└── README.md
```
