import { useProjectRoot, useWidgetPortalContainer } from '@react-trace/core'
import { Button, Popover, Separator, Textarea } from '@react-trace/ui-components'
import { useEffect, useRef, useState } from 'react'

import { getBridgeClient, useBeadOptions, useBeadsSettings, usePendingBead, useSetPendingBead } from '../store'
import type { CreateBeadInput } from '../types'
import { LabelPicker, PrioritySelect } from './BeadControls'

function buildDefaultDescription(pending: {
  displayName: string
  breadcrumb: string
  absolutePath: string
  filePath: string
  lineNumber: number
}): string {
  return [
    `Component: ${pending.displayName}`,
    pending.breadcrumb ? `Breadcrumb: ${pending.breadcrumb}` : '',
    '',
    '---',
    'Source: react-trace component',
    `Path: ${pending.filePath}:${pending.lineNumber}`,
    `Absolute: ${pending.absolutePath}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function BeadEditorOverlay() {
  const portalContainer = useWidgetPortalContainer()
  const root = useProjectRoot() ?? ''
  const pending = usePendingBead()
  const setPending = useSetPendingBead()
  const settings = useBeadsSettings()
  const { options } = useBeadOptions()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(settings.priority)
  const [labels, setLabels] = useState<string[]>(
    settings.labels.split(',').map((l) => l.trim()).filter(Boolean),
  )
  const [status, setStatus] = useState<'idle' | 'creating' | 'created' | 'error'>('idle')
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pending) {
      setTitle(pending.title)
      setDescription(buildDefaultDescription(pending))
      setPriority(settings.priority)
      setLabels(settings.labels.split(',').map((l) => l.trim()).filter(Boolean))
      setStatus('idle')
      setError('')
      requestAnimationFrame(() => titleRef.current?.focus())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const handleCancel = () => setPending(null)

  const handleCreate = async () => {
    if (!pending || !title.trim()) return
    setStatus('creating')
    setError('')

    const input: CreateBeadInput = {
      title: title.trim(),
      description: description.trim(),
      priority,
      labels,
      status: settings.status,
      epic: settings.epic,
      directory: root || undefined,
    }

    try {
      await getBridgeClient().create(input)
      setStatus('created')
      setTimeout(() => setPending(null), 900)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleCreate()
    }
  }

  if (!pending) return null

  return (
    <Popover.Root
      open
      onOpenChange={(open: boolean) => {
        if (!open) setPending(null)
      }}
    >
      <Popover.Portal container={portalContainer}>
        <Popover.Positioner
          anchor={pending.anchorEl}
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={8}
          positionMethod="fixed"
          style={{ zIndex: 9999999, pointerEvents: 'auto' }}
        >
          <Popover.Popup
            initialFocus={false}
            style={{
              width: 480,
              border: '1px solid #3b82f6',
              padding: 8,
              fontFamily: 'system-ui, sans-serif',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Title"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0f0f11',
                border: '1px solid #3f3f46',
                borderRadius: 5,
                color: '#fafafa',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
                padding: '6px 8px',
                outline: 'none',
                marginBottom: 6,
              }}
            />

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Description"
              rows={6}
            />

            <Separator style={{ margin: '6px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <PrioritySelect value={priority} onChange={setPriority} priorities={options?.priorities ?? []} />
              <LabelPicker value={labels} options={options?.labels ?? []} onChange={setLabels} />
            </div>

            <Separator style={{ margin: '6px 0 4px' }} />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 4,
              }}
            >
              <span style={{ fontSize: 11, color: '#71717a', fontFamily: 'system-ui, sans-serif' }}>
                {status === 'error' ? (
                  <span style={{ color: '#f87171' }}>{error}</span>
                ) : status === 'created' ? (
                  <span style={{ color: '#4ade80' }}>Bead created</span>
                ) : (
                  `Creating bead for ${pending.displayName}`
                )}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="secondary" onClick={handleCancel} disabled={status === 'creating'}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleCreate()}
                  disabled={!title.trim() || status === 'creating'}
                >
                  {status === 'creating' ? 'Creating…' : 'Create bead'}
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
