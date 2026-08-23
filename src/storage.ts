// =============================================================
// storage.ts · Nilai default & katalog statis (kategori, dompet).
// Mirip peran storage.ts/income.ts di project absensi: sumber default
// yang dipakai store + screens.
// =============================================================
import type { AppData, TxType, Wallet } from './types'

/** Dompet bawaan saat pertama kali memakai aplikasi (atau setelah migrasi). */
export const WALLET_DEFAULT: Wallet[] = [
  { id: 'pribadi', nama: 'Pribadi', ikon: '👤' },
  { id: 'rumah', nama: 'Rumah Tangga', ikon: '🏠' },
]

/** Pilihan emoji ikon saat menambah dompet baru. */
export const WALLET_IKON_PILIHAN = [
  '👤', '🏠', '💼', '🏦', '💳', '🐷', '🎯', '🚗', '🍔', '🎁', '✈️', '🎓',
]

/** Kategori bawaan per jenis transaksi. */
export const KATEGORI: Record<TxType, string[]> = {
  income: ['Gaji', 'Bonus', 'Hadiah', 'Investasi', 'Lainnya'],
  expense: [
    'Makanan',
    'Transport',
    'Belanja',
    'Tagihan',
    'Hiburan',
    'Kesehatan',
    'Pendidikan',
    'Lainnya',
  ],
}

export const APP_DATA_DEFAULT: AppData = {
  transactions: [],
  wallets: WALLET_DEFAULT.map((w) => ({ ...w })),
  tabungan: [],
  hargaBarang: [],
  hargaEmas: [],
  categories: { income: [...KATEGORI.income], expense: [...KATEGORI.expense] },
}
