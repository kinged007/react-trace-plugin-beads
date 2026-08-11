---
title: 'react-trace beads plugin (comments + components -> bd issues)'
type: 'feature'
created: '2026-08-11'
status: 'in-progress'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** React-trace comments/component inspections can't currently become beads issues without copy-paste; there's no browser->CLI path and no per-comment bead control.

**Approach:** A new standalone plugin package `react-trace-plugin-beads` (dev'd at `~/react-trace-plugin-beads`) with its own comments UI (replacing the official CommentsPlugin) where every comment has a bead checkmark, plus priority/labels dropdowns per comment and on the comment editor, an action-panel "Create bead" for selected components, and a settings tab (auto-add-bead, labels, status, priority, epic) whose options are fetched live from the bd CLI through a tiny zero-dependency local bridge server (bin `react-trace-beads`, default port 4790) that shells out to `bd`.

## Boundaries & Constraints

**Always:**
- All bd interaction goes through the bridge server; the browser never shells out directly.
- Created beads carry marker metadata `rt_comment_id=<uuid>` AND a `Marker: rtc-<uuid>` line in the description so an uncheck can find+delete them (content + metadata checking).
- Bridge is zero-dependency Node (`node:http`), JSON over HTTP, permissive CORS, `-C <directory>` from the Trace root per request.
- Unchecking a bead checkmark hard-deletes the bead (`bd delete <id> --force`). Epics list from `bd list --type epic --all --json`; selected epic links new beads via `--parent`.
- Comment UI mirrors official plugin patterns: `useSelectedContext`/`useSelectedSource`, `useWidgetPortalContainer` portals, inline styles, `settingsPluginAtom('beads')` with `declare module '@react-trace/core'` augmentation, prod stubs in `index.prod.ts`.
- Settings defaults: `{ autoAddBead: true, labels: '', status: 'open', priority: 'P2', epic: '' }`.

**Ask First:**
- If the official comments plugin UI needs patching instead of replacement.
- If deleting beads on uncheck should instead become close.

**Never:**
- No direct CLI from the browser, no patching `@react-trace/plugin-comments`, no changes inside the react-trace repo itself, no extra runtime deps in the browser bundle beyond react/jotai/@react-trace packages.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Comment created with bead checked | text + path + line | Bead created (title=filename, desc=comment+path+marker, priority/labels/status/epic from settings+per-comment); checkbox shows synced | Bridge down -> checkbox shows failed, retry on toggle |
| Comment created with bead unchecked | auto-add-bead=false | Comment stored, no bead; checkbox unchecked | N/A |
| Checkbox unchecked after create | comment with existing bead | `bd delete <id> --force` via marker lookup | Missing bead -> still unchecks (idempotent) |
| Selected component "Create bead" | source + breadcrumb | Bead created with filename title, component info + paths in description | Same as above |
| Per-comment priority/labels change | dropdown value | Re-create bead with new values if bead exists, else store pending for next create | N/A |
| Settings dropdown options | bridge reachable | statuses/priorities/epics/labels fetched from bd CLI | Show "bridge unreachable" + retry button |
| Bridge not running | any action | Clear error state in UI, status dot red | User starts `react-trace-beads` |

</frozen-after-approval>

## Code Map

- `~/react-trace-plugin-beads/src/index.tsx` -- BeadsPlugin(): TracePlugin with toolbar (Beads menu), actionPanel (Create bead / Add comment), settings
- `~/react-trace-plugin-beads/src/store.ts` -- settings atom + comment store w/ per-comment bead state (marker uuid, beadId, sync status)
- `~/react-trace-plugin-beads/src/bridge.ts` -- HTTP client (health, options, create, find-by-marker, delete) against `http://localhost:4790`
- `~/react-trace-plugin-beads/src/bridge/server.ts` -- zero-dep Node http server proxying to `bd` (health/options/issues CRUD), bin `react-trace-beads`
- `~/react-trace-plugin-beads/src/ui/CommentsMenu.tsx`, `CommentEditor.tsx`, `ActionPanel.tsx`, `Settings.tsx`, `BeadControls.tsx` -- components
- `~/react-trace-plugin-beads/src/index.prod.ts` -- production stubs
- `frontend/src/main.tsx` (myxon) -- swap CommentsPlugin for BeadsPlugin for testing; `frontend/package.json` -- `file:` devDep + `beads` npm script running the bridge from repo root

## Tasks & Acceptance

**Execution:**
- [ ] `~/react-trace-plugin-beads/` scaffold package (package.json, tsconfig, tsdown, plugin template structure) -- buildable, typecheckable package
- [ ] `src/bridge/server.ts` + bin -- bridge: health, options (bd statuses/label list-all/list --type epic), create (bd create + metadata + parent + set-state when status != open), find-by-marker (bd list --metadata-field), delete (bd delete --force); CORS; directory per request
- [ ] `src/bridge.ts` -- typed client + options cache + health polling
- [ ] `src/store.ts` -- settings atom (augmented TraceSettings) + comment store with bead sync lifecycle (create/delete/toggle, priority/labels edits)
- [ ] `src/ui/*` -- comments menu w/ per-comment checkmark + priority/labels dropdowns, editor overlay w/ bead defaults, action panel Create bead, settings tab w/ CLI-fetched options
- [ ] `src/index.tsx` + `index.prod.ts` -- plugin factory, toolbar badge w/ bridge status, prod stubs
- [ ] Build, typecheck, lint; manual test of bridge endpoints against myxon's beads DB
- [ ] Wire into `frontend/src/main.tsx` (swap comments plugin) + `frontend/package.json` (file: dep, `beads` script) -- dev server runs with plugin; end-to-end test in browser (chrome-devtools MCP)

**Acceptance Criteria:**
- Given bridge running and a comment created with bead checked, when the comment saves, then a bd issue exists with filename title, comment+path description, and marker; unchecking it deletes that exact issue.
- Given auto-add-bead=false, when a comment is created, then no issue is created and the checkmark starts unchecked.
- Given a selected component, when "Create bead" is used, then an issue is created with the component's source path info.
- Given the settings tab with bridge running, when opened, then status/priority/epic/label options reflect the live bd database.
- Given bridge stopped, when any bead action is attempted, then UI shows a clear unreachable error, no crash.

## Spec Change Log

## Design Notes

Bridge contract (base `http://localhost:4790`):
- `GET /api/health` -> `{ ok, bd, directory }`
- `GET /api/options?directory=...` -> `{ statuses:[{name,category}], priorities:['P0'..'P4'], epics:[{id,title}], labels:[...] }`
- `POST /api/issues { title, description, priority, labels[], status, epic, marker }` -> created issue JSON; runs `bd create <title> -d <desc> -p <prio> -l a,b --type task [--parent <epic>] --metadata rt_comment_id=<marker>`, then `bd set-state <id> <status>` when status != open
- `GET /api/issues?marker=<uuid>` -> `bd list --metadata-field rt_comment_id=<uuid> --json` first hit
- `DELETE /api/issues/:id` -> `bd delete <id> --force`

Example description payload for a comment:
```
Looks like this breaks on Safari.

Source: react-trace comment
Path: src/components/Button.tsx:42
Absolute: /home/coder/myxon/frontend/src/components/Button.tsx
Marker: rtc-3f2a9c
```

## Verification

**Commands:**
- `pnpm install && pnpm typecheck && pnpm lint && pnpm build` (in `~/react-trace-plugin-beads`) -- expected: clean
- `react-trace-beads --port 4790 --directory /home/coder/myxon` then `curl localhost:4790/api/health`, `curl localhost:4790/api/options` -- expected: ok:true, options JSON; manual create/find/delete round-trip against myxon beads DB, then delete the test issue
- `cd frontend && npm run dev` -- expected: widget loads with Beads button; browser E2E via chrome-devtools MCP: add comment -> bead created (verify via `bd list`), uncheck -> bead deleted, component "Create bead" works, settings dropdowns populated
