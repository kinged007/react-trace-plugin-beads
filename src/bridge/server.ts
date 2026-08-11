#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4']

interface Options {
  host: string
  port: number
  directory: string
  bd: string
  token: string
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    host: '127.0.0.1',
    port: Number(process.env.BEADS_BRIDGE_PORT ?? 4790),
    directory: process.cwd(),
    bd: 'bd',
    token: process.env.BEADS_BRIDGE_TOKEN ?? '',
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--port' && next) opts.port = Number(next)
    else if (arg === '--host' && next) opts.host = next
    else if (arg === '--directory' && next) opts.directory = resolve(next)
    else if (arg === '--bd' && next) opts.bd = next
    else if (arg === '--token' && next) opts.token = next
    else if (arg === '--help' || arg === '-h') {
      console.log(`react-trace-beads - local bridge between the react-trace beads plugin and the bd CLI

Usage:
  react-trace-beads [flags]

Flags:
  --host <host>        Listen host (default 127.0.0.1)
  --port <port>        Listen port (default 4790, env BEADS_BRIDGE_PORT)
  --directory <dir>    Project directory bd runs in (default: current dir; each request may override)
  --bd <path>          Path to the bd binary (default: "bd")
  --token <secret>     Require Authorization: Bearer <secret> on all API routes (env BEADS_BRIDGE_TOKEN).
                       Recommended when binding to 0.0.0.0 or exposing the port publicly.
  -h, --help           Show this help

Requires the bd CLI (beads) to be installed and the target repo to have a .beads database.`)
      process.exit(0)
    }
  }
  return opts
}

function runBd(bd: string, directory: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(bd, ['-C', directory, ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
  })
}

async function bdJson<T>(bd: string, directory: string, args: string[]): Promise<T> {
  const { stdout } = await runBd(bd, directory, args)
  try {
    return JSON.parse(stdout) as T
  } catch {
    return stdout as unknown as T
  }
}

function dirFromRequest(url: URL, opts: Options, body?: { directory?: string }): string {
  const fromQuery = url.searchParams.get('directory')
  return fromQuery ? resolve(fromQuery) : body?.directory ? resolve(body.directory) : opts.directory
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleHealth(opts: Options, directory: string): Promise<unknown> {
  try {
    const { stdout } = await runBd(opts.bd, directory, ['--version'])
    return { ok: true, bd: stdout.trim(), directory }
  } catch (e) {
    const stderr = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `bd not available: ${stderr}`, directory }
  }
}

async function handleOptions(opts: Options, directory: string): Promise<unknown> {
  const [statuses, labels, epics] = await Promise.all([
    bdJson<{ built_in_statuses: Array<{ name: string; category: string; icon: string; description?: string }> }>(
      opts.bd,
      directory,
      ['statuses', '--json'],
    ).catch(() => null),
    bdJson<Array<{ label: string }>>(opts.bd, directory, ['label', 'list-all', '--json']).catch(() => null),
    bdJson<Array<{ id: string; title: string }>>(opts.bd, directory, ['list', '--type', 'epic', '--all', '--json']).catch(
      () => null,
    ),
  ])

  return {
    statuses: (statuses?.built_in_statuses ?? []).map((s) => ({
      name: s.name,
      category: s.category,
      icon: s.icon,
      description: s.description,
    })),
    priorities: PRIORITIES,
    epics: (epics ?? []).map((e) => ({ id: e.id, title: e.title })),
    labels: (labels ?? []).map((l) => l.label).sort(),
  }
}

async function handleCreate(opts: Options, body: Record<string, unknown>): Promise<unknown> {
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  if (!title) throw new Error('title is required')

  const priority = String(body.priority ?? 'P2').trim()
  const labels = Array.isArray(body.labels) ? body.labels.filter((l): l is string => typeof l === 'string') : []
  const status = String(body.status ?? 'open').trim()
  const epic = String(body.epic ?? '').trim()
  const marker = String(body.marker ?? '').trim()
  const directory =
    typeof body.directory === 'string' && body.directory.trim()
      ? resolve(body.directory)
      : opts.directory

  const args = ['create', title, '--description', description, '--type', 'task', '-p', priority]
  if (labels.length > 0) args.push('--labels', labels.join(','))
  if (epic) args.push('--parent', epic)
  if (marker) args.push('--metadata', JSON.stringify({ rt_comment_id: marker }))
  args.push('--json')

  const created = await bdJson<{ id: string; status: string; priority: number }>(opts.bd, directory, args)

  let finalStatus = created.status
  if (status && status !== 'open' && created.id) {
    await bdJson<unknown>(opts.bd, directory, ['update', created.id, '--status', status, '--json'])
    finalStatus = status
  }

  return {
    id: created.id,
    title,
    status: finalStatus,
    priority: created.priority,
    labels,
  }
}

