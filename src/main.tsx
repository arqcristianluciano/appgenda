import './sentry'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { safeUpdate } from './lib/swUpdate'
import './index.css'

function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
setAppHeight()
window.addEventListener('resize', setAppHeight)

// iOS: al enfocar un campo, evita que el teclado lo tape. Solo en táctil y solo
// si el campo queda fuera del viewport visible (consciente de visualViewport).
if ('ontouchstart' in window && window.matchMedia('(pointer: coarse)').matches) {
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement | null
    if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
    setTimeout(() => {
      const vh = window.visualViewport?.height ?? window.innerHeight
      const rect = el.getBoundingClientRect()
      if (rect.bottom > vh - 12 || rect.top < 0) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 300) // deja que el teclado termine de animar
  })
}

if ('serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; window.location.reload() }
  })
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      safeUpdate(reg)
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    })
  })
  setInterval(() => {
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => safeUpdate(r))
    )
  }, 10_000)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
