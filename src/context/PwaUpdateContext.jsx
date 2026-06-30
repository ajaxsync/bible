import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

const PwaUpdateContext = createContext(null)

export function PwaUpdateProvider({ children }) {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updating, setUpdating] = useState(false)
  const updateSWRef = useRef(null)
  const registrationRef = useRef(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined

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

    const checkForUpdate = () => {
      registrationRef.current?.update().catch(() => {})
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
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
