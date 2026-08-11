import { Button } from '@react-trace/ui-components'
import { useState } from 'react'

import {
  useBeadOptions,
  useBeadsSettings,
  useBridgeHealth,
  useSetBeadsSettings,
} from '../store'
import type { BeadStatusOption } from '../types'
import { priorityLabel } from '../types'
import { ComboSelect, type ComboOption } from './BeadControls'
import { BridgeStatusDot } from './CommentsMenu'

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: '#a1a1aa',
  fontFamily: 'system-ui, sans-serif',
  display: 'block',
  marginBottom: 4,
}

function statusOption(s: BeadStatusOption): ComboOption {
  return {
    value: s.name,
    label: `${s.icon} ${s.name}`,
    searchLabel: `${s.name} ${s.description ?? ''}`,
    hint: s.description,
  }
}

export function BeadsSettings() {
  const settings = useBeadsSettings()
  const setSettings = useSetBeadsSettings()
  const { options, loading, error, refresh } = useBeadOptions()
  const health = useBridgeHealth()
  const [labelsDraft, setLabelsDraft] = useState(settings.labels)

  const statuses = options?.statuses ?? []
  const priorities = options?.priorities ?? ['P0', 'P1', 'P2', 'P3', 'P4']
  const epics = options?.epics ?? []

  // Default status is a creation-time setting: only backlog/ready states make
  // sense here; the rest are lifecycle states.
  const defaultStatusNames = ['open', 'deferred']
  const statusOptions = statuses
    .filter((s) => defaultStatusNames.includes(s.name))
    .map(statusOption)
  const statusOptionsForDisplay = statusOptions.length > 0 ? statusOptions : statuses.map(statusOption)
  const priorityOptions: ComboOption[] = priorities.map((p) => ({
    value: p,
    label: `${p} — ${priorityLabel(p)}`,
    searchLabel: p,
  }))
  const epicOptions: ComboOption[] = [
    { value: '', label: 'None' },
    ...epics.map((e) => ({ value: e.id, label: `${e.id} — ${e.title}`, searchLabel: `${e.id} ${e.title}` })),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ ...LABEL_STYLE, marginBottom: 0 }}>
          <BridgeStatusDot />
          {health.ok === null
            ? 'Checking bridge…'
            : health.ok
              ? `Bridge connected (${health.detail})`
              : 'Bridge unreachable'}
        </span>
        <Button
          variant="secondary"
          onClick={refresh}
          disabled={loading}
          style={{ height: 22, fontSize: 11 }}
        >
          {loading ? 'Loading…' : 'Refresh options'}
        </Button>
      </div>

      <div>
        <label style={LABEL_STYLE}>
          <input
            type="checkbox"
            checked={settings.autoAddBead}
            onChange={(e) => setSettings({ autoAddBead: e.target.checked })}
          />{' '}
          Auto-add bead for new comments
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>Default labels (comma-separated)</label>
        <input
          value={labelsDraft}
          onChange={(e) => {
            setLabelsDraft(e.target.value)
            setSettings({ labels: e.target.value })
          }}
          placeholder="review,frontend"
          style={{
            background: '#0f0f11',
            border: '1px solid #27272a',
            borderRadius: 4,
            color: '#d4d4d8',
            fontSize: 12,
            fontFamily: 'system-ui, sans-serif',
            padding: '4px 8px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>Default status</label>
        <ComboSelect
          value={settings.status}
          options={statusOptionsForDisplay}
          onChange={(v) => setSettings({ status: v })}
          style={{ fontSize: 12 }}
        />
        {error && (
          <span style={{ fontSize: 10, color: '#f87171', fontFamily: 'system-ui, sans-serif' }}>
            {error}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>Default priority</label>
        <ComboSelect
          value={settings.priority}
          options={priorityOptions}
          onChange={(v) => setSettings({ priority: v })}
          style={{ fontSize: 12 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>Epic (parent bead)</label>
        <ComboSelect
          value={settings.epic}
          options={epicOptions}
          onChange={(v) => setSettings({ epic: v })}
          style={{ fontSize: 12 }}
        />
      </div>
    </div>
  )
}
