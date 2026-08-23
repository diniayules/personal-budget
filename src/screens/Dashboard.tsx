import { useEffect, useMemo, useState } from 'react'
import type { AppData, PriceEntry, Transaction, TxType, WalletId } from '../types'
import { formatTanggal, rupiah } from '../format'
import { newId } from '../lib/store'
import { useLang } from '../i18n'
import { useToast } from '../components/Toast'
import { Icons } from '../components/Icons'
import { Modal } from '../components/Modal'
import { TransaksiModal, type ItemInput } from './TransaksiModal'
import { buatSaranBarang } from '../lib/saranBarang'

type Filter = 'all' | TxType

type Props = {
  wallet: WalletId
  data: AppData
  setData: (next: AppData) => void
  /** Jenis transaksi yang langsung dibuka saat masuk (dari pop-up sapaan). */
  quickNew?: TxType | null
  /** Dipanggil sekali setelah quickNew dipakai, agar tidak terbuka ulang. */
  onQuickConsumed?: () => void
}

export function Dashboard({ wallet, data, setData, quickNew, onQuickConsumed }: Props) {
  const { t } = useLang()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [modal, setModal] = useState<{ edit: Transaction | null; type?: TxType } | null>(null)
  // ID transaksi yang menunggu konfirmasi hapus; null = tidak ada pop-up.
  const [hapusId, setHapusId] = useState<string | null>(null)

  // Buka modal pencatatan saat diarahkan dari pop-up sapaan. Pakai efek yang
  // bereaksi pada perubahan quickNew (bukan hanya nilai awal) supaya tetap
  // jalan walau dompet tujuan == dompet aktif — komponen tidak ter-remount
  // (key tak berubah), jadi nilai awal useState tak akan terbaca ulang.
  useEffect(() => {
    if (!quickNew) return
    setModal({ edit: null, type: quickNew })
    onQuickConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickNew])

  const dompet = data.wallets.find((w) => w.id === wallet)

  // Saran nama barang diambil dari seluruh riwayat harga (lintas dompet):
  // barang yang sama sering dibeli dari dompet mana pun.
  const saranBarang = useMemo(() => buatSaranBarang(data.hargaBarang), [data.hargaBarang])

  const txs = useMemo(
    () =>
      data.transactions
        .filter((tx) => tx.wallet === wallet)
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id)),
    [data.transactions, wallet],
  )

  const { income, expense, saldoCash, saldoBank } = useMemo(() => {
    let income = 0
    let expense = 0
    let saldoCash = 0
    let saldoBank = 0
    for (const tx of txs) {
      const signed = tx.type === 'income' ? tx.jumlah : -tx.jumlah
      if (tx.type === 'income') income += tx.jumlah
      else expense += tx.jumlah
      // Cash & bank disimpan terpisah — uang tidak bercampur antar metode.
      if (tx.metode === 'bank') saldoBank += signed
      else saldoCash += signed
    }
    return { income, expense, saldoCash, saldoBank }
  }, [txs])

  const shown = filter === 'all' ? txs : txs.filter((tx) => tx.type === filter)

  // Kelompokkan transaksi per tanggal. `shown` sudah terurut tanggal menurun,
  // jadi grup pertama muncul mengikuti urutan kemunculan tanggal.
  const byDay = useMemo(() => {
    const groups = new Map<string, { tanggal: string; items: Transaction[]; income: number; expense: number }>()
    for (const tx of shown) {
      let g = groups.get(tx.tanggal)
      if (!g) {
        g = { tanggal: tx.tanggal, items: [], income: 0, expense: 0 }
        groups.set(tx.tanggal, g)
      }
      g.items.push(tx)
      if (tx.type === 'income') g.income += tx.jumlah
      else g.expense += tx.jumlah
    }
    return [...groups.values()]
  }, [shown])

  function saveTx(tx: Transaction, items: ItemInput[]) {
    const exists = data.transactions.some((x) => x.id === tx.id)
    const transactions = exists
      ? data.transactions.map((x) => (x.id === tx.id ? tx : x))
      : [...data.transactions, tx]
    // Sinkronkan rangkuman harga: buang entri lama transaksi ini, lalu rakit
    // ulang dari rincian barang pada tanggal transaksi.
    const others = data.hargaBarang.filter((h) => h.txId !== tx.id)
    const fresh: PriceEntry[] = items.map((it) => ({
      id: newId(),
      nama: it.nama,
      harga: it.harga,
      jumlah: it.jumlah,
      satuan: it.satuan,
      tanggal: tx.tanggal,
      txId: tx.id,
    }))
    setData({ ...data, transactions, hargaBarang: [...others, ...fresh] })
    setModal(null)
    toast('ok', t('toast.tersimpan'))
  }

  function konfirmasiHapus() {
    if (!hapusId) return
    setData({
      ...data,
      transactions: data.transactions.filter((x) => x.id !== hapusId),
      // Ikut hapus rincian harga yang berasal dari transaksi ini.
      hargaBarang: data.hargaBarang.filter((h) => h.txId !== hapusId),
    })
    setHapusId(null)
    toast('info', t('toast.dihapus'))
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-ikon">{dompet?.ikon}</span>
            {dompet?.nama}
          </h1>
          <p className="page-sub">
            {t('app.brandKicker')} · {dompet?.nama}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: null })}>
          <Icons.plus /> {t('tx.tambah')}
        </button>
      </header>

      <div className="cards">
        <div className="card card-income">
          <div className="card-ikon">
            <Icons.arrowUp />
          </div>
          <div className="card-label">{t('sum.pemasukan')}</div>
          <div className="card-value">{rupiah(income)}</div>
        </div>
        <div className="card card-expense">
          <div className="card-ikon">
            <Icons.arrowDown />
          </div>
          <div className="card-label">{t('sum.pengeluaran')}</div>
          <div className="card-value">{rupiah(expense)}</div>
        </div>
        <div className="card card-balance">
          <div className="card-ikon">
            <Icons.wallet />
          </div>
          <div className="card-label">{t('sum.saldoCash')}</div>
          <div className="card-value">{rupiah(saldoCash)}</div>
        </div>
        <div className="card card-balance">
          <div className="card-ikon">
            <Icons.wallet />
          </div>
          <div className="card-label">{t('sum.saldoBank')}</div>
          <div className="card-value">{rupiah(saldoBank)}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg seg-sm" role="group" aria-label="Filter">
          {(['all', 'income', 'expense'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={'seg-btn' + (filter === f ? ' is-active' : '')}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? t('tx.semua') : f === 'income' ? t('tx.pemasukan') : t('tx.pengeluaran')}
            </button>
          ))}
        </div>
        <span className="toolbar-count">{shown.length} transaksi</span>
      </div>

      {byDay.length === 0 ? (
        <div className="table-wrap">
          <div className="tx-empty">{t('tx.kosong')}</div>
        </div>
      ) : (
        <div className="day-list">
          {byDay.map((day) => {
            const net = day.income - day.expense
            return (
              <section key={day.tanggal} className="day-card">
                <header className="day-card-head">
                  <div>
                    <div className="day-card-tanggal">{formatTanggal(day.tanggal)}</div>
                    <div className="day-card-sub">
                      {day.items.length} transaksi
                      {day.income > 0 && <> · +{rupiah(day.income)}</>}
                      {day.expense > 0 && <> · −{rupiah(day.expense)}</>}
                    </div>
                  </div>
                  <div className="day-card-total">
                    <div className={'day-card-total-num amount-' + (net >= 0 ? 'income' : 'expense')}>
                      {net >= 0 ? '+' : '−'}
                      {rupiah(Math.abs(net))}
                    </div>
                    <div className="day-card-total-lbl">{t('sum.saldo')}</div>
                  </div>
                </header>

                <div className="day-breakdown">
                  {day.items.map((tx) => (
                    <div key={tx.id} className="day-breakdown-row">
                      <span className="day-bd-desc">{tx.desc || <span className="muted">—</span>}</span>
                      <span className="day-bd-meta">
                        <span className="kategori-pill">{tx.kategori}</span>
                        <span className="kategori-pill">
                          {tx.metode === 'bank' ? t('tx.metodeBank') : t('tx.metodeCash')}
                        </span>
                      </span>
                      <span className={'amount amount-' + tx.type}>
                        {tx.type === 'income' ? '+' : '−'}
                        {rupiah(tx.jumlah)}
                      </span>
                      <span className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setModal({ edit: tx })}
                          aria-label="Ubah"
                        >
                          <Icons.edit />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setHapusId(tx.id)}
                          aria-label="Hapus"
                        >
                          <Icons.trash />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {modal && (
        <TransaksiModal
          wallet={wallet}
          categories={data.categories}
          edit={modal.edit}
          initialType={modal.type}
          saranBarang={saranBarang}
          initialItems={
            modal.edit
              ? data.hargaBarang
                  .filter((h) => h.txId === modal.edit!.id)
                  .map((h) => ({
                    nama: h.nama,
                    harga: h.harga,
                    jumlah: h.jumlah,
                    satuan: h.satuan,
                  }))
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={saveTx}
        />
      )}

      {hapusId && (
        <Modal judul={t('tx.hapusKonfirmasi')} onClose={() => setHapusId(null)}>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setHapusId(null)}>
              {t('tx.tidak')}
            </button>
            <button type="button" className="btn btn-danger" onClick={konfirmasiHapus}>
              {t('tx.ya')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
