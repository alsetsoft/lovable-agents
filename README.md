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
  "extraKnownMarketplaces": [
    { "source": "github", "repo": "alsetsoft/lovable-agents" }
  ],
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
