import { createContext, useContext, useMemo, useState } from 'react'
import { DEFAULT_VERSION, getVersion, loadStoredVersion, storeVersion } from '../data/versions.js'

const VersionContext = createContext(null)

export function VersionProvider({ children }) {
  const [versionId, setVersionIdState] = useState(loadStoredVersion)

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
