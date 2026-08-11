import {
  Button,
  ClipboardIcon,
  IconButton,
  PanelHeader,
  Textarea,
  TrashIcon,
  XIcon,
} from '@react-trace/ui-components'
import { useEffect, useRef, useState } from 'react'

import {
  useBeadOptions,
  useBridgeHealth,
  useCommentBeadState,
  useCommentEntries,
  useCommentsActions,
} from '../store'
import { BeadCheckbox, CheckIcon, LabelPicker, PrioritySelect } from './BeadControls'

const SPIN_KEYFRAMES = `
@keyframes rt-beads-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('rt-beads-styles')) return
  const style = document.createElement('style')
  style.id = 'rt-beads-styles'
  style.textContent = SPIN_KEYFRAMES
  document.head.appendChild(style)
}

export function BridgeStatusDot() {
  const { ok, detail } = useBridgeHealth()
  const color = ok === null ? '#71717a' : ok ? '#4ade80' : '#f87171'
  return (
    <span
      title={ok === null ? 'Checking bridge…' : ok ? `Bridge OK (${detail})` : `Bridge down: ${detail}`}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        marginRight: 4,
      }}
    />
  )
}

function CommentRow({
  commentId,
}: {
  commentId: string
}) {
  const comments = useCommentEntries()
  const comment = comments.find((c) => c.id === commentId)
  const beadState = useCommentBeadState()
  const state = beadState[commentId]
  const { removeComment, updateComment, toggleBead, setCommentPriority, setCommentLabels } =
    useCommentsActions()
  const { options } = useBeadOptions()

  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (comment) setDraft(comment.comment)
  }, [comment?.comment, comment])

  if (!comment || !state) return null

  const sync = state.sync
  const beadLabel = sync.beadId ? `bd-${sync.beadId.split('-').slice(-1)[0] ?? ''}` : sync.beadId

  const startEditing = () => {
    setDraft(comment.comment)
    setEditing(true)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.selectionStart = el.selectionEnd = el.value.length
    })
  }

  const save = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== comment.comment) updateComment(comment.id, trimmed)
    setEditing(false)
  }

  return (
    <div
      style={{
        padding: '6px 12px',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'background 0.1s',
        borderBottom: '1px solid #1c1c1e',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <BeadCheckbox
          checked={Boolean(sync.beadId)}
          syncing={sync.syncState === 'creating' || sync.syncState === 'deleting'}
          disabled={sync.syncState === 'creating' || sync.syncState === 'deleting'}
          onClick={() => toggleBead(comment.id)}
          label={`Bead for comment at ${comment.filePath}:${comment.lineNumber}`}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                color: '#3b82f6',
                flexShrink: 0,
              }}
            >
              {comment.filePath}:{comment.lineNumber}
            </span>
            {hovered && !editing && (
              <IconButton
                onClick={() => removeComment(comment.id)}
                title="Remove comment"
                style={{ padding: 0, flexShrink: 0 }}
              >
                <XIcon size={12} />
              </IconButton>
            )}
          </div>

          {editing ? (
            <div style={{ marginTop: 4 }}>
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setEditing(false)
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    save()
                  }
                }}
                rows={3}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                <Button variant="secondary" onClick={() => setEditing(false)} style={{ height: 24, fontSize: 11 }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={save} disabled={!draft.trim()} style={{ height: 24, fontSize: 11 }}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p
              onClick={startEditing}
              title="Click to edit"
              style={{
                margin: '3px 0 0',
                fontSize: 12,
                color: '#d4d4d8',
                fontFamily: 'system-ui, sans-serif',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: 'text',
              }}
            >
              {comment.comment}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <PrioritySelect
              value={state.priority}
              onChange={(p) => setCommentPriority(comment.id, p)}
              priorities={options?.priorities ?? []}
            />
            <LabelPicker
              value={state.labels}
              options={options?.labels ?? []}
              onChange={(labels) => setCommentLabels(comment.id, labels)}
              compact
            />
            {sync.beadId && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'ui-monospace, monospace',
                  color: '#4ade80',
                  background: 'rgba(74,222,128,0.1)',
                  borderRadius: 3,
                  padding: '1px 4px',
                }}
                title={sync.beadId}
              >
                {beadLabel}
              </span>
            )}
            {sync.syncState === 'error' && (
              <span
                style={{
                  fontSize: 10,
                  color: '#f87171',
                  fontFamily: 'system-ui, sans-serif',
                }}
                title={sync.error}
              >
                Failed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommentsMenu({ onClose }: { onClose(): void }) {
  ensureStyles()
  const comments = useCommentEntries()
  const beadState = useCommentBeadState()
  const { clearAll } = useCommentsActions()
  const [copyFeedback, setCopyFeedback] = useState(false)

  const handleCopy = () => {
    if (!comments.length) return
    const text = comments
      .map((c) => `${c.filePath}:${c.lineNumber} — ${c.comment}`)
      .join('\n\n')
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopyFeedback(true)
        setTimeout(() => setCopyFeedback(false), 1500)
      })
      .catch(() => {})
  }

  const beadCount = comments.filter((c) => beadState[c.id]?.sync.beadId).length

  return (
    <div style={{ width: 360, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
      <PanelHeader
        title={
          <>
            Beads
            {comments.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, color: '#71717a', fontWeight: 400 }}>
                ({comments.length})
                {beadCount > 0 && (
                  <span style={{ color: '#4ade80' }}> · {beadCount} beaded</span>
                )}
              </span>
            )}
          </>
        }
        actionsRender={
          <IconButton onClick={onClose} title="Close">
            <XIcon />
          </IconButton>
        }
      />

      {comments.length === 0 ? (
        <div
          style={{
            padding: '16px 12px',
            fontSize: 12,
            lineHeight: 1.5,
            color: '#97979b',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            textWrap: 'balance',
          }}
        >
          No comments yet. Inspect an element, click &quot;Add comment&quot;, and the bead checkbox
          is on by default.
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto', paddingBlock: 6 }} onKeyDown={(e) => e.stopPropagation()}>
          {comments.map((c) => (
            <CommentRow key={c.id} commentId={c.id} />
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #27272a', padding: '4px 6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#71717a',
            fontFamily: 'system-ui, sans-serif',
            padding: '2px 6px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <BridgeStatusDot />
            Bridge
          </span>
          <span style={{ display: 'flex', gap: 4 }}>
            <Button
              variant="secondary"
              onClick={handleCopy}
              disabled={comments.length === 0}
              style={{ height: 24, fontSize: 11, gap: 4 }}
            >
              <ClipboardIcon size={12} />
              {copyFeedback ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="secondary"
              onClick={clearAll}
              disabled={comments.length === 0}
              style={{ height: 24, fontSize: 11, gap: 4, color: '#ef4444' }}
            >
              <TrashIcon size={12} />
              Clear
            </Button>
          </span>
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { CheckIcon }
