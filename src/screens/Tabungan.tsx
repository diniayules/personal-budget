import { useMemo, useState } from 'react'
import type { AppData, Tabungan as Pos } from '../types'
import { rupiah } from '../format'
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

export function TabunganScreen({ data, setData }: Props) {
  const { t } = useLang()
  const toast = useToast()
  // null = modal tertutup; { edit } = terbuka (edit null untuk pos baru).
  const [modal, setModal] = useState<{ edit: Pos | null } | null>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)

  const total = useMemo(
    () => data.tabungan.reduce((sum, pos) => sum + pos.jumlah, 0),
    [data.tabungan],
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
            <span className="page-title-ikon">🐷</span>
            {t('tab.judul')}
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
            {data.tabungan.length === 0 ? (
              <tr>
                <td colSpan={3} className="tx-empty">
                  {t('tab.kosong')}
                </td>
              </tr>
            ) : (
              data.tabungan.map((pos) => (
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

      {modal && <PosModal edit={modal.edit} onClose={() => setModal(null)} onSave={savePos} />}

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
  onClose: () => void
  onSave: (pos: Pos) => void
}

function PosModal({ edit, onClose, onSave }: PosModalProps) {
  const { t } = useLang()
  const [nama, setNama] = useState(edit?.nama ?? '')
  const [jumlah, setJumlah] = useState(edit?.jumlah ?? 0)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) return
    onSave({ id: edit?.id ?? newId(), nama: nama.trim(), jumlah })
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
