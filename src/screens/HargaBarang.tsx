import { useMemo, useState } from 'react'
import type { AppData, PriceEntry } from '../types'
import { formatTanggal, rupiah, todayIso } from '../format'
import { newId } from '../lib/store'
import { useLang } from '../i18n'
import { useToast } from '../components/Toast'
import { Icons } from '../components/Icons'
import { Modal } from '../components/Modal'
import { RupiahInput } from '../components/RupiahInput'

type Props = {
  data: AppData
  setData: (next: AppData) => void
}

/** Satu barang dengan riwayat harganya (urut tanggal naik). */
type Grup = {
  /** Kunci ternormalisasi (huruf kecil) untuk menggabungkan nama yang sama. */
  key: string
  nama: string
  /** Riwayat harga, terurut tanggal menaik. */
  riwayat: PriceEntry[]
  terbaru: PriceEntry
  sebelumnya: PriceEntry | null
}

export function HargaBarang({ data, setData }: Props) {
  const { t } = useLang()
  const toast = useToast()
  const [cari, setCari] = useState('')
  const [buka, setBuka] = useState<string | null>(null)
  const [modal, setModal] = useState<{ edit: PriceEntry | null } | null>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)

  const grup = useMemo<Grup[]>(() => {
    const map = new Map<string, PriceEntry[]>()
    for (const e of data.hargaBarang) {
      const key = e.nama.trim().toLowerCase()
      const arr = map.get(key)
      if (arr) arr.push(e)
      else map.set(key, [e])
    }
    const list: Grup[] = []
    for (const [key, arr] of map) {
      const riwayat = [...arr].sort(
        (a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id),
      )
      const terbaru = riwayat[riwayat.length - 1]
      const sebelumnya = riwayat.length > 1 ? riwayat[riwayat.length - 2] : null
      list.push({ key, nama: terbaru.nama.trim(), riwayat, terbaru, sebelumnya })
    }
    // Tampilkan barang yang baru diperbarui di atas.
    return list.sort((a, b) => b.terbaru.tanggal.localeCompare(a.terbaru.tanggal))
  }, [data.hargaBarang])

  const shown = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return q ? grup.filter((g) => g.key.includes(q)) : grup
  }, [grup, cari])

  const naik = grup.filter((g) => g.sebelumnya && g.terbaru.harga > g.sebelumnya.harga).length

  function saveEntry(entry: PriceEntry) {
    const exists = data.hargaBarang.some((x) => x.id === entry.id)
    const hargaBarang = exists
      ? data.hargaBarang.map((x) => (x.id === entry.id ? entry : x))
      : [...data.hargaBarang, entry]
    setData({ ...data, hargaBarang })
    setModal(null)
    toast('ok', t('toast.hargaSimpan'))
  }

  function konfirmasiHapus() {
    if (!hapusId) return
    setData({ ...data, hargaBarang: data.hargaBarang.filter((x) => x.id !== hapusId) })
    setHapusId(null)
    toast('info', t('toast.hargaHapus'))
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-ikon">🏷️</span>
            {t('harga.judul')}
          </h1>
          <p className="page-sub">
            {t('app.brandKicker')} · {t('harga.sub')}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: null })}>
          <Icons.plus /> {t('harga.tambah')}
        </button>
      </header>

      <div className="cards">
        <div className="card card-balance">
          <div className="card-ikon">
            <Icons.tag />
          </div>
          <div className="card-label">{t('harga.totalBarang')}</div>
          <div className="card-value">{grup.length}</div>
        </div>
        <div className="card card-balance">
          <div className="card-ikon">
            <Icons.tag />
          </div>
          <div className="card-label">{t('harga.totalEntri')}</div>
          <div className="card-value">{data.hargaBarang.length}</div>
        </div>
        <div className="card card-expense">
          <div className="card-ikon">
            <Icons.arrowUp />
          </div>
          <div className="card-label">{t('harga.naik')}</div>
          <div className="card-value">{naik}</div>
        </div>
      </div>

      {grup.length > 0 && (
        <div className="toolbar">
          <input
            type="search"
            className="harga-cari"
            value={cari}
            placeholder={t('harga.cari')}
            onChange={(e) => setCari(e.target.value)}
          />
          <span className="toolbar-count">{shown.length} barang</span>
        </div>
      )}

      {grup.length === 0 ? (
        <div className="table-wrap">
          <div className="tx-empty">{t('harga.kosong')}</div>
        </div>
      ) : (
        <div className="harga-list">
          {shown.map((g) => {
            const delta = g.sebelumnya ? g.terbaru.harga - g.sebelumnya.harga : 0
            const arah = delta > 0 ? 'expense' : delta < 0 ? 'income' : 'flat'
            const persen = g.sebelumnya && g.sebelumnya.harga > 0
              ? Math.round((delta / g.sebelumnya.harga) * 100)
              : 0
            const isOpen = buka === g.key
            return (
              <section key={g.key} className="harga-card">
                <button
                  type="button"
                  className="harga-card-head"
                  onClick={() => setBuka(isOpen ? null : g.key)}
                >
                  <span className={'harga-toggle' + (isOpen ? ' is-open' : '')}>
                    <Icons.chevron />
                  </span>
                  <span className="harga-info">
                    <span className="harga-nama">{g.nama}</span>
                    <span className="harga-sub">
                      {g.riwayat.length} catatan · {t('harga.terakhir')}{' '}
                      {formatTanggal(g.terbaru.tanggal)}
                    </span>
                  </span>
                  <span className="harga-now">
                    <span className="harga-now-val">{rupiah(g.terbaru.harga)}</span>
                    {g.sebelumnya && delta !== 0 && (
                      <span className={'harga-delta amount-' + arah}>
                        {delta > 0 ? '▲' : '▼'} {rupiah(Math.abs(delta))}
                        {persen !== 0 && <> ({persen > 0 ? '+' : ''}{persen}%)</>}
                      </span>
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="harga-riwayat">
                    {[...g.riwayat].reverse().map((e, i, arr) => {
                      // arr sudah dibalik (terbaru dulu); item berikutnya = lebih lama.
                      const prev = arr[i + 1]
                      const d = prev ? e.harga - prev.harga : 0
                      return (
                        <div key={e.id} className="harga-riwayat-row">
                          <span className="harga-rw-tgl">{formatTanggal(e.tanggal)}</span>
                          <span className="harga-rw-harga">{rupiah(e.harga)}</span>
                          <span className="harga-rw-delta">
                            {prev && d !== 0 && (
                              <span className={'amount-' + (d > 0 ? 'expense' : 'income')}>
                                {d > 0 ? '▲' : '▼'} {rupiah(Math.abs(d))}
                              </span>
                            )}
                          </span>
                          <span className="row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setModal({ edit: e })}
                              aria-label={t('harga.ubah')}
                            >
                              <Icons.edit />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              onClick={() => setHapusId(e.id)}
                              aria-label={t('harga.hapus')}
                            >
                              <Icons.trash />
                            </button>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
          {shown.length === 0 && <div className="tx-empty">{t('harga.takAda')}</div>}
        </div>
      )}

      {modal && (
        <EntryModal edit={modal.edit} onClose={() => setModal(null)} onSave={saveEntry} />
      )}

      {hapusId && (
        <Modal judul={t('harga.hapusKonfirmasi')} onClose={() => setHapusId(null)}>
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

type EntryModalProps = {
  edit: PriceEntry | null
  onClose: () => void
  onSave: (entry: PriceEntry) => void
}

function EntryModal({ edit, onClose, onSave }: EntryModalProps) {
  const { t } = useLang()
  const [nama, setNama] = useState(edit?.nama ?? '')
  const [harga, setHarga] = useState(edit?.harga ?? 0)
  const [tanggal, setTanggal] = useState(edit?.tanggal ?? todayIso())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim() || harga <= 0 || !tanggal) return
    onSave({
      id: edit?.id ?? newId(),
      nama: nama.trim(),
      harga,
      tanggal,
      txId: edit?.txId,
    })
  }

  return (
    <Modal judul={edit ? t('harga.judulEdit') : t('harga.judulTambah')} onClose={onClose}>
      <form className="tx-form" onSubmit={submit}>
        <label className="field">
          <span>{t('harga.namaBarang')}</span>
          <input
            type="text"
            value={nama}
            placeholder={t('item.namaPlaceholder')}
            onChange={(e) => setNama(e.target.value)}
            autoFocus
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>{t('harga.harga')}</span>
            <RupiahInput value={harga} onChange={setHarga} />
          </label>
          <label className="field">
            <span>{t('tx.tanggal')}</span>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.batal')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!nama.trim() || harga <= 0}
          >
            {t('form.simpan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
