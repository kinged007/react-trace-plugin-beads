import { settingsPluginAtom, useProjectRoot } from '@react-trace/core'
import type { WritableAtom } from 'jotai'
import { atom, useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useState } from 'react'

import { createBridgeClient, DEFAULT_BRIDGE_URL, type BridgeClient } from './bridge'
import type { BeadOptions, BeadsSettings, CreateBeadInput } from './types'

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const BEADS_DEFAULTS: BeadsSettings = {
  autoAddBead: true,
  labels: '',
  status: 'open',
  priority: 'P2',
  epic: '',
}

declare module '@react-trace/core' {
  interface TraceSettings {
    beads?: Partial<BeadsSettings>
  }
}

const beadsSettingsAtom = settingsPluginAtom('beads') as WritableAtom<
  Partial<BeadsSettings> | undefined,
  [Partial<BeadsSettings> | undefined],
  void
>

export const beadsSettingsValueAtom = atom<BeadsSettings>((get) => ({
  ...BEADS_DEFAULTS,
  ...get(beadsSettingsAtom),
}))

export function useBeadsSettings(): BeadsSettings {
  return useAtomValue(beadsSettingsValueAtom)
}

export function useSetBeadsSettings(): (patch: Partial<BeadsSettings>) => void {
  const settings = useBeadsSettings()
  const [, setSettings] = useAtom(beadsSettingsAtom)
  return useCallback(
    (patch) => setSettings({ ...settings, ...patch }),
    [settings, setSettings],
  )
}

// ---------------------------------------------------------------------------
// Bridge client + options
// ---------------------------------------------------------------------------

let bridgeUrl = DEFAULT_BRIDGE_URL
let client: BridgeClient | null = null

export function setBridgeUrl(url?: string): void {
  if (url) {
    bridgeUrl = url
    client = null
  }
}

export function getBridgeClient(): BridgeClient {
  if (!client) client = createBridgeClient(bridgeUrl)
  return client
}

const beadOptionsAtom = atom<BeadOptions | null>(null)

