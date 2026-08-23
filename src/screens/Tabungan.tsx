import { useMemo, useState } from 'react'
import type { AppData, HargaEmas, Tabungan as Pos, TabunganJenis } from '../types'
import { formatTanggal, rupiah, todayIso } from '../format'
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

/**
 * Satuan berat emas yang lazim dipakai di Indonesia beserta konversinya ke
 * gram: 1 mayam = 3,33 g dan 1 suku = 2 mayam = 6,66 g. `singkat` dipakai di
 * nama pos supaya tidak ikut berubah saat bahasa diganti.
 */
const SATUAN_EMAS = [
  { id: 'gram', gram: 1, singkat: 'gr' },
  { id: 'mayam', gram: 3.33, singkat: 'mayam' },
  { id: 'suku', gram: 6.66, singkat: 'suku' },
]

const SATUAN_EMAS_DEFAULT = SATUAN_EMAS[0]

function getSatuanEmas(id: string) {
  return SATUAN_EMAS.find((s) => s.id === id) ?? SATUAN_EMAS_DEFAULT
}

/** Berat dalam satuan pilihan user -> gram, dibulatkan ke 3 desimal. */
function keGram(berat: number, satuan: string): number {
  return Math.round(berat * getSatuanEmas(satuan).gram * 1000) / 1000
}

/** `1.5` -> `1,5`; `7` -> `7`. */
function formatBerat(n: number): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

/** Catatan harga tiap pos (terurut tanggal menaik), dikunci dengan id pos. */
function riwayatPerPos(list: HargaEmas[]): Map<string, HargaEmas[]> {
  const map = new Map<string, HargaEmas[]>()
  for (const h of list) {
    const arr = map.get(h.posId)
    if (arr) arr.push(h)
    else map.set(h.posId, [h])
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id))
  }
  return map
}

/** Beda persen terhadap harga sebelumnya, dibulatkan 1 desimal. */
function persenBeda(baru: number, lama: number): number {
  return lama > 0 ? Math.round(((baru - lama) / lama) * 1000) / 10 : 0
}

