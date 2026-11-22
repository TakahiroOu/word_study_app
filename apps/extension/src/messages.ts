import type { Capture } from '@wordcatch/shared'

/** chrome.storage.local key holding captures waiting for AI enrichment. */
export const QUEUE_KEY = 'captureQueue'

export type Message = { type: 'capture'; capture: Capture }

export async function readQueue(): Promise<Capture[]> {
  const { [QUEUE_KEY]: q } = await chrome.storage.local.get(QUEUE_KEY)
  return (q as Capture[] | undefined) ?? []
}
