import { useMemo, useState } from 'react'
import type { Transaction, TxType } from '../types'
import { bulanPendek, labelBulan, rupiah, rupiahSingkat } from '../format'
import { useLang } from '../i18n'

// =============================================================
// GrafikBulanan · Batang pemasukan vs pengeluaran per bulan, plus rincian
// per kategori untuk bulan yang dipilih — supaya kelihatan pengeluaran
// terbesar tiap bulannya. Tanpa library grafik: batang = div ber-CSS.
// =============================================================

/** Tinggi area batang (px). Dipakai juga untuk garis bantu & label sumbu. */
const TINGGI = 168

/** Pilihan rentang bulan yang ditampilkan; 0 = semua yang ada datanya. */
const RENTANG = [6, 12, 24, 0]

type Bulan = { ym: string; income: number; expense: number }

type Props = {
  /** Transaksi satu dompet, urutan bebas. */
  txs: Transaction[]
}

export function GrafikBulanan({ txs }: Props) {
  const { t, lang } = useLang()
  const [rentang, setRentang] = useState(6)
  // Bulan yang dipilih user; null = ikut bulan terakhir yang ada datanya.
  const [pilih, setPilih] = useState<string | null>(null)
  // Bulan yang sedang disorot kursor — hanya mengubah angka di readout.
  const [sorot, setSorot] = useState<string | null>(null)
  const [jenis, setJenis] = useState<TxType>('expense')

  const semua = useMemo(() => rangkumPerBulan(txs), [txs])

  // Hanya tawarkan rentang yang benar-benar memotong data + opsi "semua".
  const opsiRentang = useMemo(
    () => RENTANG.filter((n) => n === 0 || n < semua.length),
    [semua.length],
  )

  const tampil = useMemo(
    () => (rentang === 0 || rentang >= semua.length ? semua : semua.slice(-rentang)),
    [semua, rentang],
  )

  // Pilihan divalidasi ulang tiap render: kalau bulan yang dipilih keluar dari
  // rentang (atau transaksinya terhapus), otomatis jatuh ke bulan terakhir.
  const aktif = (pilih && tampil.some((b) => b.ym === pilih) ? pilih : tampil.at(-1)?.ym) ?? ''
  const dibaca = tampil.find((b) => b.ym === (sorot ?? aktif))

  const maks = useMemo(
    () => batasAtas(Math.max(0, ...tampil.flatMap((b) => [b.income, b.expense]))),
    [tampil],
  )

  const rincian = useMemo(() => {
    const map = new Map<string, { nama: string; jumlah: number; n: number }>()
    let total = 0
    for (const tx of txs) {
      if (tx.type !== jenis || !tx.tanggal.startsWith(aktif)) continue
      const nama = tx.kategori || '—'
      const k = map.get(nama) ?? { nama, jumlah: 0, n: 0 }
      k.jumlah += tx.jumlah
      k.n += 1
      map.set(nama, k)
      total += tx.jumlah
    }
    return { total, items: [...map.values()].sort((a, b) => b.jumlah - a.jumlah) }
  }, [txs, aktif, jenis])

  if (semua.length === 0) return null

  const ticks = [maks, maks / 2, 0]
  const puncak = rincian.items[0]?.jumlah ?? 0

  return (
    <section className="grafik-card">
      <header className="grafik-head">
        <div>
          <h2 className="grafik-judul">{t('grafik.judul')}</h2>
          <p className="grafik-sub">{t('grafik.sub')}</p>
        </div>
        {opsiRentang.length > 1 && (
          <div className="seg seg-sm" role="group" aria-label={t('grafik.rentang')}>
            {opsiRentang.map((n) => (
              <button
                key={n}
                type="button"
                className={'seg-btn' + (rentang === n ? ' is-active' : '')}
                onClick={() => setRentang(n)}
              >
                {n === 0 ? t('grafik.semua') : t('grafik.nBulan').replace('{n}', String(n))}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Angka bulan tersorot/terpilih: nilai tetap terbaca tanpa perlu hover. */}
      <div className="grafik-readout">
        <span className="grafik-ro-bulan">{dibaca ? labelBulan(dibaca.ym, lang) : '—'}</span>
        <span className="grafik-ro-item">
          <i className="grafik-dot dot-income" />
          {t('tx.pemasukan')} <b>{rupiah(dibaca?.income ?? 0)}</b>
        </span>
        <span className="grafik-ro-item">
          <i className="grafik-dot dot-expense" />
          {t('tx.pengeluaran')} <b>{rupiah(dibaca?.expense ?? 0)}</b>
        </span>
        <span className="grafik-ro-item">
          {t('sum.saldo')}{' '}
          <b className={'amount-' + ((dibaca?.income ?? 0) - (dibaca?.expense ?? 0) >= 0 ? 'income' : 'expense')}>
            {rupiah((dibaca?.income ?? 0) - (dibaca?.expense ?? 0))}
          </b>
        </span>
      </div>

      <div className="grafik-body">
        <div className="grafik-y" style={{ height: TINGGI }} aria-hidden="true">
          {ticks.map((v, i) => (
            <span key={v} style={{ top: (i / (ticks.length - 1)) * 100 + '%' }}>
              {v === 0 ? '0' : rupiahSingkat(v, lang)}
            </span>
          ))}
        </div>

        <div className="grafik-plot">
          <div className="grafik-lines" style={{ height: TINGGI }} aria-hidden="true">
            {ticks.map((v) => (
              <i key={v} />
            ))}
          </div>

          <div className="grafik-cols">
            {tampil.map((b, i) => {
              // Tahun dicetak hanya saat berganti — cukup jadi penanda, tidak berisik.
              const tahun = b.ym.slice(0, 4)
              const tahunBaru = i === 0 || tahun !== tampil[i - 1].ym.slice(0, 4)
              return (
                <button
                  key={b.ym}
                  type="button"
                  className={'grafik-col' + (b.ym === aktif ? ' is-active' : '')}
                  aria-pressed={b.ym === aktif}
                  title={`${labelBulan(b.ym, lang)} · ${t('tx.pemasukan')} ${rupiah(b.income)} · ${t(
                    'tx.pengeluaran',
                  )} ${rupiah(b.expense)}`}
                  onClick={() => setPilih(b.ym)}
                  onMouseEnter={() => setSorot(b.ym)}
                  onMouseLeave={() => setSorot(null)}
                  onFocus={() => setSorot(b.ym)}
                  onBlur={() => setSorot(null)}
                >
                  <span className="grafik-bars" style={{ height: TINGGI }}>
                    <span className="grafik-bar bar-income" style={{ height: tinggi(b.income, maks) }} />
                    <span className="grafik-bar bar-expense" style={{ height: tinggi(b.expense, maks) }} />
                  </span>
                  <span className="grafik-x">{bulanPendek(b.ym, lang)}</span>
                  <span className="grafik-x-thn">{tahunBaru ? tahun : ''}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grafik-rincian">
        <div className="grafik-rincian-head">
          <h3 className="grafik-rincian-judul">
            {t('grafik.rincian').replace('{bulan}', aktif ? labelBulan(aktif, lang) : '—')}
          </h3>
          <div className="seg seg-sm" role="group" aria-label={t('tx.jenis')}>
            <button
              type="button"
              className={'seg-btn seg-expense' + (jenis === 'expense' ? ' is-active' : '')}
              onClick={() => setJenis('expense')}
            >
              {t('tx.pengeluaran')}
            </button>
            <button
              type="button"
              className={'seg-btn seg-income' + (jenis === 'income' ? ' is-active' : '')}
              onClick={() => setJenis('income')}
            >
              {t('tx.pemasukan')}
            </button>
          </div>
        </div>

        {rincian.items.length === 0 ? (
          <p className="grafik-kosong">{t('grafik.kosong')}</p>
        ) : (
          <ul className="kat-bar-list">
            {rincian.items.map((k, i) => (
              <li key={k.nama} className="kat-bar">
                <div className="kat-bar-top">
                  <span className="kat-bar-nama">
                    {k.nama}
                    {i === 0 && rincian.items.length > 1 && (
                      <em className="kat-bar-tag">{t('grafik.terbesar')}</em>
                    )}
                  </span>
                  <span className={'kat-bar-nilai amount amount-' + jenis}>{rupiah(k.jumlah)}</span>
                </div>
                <div className="kat-bar-track">
                  <i
                    className={'kat-bar-fill fill-' + jenis}
                    style={{ width: (puncak > 0 ? (k.jumlah / puncak) * 100 : 0) + '%' }}
                  />
                </div>
                <div className="kat-bar-sub">
                  {t('grafik.dariTotal').replace(
                    '{p}',
                    rincian.total > 0 ? String(Math.round((k.jumlah / rincian.total) * 100)) : '0',
                  )}
                  {' · '}
                  {t('grafik.nTransaksi').replace('{n}', String(k.n))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Jumlahkan transaksi per bulan `YYYY-MM`, termasuk bulan kosong di tengah. */
function rangkumPerBulan(txs: Transaction[]): Bulan[] {
  const map = new Map<string, Bulan>()
  for (const tx of txs) {
    const ym = tx.tanggal.slice(0, 7)
    if (ym.length !== 7) continue
    const b = map.get(ym) ?? { ym, income: 0, expense: 0 }
    if (tx.type === 'income') b.income += tx.jumlah
    else b.expense += tx.jumlah
    map.set(ym, b)
  }
  if (map.size === 0) return []
  const kunci = [...map.keys()].sort()
  const akhir = kunci[kunci.length - 1]
  const out: Bulan[] = []
  // Bulan tanpa transaksi tetap dicetak sebagai kolom kosong supaya jarak
  // antar bulan di grafik sesuai waktu sebenarnya.
  for (let ym = kunci[0]; ym <= akhir && out.length < 600; ym = bulanBerikut(ym)) {
    out.push(map.get(ym) ?? { ym, income: 0, expense: 0 })
  }
  return out
}

function bulanBerikut(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m >= 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

/**
 * Bulatkan batas atas sumbu ke angka bulat terdekat di atas nilai tertinggi.
 * Langkahnya rapat (bukan cuma 1/2/5) supaya batang tertinggi hampir memenuhi
 * area grafik — kalau lompatannya jauh, semua batang jadi kelihatan pendek.
 */
const LANGKAH = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

function batasAtas(v: number): number {
  if (v <= 0) return 0
  const pangkat = Math.pow(10, Math.floor(Math.log10(v)))
  const sisa = v / pangkat
  return (LANGKAH.find((x) => sisa <= x) ?? 10) * pangkat
}

/** Tinggi batang dalam px; nilai kecil tetap disisakan 3px agar terlihat. */
function tinggi(nilai: number, maks: number): number {
  if (nilai <= 0 || maks <= 0) return 0
  return Math.max(3, Math.round((nilai / maks) * TINGGI))
}
