export interface BeadsSettings {
  /** Whether new comments start with the bead checkbox checked. */
  autoAddBead: boolean
  /** Comma-separated default labels applied to created beads. */
  labels: string
  /** Default beads status (e.g. "open", "in_progress"). */
  status: string
  /** Default priority (P0-P4). */
  priority: string
  /** Optional epic bead id; created beads become its children. */
  epic: string
}

export interface BeadsPluginOptions {
  /** Base URL of the local bd bridge server. Default: http://localhost:4790 */
  bridgeUrl?: string
}

export interface BeadStatusOption {
  name: string
  category: string
  icon: string
  description?: string
}

export interface BeadEpicOption {
  id: string
  title: string
}

export interface BeadOptions {
  statuses: BeadStatusOption[]
  priorities: string[]
  epics: BeadEpicOption[]
  labels: string[]
}

export interface CreateBeadInput {
  title: string
  description: string
  priority: string
  labels: string[]
  status: string
  epic: string
  /** Unique marker (rtc-<uuid>) used to find and delete the created issue. */
  marker?: string
  /** Project directory the bridge runs bd in. Defaults to the bridge's --directory. */
  directory?: string
}

export interface BeadIssue {
  id: string
  title: string
  status: string
  priority: number
  labels?: string[]
}
