export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type WordStatus = 'new' | 'practicing' | 'learned'
/** Where an AI result was computed — shown as the ⚡ / ☁ badge. */
export type AiSource = 'on_device' | 'in_cloud'

export interface LangPair {
  /** Language being learned, BCP-47 (e.g. "en", "es", "ja"). */
  target: string
  /** Learner's native language, BCP-47. */
  native: string
}

/** What the content script captures when a word is clicked. */
export interface Capture {
  word: string
  sentence: string
  url: string
  title: string
  at: number
}

/** Output of the on-device enrichment prompt. */
export interface Enrichment {
  lemma: string
  translation: string
  pos: string
  cefr: Cefr
  topic: string
  example: string
}

export interface WordContext {
  sentence: string
  url: string
  title: string
  at: number
}

export interface CorrectUse {
  at: number
  sessionId: string
}

export interface WordDoc extends Omit<Enrichment, 'example'> {
  surfaceForms: string[]
  examples: string[]
  contexts: WordContext[]
  status: WordStatus
  correctUses: CorrectUse[]
  inferredBy: AiSource
  createdAt: number
  lastSeen: number
}

export type Verdict = 'correct' | 'awkward' | 'wrong'

export interface UsageGrade {
  lemma: string
  used: boolean
  verdict: Verdict
  feedback: string
}
