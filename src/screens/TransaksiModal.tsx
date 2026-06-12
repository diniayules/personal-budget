import { useState } from 'react'
import type { PaymentMethod, Transaction, TxType, WalletId } from '../types'
import { rupiah, todayIso } from '../format'
import { newId } from '../lib/store'
import { useLang } from '../i18n'
import { Icons } from '../components/Icons'
import { Modal } from '../components/Modal'
import { RupiahInput } from '../components/RupiahInput'

/** Rincian satu barang dalam sebuah pengeluaran (untuk rangkuman harga). */
export type ItemInput = { nama: string; harga: number }

/** Baris barang dengan kunci lokal agar stabil saat diedit/dihapus di form. */
type ItemRow = ItemInput & { key: string }

type Props = {
  wallet: WalletId
  /** Kategori per jenis transaksi (dikelola di Pengaturan). */
  categories: Record<TxType, string[]>
  /** Transaksi yang diedit; null untuk transaksi baru. */
  edit: Transaction | null
  /** Jenis awal untuk transaksi baru (mis. dari pop-up sapaan). */
  initialType?: TxType
  /** Rincian barang yang sudah tersimpan untuk transaksi yang diedit. */
  initialItems?: ItemInput[]
  onClose: () => void
  onSave: (tx: Transaction, items: ItemInput[]) => void
}

export function TransaksiModal({
  wallet,
  categories,
  edit,
  initialType,
  initialItems,
  onClose,
  onSave,
}: Props) {
  const { t } = useLang()
  const [type, setType] = useState<TxType>(edit?.type ?? initialType ?? 'expense')
  const [desc, setDesc] = useState(edit?.desc ?? '')
  const [kategori, setKategori] = useState(
    edit?.kategori ?? categories[edit?.type ?? initialType ?? 'expense'][0] ?? '',
  )
  const [jumlah, setJumlah] = useState(edit?.jumlah ?? 0)
  const [metode, setMetode] = useState<PaymentMethod>(edit?.metode ?? 'cash')
  const [tanggal, setTanggal] = useState(edit?.tanggal ?? todayIso())
  const [items, setItems] = useState<ItemRow[]>(
    (initialItems ?? []).map((it) => ({ ...it, key: newId() })),
  )

  const itemTotal = items.reduce((sum, it) => sum + it.harga, 0)

  function pilihType(next: TxType) {
    setType(next)
    // Reset kategori ke daftar yang sesuai kalau kategori lama tidak ada.
    if (!categories[next].includes(kategori)) setKategori(categories[next][0] ?? '')
  }

  function addItem() {
    setItems((rows) => [...rows, { key: newId(), nama: '', harga: 0 }])
  }
  function patchItem(key: string, patch: Partial<ItemInput>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function removeItem(key: string) {
    setItems((rows) => rows.filter((r) => r.key !== key))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (jumlah <= 0 || !tanggal) return
    // Hanya barang dengan nama & harga valid yang dicatat ke rangkuman harga.
    const cleanItems =
      type === 'expense'
        ? items
            .map((it) => ({ nama: it.nama.trim(), harga: it.harga }))
            .filter((it) => it.nama && it.harga > 0)
        : []
    onSave(
      {
        id: edit?.id ?? newId(),
        wallet,
        type,
        desc: desc.trim(),
        kategori,
        jumlah,
        metode,
        tanggal,
      },
      cleanItems,
    )
  }

  return (
    <Modal judul={edit ? t('form.judulEdit') : t('form.judulTambah')} onClose={onClose}>
      <form className="tx-form" onSubmit={submit}>
        <div className="seg" role="group" aria-label={t('tx.jenis')}>
          <button
            type="button"
            className={'seg-btn seg-income' + (type === 'income' ? ' is-active' : '')}
            onClick={() => pilihType('income')}
          >
            {t('tx.pemasukan')}
          </button>
          <button
            type="button"
            className={'seg-btn seg-expense' + (type === 'expense' ? ' is-active' : '')}
            onClick={() => pilihType('expense')}
          >
            {t('tx.pengeluaran')}
          </button>
        </div>

        <label className="field">
          <span>{t('tx.jumlah')}</span>
          <RupiahInput value={jumlah} onChange={setJumlah} autoFocus />
        </label>

        <div className="field">
          <span>{t('tx.metode')}</span>
          <div className="seg" role="group" aria-label={t('tx.metode')}>
            <button
              type="button"
              className={'seg-btn' + (metode === 'cash' ? ' is-active' : '')}
              onClick={() => setMetode('cash')}
            >
              {t('tx.metodeCash')}
            </button>
            <button
              type="button"
              className={'seg-btn' + (metode === 'bank' ? ' is-active' : '')}
              onClick={() => setMetode('bank')}
            >
              {t('tx.metodeBank')}
            </button>
          </div>
        </div>

        <label className="field">
          <span>{t('tx.keterangan')}</span>
          <input
            type="text"
            value={desc}
            placeholder={t('form.ketPlaceholder')}
            onChange={(e) => setDesc(e.target.value)}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>{t('tx.kategori')}</span>
            <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {categories[type].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('tx.tanggal')}</span>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </label>
        </div>

        {type === 'expense' && (
          <div className="field item-section">
            <span>{t('item.judul')}</span>
            <p className="item-hint">{t('item.hint')}</p>

            {items.length > 0 && (
              <div className="item-rows">
                {items.map((it) => (
                  <div key={it.key} className="item-row">
                    <input
                      type="text"
                      className="item-nama"
                      value={it.nama}
                      placeholder={t('item.namaPlaceholder')}
                      onChange={(e) => patchItem(it.key, { nama: e.target.value })}
                    />
                    <div className="item-harga">
                      <RupiahInput
                        value={it.harga}
                        onChange={(n) => patchItem(it.key, { harga: n })}
                      />
                    </div>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => removeItem(it.key)}
                      aria-label={t('item.hapus')}
                    >
                      <Icons.trash />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="item-foot">
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
                <Icons.plus /> {t('item.tambah')}
              </button>
              {itemTotal > 0 && (
                <span className="item-total">
                  {t('item.total')}: <strong>{rupiah(itemTotal)}</strong>
                  {itemTotal !== jumlah && (
                    <button
                      type="button"
                      className="item-apply"
                      onClick={() => setJumlah(itemTotal)}
                    >
                      {t('item.pakai')}
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.batal')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={jumlah <= 0}>
            {t('form.simpan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
