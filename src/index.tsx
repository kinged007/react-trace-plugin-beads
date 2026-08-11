import type { TracePlugin } from '@react-trace/core'
import { useDeactivateInspector, useWidgetPortalContainer } from '@react-trace/core'
import { DropdownMenu, ToolbarButton, Tooltip } from '@react-trace/ui-components'
import { useRef, useState } from 'react'

import { setBridgeUrl, useCommentBeadState, useCommentEntries } from './store'
import { resolveBridgeUrl } from './bridge'
import type { BeadsPluginOptions } from './types'
import { BeadsActionPanel } from './ui/ActionPanel'
import { CommentEditorOverlay } from './ui/CommentEditor'
import { CommentsMenu } from './ui/CommentsMenu'
import { BeadsSettings } from './ui/Settings'

function BeadsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" style={{ display: 'block' }}>
      <circle cx="6" cy="2" r="1.7" />
      <circle cx="2.6" cy="6" r="1.7" />
      <circle cx="9.4" cy="6" r="1.7" />
      <circle cx="6" cy="10" r="1.7" />
    </svg>
  )
}

function BeadsToolbarIcon({ count, beaded }: { count: number; beaded: number }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BeadsIcon />
      {(count > 0 || beaded > 0) && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: beaded > 0 ? '#4ade80' : '#ef4444',
            color: '#0a0a0a',
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  )
}

function BeadsToolbar() {
  const comments = useCommentEntries()
  const beadState = useCommentBeadState()
  const portalContainer = useWidgetPortalContainer()
  const deactivateInspector = useDeactivateInspector()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const count = comments.length
  const beaded = comments.filter((c) => beadState[c.id]?.sync.beadId).length

  return (
    <>
      <Tooltip
        label="Beads"
        container={portalContainer}
        render={<ToolbarButton ref={buttonRef} />}
        aria-label="Beads"
        onClick={() => {
          deactivateInspector()
          setIsOpen((open) => !open)
        }}
      >
        <BeadsToolbarIcon count={count} beaded={beaded} />
      </Tooltip>

      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Portal container={portalContainer}>
          <DropdownMenu.Positioner
            anchor={buttonRef.current}
            side="top"
            align="end"
            sideOffset={8}
            collisionPadding={8}
            positionMethod="fixed"
            style={{ zIndex: 9999999, pointerEvents: 'auto' }}
          >
            <DropdownMenu.Popup>
              <CommentsMenu onClose={() => setIsOpen(false)} />
            </DropdownMenu.Popup>
          </DropdownMenu.Positioner>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <CommentEditorOverlay />
    </>
  )
}

function BeadsActionPanelWithContext() {
  return <BeadsActionPanel />
}

/**
 * React-trace plugin that creates beads (bd CLI) issues from comments and
 * inspected components.
 *
 * Requires the local bridge server to be running:
 *
 *   react-trace-beads --directory /path/to/repo
 *
 * @example
 * import { BeadsPlugin } from 'react-trace-plugin-beads'
 * <Trace root={import.meta.env.VITE_ROOT} plugins={[BeadsPlugin()]} />
 */
export function BeadsPlugin(options?: BeadsPluginOptions): TracePlugin {
  setBridgeUrl(resolveBridgeUrl(options?.bridgeUrl), options?.bridgeToken)
  return {
    name: 'beads',
    toolbar: BeadsToolbar,
    actionPanel: BeadsActionPanelWithContext,
    settings: BeadsSettings,
  }
}
