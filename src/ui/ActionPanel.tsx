import {
  useClearSelectedContext,
  useDeactivateInspector,
  useSelectedContext,
  useSelectedSource,
} from '@react-trace/core'
import { ChatBubbleIcon, DropdownMenu } from '@react-trace/ui-components'
import { useState } from 'react'

import { getBridgeClient, useBeadsSettings, useCommentsActions } from '../store'
import type { CreateBeadInput } from '../types'

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

type CreateState = 'idle' | 'creating' | 'created' | 'error'

export function BeadsActionPanel() {
  const selectedContext = useSelectedContext()
  const selectedSource = useSelectedSource()
  const settings = useBeadsSettings()
  const { setPending } = useCommentsActions()
  const clearSelectedContext = useClearSelectedContext()
  const deactivateInspector = useDeactivateInspector()

  const [createState, setCreateState] = useState<CreateState>('idle')
  const [createdId, setCreatedId] = useState('')

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

  const handleCreateBead = async () => {
    const source = selectedSource
    if (!source) return
    setCreateState('creating')

    const displayName = selectedContext?.displayName ?? source.fileName
    const breadcrumb = (selectedContext?.breadcrumb ?? []).join(' > ')
    const propsPreview = JSON.stringify(selectedContext?.props ?? {}).slice(0, 2000)

    const input: CreateBeadInput = {
      title: source.fileName.split('/').pop() ?? source.fileName,
      description: [
        `Component: ${displayName}`,
        breadcrumb ? `Breadcrumb: ${breadcrumb}` : '',
        propsPreview && propsPreview !== '{}' ? `Props: ${propsPreview}` : '',
        '',
        '---',
        'Source: react-trace component',
        `Path: ${source.relativePath}:${source.lineNumber}`,
        `Absolute: ${source.absolutePath}`,
      ]
        .filter(Boolean)
        .join('\n'),
      priority: settings.priority,
      labels: settings.labels.split(',').map((l) => l.trim()).filter(Boolean),
      status: settings.status,
      epic: settings.epic,
    }

    try {
      const issue = await getBridgeClient().create(input)
      setCreatedId(issue.id)
      setCreateState('created')
    } catch {
      setCreateState('error')
    }
  }

  return (
    <>
      <DropdownMenu.Item closeOnClick onClick={handleAddComment}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <ChatBubbleIcon />
        </span>
        Add comment
      </DropdownMenu.Item>
      <DropdownMenu.Item
        closeOnClick={createState !== 'creating'}
        onClick={() => {
          if (createState === 'idle' || createState === 'error') void handleCreateBead()
        }}
        style={{
          color: createState === 'error' ? '#f87171' : createState === 'created' ? '#4ade80' : undefined,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <BeadIcon />
        </span>
        {createState === 'creating'
          ? 'Creating bead…'
          : createState === 'created'
            ? `Bead created: ${createdId}`
            : createState === 'error'
              ? 'Failed — try again'
              : 'Create bead'}
      </DropdownMenu.Item>
    </>
  )
}
