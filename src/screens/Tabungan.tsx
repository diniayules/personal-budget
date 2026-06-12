import { useMemo, useState } from 'react'
import type { AppData, Tabungan as Pos, TabunganJenis } from '../types'
import { rupiah, todayIso } from '../format'
import { newId } from '../lib/store'
import { useLang } from '../i18n'
import { useToast } from '../components/Toast'
import { Icons } from '../components/Icons'
import { Modal } from '../components/Modal'
import { RupiahInput } from '../components/RupiahInput'

/** Ikon & label per jenis tabungan (label dari kamus i18n). */
const JENIS_META: Record<TabunganJenis, { ikon: string; labelKey: string }> = {
  uang: { ikon: '💵', labelKey: 'nav.tabUang' },
  saham: { ikon: '📈', labelKey: 'nav.tabSaham' },
  emas: { ikon: '🥇', labelKey: 'nav.tabEmas' },
}

/** Pilihan dropdown khusus tabungan emas. */
const BENTUK_EMAS = ['Gelang', 'Cincin', 'Kalung', 'Anting', 'Emas Batangan']
const KADAR_EMAS = ['Logam Mulia', '18k', '16k', '8k']

type Props = {
  data: AppData
  setData: (next: AppData) => void
  jenis: TabunganJenis
}

