import { useMemo, useState } from 'react'
import type { AppData, PriceEntry } from '../types'
import { formatTanggal, rupiah, todayIso } from '../format'
import { newId } from '../lib/store'
import { useLang } from '../i18n'
import { useToast } from '../components/Toast'
import { Icons } from '../components/Icons'
import { Modal } from '../components/Modal'
import { RupiahInput } from '../components/RupiahInput'
import { JumlahSatuan } from '../components/JumlahSatuan'
import { NamaBarangInput } from '../components/NamaBarangInput'
import { buatSaranBarang, saranPersis, type SaranBarang } from '../lib/saranBarang'
import {
  SATUAN_DEFAULT,
  baseSatuan,
  formatJumlah,
  hargaPerSatuan,
} from '../lib/satuan'

type Props = {
  data: AppData
  setData: (next: AppData) => void
}

/** Harga untuk 1 satuan dasar dari sebuah catatan (7 kg / Rp210.000 -> Rp30.000). */
function perSatuan(e: PriceEntry): number {
  return hargaPerSatuan(e.harga, e.jumlah, e.satuan)
}

/**
 * Selisih harga per satuan antara dua catatan. Bernilai null bila satuannya
 * beda basis (mis. sekali beli per kg, sekali per ikat) — membandingkannya
 * tidak bermakna, jadi lebih baik tidak ditampilkan.
 */
function selisih(baru: PriceEntry, lama: PriceEntry | null): number | null {
  if (!lama) return null
  if (baseSatuan(baru.satuan) !== baseSatuan(lama.satuan)) return null
  return perSatuan(baru) - perSatuan(lama)
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

  const saranBarang = useMemo(() => buatSaranBarang(data.hargaBarang), [data.hargaBarang])

  const shown = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return q ? grup.filter((g) => g.key.includes(q)) : grup
  }, [grup, cari])

  const naik = grup.filter((g) => (selisih(g.terbaru, g.sebelumnya) ?? 0) > 0).length

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
            const unit = perSatuan(g.terbaru)
            const delta = selisih(g.terbaru, g.sebelumnya) ?? 0
            const arah = delta > 0 ? 'expense' : delta < 0 ? 'income' : 'flat'
            const unitLama = g.sebelumnya ? perSatuan(g.sebelumnya) : 0
            const persen = delta !== 0 && unitLama > 0 ? Math.round((delta / unitLama) * 100) : 0
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
                    <span className="harga-now-val">
                      {rupiah(unit)}
                      <span className="harga-now-unit">
                        /{t('satuan.' + baseSatuan(g.terbaru.satuan))}
                      </span>
                    </span>
                    <span className="harga-now-asal">
                      {formatJumlah(g.terbaru.jumlah)} {t('satuan.' + g.terbaru.satuan)} ·{' '}
                      {rupiah(g.terbaru.harga)}
                    </span>
                    {delta !== 0 && (
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
                      const prev = arr[i + 1] ?? null
                      const d = selisih(e, prev) ?? 0
                      return (
                        <div key={e.id} className="harga-riwayat-row">
                          <span className="harga-rw-tgl">{formatTanggal(e.tanggal)}</span>
                          <span className="harga-rw-qty">
                            {formatJumlah(e.jumlah)} {t('satuan.' + e.satuan)} ·{' '}
                            {rupiah(e.harga)}
                          </span>
                          <span className="harga-rw-harga">
                            {rupiah(perSatuan(e))}
                            <span className="harga-rw-unit">
                              /{t('satuan.' + baseSatuan(e.satuan))}
                            </span>
                          </span>
                          <span className="harga-rw-delta">
                            {d !== 0 && (
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
        <EntryModal
          edit={modal.edit}
          saran={saranBarang}
          onClose={() => setModal(null)}
          onSave={saveEntry}
        />
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
  /** Barang yang pernah dicatat, untuk saran otomatis saat mengetik nama. */
  saran: SaranBarang[]
  onClose: () => void
  onSave: (entry: PriceEntry) => void
}

function EntryModal({ edit, saran, onClose, onSave }: EntryModalProps) {
  const { t } = useLang()
  const [nama, setNama] = useState(edit?.nama ?? '')
  const [harga, setHarga] = useState(edit?.harga ?? 0)
  const [jumlah, setJumlah] = useState(edit?.jumlah ?? 1)
  const [satuan, setSatuan] = useState(edit?.satuan ?? SATUAN_DEFAULT)
  // Satuan pada catatan yang diedit dianggap pilihan user, jangan ditimpa saran.
  const [satuanManual, setSatuanManual] = useState(edit != null)
  const [tanggal, setTanggal] = useState(edit?.tanggal ?? todayIso())

  const unit = jumlah > 0 && harga > 0 ? hargaPerSatuan(harga, jumlah, satuan) : 0
  const kenal = saranPersis(saran, nama)

  function ubahNama(next: string) {
    setNama(next)
    const cocok = saranPersis(saran, next)
    if (cocok && !satuanManual) setSatuan(cocok.satuan)
  }

  function pilihSaran(s: SaranBarang) {
    setNama(s.nama)
    if (!satuanManual) setSatuan(s.satuan)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim() || harga <= 0 || jumlah <= 0 || !tanggal) return
    onSave({
      id: edit?.id ?? newId(),
      nama: nama.trim(),
      harga,
      jumlah,
      satuan,
      tanggal,
      txId: edit?.txId,
    })
  }

  return (
    <Modal judul={edit ? t('harga.judulEdit') : t('harga.judulTambah')} onClose={onClose}>
      <form className="tx-form" onSubmit={submit}>
        <div className="field">
          <span>{t('harga.namaBarang')}</span>
          <NamaBarangInput
            value={nama}
            onChange={ubahNama}
            onPilih={pilihSaran}
            saran={saran}
            placeholder={t('item.namaPlaceholder')}
            ariaLabel={t('harga.namaBarang')}
            autoFocus
          />
          {kenal && (
            <p className="field-hint">
              {t('harga.pernahDicatat')
                .replace('{harga}', rupiah(kenal.hargaSatuan))
                .replace('{satuan}', t('satuan.' + baseSatuan(kenal.satuan)))
                .replace('{tanggal}', formatTanggal(kenal.tanggal))}
            </p>
          )}
        </div>
        <div className="field-row">
          <div className="field">
            <span>{t('harga.jumlah')}</span>
            <JumlahSatuan
              jumlah={jumlah}
              satuan={satuan}
              onJumlah={setJumlah}
              onSatuan={(s) => {
                setSatuan(s)
                setSatuanManual(true)
              }}
            />
          </div>
          <label className="field">
            <span>{t('harga.hargaTotal')}</span>
            <RupiahInput value={harga} onChange={setHarga} />
          </label>
        </div>
        {unit > 0 && (
          <p className="harga-unit-preview">
            {t('harga.perSatuan')}: <strong>{rupiah(unit)}</strong> /{' '}
            {t('satuan.' + baseSatuan(satuan))}
          </p>
        )}
        <label className="field">
          <span>{t('tx.tanggal')}</span>
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.batal')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!nama.trim() || harga <= 0 || jumlah <= 0}
          >
            {t('form.simpan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
