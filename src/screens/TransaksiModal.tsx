import { useState } from 'react'
import type { PaymentMethod, Transaction, TxType, WalletId } from '../types'
import { rupiah, todayIso } from '../format'
import { newId } from '../lib/store'
import { useLang } from '../i18n'
import { Icons } from '../components/Icons'
import { Modal } from '../components/Modal'
import { RupiahInput } from '../components/RupiahInput'
import { JumlahSatuan } from '../components/JumlahSatuan'
import { NamaBarangInput } from '../components/NamaBarangInput'
import { baseSatuan, hargaPerSatuan, SATUAN_DEFAULT } from '../lib/satuan'
import { saranPersis, type SaranBarang } from '../lib/saranBarang'

/**
 * Rincian satu barang dalam sebuah pengeluaran (untuk rangkuman harga).
 * `harga` adalah total yang dibayar untuk `jumlah` satuan — harga per satuan
 * dihitung otomatis di layar Harga Barang.
 */
export type ItemInput = { nama: string; harga: number; jumlah: number; satuan: string }

/**
 * Baris barang dengan kunci lokal agar stabil saat diedit/dihapus di form.
 * `satuanManual` menandai user sudah memilih satuan sendiri, supaya saran
 * dari barang lama tidak menimpanya.
 */
type ItemRow = ItemInput & { key: string; satuanManual: boolean }

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
  /** Barang yang pernah dicatat, untuk saran otomatis saat mengetik nama. */
  saranBarang: SaranBarang[]
  onClose: () => void
  onSave: (tx: Transaction, items: ItemInput[]) => void
}

export function TransaksiModal({
  wallet,
  categories,
  edit,
  initialType,
  initialItems,
  saranBarang,
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
    (initialItems ?? []).map((it) => ({ ...it, key: newId(), satuanManual: true })),
  )

  const itemTotal = items.reduce((sum, it) => sum + it.harga, 0)

  function pilihType(next: TxType) {
    setType(next)
    // Reset kategori ke daftar yang sesuai kalau kategori lama tidak ada.
    if (!categories[next].includes(kategori)) setKategori(categories[next][0] ?? '')
  }

  function addItem() {
    setItems((rows) => [
      ...rows,
      { key: newId(), nama: '', harga: 0, jumlah: 1, satuan: SATUAN_DEFAULT, satuanManual: false },
    ])
  }
  function patchItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  /**
   * Nama diketik manual: kalau persis sama dengan barang yang pernah dicatat,
   * satuannya ikut menyesuaikan — kecuali user sudah memilih satuan sendiri.
   */
  function ubahNamaItem(row: ItemRow, nama: string) {
    const kenal = saranPersis(saranBarang, nama)
    patchItem(row.key, {
      nama,
      ...(kenal && !row.satuanManual ? { satuan: kenal.satuan } : null),
    })
  }

  /** Saran dipilih dari daftar: pakai nama & satuan terakhirnya. */
  function pilihSaran(row: ItemRow, s: SaranBarang) {
    patchItem(row.key, { nama: s.nama, satuan: row.satuanManual ? row.satuan : s.satuan })
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
            .map((it) => ({
              nama: it.nama.trim(),
              harga: it.harga,
              // Jumlah kosong/nol dianggap 1 satuan supaya harga tetap tercatat.
              jumlah: it.jumlah > 0 ? it.jumlah : 1,
              satuan: it.satuan,
            }))
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
                    <NamaBarangInput
                      className="item-nama"
                      value={it.nama}
                      onChange={(nama) => ubahNamaItem(it, nama)}
                      onPilih={(s) => pilihSaran(it, s)}
                      saran={saranBarang}
                      placeholder={t('item.namaPlaceholder')}
                      ariaLabel={t('harga.namaBarang')}
                    />
                    <JumlahSatuan
                      jumlah={it.jumlah}
                      satuan={it.satuan}
                      onJumlah={(n) => patchItem(it.key, { jumlah: n })}
                      onSatuan={(s) => patchItem(it.key, { satuan: s, satuanManual: true })}
                      ariaLabel={t('item.jumlah')}
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
                    {it.harga > 0 && it.jumlah > 0 && (
                      <p className="item-unit">
                        {rupiah(hargaPerSatuan(it.harga, it.jumlah, it.satuan))} /{' '}
                        {t('satuan.' + baseSatuan(it.satuan))}
                      </p>
                    )}
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
