import type { LangPair, WordDoc } from '@wordcatch/shared'

/**
 * Day-0 local word store (chrome.storage.local). Day 2 swaps this for Firestore
 * (users/{uid}/words/{lemma}) with offline persistence; the WordDoc shape is the same.
 */
const WORDS_KEY = 'words'
const LANGS_KEY = 'langs'

export async function loadWords(): Promise<Record<string, WordDoc>> {
  const { [WORDS_KEY]: w } = await chrome.storage.local.get(WORDS_KEY)
  return (w as Record<string, WordDoc> | undefined) ?? {}
}

export async function saveWords(words: Record<string, WordDoc>): Promise<void> {
  await chrome.storage.local.set({ [WORDS_KEY]: words })
}

export async function loadLangs(): Promise<LangPair> {
  const { [LANGS_KEY]: l } = await chrome.storage.sync.get(LANGS_KEY)
  return (l as LangPair | undefined) ?? { target: 'en', native: navigator.language.split('-')[0] || 'en' }
}

export async function saveLangs(langs: LangPair): Promise<void> {
  await chrome.storage.sync.set({ [LANGS_KEY]: langs })
}