export function useBeadOptions(): {
  options: BeadOptions | null
  loading: boolean
  error: string | null
  refresh(): void
} {
  const root = useProjectRoot()
  const [options, setOptions] = useAtom(beadOptionsAtom)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    getBridgeClient()
      .options(root)
      .then((opts) => {
        setOptions(opts)
        setLoading(false)
      })
      .catch((e: unknown) => {
        setOptions(null)
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
  }, [root, setOptions])

  useEffect(() => {
    if (!options) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { options, loading, error, refresh }
}

export function useBridgeHealth(): {
  ok: boolean | null
  detail: string
} {
  const root = useProjectRoot()
  const [state, setState] = useState<{ ok: boolean | null; detail: string }>({
    ok: null,
    detail: '',
  })

  useEffect(() => {
    let cancelled = false
    const check = () => {
      getBridgeClient().health().then((h) => {
        if (cancelled) return
        setState({
          ok: h.ok,
          detail: h.error ?? (h.ok ? `${h.bd ?? 'bd'}` : ''),
        })
      })
    }
    check()
    const timer = setInterval(check, 10_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [root])

  return state
}

// ---------------------------------------------------------------------------
// Comments + bead sync
// ---------------------------------------------------------------------------

export interface CommentEntry {
  id: string
  filePath: string
  lineNumber: number
  comment: string
  createdAt: number
  root: string
}

export type BeadSyncState = 'idle' | 'creating' | 'deleting' | 'synced' | 'error'

export interface BeadSync {
  marker: string
  beadId: string | null
  syncState: BeadSyncState
  error?: string
}

export interface CommentBeadState {
  priority: string
  labels: string[]
  sync: BeadSync
}

const commentsAtom = atom<CommentEntry[]>([])
const beadStateAtom = atom<Record<string, CommentBeadState>>({})

export interface PendingComment {
  filePath: string
  lineNumber: number
  anchorEl: HTMLElement
}

const pendingCommentAtom = atom<PendingComment | null>(null)

export function useCommentEntries(): CommentEntry[] {
  return useAtomValue(commentsAtom)
}

export function useCommentBeadState(): Record<string, CommentBeadState> {
  return useAtomValue(beadStateAtom)
}

export function usePendingComment(): PendingComment | null {
  return useAtomValue(pendingCommentAtom)
}

export function useCommentsActions() {
  const [comments, setComments] = useAtom(commentsAtom)
  const [beadState, setBeadState] = useAtom(beadStateAtom)
  const [, setPending] = useAtom(pendingCommentAtom)
  const settings = useBeadsSettings()
  const root = useProjectRoot()

  const setSync = useCallback(
    (id: string, patch: Partial<BeadSync>) => {
      setBeadState((prev) => {
        const cur = prev[id]
        if (!cur) return prev
        return { ...prev, [id]: { ...cur, sync: { ...cur.sync, ...patch } } }
      })
    },
    [setBeadState],
  )

  const removeBead = useCallback(
    async (id: string, beadId: string) => {
      setSync(id, { syncState: 'deleting', error: undefined })
      try {
        await getBridgeClient().remove(beadId)
        setSync(id, { beadId: null, syncState: 'idle' })
      } catch (e) {
        setSync(id, {
          syncState: 'error',
          error: e instanceof Error ? e.message : String(e),
        })
      }
    },
    [setSync],
  )

  const createBead = useCallback(
    async (comment: CommentEntry, state: CommentBeadState) => {
      const marker = state.sync.marker
      const input: CreateBeadInput = {
        title: `${comment.filePath.split('/').pop() ?? comment.filePath}:${comment.lineNumber}`,
        description: [
          comment.comment,
          '',
          '---',
          'Source: react-trace comment',
          `Path: ${comment.filePath}:${comment.lineNumber}`,
          `Absolute: ${comment.root.replace(/\/$/, '')}/${comment.filePath}`,
          `Marker: ${marker}`,
        ].join('\n'),
        priority: state.priority,
        labels: state.labels,
        status: settings.status,
        epic: settings.epic,
        marker,
        directory: comment.root,
      }

      setSync(comment.id, { syncState: 'creating', error: undefined })
      try {
        const issue = await getBridgeClient().create(input)
        setSync(comment.id, { beadId: issue.id, syncState: 'synced' })
      } catch (e) {
        setSync(comment.id, {
          syncState: 'error',
          error: e instanceof Error ? e.message : String(e),
        })
      }
    },
    [setSync, settings.status, settings.epic],
  )

  const addComment = useCallback(
    (
      entry: Omit<CommentEntry, 'id' | 'createdAt' | 'root'> & {
        bead?: { enabled: boolean; priority: string; labels: string[] }
      },
    ) => {
      const id = crypto.randomUUID()
      const marker = `rtc-${crypto.randomUUID()}`
      const { bead, ...commentInput } = entry
      const comment: CommentEntry = {
        ...commentInput,
        id,
        root,
        createdAt: Date.now(),
      }
      const withBead = bead?.enabled ?? settings.autoAddBead
      const state: CommentBeadState = {
        priority: bead?.priority ?? settings.priority,
        labels:
          bead?.labels ??
          settings.labels
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean),
        sync: {
          marker,
          beadId: null,
          syncState: withBead ? 'creating' : 'idle',
        },
      }
      setComments((prev) => [...prev, comment])
      setBeadState((prev) => ({ ...prev, [id]: state }))
      if (withBead) {
        void createBead(comment, state)
      }
      return id
    },
    [root, settings, setComments, setBeadState, createBead],
  )

  const updateComment = useCallback(
    (id: string, text: string) => {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, comment: text } : c)),
      )
    },
    [setComments],
  )

  const removeComment = useCallback(
    (id: string) => {
      const state = beadState[id]
      setComments((prev) => prev.filter((c) => c.id !== id))
      setBeadState((prev) => {
        const { [id]: _removed, ...rest } = prev
        return rest
      })
      if (state?.sync.beadId) void removeBead(id, state.sync.beadId)
    },
    [setComments, setBeadState, beadState, removeBead],
  )

  const toggleBead = useCallback(
    (id: string) => {
      const state = beadState[id]
      const comment = comments.find((c) => c.id === id)
      if (!state) return
      if (state.sync.beadId) void removeBead(id, state.sync.beadId)
      else if (comment) void createBead(comment, state)
    },
    [beadState, comments, removeBead, createBead],
  )

  const setCommentPriority = useCallback(
    async (id: string, priority: string) => {
      setBeadState((prev) => {
        const cur = prev[id]
        if (!cur) return prev
        return { ...prev, [id]: { ...cur, priority } }
      })
      const beadId = beadState[id]?.sync.beadId
      if (beadId) {
        try {
          await getBridgeClient().update(beadId, { priority })
        } catch {
          // surface via next toggle/create
        }
      }
    },
    [setBeadState, beadState],
  )

  const setCommentLabels = useCallback(
    async (id: string, labels: string[]) => {
      setBeadState((prev) => {
        const cur = prev[id]
        if (!cur) return prev
        return { ...prev, [id]: { ...cur, labels } }
      })
      const beadId = beadState[id]?.sync.beadId
      if (beadId) {
        try {
          await getBridgeClient().update(beadId, { labels })
        } catch {
          // surface via next toggle/create
        }
      }
    },
    [setBeadState, beadState],
  )

  const clearAll = useCallback(() => {
    for (const [id, state] of Object.entries(beadState)) {
      if (state.sync.beadId) void removeBead(id, state.sync.beadId)
    }
    setComments([])
    setBeadState({})
  }, [beadState, setComments, setBeadState, removeBead])

  return {
    addComment,
    updateComment,
    removeComment,
    clearAll,
    toggleBead,
    setCommentPriority,
    setCommentLabels,
    setPending,
  }
}
