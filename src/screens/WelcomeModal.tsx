import { useState } from 'react'
import type { TxType, Wallet, WalletId } from '../types'
import { useLang } from '../i18n'
import { Modal } from '../components/Modal'

type Props = {
  wallets: Wallet[]
  /**
   * Dompet yang sudah dipilih (mis. lewat sidebar). Bila diisi, langkah pilih
   * dompet dilewati — setelah memilih jenis langsung diarahkan ke dompet ini.
   */
  lockedWallet?: WalletId | null
  /** Dipanggil saat pengguna selesai memilih jenis + dompet. */
  onPick: (type: TxType, wallet: WalletId) => void
  onClose: () => void
}

/**
 * Pop-up sapaan. Dua langkah:
 * 1. Pilih jenis transaksi (pemasukan / pengeluaran).
 * 2. Pilih dompet (sesuai sidebar) — dilewati bila lockedWallet sudah diisi.
 * Setelah itu langsung diarahkan ke pencatatan transaksi yang sesuai.
 */
export function WelcomeModal({ wallets, lockedWallet, onPick, onClose }: Props) {
  const { t } = useLang()
  const [type, setType] = useState<TxType | null>(null)

  function pilihJenis(next: TxType) {
    // Dompet sudah dikunci → langsung lanjut tanpa langkah kedua.
    if (lockedWallet) onPick(next, lockedWallet)
    else setType(next)
  }

  return (
    <Modal
      judul={type === null ? t('welcome.judul') : t('welcome.dompetJudul')}
      onClose={onClose}
    >
      {type === null ? (
        <div className="welcome-grid">
          <button
            type="button"
            className="welcome-btn welcome-income"
            onClick={() => pilihJenis('income')}
          >
            <span className="welcome-emoji">💸</span>
            {t('tx.pemasukan')}
          </button>
          <button
            type="button"
            className="welcome-btn welcome-expense"
            onClick={() => pilihJenis('expense')}
          >
            <span className="welcome-emoji">🛒</span>
            {t('tx.pengeluaran')}
          </button>
        </div>
      ) : (
        <div className="welcome-grid">
          {wallets.map((w) => (
            <button
              key={w.id}
              type="button"
              className="welcome-btn"
              onClick={() => onPick(type, w.id)}
            >
              <span className="welcome-emoji">{w.ikon}</span>
              {w.nama}
            </button>
          ))}
        </div>
      )}

      <div className="modal-actions">
        {type === null ? (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('welcome.lewati')}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setType(null)}>
            {t('welcome.kembali')}
          </button>
        )}
      </div>
    </Modal>
  )
}
