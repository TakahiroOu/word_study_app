import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  enrichWord,
  initFirebase,
  langName,
  lemmaId,
  mergeCapture,
  type AiSource,
  type LangPair,
  type WordDoc,
} from '@wordcatch/shared'
import { QUEUE_KEY, readQueue } from '../messages'
import { loadLangs, loadWords, saveLangs, saveWords } from './localStore'
import { nanoStatus, type NanoStatus } from './nano'

const { ai } = initFirebase({ appCheckDebugToken: import.meta.env.VITE_APPCHECK_DEBUG_TOKEN })

const LANGS = ['en', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ko', 'zh', 'vi', 'th', 'ar', 'hi', 'ru']

interface Activity {
  word: string
  lemma?: string
  source?: AiSource
  ms?: number
  merged?: boolean
  error?: string
}

export function App() {
  const [langs, setLangs] = useState<LangPair | null>(null)
  const [words, setWords] = useState<Record<string, WordDoc>>({})
  const [activity, setActivity] = useState<Activity[]>([])
  const [nano, setNano] = useState<NanoStatus>('unsupported')
  const busy = useRef(false)

  useEffect(() => {
    void loadLangs().then(setLangs)
    void loadWords().then(setWords)
  }, [])

  useEffect(() => {
    if (langs) void nanoStatus(langs).then(setNano)
  }, [langs])

  /** Drain the capture queue one item at a time: enrich (hybrid) → dedupe by lemma → save. */
  const drain = useCallback(async () => {
    if (busy.current || !langs) return
    busy.current = true
    try {
      for (;;) {
        const [next, ...rest] = await readQueue()
        if (!next) break
        try {
          const { data, source, ms } = await enrichWord(ai, next, langs)
          const id = lemmaId(data.lemma, langs.target)
          const all = await loadWords()
          const merged = id in all
          all[id] = mergeCapture(all[id], next, data, source)
          await saveWords(all)
          setWords(all)
          setActivity((a) => [{ word: next.word, lemma: id, source, ms, merged }, ...a].slice(0, 20))
        } catch (e) {
          console.error(e)
          setActivity((a) => [{ word: next.word, error: String(e) }, ...a].slice(0, 20))
        }
        await chrome.storage.local.set({ [QUEUE_KEY]: rest })
      }
    } finally {
      busy.current = false
    }
  }, [langs])

  useEffect(() => {
    void drain()
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && QUEUE_KEY in changes) void drain()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [drain])

  const sorted = useMemo(() => Object.values(words).sort((a, b) => b.lastSeen - a.lastSeen), [words])

  if (!langs) return null

  const setLang = (k: keyof LangPair) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = { ...langs, [k]: e.target.value }
    setLangs(next)
    void saveLangs(next)
  }

  const remove = async (lemma: string) => {
    const all = await loadWords()
    delete all[lemma]
    await saveWords(all)
    setWords(all)
  }

  return (
    <main>
      <header>
        <h1>WordCatch</h1>
        <span className={`nano nano-${nano}`} title="Chrome built-in Gemini Nano status">
          {nano === 'available' ? '⚡ on-device ready' : nano === 'unsupported' ? '☁ cloud mode' : `⚡ ${nano}`}
        </span>
      </header>

      <section className="langs">
        <label>
          Learning
          <select value={langs.target} onChange={setLang('target')}>
            {LANGS.map((l) => <option key={l} value={l}>{langName(l)}</option>)}
          </select>
        </label>
        <label>
          I speak
          <select value={langs.native} onChange={setLang('native')}>
            {LANGS.map((l) => <option key={l} value={l}>{langName(l)}</option>)}
          </select>
        </label>
      </section>

      <p className="hint"><kbd>Alt</kbd> + click any word on a page or in YouTube captions.</p>

      {activity.length > 0 && (
        <section className="activity">
          {activity.slice(0, 3).map((a, i) => (
            <div key={i} className={a.error ? 'err' : ''}>
              {a.error ? `✗ “${a.word}”: ${a.error}` : (
                <>
                  <SourceBadge source={a.source!} /> “{a.word}” → <b>{a.lemma}</b>
                  {a.merged && <em> · merged duplicate</em>} <small>{a.ms} ms</small>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      <ul className="words">
        {sorted.map((w) => (
          <li key={w.lemma}>
            <div className="row">
              <b>{w.lemma}</b> <span className="pos">{w.pos}</span>
              <span className="chip">{w.topic}</span>
              <span className="chip cefr">{w.cefr}</span>
              <SourceBadge source={w.inferredBy} />
              <button className="del" onClick={() => void remove(w.lemma)} aria-label={`Delete ${w.lemma}`}>×</button>
            </div>
            <div className="tr">{w.translation}</div>
            <div className="ctx">“{w.contexts[0]?.sentence}”</div>
            {w.surfaceForms.length > 1 && <div className="forms">seen as: {w.surfaceForms.join(', ')}</div>}
          </li>
        ))}
      </ul>
      {sorted.length === 0 && <p className="empty">No words yet.</p>}
    </main>
  )
}

function SourceBadge({ source }: { source: AiSource }) {
  return source === 'on_device'
    ? <span className="badge dev" title="Computed on-device by Gemini Nano">⚡</span>
    : <span className="badge cloud" title="Computed in the cloud by Gemini">☁</span>
}
