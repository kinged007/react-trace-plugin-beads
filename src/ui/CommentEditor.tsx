import { useWidgetPortalContainer } from '@react-trace/core'
import { Button, Popover, Separator, Textarea } from '@react-trace/ui-components'
import { useEffect, useRef, useState } from 'react'

import { useBeadOptions, useBeadsSettings, useCommentsActions, usePendingComment } from '../store'
import { BeadCheckbox, LabelPicker, PrioritySelect } from './BeadControls'

export function CommentEditorOverlay() {
  const portalContainer = useWidgetPortalContainer()
  const pending = usePendingComment()
  const { addComment, setPending } = useCommentsActions()
  const settings = useBeadsSettings()
  const { options } = useBeadOptions()

  const [text, setText] = useState('')
  const [withBead, setWithBead] = useState(settings.autoAddBead)
  const [priority, setPriority] = useState(settings.priority)
  const [labels, setLabels] = useState<string[]>(
    settings.labels.split(',').map((l) => l.trim()).filter(Boolean),
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (pending) {
      setText('')
      setWithBead(settings.autoAddBead)
      setPriority(settings.priority)
      setLabels(settings.labels.split(',').map((l) => l.trim()).filter(Boolean))
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const handleCancel = () => setPending(null)

  const handleSubmit = () => {
    if (!pending || !text.trim()) return
    addComment({
      filePath: pending.filePath,
      lineNumber: pending.lineNumber,
      comment: text.trim(),
      bead: {
        enabled: withBead,
        priority,
        labels,
      },
    })
    setPending(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
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
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add comment"
              rows={3}
            />

            <Separator style={{ margin: '6px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#a1a1aa',
                  cursor: 'pointer',
                }}
              >
                <BeadCheckbox
                  checked={withBead}
                  onClick={() => setWithBead((v) => !v)}
                  label="Create bead for this comment"
                />
                Create bead
              </label>

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
              <span style={{ fontSize: 11, color: '#71717a', fontFamily: 'ui-monospace, monospace' }}>
                Commenting on line {pending.lineNumber}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={!text.trim()}>
                  Comment
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
