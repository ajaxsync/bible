import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react'
import { getVersion, loadStoredVersion, storeVersion } from '../data/versions.js'

const VersionContext = createContext(null)

export function VersionProvider({ children }) {
  const [versionId, setVersionIdState] = useState(() => {
    const id = loadStoredVersion()
    document.documentElement.dataset.bibleLang = getVersion(id).lang
    return id
  })

  useLayoutEffect(() => {
    document.documentElement.dataset.bibleLang = getVersion(versionId).lang
  }, [versionId])

  const setVersionId = (id) => {
    setVersionIdState(id)
    storeVersion(id)
  }

  const value = useMemo(
    () => ({ versionId, version: getVersion(versionId), setVersionId }),
    [versionId],
  )

  return <VersionContext.Provider value={value}>{children}</VersionContext.Provider>
}

export function useVersion() {
  const ctx = useContext(VersionContext)
  if (!ctx) throw new Error('useVersion must be used within VersionProvider')
  return ctx
}
