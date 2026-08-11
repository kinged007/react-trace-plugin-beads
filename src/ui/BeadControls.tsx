import { useWidgetPortalContainer } from '@react-trace/core'
import { Popover, Select, Tooltip } from '@react-trace/ui-components'
import { useRef, useState } from 'react'

export function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      style={{ display: 'block' }}
    >
      <path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LabelPicker({
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Labels',
  compact = false,
}: {
  value: string[]
  options: string[]
  onChange(vals: string[]): void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
}) {
  const portalContainer = useWidgetPortalContainer()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  const all = Array.from(new Set([...options, ...value])).sort()

  const toggle = (label: string) => {
    onChange(value.includes(label) ? value.filter((l) => l !== label) : [...value, label])
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: '1px solid #27272a',
              borderRadius: 4,
              background: '#0f0f11',
              color: '#a1a1aa',
              fontSize: 11,
              fontFamily: 'system-ui, sans-serif',
              padding: '2px 6px',
              cursor: 'pointer',
              maxWidth: compact ? 130 : 200,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {value.length === 0 ? (
              <span style={{ whiteSpace: 'nowrap' }}>{placeholder}</span>
            ) : (
              <span style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {value.slice(0, 3).map((l) => (
                  <span
                    key={l}
                    style={{
                      background: 'rgba(59,130,246,0.15)',
                      color: '#93c5fd',
                      borderRadius: 3,
                      padding: '0 4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {l}
                  </span>
                ))}
                {value.length > 3 && (
                  <span style={{ color: '#71717a' }}>+{value.length - 3}</span>
                )}
              </span>
            )}
          </button>
        }
      />
      <Popover.Portal container={portalContainer}>
        <Popover.Positioner
          anchor={triggerRef}
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          positionMethod="fixed"
          style={{ zIndex: 9999999, pointerEvents: 'auto' }}
        >
          <Popover.Popup
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ width: 180, maxHeight: 220, overflowY: 'auto', padding: 4 }}
          >
            {all.length === 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: '#71717a',
                  fontFamily: 'system-ui, sans-serif',
                  padding: 6,
                }}
              >
                No labels in the database yet.
              </div>
            )}
            {all.map((label) => (
              <label
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  borderRadius: 3,
                  fontSize: 11,
                  color: '#d4d4d8',
                  fontFamily: 'system-ui, sans-serif',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={value.includes(label)}
                  onChange={() => toggle(label)}
                  style={{ margin: 0, accentColor: '#3b82f6' }}
                />
                {label}
              </label>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function PrioritySelect({
  value,
  onChange,
  disabled,
  priorities,
}: {
  value: string
  onChange(v: string): void
  disabled?: boolean
  priorities: string[]
}) {
  const portalContainer = useWidgetPortalContainer()
  const items = priorities.length > 0 ? priorities : ['P0', 'P1', 'P2', 'P3', 'P4']

  return (
    <Select.Root value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
      <Select.Trigger
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{ padding: '2px 6px', fontSize: 11, minWidth: 44, width: 'auto' }}
      >
        <Select.Value placeholder="P2" />
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Positioner style={{ zIndex: 9999999, pointerEvents: 'auto' }}>
          <Select.Popup>
            <Select.List>
              {items.map((p) => (
                <Select.Item key={p} value={p}>
                  <Select.ItemText>{p}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

export function BeadCheckbox({
  checked,
  syncing,
  disabled,
  onClick,
  label,
}: {
  checked: boolean
  syncing?: boolean
  disabled?: boolean
  onClick(): void
  label: string
}) {
  const portalContainer = useWidgetPortalContainer()
  return (
    <Tooltip
      label={syncing ? 'Syncing…' : checked ? 'Remove bead' : 'Create bead'}
      container={portalContainer}
      render={
        <button
          type="button"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) onClick()
          }}
          style={{
            width: 18,
            height: 18,
            border: `1.5px solid ${checked ? '#3b82f6' : '#3f3f46'}`,
            borderRadius: 4,
            background: checked ? '#3b82f6' : 'transparent',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'default' : 'pointer',
            flexShrink: 0,
            opacity: syncing ? 0.6 : 1,
            padding: 0,
          }}
        >
          {checked && <CheckIcon size={10} />}
          {syncing && !checked && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: '1.5px solid #71717a',
                borderTopColor: 'transparent',
                animation: 'rt-beads-spin 0.7s linear infinite',
              }}
            />
          )}
        </button>
      }
    >
      <span />
    </Tooltip>
  )
}
