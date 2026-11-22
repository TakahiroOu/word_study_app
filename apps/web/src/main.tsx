import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Day 3: Google sign-in, word library (TanStack Query + Firestore), practice conversations.
function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>WordCatch</h1>
      <p>Practice app — coming on Day 3.</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
