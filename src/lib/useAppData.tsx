import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppData } from '../types'
import { loadAppData, saveAppData } from './store'

type UseAppData = {
  data: AppData | null
  loading: boolean
  /** Setter write-through: perbarui state lalu persist ke localStorage. */
  setData: (next: AppData) => void
  reload: () => void
}

/**
 * Memuat AppData dari localStorage dan menjaganya tetap sinkron. Pola sama
 * dengan useAppData di project absensi (optimistic write-through), hanya saja
 * sumber datanya lokal sehingga tidak butuh autentikasi/jaringan.
 */
export function useAppData(): UseAppData {
  const [data, setDataState] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const dataRef = useRef<AppData | null>(null)
  dataRef.current = data

  const load = useCallback(() => {
    setLoading(true)
    setDataState(loadAppData())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Sinkron antar-tab: kalau tab lain menulis, muat ulang.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'personal-budget:data:v1') setDataState(loadAppData())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setData = useCallback((next: AppData) => {
    setDataState(next)
    saveAppData(next)
  }, [])

  return { data, loading, setData, reload: load }
}
