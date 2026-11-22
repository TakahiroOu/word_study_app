import type { LangPair } from '@wordcatch/shared'

export type NanoStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported'

interface LanguageModelStatic {
  availability(opts?: unknown): Promise<Exclude<NanoStatus, 'unsupported'>>
}

/**
 * Display-only check of Chrome's built-in model for the chosen languages.
 * Firebase AI Logic makes the real routing decision (PREFER_ON_DEVICE → cloud fallback).
 */
export async function nanoStatus(langs: LangPair): Promise<NanoStatus> {
  const LM = (self as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel
  if (!LM) return 'unsupported'
  const languages = [...new Set([langs.target, langs.native, 'en'])]
  try {
    return await LM.availability({
      expectedInputs: [{ type: 'text', languages }],
      expectedOutputs: [{ type: 'text', languages }],
    })
  } catch {
    return 'unavailable'
  }
}
