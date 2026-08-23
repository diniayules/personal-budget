// =============================================================
// format.ts · Util format Rupiah & tanggal Bahasa Indonesia.
// =============================================================

import type { Lang } from './types'

export function rupiah(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** `2026-06-11` -> `11 Jun 2026`. */
export function formatTanggal(iso: string): string {
  const [y, m, d] = iso.split('-')
  const bulan = BULAN[Number(m) - 1] ?? m
  return `${Number(d)} ${bulan} ${y}`
}

/** Tanggal hari ini dalam format ISO lokal (`YYYY-MM-DD`). */
export function todayIso(): string {
  const t = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

const BULAN_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-06` -> `Jun` (nama bulan pendek sesuai bahasa aktif). */
export function bulanPendek(ym: string, lang: Lang = 'id'): string {
  const m = Number(ym.split('-')[1])
  const nama = lang === 'en' ? BULAN_EN : BULAN
  return nama[m - 1] ?? ym
}

/** `2026-06` -> `Jun 2026`. */
export function labelBulan(ym: string, lang: Lang = 'id'): string {
  const [y] = ym.split('-')
  return `${bulanPendek(ym, lang)} ${y}`
}

/**
 * Rupiah ringkas untuk label sumbu grafik: `Rp1,2jt`, `Rp850rb`.
 * Angka di bawah seribu tetap ditulis penuh supaya tidak jadi `Rp0rb`.
 */
export function rupiahSingkat(n: number, lang: Lang = 'id'): string {
  const abs = Math.abs(n)
  const loc = lang === 'en' ? 'en-US' : 'id-ID'
  const [miliar, juta, ribu] = lang === 'en' ? ['B', 'M', 'K'] : ['M', 'jt', 'rb']
  const potong = (v: number, satuan: string) =>
    'Rp' + v.toLocaleString(loc, { maximumFractionDigits: Math.abs(v) < 10 ? 1 : 0 }) + satuan
  if (abs >= 1e9) return potong(n / 1e9, miliar)
  if (abs >= 1e6) return potong(n / 1e6, juta)
  if (abs >= 1e3) return potong(n / 1e3, ribu)
  return rupiah(n)
}
