import type { Capture } from '@wordcatch/shared'
import type { Message } from '../messages'

/**
 * Alt+click a word (or double-click with Alt held) on any page — including YouTube captions —
 * to capture it with the sentence it appears in. No AI runs here; this script only captures.
 */

const BLOCK = 'p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption, dd, dt, article, section, div'
const CAPTION = '.ytp-caption-window-container, .caption-window'

function lang(): string {
  return document.documentElement.lang || navigator.language || 'en'
}

/** Find the word under the pointer using Intl.Segmenter (works for spaced and unspaced scripts). */
function wordAtPoint(x: number, y: number): { node: Text; start: number; end: number } | null {
  const pos = document.caretPositionFromPoint?.(x, y)
  const node = pos?.offsetNode
  if (!node || node.nodeType !== Node.TEXT_NODE) return null
  const text = node.textContent ?? ''
  const seg = new Intl.Segmenter(lang(), { granularity: 'word' })
  for (const s of seg.segment(text)) {
    if (pos.offset >= s.index && pos.offset <= s.index + s.segment.length && s.isWordLike) {
      return { node: node as Text, start: s.index, end: s.index + s.segment.length }
    }
  }
  return null
}

/** The sentence around the clicked word, taken from the nearest block (or the whole caption). */
function sentenceAround(node: Text, start: number): string {
  const el = node.parentElement
  const block = el?.closest(CAPTION) ?? el?.closest(BLOCK) ?? el
  if (!block) return node.textContent ?? ''
  const full = (block as HTMLElement).innerText ?? block.textContent ?? ''
  if (block.matches(CAPTION)) return full.replace(/\s+/g, ' ').trim()

  // Locate the clicked text node's offset inside the block's text.
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let offset = 0
  for (let n = walker.nextNode(); n && n !== node; n = walker.nextNode()) offset += n.textContent?.length ?? 0
  const text = block.textContent ?? ''
  const at = offset + start
  for (const s of new Intl.Segmenter(lang(), { granularity: 'sentence' }).segment(text)) {
    if (at >= s.index && at < s.index + s.segment.length) return s.segment.replace(/\s+/g, ' ').trim()
  }
  return full.slice(0, 300)
}

function flash(node: Text, start: number, end: number) {
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const rect = range.getBoundingClientRect()
  const mark = document.createElement('div')
  Object.assign(mark.style, {
    position: 'fixed', left: `${rect.left - 2}px`, top: `${rect.top - 2}px`,
    width: `${rect.width + 4}px`, height: `${rect.height + 4}px`, borderRadius: '4px',
    background: 'rgba(109,40,217,.25)', outline: '2px solid #6d28d9', zIndex: '2147483647',
    pointerEvents: 'none', transition: 'opacity .6s',
  })
  document.documentElement.appendChild(mark)
  setTimeout(() => (mark.style.opacity = '0'), 500)
  setTimeout(() => mark.remove(), 1200)
}

function toast(text: string) {
  const t = document.createElement('div')
  t.textContent = text
  Object.assign(t.style, {
    position: 'fixed', right: '16px', bottom: '16px', padding: '8px 12px', borderRadius: '8px',
    background: '#1f1235', color: '#fff', font: '13px system-ui, sans-serif', zIndex: '2147483647',
    boxShadow: '0 4px 16px rgba(0,0,0,.3)', transition: 'opacity .4s',
  })
  document.documentElement.appendChild(t)
  setTimeout(() => (t.style.opacity = '0'), 1400)
  setTimeout(() => t.remove(), 1900)
}

function capture(e: MouseEvent) {
  if (!e.altKey) return
  const hit = wordAtPoint(e.clientX, e.clientY)
  if (!hit) return
  e.preventDefault()
  e.stopPropagation()
  const word = hit.node.textContent!.slice(hit.start, hit.end)
  const c: Capture = {
    word,
    sentence: sentenceAround(hit.node, hit.start),
    url: location.href,
    title: document.title,
    at: Date.now(),
  }
  flash(hit.node, hit.start, hit.end)
  chrome.runtime
    .sendMessage({ type: 'capture', capture: c } satisfies Message)
    .then(() => toast(`Saved “${word}” to WordCatch`))
    .catch(() => toast('WordCatch: reload the page after updating the extension'))
}

// Capture phase so pages (and the YouTube player) can't swallow the click first.
document.addEventListener('click', capture, true)
