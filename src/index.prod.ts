import type { TracePlugin } from '@react-trace/core'

import type { BeadsPluginOptions, BeadsSettings } from './types'

export type { BeadsPluginOptions, BeadsSettings } from './types'

export function BeadsPlugin(_options?: BeadsPluginOptions): TracePlugin {
  return { name: 'beads' }
}

export function useBeadsSettings(): BeadsSettings | null {
  return null
}