/** `+1,2%` / `-0,4%`. */
function formatPersen(n: number): string {
  return (n > 0 ? '+' : '') + n.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%'
}

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
  // Khusus emas: panel riwayat harga tiap pos.
  const [bukaRiwayat, setBukaRiwayat] = useState(false)
  const [hapusHargaId, setHapusHargaId] = useState<string | null>(null)

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

  const riwayatPos = useMemo(() => riwayatPerPos(data.hargaEmas), [data.hargaEmas])

  // Pos yang harganya belum dicek dihitung sebesar harga belinya supaya total
  // tetap wajar; jumlahnya ditandai agar user tahu ada yang belum dinilai.
  const ringkasEmas = useMemo(() => {
    let kini = 0
    let belum = 0
    for (const pos of posList) {
      if (!pos.hargaKini) belum++
      kini += pos.hargaKini || pos.jumlah
    }
    return { kini, belum, selisih: kini - total, persen: persenBeda(kini, total) }
  }, [posList, total])

  // Semua catatan harga jadi satu daftar (terbaru dulu) + perubahannya
  // terhadap catatan sebelumnya pada pos yang sama.
  const riwayatUrut = useMemo(() => {
    const nama = new Map(posList.map((pos) => [pos.id, pos.nama]))
    const out: { entri: HargaEmas; nama: string; beda: number | null }[] = []
    for (const [posId, riwayat] of riwayatPos) {
      if (!nama.has(posId)) continue
      riwayat.forEach((entri, i) => {
        const lalu = i > 0 ? riwayat[i - 1] : null
        out.push({
          entri,
          nama: nama.get(posId) ?? '',
          beda: lalu ? persenBeda(entri.harga, lalu.harga) : null,
        })
      })
    }
    return out.sort(
      (a, b) => b.entri.tanggal.localeCompare(a.entri.tanggal) || a.nama.localeCompare(b.nama),
    )
  }, [riwayatPos, posList])

  function savePos(pos: Pos) {
    const lama = data.tabungan.find((x) => x.id === pos.id) ?? null
    const tabungan = lama
      ? data.tabungan.map((x) => (x.id === pos.id ? pos : x))
      : [...data.tabungan, pos]
    // Harga hari ini yang baru/berubah dicatat ke riwayat; entri pos+tanggal
    // yang sama ditimpa supaya tidak dobel saat user mengoreksi angkanya.
    let hargaEmas = data.hargaEmas
    if (pos.hargaKini && pos.hargaKini !== lama?.hargaKini) {
      const tanggal = pos.hargaKiniTanggal ?? todayIso()
      hargaEmas = [
        ...hargaEmas.filter((h) => !(h.posId === pos.id && h.tanggal === tanggal)),
        { id: newId(), posId: pos.id, harga: pos.hargaKini, tanggal },
      ]
    }
    setData({ ...data, tabungan, hargaEmas })
    setModal(null)
    toast('ok', t('toast.tabSimpan'))
  }

  function konfirmasiHapusHarga() {
    if (!hapusHargaId) return
    setData({ ...data, hargaEmas: data.hargaEmas.filter((h) => h.id !== hapusHargaId) })
    setHapusHargaId(null)
    toast('info', t('toast.hargaEmasHapus'))
  }

  function konfirmasiHapus() {
    if (!hapusId) return
    setData({
      ...data,
      tabungan: data.tabungan.filter((x) => x.id !== hapusId),
      // Riwayat harga ikut terhapus bersama posnya.
      hargaEmas: data.hargaEmas.filter((h) => h.posId !== hapusId),
    })
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
          <div className="card-label">{jenis === 'emas' ? t('emas.totalBeli') : t('tab.total')}</div>
          <div className="card-value">{rupiah(total)}</div>
        </div>
        {jenis === 'emas' && (
          <>
            <div className="card card-balance">
              <div className="card-ikon">
                <Icons.tag />
              </div>
              <div className="card-label">{t('emas.nilaiKini')}</div>
              <div className="card-value">{rupiah(ringkasEmas.kini)}</div>
            </div>
            <div className={'card ' + (ringkasEmas.selisih < 0 ? 'card-expense' : 'card-income')}>
              <div className="card-ikon">
                {ringkasEmas.selisih < 0 ? <Icons.arrowDown /> : <Icons.arrowUp />}
              </div>
              <div className="card-label">{t('emas.untungRugi')}</div>
              <div className="card-value">
                {(ringkasEmas.selisih > 0 ? '+' : '') + rupiah(ringkasEmas.selisih)}
              </div>
              <div className="card-sub">{formatPersen(ringkasEmas.persen)}</div>
            </div>
          </>
        )}
      </div>

      <div className="table-wrap">
        <table className="tx-table">
          <thead>
            <tr>
              <th>{t('tab.namaPos')}</th>
              <th className="ta-right">{jenis === 'emas' ? t('emas.hargaBeli') : t('tab.jumlah')}</th>
              {jenis === 'emas' && (
                <>
                  <th className="ta-right">{t('emas.nilaiKini')}</th>
                  <th className="ta-right">{t('emas.untungRugi')}</th>
                </>
              )}
              <th aria-label="aksi" />
            </tr>
          </thead>
          <tbody>
            {posList.length === 0 ? (
              <tr>
                <td colSpan={jenis === 'emas' ? 5 : 3} className="tx-empty">
                  {t('tab.kosong')}
                </td>
              </tr>
            ) : (
              posList.map((pos) => {
                const nilai = jenis === 'emas' ? pos.hargaKini ?? null : null
                const beda = nilai === null ? null : nilai - pos.jumlah
                return (
                <tr key={pos.id}>
                  <td>{pos.nama || <span className="muted">—</span>}</td>
                  <td className="ta-right amount amount-income">{rupiah(pos.jumlah)}</td>
                  {jenis === 'emas' && (
                    <>
                      <td className="ta-right amount">
                        {nilai === null ? (
                          <span className="muted">—</span>
                        ) : (
                          <>
                            {rupiah(nilai)}
                            {pos.hargaKiniTanggal && (
                              <span className="emas-cek-tgl">
                                {formatTanggal(pos.hargaKiniTanggal)}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="ta-right amount">
                        {beda === null ? (
                          <span className="muted">—</span>
                        ) : (
                          <span className={'amount-' + (beda < 0 ? 'expense' : 'income')}>
                            {(beda > 0 ? '+' : '') + rupiah(beda)}
                          </span>
                        )}
                      </td>
                    </>
                  )}
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
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {jenis === 'emas' && (ringkasEmas.belum > 0 || riwayatUrut.length > 0) && (
        <section className="panel emas-panel">
          {ringkasEmas.belum > 0 && posList.length > 0 && (
            <p className="emas-catatan muted">
              {t('emas.belumDinilai').replace('{n}', String(ringkasEmas.belum))}
            </p>
          )}

          {riwayatUrut.length > 0 && (
            <>
              <button
                type="button"
                className="emas-riwayat-toggle"
                onClick={() => setBukaRiwayat(!bukaRiwayat)}
              >
                <span className={'harga-toggle' + (bukaRiwayat ? ' is-open' : '')}>
                  <Icons.chevron />
                </span>
                {t('emas.riwayat')} ({riwayatUrut.length})
              </button>

              {bukaRiwayat && (
                <div className="table-wrap">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>{t('tab.tanggalHarga')}</th>
                        <th>{t('tab.namaPos')}</th>
                        <th className="ta-right">{t('emas.hargaKini')}</th>
                        <th className="ta-right">{t('emas.perubahan')}</th>
                        <th aria-label="aksi" />
                      </tr>
                    </thead>
                    <tbody>
                      {riwayatUrut.map(({ entri, nama, beda }) => (
                        <tr key={entri.id}>
                          <td>{formatTanggal(entri.tanggal)}</td>
                          <td>{nama}</td>
                          <td className="ta-right">{rupiah(entri.harga)}</td>
                          <td className="ta-right">
                            {beda === null ? (
                              <span className="muted">—</span>
                            ) : (
                              <span className={'amount-' + (beda >= 0 ? 'income' : 'expense')}>
                                {formatPersen(beda)}
                              </span>
                            )}
                          </td>
                          <td className="ta-right">
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              onClick={() => setHapusHargaId(entri.id)}
                              aria-label={t('harga.hapus')}
                            >
                              <Icons.trash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

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

      {hapusHargaId && (
        <Modal judul={t('emas.hapusHargaKonfirmasi')} onClose={() => setHapusHargaId(null)}>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setHapusHargaId(null)}>
              {t('tx.tidak')}
            </button>
            <button type="button" className="btn btn-danger" onClick={konfirmasiHapusHarga}>
              {t('tx.ya')}
            </button>
          </div>
        </Modal>
      )}

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
  // Data lama hanya menyimpan gram; anggap satuannya gram.
  const [berat, setBerat] = useState(edit?.berat ?? edit?.gram ?? 0)
  const [satuan, setSatuan] = useState(edit?.satuanBerat ?? SATUAN_EMAS_DEFAULT.id)
  const [harga, setHarga] = useState(edit?.jumlah ?? 0)
  // Taksiran harga item ini sekarang — opsional, dipakai menghitung untung/rugi.
  const [hargaKini, setHargaKini] = useState(edit?.hargaKini ?? 0)

  // Berat & harga baru muncul setelah kedua dropdown dipilih.
  const showRest = bentuk !== '' && kadar !== ''
  const valid = showRest && berat > 0 && harga > 0 && tanggal !== ''

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const nama = `${bentuk} ${kadar} · ${formatBerat(berat)} ${getSatuanEmas(satuan).singkat}`
    onSave({
      id: edit?.id ?? newId(),
      nama,
      jumlah: harga,
      jenis: 'emas',
      tanggal,
      bentuk,
      kadar,
      berat,
      satuanBerat: satuan,
      gram: keGram(berat, satuan),
      // Harga yang berubah dianggap pengecekan hari ini; kalau tidak diubah,
      // tanggal cek sebelumnya dipertahankan.
      ...(hargaKini > 0
        ? {
            hargaKini,
            hargaKiniTanggal:
              hargaKini === edit?.hargaKini ? edit?.hargaKiniTanggal ?? todayIso() : todayIso(),
          }
        : {}),
    })
  }

  const selisih = hargaKini > 0 && harga > 0 ? hargaKini - harga : null

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
              <span>{t('tab.berat')}</span>
              <div className="berat-input">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={berat || ''}
                  placeholder="0"
                  onChange={(e) => setBerat(Number(e.target.value))}
                />
                <select
                  aria-label={t('tab.satuanBerat')}
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                >
                  {SATUAN_EMAS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t('emas.' + s.id)}
                    </option>
                  ))}
                </select>
              </div>
              {satuan !== SATUAN_EMAS_DEFAULT.id && berat > 0 && (
                <small className="muted">≈ {formatBerat(keGram(berat, satuan))} gr</small>
              )}
            </label>

            <label className="field">
              <span>{t('tab.harga')}</span>
              <RupiahInput value={harga} onChange={setHarga} />
            </label>

            <label className="field">
              <span>{t('emas.hargaKini')}</span>
              <RupiahInput value={hargaKini} onChange={setHargaKini} />
              {selisih === null ? (
                <small className="muted">{t('emas.hargaKiniPetunjuk')}</small>
              ) : (
                <small className={'amount-' + (selisih < 0 ? 'expense' : 'income')}>
                  {t('emas.untungRugi')}: {(selisih > 0 ? '+' : '') + rupiah(selisih)} (
                  {formatPersen(persenBeda(hargaKini, harga))})
                </small>
              )}
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
