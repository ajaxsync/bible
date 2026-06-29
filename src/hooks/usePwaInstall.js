import { useEffect, useState } from 'react'
import { promptPwaInstall, subscribePwaInstall } from '../lib/pwaInstall.js'

export function usePwaInstall() {
  const [installState, setInstallState] = useState('unavailable')

  useEffect(() => subscribePwaInstall(setInstallState), [])

  const promptInstall = () => promptPwaInstall()

  return { installState, promptInstall }
}