async function handleFindByMarker(opts: Options, marker: string, directory: string): Promise<unknown> {
  const issues = await bdJson<Array<{ id: string; title: string; status: string; priority: number }>>(
    opts.bd,
    directory,
    ['list', '--metadata-field', `rt_comment_id=${marker}`, '--json'],
  )
  const issue = issues[0]
  if (!issue) return null
  return { id: issue.id, title: issue.title, status: issue.status, priority: issue.priority }
}

async function handleUpdate(opts: Options, id: string, body: Record<string, unknown>): Promise<unknown> {
  const args = ['update', id]
  const priority = String(body.priority ?? '').trim()
  const labels = Array.isArray(body.labels) ? body.labels.filter((l): l is string => typeof l === 'string') : null
  if (priority) args.push('-p', priority)
  if (labels && labels.length > 0) args.push('--set-labels', labels.join(','))
  if (args.length <= 2) throw new Error('nothing to update')
  args.push('--json')

  const updated = await bdJson<{ id: string; status: string; priority: number }>(opts.bd, opts.directory, args)
  return { id: updated.id, title: '', status: updated.status, priority: updated.priority, labels: labels ?? [] }
}

async function handleDelete(opts: Options, id: string, directory: string): Promise<unknown> {
  await runBd(opts.bd, directory, ['delete', id, '--force'])
  return { deleted: id }
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

function authorized(req: IncomingMessage, opts: Options): boolean {
  if (!opts.token) return true
  const header = req.headers.authorization ?? ''
  const url = new URL(req.url ?? '/', 'http://localhost')
  return header === `Bearer ${opts.token}` || url.searchParams.get('token') === opts.token
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  })
  res.end(JSON.stringify(payload))
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
      if (data.length > 1024 * 1024) {
        reject(new Error('request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolvePromise(data ? (JSON.parse(data) as Record<string, unknown>) : {})
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

async function route(req: IncomingMessage, res: ServerResponse, opts: Options): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname
  const method = req.method ?? 'GET'

  if (method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  const directory = dirFromRequest(url, opts)

  if (method === 'GET' && path === '/api/health') {
    sendJson(res, 200, await handleHealth(opts, directory))
    return
  }

  if (!authorized(req, opts)) {
    sendJson(res, 401, { error: 'unauthorized: set BEADS_BRIDGE_TOKEN / --token on the bridge and pass bridgeToken to BeadsPlugin' })
    return
  }

  if (method === 'GET' && path === '/api/options') {
    sendJson(res, 200, await handleOptions(opts, directory))
    return
  }

  if (method === 'GET' && path === '/api/issues') {
    const marker = url.searchParams.get('marker')
    if (!marker) {
      sendJson(res, 400, { error: 'marker query param is required' })
      return
    }
    const issue = await handleFindByMarker(opts, marker, directory)
    if (!issue) {
      sendJson(res, 404, { error: `no issue found for marker ${marker}` })
      return
    }
    sendJson(res, 200, issue)
    return
  }

  if (method === 'POST' && path === '/api/issues') {
    const body = await readBody(req)
    sendJson(res, 201, await handleCreate(opts, body))
    return
  }

  const deleteMatch = path.match(/^\/api\/issues\/([^/]+)$/)
  if (method === 'DELETE' && deleteMatch) {
    sendJson(res, 200, await handleDelete(opts, decodeURIComponent(deleteMatch[1]!), directory))
    return
  }

  if (method === 'PATCH' && deleteMatch) {
    const body = await readBody(req)
    sendJson(res, 200, await handleUpdate(opts, decodeURIComponent(deleteMatch[1]!), body))
    return
  }

  sendJson(res, 404, { error: `not found: ${method} ${path}` })
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))

  const server = createServer((req, res) => {
    route(req, res, opts).catch((e) => {
      const status = /not found/i.test(e?.message ?? '') ? 404 : 500
      sendJson(res, status, { error: e instanceof Error ? e.message : String(e) })
    })
  })

  server.listen(opts.port, opts.host, () => {
    console.log(`react-trace-beads bridge listening on http://${opts.host}:${opts.port}`)
    console.log(`  bd: ${opts.bd}  directory: ${opts.directory}`)
  })
}

const isMain = typeof process !== 'undefined' && (process.argv[1] ?? '').endsWith('server.js')
if (isMain) {
  void main()
}
