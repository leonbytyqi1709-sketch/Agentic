import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const MAP = {
  d: '/dashboard',
  c: '/clients',
  p: '/projects',
  i: '/invoices',
  r: '/reports',
  s: '/settings',
}

export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()
  const chord = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.target.matches('input, textarea, select')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // g + letter navigation
      if (e.key === 'g') {
        chord.current = 'g'
        setTimeout(() => (chord.current = null), 800)
        return
      }
      if (chord.current === 'g') {
        const path = MAP[e.key.toLowerCase()]
        if (path) {
          e.preventDefault()
          navigate(path)
        }
        chord.current = null
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, location.pathname])
}
