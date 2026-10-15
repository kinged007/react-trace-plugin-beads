# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
npm install
npm run check      # typecheck (tsc + tsconfig.bridge.json) + lint (oxlint)
npm run build      # plugin -> dist/ (tsdown) + bridge -> dist-bridge/
npm run typecheck  # tsc --noEmit + bridge tsconfig
npm run lint       # oxlint src
```

CI runs `npm ci && npm run check && npm run build` on push/PR to `main` (`.github/workflows/ci.yml`).

## Architecture Overview

- `src/index.tsx` — `BeadsPlugin()` TracePlugin: toolbar, action panel (Create bead), settings tab.
- `src/store.ts` — settings atom (`settingsPluginAtom('beads')`) + comment store with bead sync lifecycle (marker uuid, beadId, sync status).
- `src/bridge.ts` — typed HTTP client against `http://localhost:4790` (health, options, create, find-by-marker, delete).
- `src/bridge/server.ts` — zero-dep Node `http` bridge (`react-trace-beads` bin) proxying to `bd` CLI (health/options/issues CRUD), CORS, directory per request.
- `src/ui/*` — CommentsMenu, CommentEditor, ActionPanel, Settings, BeadControls.
- `src/index.prod.ts` — production stubs.

## Branch / PR workflow

- Do not push directly to `main`. Create a feature branch and open a PR (`gh pr create`).
- CI must pass (`npm run check` + build) before merge.
- Keep commits attributed to `kinged007 <599286+kinged007@users.noreply.github.com>`.

## Skills

If `.agents/skills/` is present, use the relevant skill for the task (e.g., beads, dispatch). Run `bd prime` for beads workflow context.

## Permissions

- Do not publish anything derived from the private `tenantflex` org repos without written org-owner approval (see workspace `docs/03-tenantflex.md` — not part of this repo).
- Do not commit secrets (`.env`, tokens). Bridge tokens are passed via `BEADS_BRIDGE_TOKEN` / `--token` at runtime only.

## Conventions & Patterns

- Bridge is zero-dep Node `http`; all `bd` interaction goes through it (no browser CLI).
- Formatting via `oxfmt`, linting via `oxlint`; run `npm run fmt` to format.
- Plugin uses `useSelectedContext`/`useSelectedSource`, `useWidgetPortalContainer` portals, inline styles, following `@react-trace/plugin-comments` patterns.
