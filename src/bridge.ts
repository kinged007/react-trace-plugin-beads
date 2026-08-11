import type { BeadIssue, BeadOptions, CreateBeadInput } from './types'

export const DEFAULT_BRIDGE_URL = 'http://localhost:4790'

export class BridgeError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
  ) {
    super(message)
    this.name = 'BridgeError'
  }
}

export interface BridgeClient {
  baseUrl: string
  health(): Promise<{ ok: boolean; bd?: string; directory?: string; error?: string }>
  options(directory?: string): Promise<BeadOptions>
  create(input: CreateBeadInput): Promise<BeadIssue>
  update(id: string, patch: { priority?: string; labels?: string[] }): Promise<BeadIssue>
  findByMarker(marker: string, directory?: string): Promise<BeadIssue | null>
  remove(id: string): Promise<void>
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new BridgeError('Bridge unreachable. Is `react-trace-beads` running?', 0)
  }
  const body = (await res.json().catch(() => null)) as T & { error?: string } | null
  if (!res.ok) {
    throw new BridgeError(body?.error ?? `Bridge request failed (${res.status})`, res.status)
  }
  return body as T
}

export function createBridgeClient(baseUrl: string): BridgeClient {
  const api = `${baseUrl.replace(/\/$/, '')}/api`

  return {
    baseUrl,
    async health() {
      try {
        return await request<{ ok: boolean; bd?: string; directory?: string }>(`${api}/health`)
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'unreachable' }
      }
    },
    options(directory) {
      const qs = directory ? `?directory=${encodeURIComponent(directory)}` : ''
      return request<BeadOptions>(`${api}/options${qs}`)
    },
    create(input) {
      return request<BeadIssue>(`${api}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    },
    update(id, patch) {
      return request<BeadIssue>(`${api}/issues/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    },
    async findByMarker(marker, directory) {
      const qs = directory ? `&directory=${encodeURIComponent(directory)}` : ''
      return request<BeadIssue | null>(`${api}/issues?marker=${encodeURIComponent(marker)}${qs}`)
    },
    async remove(id) {
      await request<{ deleted: string }>(`${api}/issues/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    },
  }
}