export function TabunganScreen({ data, setData, jenis }: Props) {
  const { t } = useLang()
  const toast = useToast()
  // null = modal tertutup; { edit } = terbuka (edit null untuk pos baru).
  const [modal, setModal] = useState<{ edit: Pos | null } | null>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)

  const meta = JENIS_META[jenis]
  // Hanya pos milik jenis tabungan yang sedang dibuka.
  const posList = useMemo(
    () => data.tabungan.filter((pos) => pos.jenis === jenis),
    [data.tabungan, jenis],
  )

  const total = useMemo(
    () => posList.reduce((sum, pos) => sum + pos.jumlah, 0),
    [posList],
  )

  function savePos(pos: Pos) {
    const exists = data.tabungan.some((x) => x.id === pos.id)
    const tabungan = exists
      ? data.tabungan.map((x) => (x.id === pos.id ? pos : x))
      : [...data.tabungan, pos]
    setData({ ...data, tabungan })
    setModal(null)
    toast('ok', t('toast.tabSimpan'))
  }

  function konfirmasiHapus() {
    if (!hapusId) return
    setData({ ...data, tabungan: data.tabungan.filter((x) => x.id !== hapusId) })
    setHapusId(null)
    toast('info', t('toast.tabHapus'))
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-ikon">{meta.ikon}</span>
            {t('tab.judul')} · {t(meta.labelKey)}
          </h1>
          <p className="page-sub">
            {t('app.brandKicker')} · {t('tab.sub')}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: null })}>
          <Icons.plus /> {t('tab.tambah')}
        </button>
      </header>

      <div className="cards">
        <div className="card card-balance">
          <div className="card-ikon">
            <Icons.piggy />
          </div>
          <div className="card-label">{t('tab.total')}</div>
          <div className="card-value">{rupiah(total)}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tx-table">
          <thead>
            <tr>
              <th>{t('tab.namaPos')}</th>
              <th className="ta-right">{t('tab.jumlah')}</th>
              <th aria-label="aksi" />
            </tr>
          </thead>
          <tbody>
            {posList.length === 0 ? (
              <tr>
                <td colSpan={3} className="tx-empty">
                  {t('tab.kosong')}
                </td>
              </tr>
            ) : (
              posList.map((pos) => (
                <tr key={pos.id}>
                  <td>{pos.nama || <span className="muted">—</span>}</td>
                  <td className="ta-right amount amount-income">{rupiah(pos.jumlah)}</td>
                  <td className="ta-right">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setModal({ edit: pos })}
                        aria-label="Ubah"
                      >
                        <Icons.edit />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={() => setHapusId(pos.id)}
                        aria-label="Hapus"
                      >
                        <Icons.trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal &&
        (jenis === 'emas' ? (
          <EmasModal edit={modal.edit} onClose={() => setModal(null)} onSave={savePos} />
        ) : (
          <PosModal
            edit={modal.edit}
            jenis={jenis}
            onClose={() => setModal(null)}
            onSave={savePos}
          />
        ))}

      {hapusId && (
        <Modal judul={t('tab.hapusKonfirmasi')} onClose={() => setHapusId(null)}>
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

type PosModalProps = {
  edit: Pos | null
  jenis: TabunganJenis
  onClose: () => void
  onSave: (pos: Pos) => void
}

function PosModal({ edit, jenis, onClose, onSave }: PosModalProps) {
  const { t } = useLang()
  const [nama, setNama] = useState(edit?.nama ?? '')
  const [jumlah, setJumlah] = useState(edit?.jumlah ?? 0)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) return
    onSave({ id: edit?.id ?? newId(), nama: nama.trim(), jumlah, jenis: edit?.jenis ?? jenis })
  }

  return (
    <Modal judul={edit ? t('tab.judulEdit') : t('tab.judulTambah')} onClose={onClose}>
      <form className="tx-form" onSubmit={submit}>
        <label className="field">
          <span>{t('tab.namaPos')}</span>
          <input
            type="text"
            value={nama}
            placeholder={t('tab.namaPlaceholder')}
            onChange={(e) => setNama(e.target.value)}
            autoFocus
          />
        </label>

        <label className="field">
          <span>{t('tab.jumlah')}</span>
          <RupiahInput value={jumlah} onChange={setJumlah} />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.batal')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!nama.trim()}>
            {t('form.simpan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

type EmasModalProps = {
  edit: Pos | null
  onClose: () => void
  onSave: (pos: Pos) => void
}

function EmasModal({ edit, onClose, onSave }: EmasModalProps) {
  const { t } = useLang()
  const [tanggal, setTanggal] = useState(edit?.tanggal ?? todayIso())
  const [bentuk, setBentuk] = useState(edit?.bentuk ?? '')
  const [kadar, setKadar] = useState(edit?.kadar ?? '')
  const [gram, setGram] = useState(edit?.gram ?? 0)
  const [harga, setHarga] = useState(edit?.jumlah ?? 0)

  // Gram & harga baru muncul setelah kedua dropdown dipilih.
  const showRest = bentuk !== '' && kadar !== ''
  const valid = showRest && gram > 0 && harga > 0 && tanggal !== ''

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const nama = `${bentuk} ${kadar} · ${gram} gr`
    onSave({
      id: edit?.id ?? newId(),
      nama,
      jumlah: harga,
      jenis: 'emas',
      tanggal,
      bentuk,
      kadar,
      gram,
    })
  }

  return (
    <Modal judul={edit ? t('tab.judulEdit') : t('tab.judulTambah')} onClose={onClose}>
      <form className="tx-form" onSubmit={submit}>
        <label className="field">
          <span>{t('tab.tanggal')}</span>
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </label>

        <label className="field">
          <span>{t('tab.jenisEmas')}</span>
          <select value={bentuk} onChange={(e) => setBentuk(e.target.value)}>
            <option value="" disabled>
              {t('tab.pilih')}
            </option>
            {BENTUK_EMAS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t('tab.kadar')}</span>
          <select value={kadar} onChange={(e) => setKadar(e.target.value)}>
            <option value="" disabled>
              {t('tab.pilih')}
            </option>
            {KADAR_EMAS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        {showRest && (
          <>
            <label className="field">
              <span>{t('tab.gram')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={gram || ''}
                placeholder="0"
                onChange={(e) => setGram(Number(e.target.value))}
              />
            </label>

            <label className="field">
              <span>{t('tab.harga')}</span>
              <RupiahInput value={harga} onChange={setHarga} />
            </label>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.batal')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {t('form.simpan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
