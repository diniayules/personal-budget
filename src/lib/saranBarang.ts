// =============================================================
// saranBarang.ts · Kumpulan nama barang yang pernah dicatat, untuk saran
// otomatis saat mengetik nama barang baru. Tiap nama diwakili catatan
// terbarunya supaya satuan & harga terakhir bisa langsung ditampilkan.
// =============================================================
import type { PriceEntry } from '../types'
import { hargaPerSatuan } from './satuan'

export type SaranBarang = {
  nama: string
  /** Satuan yang dipakai terakhir kali, mis. 'kg'. */
  satuan: string
  /** Harga per satuan dasar pada catatan terakhir. */
  hargaSatuan: number
  /** Tanggal catatan terakhir (ISO). */
  tanggal: string
  /** Banyaknya catatan harga untuk nama ini. */
  catatan: number
}

/** Rangkum riwayat harga jadi satu saran per nama barang, terbaru di atas. */
export function buatSaranBarang(entries: PriceEntry[]): SaranBarang[] {
  const map = new Map<string, { terbaru: PriceEntry; catatan: number }>()
  for (const e of entries) {
    const key = e.nama.trim().toLowerCase()
    if (!key) continue
    const cur = map.get(key)
    if (!cur) {
      map.set(key, { terbaru: e, catatan: 1 })
      continue
    }
    cur.catatan++
    if (e.tanggal.localeCompare(cur.terbaru.tanggal) >= 0) cur.terbaru = e
  }
  return [...map.values()]
    .map(({ terbaru, catatan }) => ({
      nama: terbaru.nama.trim(),
      satuan: terbaru.satuan,
      hargaSatuan: hargaPerSatuan(terbaru.harga, terbaru.jumlah, terbaru.satuan),
      tanggal: terbaru.tanggal,
      catatan,
    }))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
}

/**
 * Saring saran menurut huruf yang sedang diketik. Nama yang diawali huruf
 * tersebut didahulukan, baru yang mengandungnya di tengah. Saat input masih
 * kosong, tampilkan barang yang terakhir dicatat.
 */
export function cariSaran(saran: SaranBarang[], q: string, batas = 6): SaranBarang[] {
  const s = q.trim().toLowerCase()
  if (!s) return saran.slice(0, batas)
  const awalan: SaranBarang[] = []
  const tengah: SaranBarang[] = []
  for (const it of saran) {
    const nama = it.nama.toLowerCase()
    // Sudah persis sama: tidak ada yang perlu dilengkapi lagi.
    if (nama === s) continue
    if (nama.startsWith(s)) awalan.push(it)
    else if (nama.includes(s)) tengah.push(it)
  }
  return [...awalan, ...tengah].slice(0, batas)
}

/** Cari saran yang namanya persis sama (abaikan besar-kecil huruf & spasi tepi). */
export function saranPersis(saran: SaranBarang[], nama: string): SaranBarang | null {
  const s = nama.trim().toLowerCase()
  if (!s) return null
  return saran.find((it) => it.nama.toLowerCase() === s) ?? null
}
