import {
  getGenerativeModel,
  InferenceMode,
  Schema,
  type AI,
  type GenerativeModel,
} from 'firebase/ai'
import type { AiSource, Capture, Cefr, Enrichment, LangPair } from './types'

/** Overridable from Remote Config (`cloud_model_name`). */
export const DEFAULT_CLOUD_MODEL = 'gemini-3.5-flash-lite'

const CEFR: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const TOPICS = [
  'daily life', 'food', 'travel', 'work', 'business', 'technology', 'science', 'health',
  'nature', 'politics', 'culture', 'emotions', 'sports', 'education', 'other',
] as const

// Plain JSON Schema for the on-device Prompt API (`responseConstraint`)...
const enrichmentJsonSchema = {
  type: 'object',
  properties: {
    lemma: { type: 'string' },
    translation: { type: 'string' },
    pos: { type: 'string' },
    cefr: { type: 'string', enum: CEFR },
    topic: { type: 'string', enum: [...TOPICS] },
    example: { type: 'string' },
  },
  required: ['lemma', 'translation', 'pos', 'cefr', 'topic', 'example'],
}

// ...and the equivalent Firebase Schema for the cloud fallback.
const enrichmentCloudSchema = Schema.object({
  properties: {
    lemma: Schema.string(),
    translation: Schema.string(),
    pos: Schema.string(),
    cefr: Schema.enumString({ enum: CEFR }),
    topic: Schema.enumString({ enum: [...TOPICS] }),
    example: Schema.string(),
  },
})

export const langName = (code: string) =>
  new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code

const models = new Map<string, GenerativeModel>()

/**
 * The hybrid enrichment model: runs on Gemini Nano when Chrome has it for this language pair,
 * otherwise Firebase AI Logic transparently falls back to cloud Gemini.
 */
export function enrichmentModel(ai: AI, langs: LangPair, cloudModel = DEFAULT_CLOUD_MODEL): GenerativeModel {
  const key = `${langs.target}>${langs.native}|${cloudModel}`
  let model = models.get(key)
  if (!model) {
    const languages = [...new Set([langs.target, langs.native, 'en'])]
    model = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          expectedInputs: [{ type: 'text', languages }],
          expectedOutputs: [{ type: 'text', languages }],
        },
        promptOptions: { responseConstraint: enrichmentJsonSchema },
      },
      inCloudParams: {
        model: cloudModel,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: enrichmentCloudSchema,
          temperature: 0.2,
        },
      },
    })
    models.set(key, model)
  }
  return model
}

export function enrichmentPrompt(capture: Capture, langs: LangPair): string {
  const target = langName(langs.target)
  const native = langName(langs.native)
  return [
    `You are a dictionary for a ${native}-speaking learner of ${target}.`,
    `The learner clicked the word "${capture.word}" in this sentence:`,
    `"${capture.sentence}"`,
    '',
    'Return JSON with:',
    `- lemma: dictionary form of the word in ${target} (e.g. "ran" -> "run"), lowercase unless a proper noun`,
    `- translation: short ${native} translation of the word AS USED IN THIS SENTENCE`,
    '- pos: part of speech in English (noun, verb, adjective, adverb, phrase, ...)',
    '- cefr: estimated CEFR level',
    `- topic: one of ${TOPICS.join(', ')}`,
    `- example: one new, simple ${target} example sentence using the lemma with the same meaning`,
  ].join('\n')
}

export function isEnrichment(x: unknown): x is Enrichment {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    ['lemma', 'translation', 'pos', 'example', 'topic'].every((k) => typeof o[k] === 'string' && o[k] !== '') &&
    CEFR.includes(o.cefr as Cefr)
  )
}

/** Extracts JSON even if a model wraps it in ``` fences. */
export function parseJson(text: string): unknown {
  const stripped = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  return JSON.parse(stripped)
}

export interface AiResult<T> {
  data: T
  source: AiSource
  ms: number
}

export async function enrichWord(
  ai: AI,
  capture: Capture,
  langs: LangPair,
  cloudModel?: string,
): Promise<AiResult<Enrichment>> {
  const model = enrichmentModel(ai, langs, cloudModel)
  const prompt = enrichmentPrompt(capture, langs)
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = performance.now()
    try {
      const { response } = await model.generateContent(prompt)
      const data = parseJson(response.text())
      if (!isEnrichment(data)) throw new Error(`Invalid enrichment: ${response.text()}`)
      if (!TOPICS.includes(data.topic as (typeof TOPICS)[number])) data.topic = 'other'
      return { data, source: response.inferenceSource ?? 'in_cloud', ms: Math.round(performance.now() - t0) }
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
