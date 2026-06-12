// =============================================================
// format.ts · Util format Rupiah & tanggal Bahasa Indonesia.
// =============================================================

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
