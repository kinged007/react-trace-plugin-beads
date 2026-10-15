# react-trace-plugin-beads

[![CI](https://github.com/kinged007/react-trace-plugin-beads/actions/workflows/ci.yml/badge.svg)](https://github.com/kinged007/react-trace-plugin-beads/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-trace-plugin-beads?label=npm)](https://www.npmjs.com/package/react-trace-plugin-beads)

A [react-trace](https://react-trace.js.org) plugin that turns comments and component inspections into [beads](https://github.com/gastownhall/beads) issues via the `bd` CLI.

- **Comments** — ships its own comments UI (menu + inline editor). Every comment has a bead checkbox (on by default, controlled by the `auto-add-bead` setting). Checking creates a bead; unchecking finds it by its marker and hard-deletes it. Each comment also has priority and label dropdowns on top of the settings defaults.
- **Components** — inspect an element and use **Create bead** in the action panel to file a bead with the component info and source path.
- **Settings** — `auto-add-bead`, default labels, and default status / priority / epic. Status, epic, and label options are fetched live from the bd CLI.

![Demo](./docs/screenshot.png)
_Screenshot: BeadsPlugin toolbar and comments overlay with per-comment bead controls. Replace `docs/screenshot.png` with an actual capture (`400-800px` wide) after recording._

## Install

```bash
npm install react-trace-plugin-beads
# or
pnpm add react-trace-plugin-beads
```

Requires `react >= 18`, `@react-trace/core`, `@react-trace/ui-components`, and `jotai`.

## Usage

```tsx
import { Trace } from '@react-trace/core'
import { PreviewPlugin, OpenEditorPlugin, CopyToClipboardPlugin } from '@react-trace/kit'
import { BeadsPlugin } from 'react-trace-plugin-beads'

export function AppWithTrace() {
  return (
    <>
      <App />
      <Trace
        root={import.meta.env.VITE_ROOT}
        plugins={[PreviewPlugin(), OpenEditorPlugin(), CopyToClipboardPlugin(), BeadsPlugin()]}
      />
    </>
  )
}
```

Replace the official `CommentsPlugin` with `BeadsPlugin()` — the beads plugin provides the comments UI with bead controls.

### 1. Start the bridge

```bash
npx react-trace-beads --directory .        # port 4790, or BEADS_BRIDGE_PORT
```

Run it alongside your dev server (add a `"beads": "react-trace-beads --directory ."` script). The bridge shells out to `bd` in the given directory (each request can override via the Trace root), so run it from the repo that contains your `.beads` database.

### 2. Plugin options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `bridgeUrl` | auto | Bridge base URL — absolute (`http://localhost:4790`) or same-origin path (`/beads-api` when proxied by the dev server). Resolution order: explicit option → port-forwarding proxy hostname (Coder-style `5175--app--user.example.com`, derived by swapping the port to 4790) → `http://localhost:4790` |
| `bridgeToken` | — | Bearer token for the bridge when it runs with `--token` / `BEADS_BRIDGE_TOKEN` (needed when the bridge port is exposed publicly) |

### 3. Bridge security

The bridge only ever runs fixed `bd` subcommands (create/update/delete/statuses/list — no arbitrary shell), but if the port is reachable by others it can still be abused to spam or delete beads. Keep it on `127.0.0.1` (default) — for remote/proxied setups prefer **same-origin proxying** so the port is never exposed:

```ts
// vite.config.ts
proxy: {
  '/beads-api': {
    target: 'http://localhost:4790',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/beads-api/, ''),
  },
}
// main.tsx
<Trace ... plugins={[..., BeadsPlugin({ bridgeUrl: '/beads-api' })]} />
```

If you must expose the port publicly, protect it with a token:

```bash
BEADS_BRIDGE_TOKEN=$(openssl rand -hex 32) react-trace-beads --host 0.0.0.0
# plugin: BeadsPlugin({ bridgeToken: '<same token>' })
```

`/api/health` stays unauthenticated (safe); every other route returns 401 without a valid token.

## How created beads look

- **Title**: filename from the path (`Button.tsx`) — comments add `:line` (`Button.tsx:42`)
- **Description**: comment/component info, `Path`, `Absolute`, and a unique `Marker: rtc-<uuid>` line
- **Metadata**: `rt_comment_id=<marker>` for reliable find-and-delete
- **Type**: `task`; priority, labels, status, and epic (`--parent`) follow settings + per-comment overrides

Unchecking a comment's bead checkbox deletes that exact issue (`bd delete --force` after lookup by marker).

## Bridge API

| Endpoint | Description |
| -------- | ----------- |
| `GET /api/health` | Bridge + bd availability |
| `GET /api/options` | statuses, priorities, epics, labels from bd |
| `POST /api/issues` | create bead (title, description, priority, labels, status, epic, marker) |
| `PATCH /api/issues/:id` | update priority/labels |
| `GET /api/issues?marker=` | find bead by `rt_comment_id` marker |
| `DELETE /api/issues/:id` | hard-delete bead |

## How it is tested

```bash
npm run check   # typecheck (tsc + tsconfig.bridge.json) + lint (oxlint)
npm run build   # plugin -> dist/ (tsdown) + bridge -> dist-bridge/
```

No unit test suite yet — verification is build/typecheck/lint via CI and manual end-to-end against a live beads DB (`npx react-trace-beads` + browser overlay). Contributions adding `vitest` coverage for `bridge.ts` and `store.ts` are welcome.

## Development

```bash
npm install
npm run build:bridge   # bridge server -> dist-bridge/
npm run build          # plugin -> dist/ (tsdown)
npm run typecheck
npm run lint
npm run check
```

## License

MIT — see [LICENSE](./LICENSE).
