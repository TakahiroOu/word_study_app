# WordCatch

**Don't just memorize words. Use them.**

WordCatch is a Chrome extension and web app for language learners. Alt+click any word while you read an article or watch YouTube with captions. **On-device Gemini Nano** translates it *as used in that sentence*, reduces it to its dictionary form (so "ran", "running" and "runs" all become "run"), removes duplicates, and tags it with a topic and CEFR level. You never leave the page, and your browsing context stays on your device.

Later, a **cloud Gemini** tutor holds a conversation with you that's built around your saved words and grades how you use each one. A word only counts as *learned* after you've used it correctly on several different days.

Built for [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com/) with the **Firebase AI Logic hybrid inference SDK**.

## Why hybrid?
| Task | Inference mode | Why |
|---|---|---|
| Word enrichment (translation in context, dictionary form, part of speech, CEFR, topic, example) | `PREFER_ON_DEVICE` | Runs on every click: instant, free, private, works offline |
| Language pairs or devices without Gemini Nano | automatic cloud fallback | Any language pair works on any Chrome |
| Conversation tutor and usage grading | `ONLY_IN_CLOUD` | Long context and reasoning |

Every AI result shows a ⚡ badge (on-device) or ☁ badge (cloud), using `response.inferenceSource`.

The code: [packages/shared/src/ai.ts](packages/shared/src/ai.ts) uses `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, ... })`.

## Repo layout
```
packages/shared   types, Firebase init (App Check, Firestore, AI Logic), hybrid AI wrappers, dedupe + mastery logic
apps/extension    Chrome MV3 extension: content script (capture) + side panel (AI Logic runs here)
apps/web          Practice web app (Firebase Hosting)
```

## Setup
1. **Firebase project**: in the [Firebase console](https://console.firebase.google.com), create a project, then:
   - **AI Logic**: get started and choose the *Gemini Developer API*.
   - **App Check**: register the web app with **reCAPTCHA Enterprise**. Under *Manage debug tokens*, add a debug token for the extension. Chrome extensions can't run reCAPTCHA, so they use a debug token, which the hackathon rules allow.
   - **Firestore**: create a database, then deploy the rules with `firebase deploy --only firestore:rules`.
   - **Authentication**: enable the Google provider.
2. Copy `.env.example` to `apps/extension/.env.local` and `apps/web/.env.local`, then fill in the values.
3. Run `npm install`.
4. Run `npm test` to run the unit tests.
5. **Extension**: run `npm run build -w apps/extension`. Then go to `chrome://extensions`, turn on Developer mode, click *Load unpacked*, and select `apps/extension/dist`.
   - To use Gemini Nano, use Chrome 138+ on a supported device. Check `chrome://on-device-internals` to confirm the model is available. Without it, the app automatically uses the cloud instead.
6. **Web**: run `npm run dev:web`.

## License
[Apache-2.0](LICENSE)
