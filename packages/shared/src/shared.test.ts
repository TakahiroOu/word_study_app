import { describe, expect, it } from 'vitest'
import { cleanToken, lemmaId, mergeCapture } from './lemma'
import { statusFor } from './mastery'
import { isEnrichment, parseJson } from './ai'
import type { Capture, Enrichment } from './types'

const capture = (word: string, sentence: string, at = 1): Capture => ({
  word, sentence, url: 'https://example.com', title: 'Example', at,
})
const enrich: Enrichment = {
  lemma: 'run', translation: '走る', pos: 'verb', cefr: 'A1', topic: 'sports', example: 'I run every day.',
}

describe('cleanToken / lemmaId', () => {
  it('strips punctuation and lowercases', () => {
    expect(cleanToken('“Running,”')).toBe('running')
    expect(cleanToken('  Café! ')).toBe('café')
  })
  it('rejects empty ids and escapes slashes', () => {
    expect(() => lemmaId('...')).toThrow()
    expect(lemmaId('and/or')).not.toContain('/')
  })
})

describe('mergeCapture', () => {
  it('creates a new word', () => {
    const w = mergeCapture(undefined, capture('Ran', 'She ran home.'), enrich, 'on_device')
    expect(w).toMatchObject({ lemma: 'run', surfaceForms: ['ran'], status: 'new', inferredBy: 'on_device' })
    expect(w.examples).toEqual(['I run every day.'])
  })
  it('merges a duplicate with a different surface form and sentence', () => {
    const first = mergeCapture(undefined, capture('ran', 'She ran home.', 1), enrich, 'on_device')
    const second = mergeCapture(first, capture('running', 'He is running late.', 2), enrich, 'in_cloud')
    expect(second.surfaceForms).toEqual(['ran', 'running'])
    expect(second.contexts.map((c) => c.sentence)).toEqual(['He is running late.', 'She ran home.'])
    expect(second.lastSeen).toBe(2)
    expect(second.inferredBy).toBe('on_device')
  })
  it('does not duplicate the same sentence', () => {
    const first = mergeCapture(undefined, capture('ran', 'She ran home.'), enrich, 'on_device')
    expect(mergeCapture(first, capture('ran', 'She ran home.', 5), enrich, 'on_device').contexts).toHaveLength(1)
  })
})

describe('statusFor', () => {
  const day = 86_400_000
  it('needs correct use on N different days', () => {
    expect(statusFor([], 3)).toBe('new')
    const sameDay = [0, 1000, 2000].map((at) => ({ at, sessionId: 's' }))
    expect(statusFor(sameDay, 3)).toBe('practicing')
    const threeDays = [0, day, 2 * day].map((at) => ({ at, sessionId: 's' }))
    expect(statusFor(threeDays, 3)).toBe('learned')
  })
})

describe('AI output validation', () => {
  it('parses fenced JSON and validates shape', () => {
    expect(isEnrichment(parseJson('```json\n' + JSON.stringify(enrich) + '\n```'))).toBe(true)
    expect(isEnrichment({ ...enrich, cefr: 'Z9' })).toBe(false)
    expect(isEnrichment({ ...enrich, lemma: '' })).toBe(false)
  })
})
