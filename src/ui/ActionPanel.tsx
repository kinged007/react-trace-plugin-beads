import {
  useClearSelectedContext,
  useDeactivateInspector,
  useSelectedContext,
  useSelectedSource,
} from '@react-trace/core'
import { ChatBubbleIcon, DropdownMenu } from '@react-trace/ui-components'

import { useCommentsActions, useSetPendingBead } from '../store'

export function BeadIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" style={{ display: 'block' }}>
      <circle cx="6" cy="2" r="1.7" />
      <circle cx="2.6" cy="6" r="1.7" />
      <circle cx="9.4" cy="6" r="1.7" />
      <circle cx="6" cy="10" r="1.7" />
    </svg>
  )
}

export function BeadsActionPanel() {
  const selectedContext = useSelectedContext()
  const selectedSource = useSelectedSource()
  const { setPending } = useCommentsActions()
  const setPendingBead = useSetPendingBead()
  const clearSelectedContext = useClearSelectedContext()
  const deactivateInspector = useDeactivateInspector()

  if (!selectedContext || !selectedSource) return null

  const handleAddComment = () => {
    setPending({
      filePath: selectedSource.relativePath,
      lineNumber: selectedSource.lineNumber,
      anchorEl: selectedContext.element,
    })
    clearSelectedContext()
    deactivateInspector()
  }

  const handleCreateBead = () => {
    const displayName = selectedContext?.displayName ?? selectedSource.fileName
    const breadcrumb = (selectedContext?.breadcrumb ?? []).join(' > ')
    setPendingBead({
      title: selectedSource.fileName.split('/').pop() ?? selectedSource.fileName,
      filePath: selectedSource.relativePath,
      lineNumber: selectedSource.lineNumber,
      displayName,
      breadcrumb,
      absolutePath: selectedSource.absolutePath,
      anchorEl: selectedContext.element,
    })
    clearSelectedContext()
    deactivateInspector()
  }

  return (
    <>
      <DropdownMenu.Item closeOnClick onClick={handleAddComment}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <ChatBubbleIcon />
        </span>
        Add comment
      </DropdownMenu.Item>
      <DropdownMenu.Item closeOnClick onClick={handleCreateBead}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <BeadIcon />
        </span>
        Create bead
      </DropdownMenu.Item>
    </>
  )
}
