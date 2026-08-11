import { useWidgetPortalContainer } from '@react-trace/core'
import { Button, Select } from '@react-trace/ui-components'
import { useState } from 'react'

import {
  useBeadOptions,
  useBeadsSettings,
  useBridgeHealth,
  useSetBeadsSettings,
} from '../store'
import { BridgeStatusDot } from './CommentsMenu'

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: '#a1a1aa',
  fontFamily: 'system-ui, sans-serif',
  display: 'block',
  marginBottom: 4,
}

export function BeadsSettings() {
  const portalContainer = useWidgetPortalContainer()
  const settings = useBeadsSettings()
  const setSettings = useSetBeadsSettings()
  const { options, loading, error, refresh } = useBeadOptions()
  const health = useBridgeHealth()
  const [labelsDraft, setLabelsDraft] = useState(settings.labels)

  const statuses = options?.statuses ?? []
  const priorities = options?.priorities ?? ['P0', 'P1', 'P2', 'P3', 'P4']
  const epics = options?.epics ?? []

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
        <Select.Root
          value={settings.status}
          onValueChange={(v) => v && setSettings({ status: v })}
        >
          <Select.Trigger>
            <Select.Value placeholder="open">
              {(value) =>
                value ? `${statuses.find((s) => s.name === value)?.icon ?? ''} ${value}` : 'open'
              }
            </Select.Value>
          </Select.Trigger>
          <Select.Portal container={portalContainer}>
            <Select.Positioner style={{ zIndex: 9999999, pointerEvents: 'auto' }}>
              <Select.Popup>
                <Select.List>
                  {statuses.map((s) => (
                    <Select.Item key={s.name} value={s.name}>
                      <Select.ItemText>
                        {s.icon} {s.name}
                        {s.description ? ` — ${s.description}` : ''}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        {error && (
          <span style={{ fontSize: 10, color: '#f87171', fontFamily: 'system-ui, sans-serif' }}>
            {error}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>Default priority</label>
        <Select.Root
          value={settings.priority}
          onValueChange={(v) => v && setSettings({ priority: v })}
        >
          <Select.Trigger>
            <Select.Value placeholder="P2" />
          </Select.Trigger>
          <Select.Portal container={portalContainer}>
            <Select.Positioner style={{ zIndex: 9999999, pointerEvents: 'auto' }}>
              <Select.Popup>
                <Select.List>
                  {priorities.map((p) => (
                    <Select.Item key={p} value={p}>
                      <Select.ItemText>{p}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>Epic (parent bead)</label>
        <Select.Root
          value={settings.epic}
          onValueChange={(v) => setSettings({ epic: v ?? '' })}
        >
          <Select.Trigger>
            <Select.Value placeholder="None">
              {(value) =>
                value ? `${value} — ${epics.find((e) => e.id === value)?.title ?? ''}` : 'None'
              }
            </Select.Value>
          </Select.Trigger>
          <Select.Portal container={portalContainer}>
            <Select.Positioner style={{ zIndex: 9999999, pointerEvents: 'auto' }}>
              <Select.Popup>
                <Select.List>
                  <Select.Item value="">
                    <Select.ItemText>None</Select.ItemText>
                  </Select.Item>
                  {epics.map((e) => (
                    <Select.Item key={e.id} value={e.id}>
                      <Select.ItemText>
                        {e.id} — {e.title}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
    </div>
  )
}
