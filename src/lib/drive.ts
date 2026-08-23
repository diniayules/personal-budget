// =============================================================
// drive.ts · Sinkronisasi data ke Google Drive (folder aplikasi).
//
// Menyimpan satu file `personal-budget.json` di **appDataFolder** Drive milik
// pengguna — folder tersembunyi khusus aplikasi ini: tak terlihat di Drive
// biasa dan tak bisa diakses aplikasi lain. Scope minimal: `drive.appdata`.
//
// Tidak ada "akun aplikasi" dan tidak ada server kita sendiri: identitas
// dipinjam dari login Google pengguna lewat Google Identity Services (GIS).
// Client ID diisi lewat env VITE_GOOGLE_CLIENT_ID (publik, bukan rahasia).
// =============================================================
import type { AppData } from '../types'
import { normalizeHargaEmasList, normalizePriceList } from './store'

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'personal-budget.json'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

/** Satu salinan data + stempel waktu, bentuk yang disimpan di Drive. */
export type DriveSnapshot = { data: AppData; updatedAt: number }

// --- Token GIS (di-cache di memori; access token kedaluwarsa ~1 jam) ---
let accessToken = ''
let tokenExpiry = 0
let cachedFileId = ''

/** Apakah Client ID Google sudah dikonfigurasi? Bila tidak, fitur disembunyikan. */
export function isDriveConfigured(): boolean {
  return CLIENT_ID !== ''
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Gagal memuat Google Identity Services'))
    document.head.appendChild(s)
  })
}

type GisOAuth2 = {
  initTokenClient: (cfg: Record<string, unknown>) => { requestAccessToken: (o?: { prompt?: string }) => void }
  revoke: (token: string, cb: () => void) => void
}
function gis(): GisOAuth2 | undefined {
  return (window as unknown as { google?: { accounts?: { oauth2?: GisOAuth2 } } }).google?.accounts?.oauth2
}

/**
 * Minta access token lewat GIS. `prompt: ''` mengembalikan token tanpa UI bila
 * pengguna sudah mengizinkan sebelumnya; menampilkan dialog Google bila belum.
 */
function requestToken(prompt: '' | 'consent' = ''): Promise<string> {
  return new Promise((resolve, reject) => {
    loadScript(GIS_SRC)
      .then(() => {
        const oauth2 = gis()
        if (!oauth2) return reject(new Error('Google Identity Services belum siap'))
        const client = oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          prompt,
          callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => {
            if (resp.error || !resp.access_token) return reject(new Error(resp.error || 'token_gagal'))
            accessToken = resp.access_token
            tokenExpiry = Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 60_000
            resolve(accessToken)
          },
          error_callback: (err: { type?: string }) => reject(new Error(err?.type || 'token_dibatalkan')),
        })
        client.requestAccessToken({ prompt })
      })
      .catch(reject)
  })
}

async function validToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken
  return requestToken('')
}

/** Panggil Drive REST dengan Bearer token; sekali coba ulang bila token kedaluwarsa (401). */
async function api(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await validToken()
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 && retry) {
    accessToken = ''
    return api(url, init, false)
  }
  return res
}

async function findFileId(): Promise<string> {
  if (cachedFileId) return cachedFileId
  const q = encodeURIComponent(`name='${FILE_NAME}'`)
  const url =
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder` +
    `&q=${q}&fields=files(id)&orderBy=modifiedTime desc`
  const res = await api(url)
  if (!res.ok) throw new Error('Gagal mencari file di Drive')
  const json = (await res.json()) as { files?: Array<{ id: string }> }
  cachedFileId = json.files?.[0]?.id ?? ''
  return cachedFileId
}

/** Tampilkan dialog izin Google dan simpan token. Dipanggil saat tombol "Sambungkan". */
export async function connectDrive(): Promise<void> {
  await requestToken('')
}

/** Cabut izin & lupakan token di perangkat ini (data di Drive tetap ada). */
export function disconnectDrive(): void {
  const oauth2 = gis()
  if (accessToken && oauth2) oauth2.revoke(accessToken, () => {})
  accessToken = ''
  tokenExpiry = 0
  cachedFileId = ''
}

/** Unduh snapshot dari Drive, atau null bila belum ada file. */
export async function pullFromDrive(): Promise<DriveSnapshot | null> {
  const id = await findFileId()
  if (!id) return null
  const res = await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)
  if (!res.ok) throw new Error('Gagal mengunduh data dari Drive')
  const body = (await res.json()) as Partial<DriveSnapshot>
  if (body && typeof body === 'object' && body.data) {
    const data = body.data as AppData
    return {
      // Snapshot lama bisa menyimpan berat di dalam nama barang — pisahkan dulu.
      data: {
        ...data,
        hargaBarang: normalizePriceList(data.hargaBarang),
        hargaEmas: normalizeHargaEmasList(data.hargaEmas),
      },
      updatedAt: Number(body.updatedAt) || 0,
    }
  }
  return null
}

/** Tulis snapshot ke Drive (buat file baru bila belum ada, atau timpa yang lama). */
export async function pushToDrive(snap: DriveSnapshot): Promise<void> {
  const id = await findFileId()
  const content = JSON.stringify(snap)
  if (id) {
    const res = await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    })
    if (!res.ok) throw new Error('Gagal menyimpan ke Drive')
    return
  }
  const boundary = 'budget_boundary_8f2a'
  const metadata = { name: FILE_NAME, parents: ['appDataFolder'] }
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}` +
    `\r\n--${boundary}--`
  const res = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  })
  if (!res.ok) throw new Error('Gagal membuat file di Drive')
  const json = (await res.json()) as { id: string }
  cachedFileId = json.id
}
