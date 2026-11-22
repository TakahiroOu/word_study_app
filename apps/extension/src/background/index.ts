import { QUEUE_KEY, readQueue, type Message } from '../messages'

// Clicking the toolbar icon opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)

/**
 * Captures are queued in chrome.storage so nothing is lost when the side panel is closed;
 * the side panel drains the queue (that's where Gemini Nano / Firebase AI Logic runs).
 */
chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type !== 'capture') return
  void (async () => {
    const queue = await readQueue()
    queue.push(msg.capture)
    await chrome.storage.local.set({ [QUEUE_KEY]: queue })
    await chrome.action.setBadgeText({ text: String(queue.length) })
    await chrome.action.setBadgeBackgroundColor({ color: '#6d28d9' })
    sendResponse({ ok: true, queued: queue.length })
  })()
  return true // keep the channel open for the async response
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && QUEUE_KEY in changes) {
    const n = (changes[QUEUE_KEY].newValue as unknown[] | undefined)?.length ?? 0
    void chrome.action.setBadgeText({ text: n ? String(n) : '' })
  }
})
