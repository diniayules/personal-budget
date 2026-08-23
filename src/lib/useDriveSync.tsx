// =============================================================
// useDriveSync.tsx · Menjembatani AppData (localStorage) <-> Google Drive.
//
// Strategi sederhana & aman untuk satu pengguna lintas-perangkat:
// - Setiap perubahan lokal menaikkan stempel waktu `updatedAt` lalu (debounce)
//   diunggah ke Drive.
// - Saat sinkron, snapshot dengan `updatedAt` paling baru yang menang
//   (last-write-wins). Ekspor JSON tetap tersedia sebagai cadangan manual.
//
// Catatan: bila dua perangkat sama-sama diedit saat offline, hanya perubahan
// terakhir yang tersimpan — wajar untuk catatan keuangan satu orang.
// =============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppData } from '../types'
import { connectDrive, disconnectDrive, isDriveConfigured, pullFromDrive, pushToDrive } from './drive'

const SYNC_KEY = 'personal-budget:sync:v1'
const PUSH_DEBOUNCE_MS = 2000

export type DriveStatus = 'off' | 'connecting' | 'idle' | 'syncing' | 'error'

type Persisted = { connected: boolean; updatedAt: number }

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      return { connected: !!p.connected, updatedAt: Number(p.updatedAt) || 0 }
    }
  } catch {
    /* abaikan, pakai default */
  }
  return { connected: false, updatedAt: 0 }
}

export type DriveSync = {
  configured: boolean
  connected: boolean
  status: DriveStatus
  lastError: string | null
  lastSyncAt: number
  connect: () => Promise<void>
  disconnect: () => void
  syncNow: () => Promise<void>
}

export function useDriveSync(data: AppData | null, setData: (d: AppData) => void): DriveSync {
  const initial = loadPersisted()
  const [connected, setConnected] = useState(initial.connected)
  const [status, setStatus] = useState<DriveStatus>('off')
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<number>(initial.updatedAt)

  const connectedRef = useRef(initial.connected)
  const localUpdatedAt = useRef<number>(initial.updatedAt)
  const lastSyncedJson = useRef<string>('') // snapshot terakhir yang seragam dengan Drive
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  const persist = useCallback((isConnected: boolean, ts: number) => {
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify({ connected: isConnected, updatedAt: ts }))
    } catch {
      /* abaikan */
    }
  }, [])

  const markSynced = useCallback(
    (d: AppData, ts: number) => {
      lastSyncedJson.current = JSON.stringify(d)
      localUpdatedAt.current = ts
      setLastSyncAt(ts)
      persist(connectedRef.current, ts)
    },
    [persist],
  )

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Gagal sinkron ke Drive')

  // Tarik dari Drive, bandingkan stempel waktu; yang terbaru menang.
  const syncNow = useCallback(async () => {
    const local = dataRef.current
    if (!connectedRef.current || !local) return
    setStatus('syncing')
    setLastError(null)
    try {
      const remote = await pullFromDrive()
      if (remote && remote.updatedAt > localUpdatedAt.current) {
        setData(remote.data)
        markSynced(remote.data, remote.updatedAt)
      } else {
        const ts = Math.max(localUpdatedAt.current, Date.now())
        if (!remote || JSON.stringify(local) !== JSON.stringify(remote.data)) {
          await pushToDrive({ data: local, updatedAt: ts })
        }
        markSynced(local, ts)
      }
      setStatus('idle')
    } catch (e) {
      setStatus('error')
      setLastError(errMsg(e))
    }
  }, [setData, markSynced])

  const connect = useCallback(async () => {
    setStatus('connecting')
    setLastError(null)
    try {
      await connectDrive()
      connectedRef.current = true
      setConnected(true)
      persist(true, localUpdatedAt.current)
      await syncNow()
    } catch (e) {
      setStatus('error')
      setLastError(errMsg(e))
    }
  }, [persist, syncNow])

  const disconnect = useCallback(() => {
    disconnectDrive()
    connectedRef.current = false
    setConnected(false)
    persist(false, localUpdatedAt.current)
    setStatus('off')
    setLastError(null)
  }, [persist])

  // Sambung ulang diam-diam + sinkron awal, sekali saat data pertama tersedia.
  const bootstrapped = useRef(false)
  useEffect(() => {
    if (bootstrapped.current || !data) return
    bootstrapped.current = true
    if (!isDriveConfigured() || !connectedRef.current) return
    lastSyncedJson.current = JSON.stringify(data) // baseline agar tak memicu push semu
    ;(async () => {
      setStatus('connecting')
      try {
        await connectDrive()
        connectedRef.current = true
        await syncNow()
      } catch {
        // Sambung-ulang diam-diam bisa gagal (popup diblokir / sesi habis).
        // Jangan kabari sebagai error; biarkan idle agar user bisa "Sinkronkan sekarang".
        setStatus('idle')
      }
    })()
  }, [data, syncNow])

  // Deteksi perubahan lokal -> unggah ke Drive (debounce).
  useEffect(() => {
    if (!connectedRef.current || !data) return
    const json = JSON.stringify(data)
    if (lastSyncedJson.current === '') {
      lastSyncedJson.current = json
      return
    }
    if (json === lastSyncedJson.current) return

    const ts = Date.now()
    localUpdatedAt.current = ts
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      setStatus('syncing')
      try {
        await pushToDrive({ data, updatedAt: ts })
        markSynced(data, ts)
        setStatus('idle')
      } catch (e) {
        setStatus('error')
        setLastError(errMsg(e))
      }
    }, PUSH_DEBOUNCE_MS)

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [data, markSynced])

  return {
    configured: isDriveConfigured(),
    connected,
    status,
    lastError,
    lastSyncAt,
    connect,
    disconnect,
    syncNow,
  }
}
