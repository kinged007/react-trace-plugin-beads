# react-trace-plugin-beads

A [react-trace](https://react-trace.js.org) plugin that turns comments and
component inspections into [beads](https://github.com/gastownhall/beads)
issues via the `bd` CLI.

- **Comments** — ships its own comments UI (menu + inline editor). Every
  comment has a **bead checkbox** (on by default, controlled by the
  `auto-add-bead` setting). Checking creates a bead; unchecking finds it by
  its marker and hard-deletes it. Each comment also has priority and label
  dropdowns on top of the settings defaults.
- **Components** — inspect an element and use **Create bead** in the action
  panel to file a bead with the component info and source path.
- **Settings** — `auto-add-bead`, default labels, and default status /
  priority / epic. Status, epic, and label options are fetched live from the
  bd CLI.

## Why a bridge server?

Plugins run in the browser and cannot execute CLI commands. This package
ships a tiny zero-dependency bridge (`react-trace-beads`, Node `http`) that
runs the `bd` commands for the plugin over HTTP on `localhost:4790`.

## Usage

```tsx
import { Trace } from '@react-trace/core'
import { PreviewPlugin, OpenEditorPlugin, CopyToClipboardPlugin } from '@react-trace/kit' // optional
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

Replace the official `CommentsPlugin` with `BeadsPlugin()` — the beads plugin
provides the comments UI with bead controls.

### 1. Start the bridge

```bash
npm i -D react-trace-plugin-beads
npx react-trace-beads --directory .        # port 4790, or BEADS_BRIDGE_PORT
```

Run it alongside your dev server (add a `"beads": "react-trace-beads --directory ."` script). The bridge shells out to `bd` in the given directory (each request can override via the Trace root), so run it from the repo that contains your `.beads` database.

### 2. Plugin options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `bridgeUrl` | `http://localhost:4790` | Bridge base URL |

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

## Development

```bash
npm install
npm run build:bridge   # bridge server -> dist-bridge/
npm run build          # plugin -> dist/ (tsdown)
npm run typecheck
npm run lint
```
