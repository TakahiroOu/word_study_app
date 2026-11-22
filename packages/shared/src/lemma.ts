import type { Capture, Enrichment, WordDoc } from './types'

const MAX_CONTEXTS = 5

/** Normalises a clicked token: trims punctuation/whitespace, lowercases (locale-aware). */
export function cleanToken(raw: string, lang = 'en'): string {
  return raw
    .normalize('NFC')
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')
    .toLocaleLowerCase(lang)
}

/** Firestore doc id for a lemma. Ids can't contain "/" and shouldn't be empty. */
export function lemmaId(lemma: string, lang = 'en'): string {
  const id = cleanToken(lemma, lang).replace(/\//g, '∕').replace(/\s+/g, ' ')
  if (!id || id === '.' || id === '..') throw new Error(`Invalid lemma: "${lemma}"`)
  return id
}

/**
 * Creates a new word doc, or merges a new capture into an existing one (duplicate click).
 * Pure function so it is easy to test; the caller writes the result to Firestore.
 */
export function mergeCapture(
  existing: WordDoc | undefined,
  capture: Capture,
  enrichment: Enrichment,
  source: WordDoc['inferredBy'],
): WordDoc {
  const surface = cleanToken(capture.word)
  const context = { sentence: capture.sentence, url: capture.url, title: capture.title, at: capture.at }

  if (!existing) {
    const { example, ...rest } = enrichment
    return {
      ...rest,
      lemma: lemmaId(enrichment.lemma),
      surfaceForms: [surface],
      examples: example ? [example] : [],
      contexts: [context],
      status: 'new',
      correctUses: [],
      inferredBy: source,
      createdAt: capture.at,
      lastSeen: capture.at,
    }
  }

  const sameSentence = existing.contexts.some((c) => c.sentence === context.sentence)
  return {
    ...existing,
    surfaceForms: existing.surfaceForms.includes(surface)
      ? existing.surfaceForms
      : [...existing.surfaceForms, surface],
    contexts: sameSentence ? existing.contexts : [context, ...existing.contexts].slice(0, MAX_CONTEXTS),
    lastSeen: capture.at,
  }
}
