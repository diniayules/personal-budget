// =============================================================
// types.ts · Model inti aplikasi catatan keuangan.
// =============================================================

/** ID dompet/akun. Dulu union tetap; kini bebas (dompet bisa ditambah manual). */
export type WalletId = string

/** Satu dompet/akun terpisah — punya transaksi & saldo sendiri. */
export type Wallet = {
  id: WalletId
  /** Nama tampilan, mis. "Pribadi". */
  nama: string
  /** Emoji ikon, mis. "👤". */
  ikon: string
}

/** Jenis transaksi. */
export type TxType = 'income' | 'expense'

/** Metode pembayaran. */
export type PaymentMethod = 'cash' | 'bank'

export type Transaction = {
  id: string
  wallet: WalletId
  type: TxType
  desc: string
  kategori: string
  jumlah: number
  /** Metode pembayaran (tunai atau bank). */
  metode: PaymentMethod
  /** Format ISO `YYYY-MM-DD`. */
  tanggal: string
}

/** Jenis tabungan: uang tunai/tabungan, saham, atau emas. */
export type TabunganJenis = 'uang' | 'saham' | 'emas'

/** Satu pos tabungan (mis. Dana Darurat, Liburan) dengan nominal terkumpul. */
export type Tabungan = {
  id: string
  nama: string
  /** Jumlah terkumpul dalam Rupiah (untuk emas: harga beli). */
  jumlah: number
  /** Kategori tabungan: uang, saham, atau emas. */
  jenis: TabunganJenis
  // ---- Khusus emas (opsional, hanya terisi saat jenis === 'emas') ----
  /** Tanggal pembelian, format ISO `YYYY-MM-DD`. */
  tanggal?: string
  /** Bentuk emas: Gelang, Cincin, Kalung, Anting, Emas Batangan. */
  bentuk?: string
  /** Kadar emas: Logam Mulia, 18k, 16k, 8k. */
  kadar?: string
  /** Berat dalam gram. */
  gram?: number
}

/**
 * Catatan harga satu barang pada satu tanggal — terkumpul jadi riwayat harga
 * per barang di layar "Harga Barang". Biasanya dibuat otomatis dari rincian
 * sebuah transaksi pengeluaran, tapi bisa juga ditambah manual.
 */
export type PriceEntry = {
  id: string
  /** Nama barang, mis. "Ayam 1kg". */
  nama: string
  /** Harga dalam Rupiah pada tanggal tersebut. */
  harga: number
  /** Format ISO `YYYY-MM-DD`. */
  tanggal: string
  /** ID transaksi sumber bila berasal dari rincian pengeluaran. */
  txId?: string
}

/** Seluruh state aplikasi yang dipersistensi (di localStorage). */
export type AppData = {
  transactions: Transaction[]
  /** Daftar dompet (bisa ditambah/dihapus/diganti nama). Selalu minimal satu. */
  wallets: Wallet[]
  /** Pos-pos tabungan yang dibuat manual. */
  tabungan: Tabungan[]
  /** Riwayat harga barang yang dilacak. */
  hargaBarang: PriceEntry[]
  /** Kategori per jenis transaksi (bisa ditambah/dihapus di Pengaturan). */
  categories: Record<TxType, string[]>
}

// ---- Preferensi tampilan (per-perangkat) ----
export type FontPair = 'playful' | 'modern' | 'editorial' | 'minimal' | 'oui'
export type FontSize = 'small' | 'normal' | 'large' | 'xlarge'
export type Theme = 'pop' | 'dark' | 'toystory' | 'spongebob'
export type Lang = 'id' | 'en'
