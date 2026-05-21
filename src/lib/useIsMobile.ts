import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 1024
const MQ = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MQ).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(MQ)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
