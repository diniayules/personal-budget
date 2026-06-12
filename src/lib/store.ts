// =============================================================
// store.ts · Lapisan data lokal (localStorage) untuk AppData.
//
// loadAppData()  -> rakit AppData dari localStorage (toleran data lama/rusak).
// saveAppData()  -> tulis seluruh AppData (write-through dari useAppData).
//
// Analog dengan db.ts di project absensi, tapi backend-nya localStorage
// bukan Supabase — supaya app langsung jalan tanpa setup.
// =============================================================
import type { AppData, PriceEntry, Tabungan, TabunganJenis, Transaction, TxType, Wallet } from '../types'
import { APP_DATA_DEFAULT, KATEGORI, WALLET_DEFAULT } from '../storage'

const KEY = 'personal-budget:data:v1'

function isTransaction(t: unknown): t is Transaction {
  if (!t || typeof t !== 'object') return false
  const r = t as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.wallet === 'string' &&
    (r.type === 'income' || r.type === 'expense') &&
    typeof r.jumlah === 'number' &&
    typeof r.tanggal === 'string'
  )
}

function isTabungan(t: unknown): t is Tabungan {
  if (!t || typeof t !== 'object') return false
  const r = t as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.nama === 'string' && typeof r.jumlah === 'number'
}

/** Pastikan `jenis` valid; data lama tanpa jenis jatuh ke 'uang'. Field emas dipertahankan. */
function normalizeTabungan(pos: Tabungan): Tabungan {
  const jenis = pos.jenis
  const valid: TabunganJenis = jenis === 'saham' || jenis === 'emas' ? jenis : 'uang'
  const out: Tabungan = { id: pos.id, nama: pos.nama, jumlah: pos.jumlah, jenis: valid }
  if (valid === 'emas') {
    if (typeof pos.tanggal === 'string') out.tanggal = pos.tanggal
    if (typeof pos.bentuk === 'string') out.bentuk = pos.bentuk
    if (typeof pos.kadar === 'string') out.kadar = pos.kadar
    if (typeof pos.gram === 'number') out.gram = pos.gram
  }
  return out
}

function isPriceEntry(t: unknown): t is PriceEntry {
  if (!t || typeof t !== 'object') return false
  const r = t as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.nama === 'string' &&
    typeof r.harga === 'number' &&
    typeof r.tanggal === 'string'
  )
}

/**
 * Rakit daftar dompet. Mendukung format baru (`wallets: Wallet[]`) sekaligus
 * memigrasi format lama (`walletNames: Record<id, nama>`). Selalu mengembalikan
 * minimal satu dompet agar aplikasi tetap punya halaman default.
 */
function normalizeWallets(parsed: Record<string, unknown>): Wallet[] {
  const raw = parsed.wallets
  if (Array.isArray(raw)) {
    const seen = new Set<string>()
    const clean = raw
      .filter((w): w is Wallet => {
        if (!w || typeof w !== 'object') return false
        const r = w as Record<string, unknown>
        return typeof r.id === 'string' && r.id.trim() !== '' && typeof r.nama === 'string'
      })
      .filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)))
      .map((w) => ({ id: w.id, nama: w.nama, ikon: typeof w.ikon === 'string' ? w.ikon : '👛' }))
    if (clean.length) return clean
  }
  // Migrasi dari format lama walletNames.
  const names = parsed.walletNames
  if (names && typeof names === 'object') {
    const entries = Object.entries(names as Record<string, unknown>).filter(
      ([, v]) => typeof v === 'string',
    )
    if (entries.length) {
      return entries.map(([id, nama]) => {
        const def = WALLET_DEFAULT.find((w) => w.id === id)
        return { id, nama: nama as string, ikon: def?.ikon ?? '👛' }
      })
    }
  }
  return WALLET_DEFAULT.map((w) => ({ ...w }))
}

/** Daftar kategori valid (string unik & tidak kosong) per jenis, jatuh ke default bila kosong/rusak. */
function normalizeCategories(raw: unknown): Record<TxType, string[]> {
  const pick = (type: TxType): string[] => {
    const list = (raw as Record<string, unknown> | null | undefined)?.[type]
    if (Array.isArray(list)) {
      const clean = [...new Set(list.filter((c): c is string => typeof c === 'string' && c.trim() !== ''))]
      if (clean.length) return clean
    }
    return [...KATEGORI[type]]
  }
  return { income: pick('income'), expense: pick('expense') }
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(APP_DATA_DEFAULT)
    const parsed = JSON.parse(raw) as Partial<AppData>
    const transactions = Array.isArray(parsed.transactions)
      ? parsed.transactions.filter(isTransaction)
      : []
    const tabungan = Array.isArray(parsed.tabungan)
      ? parsed.tabungan.filter(isTabungan).map(normalizeTabungan)
      : []
    const hargaBarang = Array.isArray(parsed.hargaBarang)
      ? parsed.hargaBarang.filter(isPriceEntry)
      : []
    return {
      transactions,
      wallets: normalizeWallets(parsed as Record<string, unknown>),
      tabungan,
      hargaBarang,
      categories: normalizeCategories(parsed.categories),
    }
  } catch (e) {
    console.error('[store] gagal memuat data, pakai default', e)
    return structuredClone(APP_DATA_DEFAULT)
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.error('[store] gagal menyimpan data', e)
  }
}

/** ID stabil tanpa bergantung pada crypto/Math.random global. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 't_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}
