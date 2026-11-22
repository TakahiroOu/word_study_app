import type { CorrectUse, WordDoc, WordStatus } from './types'

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Number of distinct (UTC) days on which the word was used correctly. */
export function distinctDays(uses: CorrectUse[]): number {
  return new Set(uses.map((u) => dayKey(u.at))).size
}

/**
 * A word is "learned" only after correct use on `requiredDays` different days —
 * a single lucky sentence isn't mastery.
 */
export function statusFor(uses: CorrectUse[], requiredDays: number): WordStatus {
  if (uses.length === 0) return 'new'
  return distinctDays(uses) >= requiredDays ? 'learned' : 'practicing'
}

export function recordCorrectUse(word: WordDoc, use: CorrectUse, requiredDays: number): WordDoc {
  const correctUses = [...word.correctUses, use]
  return { ...word, correctUses, status: statusFor(correctUses, requiredDays) }
}
