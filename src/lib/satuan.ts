// =============================================================
// satuan.ts · Katalog satuan barang + konversi harga per satuan.
//
// Tiap satuan punya `base` (satuan pembanding) dan `faktor` ke base itu,
// mis. 1 g = 0.001 kg. Dengan begitu belanja 7 kg dan 500 g bisa
// dibandingkan apple-to-apple: keduanya ditampilkan sebagai harga per 1 kg.
// =============================================================

export type Satuan = {
  /** ID tersimpan di data, mis. 'kg'. */
  id: string
  /** Satuan pembanding untuk grup ini, mis. 'kg' untuk g/ons/kg. */
  base: string
  /** Berapa base per 1 satuan ini, mis. 0.001 untuk gram. */
  faktor: number
}

export const SATUAN: Satuan[] = [
  { id: 'kg', base: 'kg', faktor: 1 },
  { id: 'ons', base: 'kg', faktor: 0.1 },
  { id: 'g', base: 'kg', faktor: 0.001 },
  { id: 'l', base: 'l', faktor: 1 },
  { id: 'ml', base: 'l', faktor: 0.001 },
  { id: 'pcs', base: 'pcs', faktor: 1 },
  { id: 'lusin', base: 'pcs', faktor: 12 },
  { id: 'pack', base: 'pack', faktor: 1 },
  { id: 'ikat', base: 'ikat', faktor: 1 },
  { id: 'botol', base: 'botol', faktor: 1 },
  { id: 'ekor', base: 'ekor', faktor: 1 },
]

/** Satuan default untuk barang tanpa berat/ukuran (dan untuk data lama). */
export const SATUAN_DEFAULT = 'pcs'

const BY_ID = new Map(SATUAN.map((s) => [s.id, s]))

export function getSatuan(id: string): Satuan {
  return BY_ID.get(id) ?? BY_ID.get(SATUAN_DEFAULT)!
}

/** Satuan pembanding dari sebuah satuan, mis. 'g' -> 'kg'. */
export function baseSatuan(id: string): string {
  return getSatuan(id).base
}

/**
 * Harga untuk 1 satuan dasar. Mis. Rp210.000 untuk 7 kg -> Rp30.000/kg,
 * Rp30.000 untuk 500 g -> Rp60.000/kg.
 */
export function hargaPerSatuan(harga: number, jumlah: number, satuan: string): number {
  const base = jumlah * getSatuan(satuan).faktor
  return base > 0 ? harga / base : harga
}

/** `1.5` -> `1,5`; `7` -> `7`. */
export function formatJumlah(n: number): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

// ---- Migrasi data lama: berat masih menempel di nama barang ----

/** Kata satuan yang lazim ditulis user -> ID satuan resmi. */
const ALIAS: Record<string, string> = {
  kg: 'kg', kilo: 'kg', kilogram: 'kg',
  ons: 'ons',
  g: 'g', gr: 'g', gram: 'g',
  l: 'l', ltr: 'l', liter: 'l', litre: 'l',
  ml: 'ml',
  pcs: 'pcs', pc: 'pcs', buah: 'pcs', butir: 'pcs', biji: 'pcs', bh: 'pcs',
  lusin: 'lusin', dozen: 'lusin',
  pack: 'pack', pak: 'pack', bungkus: 'pack', sachet: 'pack', renteng: 'pack',
  ikat: 'ikat', ikt: 'ikat',
  botol: 'botol', btl: 'botol',
  ekor: 'ekor', ekr: 'ekor',
}

const POLA = /^(.*?)[\s·,-]*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)$/

/**
 * Pisahkan berat/jumlah yang menempel di akhir nama, mis. "Ayam 1kg" ->
 * { nama: 'Ayam', jumlah: 1, satuan: 'kg' }. Dipakai sekali saat memuat data
 * lama; nama yang tidak berpola dibiarkan apa adanya.
 */
export function pisahJumlahDariNama(nama: string): {
  nama: string
  jumlah: number
  satuan: string
} {
  const cocok = POLA.exec(nama.trim())
  if (cocok) {
    const sisa = cocok[1].trim()
    const jumlah = Number(cocok[2].replace(',', '.'))
    const satuan = ALIAS[cocok[3].toLowerCase()]
    if (sisa && satuan && jumlah > 0) return { nama: sisa, jumlah, satuan }
  }
  return { nama: nama.trim(), jumlah: 1, satuan: SATUAN_DEFAULT }
}
