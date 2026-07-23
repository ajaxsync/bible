import { Capacitor } from '@capacitor/core'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const PwaUpdateContext = createContext(null)

export function PwaUpdateProvider({ children }) {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updating, setUpdating] = useState(false)
  const updateSWRef = useRef(null)
  const registrationRef = useRef(null)

  useEffect(() => {
    // Capacitor / 无 PWA 构建：不注册 Service Worker
    if (import.meta.env.VITE_CAPACITOR === 'true') return undefined
    if (Capacitor.isNativePlatform()) return undefined
    if (!('serviceWorker' in navigator)) return undefined

    let cancelled = false
    let cleanup = () => {}

    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return

        const updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true)
          },
          onRegistered(registration) {
            registrationRef.current = registration ?? null
          },
        })
        updateSWRef.current = updateSW

        const checkForUpdateOnVisible = () => {
          registrationRef.current?.update().catch(() => {})
        }

        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            checkForUpdateOnVisible()
          }
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        cleanup = () => document.removeEventListener('visibilitychange', onVisibilityChange)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  const applyUpdate = useCallback(async () => {
    if (!updateSWRef.current || updating) return
    setUpdating(true)
    try {
      await updateSWRef.current(true)
    } catch {
      setUpdating(false)
    }
  }, [updating])

  const value = useMemo(
    () => ({
      needRefresh,
      updating,
      applyUpdate,
    }),
    [needRefresh, updating, applyUpdate],
  )

  return (
    <PwaUpdateContext.Provider value={value}>
      {children}
    </PwaUpdateContext.Provider>
  )
}

export function usePwaUpdate() {
  const ctx = useContext(PwaUpdateContext)
  if (!ctx) throw new Error('usePwaUpdate must be used within PwaUpdateProvider')
  return ctx
}
