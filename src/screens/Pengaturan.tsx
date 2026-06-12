import { useRef, useState } from 'react'
import type { AppData, FontPair, FontSize, Lang, TxType, WalletId } from '../types'
import { APP_DATA_DEFAULT } from '../storage'
import { FONT_PAIRS, FONT_PAIR_LIST, FONT_SIZE_LIST, FONT_SIZE_META } from '../appearance'
import { setPrefs, usePrefs } from '../lib/prefs'
import { useLang } from '../i18n'
import { useToast } from '../components/Toast'
import { ThemeSwitcher } from '../components/ThemeSwitcher'

type Props = {
  data: AppData
  setData: (next: AppData) => void
  onDeleteWallet: (id: WalletId) => void
}

export function Pengaturan({ data, setData, onDeleteWallet }: Props) {
  const { t } = useLang()
  const toast = useToast()
  const prefs = usePrefs()
  const fileRef = useRef<HTMLInputElement>(null)
  const [katBaru, setKatBaru] = useState<Record<TxType, string>>({ income: '', expense: '' })

  function renameWallet(id: WalletId, nama: string) {
    setData({
      ...data,
      wallets: data.wallets.map((w) => (w.id === id ? { ...w, nama } : w)),
    })
  }

  function hapusDompet(id: WalletId, nama: string) {
    if (data.wallets.length <= 1) return
    if (!confirm(t('dompet.hapusKonfirmasi').replace('{nama}', nama))) return
    onDeleteWallet(id)
    toast('info', t('toast.dompetHapus'))
  }

  function tambahKategori(type: TxType) {
    const nama = katBaru[type].trim()
    if (!nama) return
    if (data.categories[type].some((k) => k.toLowerCase() === nama.toLowerCase())) {
      toast('warn', t('set.katAda'))
      return
    }
    setData({
      ...data,
      categories: { ...data.categories, [type]: [...data.categories[type], nama] },
    })
    setKatBaru((s) => ({ ...s, [type]: '' }))
  }

  function hapusKategori(type: TxType, nama: string) {
    setData({
      ...data,
      categories: {
        ...data.categories,
        [type]: data.categories[type].filter((k) => k !== nama),
      },
    })
  }

  function ekspor() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'catatan-keuangan.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function impor(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppData>
        if (!Array.isArray(parsed.transactions)) throw new Error('bad')
        setData({
          transactions: parsed.transactions,
          wallets:
            Array.isArray(parsed.wallets) && parsed.wallets.length
              ? parsed.wallets
              : APP_DATA_DEFAULT.wallets.map((w) => ({ ...w })),
          tabungan: Array.isArray(parsed.tabungan) ? parsed.tabungan : [],
          hargaBarang: Array.isArray(parsed.hargaBarang) ? parsed.hargaBarang : [],
          categories: {
            income: Array.isArray(parsed.categories?.income)
              ? parsed.categories.income
              : [...APP_DATA_DEFAULT.categories.income],
            expense: Array.isArray(parsed.categories?.expense)
              ? parsed.categories.expense
              : [...APP_DATA_DEFAULT.categories.expense],
          },
        })
        toast('ok', t('toast.imporOk'))
      } catch {
        toast('warn', t('toast.imporGagal'))
      }
    }
    reader.readAsText(file)
  }

  function reset() {
    if (!confirm(t('set.resetKonfirmasi'))) return
    setData({ ...data, transactions: [] })
    toast('info', t('toast.reset'))
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">{t('set.judul')}</h1>
          <p className="page-sub">{t('app.brandKicker')}</p>
        </div>
      </header>

      <section className="panel">
        <h2 className="panel-title">{t('set.namaDompet')}</h2>
        <div className="setting-grid">
          {data.wallets.map((w) => (
            <label key={w.id} className="field">
              <span>{w.ikon} {w.nama}</span>
              <div className="field-row">
                <input
                  type="text"
                  value={w.nama}
                  onChange={(e) => renameWallet(w.id, e.target.value)}
                />
                {data.wallets.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => hapusDompet(w.id, w.nama)}
                  >
                    {t('dompet.hapus')}
                  </button>
                )}
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">{t('set.kategori')}</h2>
        <p className="page-sub">{t('set.kategoriSub')}</p>
        {(['expense', 'income'] as TxType[]).map((type) => (
          <div key={type} className="kat-group">
            <h3 className="panel-title mt">
              {type === 'income' ? t('tx.pemasukan') : t('tx.pengeluaran')}
            </h3>
            <div className="chip-row">
              {data.categories[type].length === 0 && (
                <span className="page-sub">{t('set.katKosong')}</span>
              )}
              {data.categories[type].map((k) => (
                <span key={k} className="chip kat-chip">
                  {k}
                  <button
                    type="button"
                    className="kat-del"
                    onClick={() => hapusKategori(type, k)}
                    aria-label={`${t('harga.hapus')} ${k}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form
              className="kat-add"
              onSubmit={(e) => {
                e.preventDefault()
                tambahKategori(type)
              }}
            >
              <input
                type="text"
                value={katBaru[type]}
                placeholder={t('set.katPlaceholder')}
                onChange={(e) => setKatBaru((s) => ({ ...s, [type]: e.target.value }))}
              />
              <button type="submit" className="btn btn-ghost btn-sm">
                {t('set.katTambah')}
              </button>
            </form>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2 className="panel-title">{t('set.tema')}</h2>
        <ThemeSwitcher />
      </section>

      <section className="panel">
        <h2 className="panel-title">{t('set.font')}</h2>
        <div className="chip-row">
          {FONT_PAIR_LIST.map((fp: FontPair) => (
            <button
              key={fp}
              type="button"
              className={'chip' + (prefs.fontPair === fp ? ' is-active' : '')}
              onClick={() => setPrefs({ fontPair: fp })}
            >
              {FONT_PAIRS[fp].label}
            </button>
          ))}
        </div>

        <h2 className="panel-title mt">{t('set.ukuran')}</h2>
        <div className="chip-row">
          {FONT_SIZE_LIST.map((fs: FontSize) => (
            <button
              key={fs}
              type="button"
              className={'chip' + (prefs.fontSize === fs ? ' is-active' : '')}
              onClick={() => setPrefs({ fontSize: fs })}
            >
              {FONT_SIZE_META[fs].label}
            </button>
          ))}
        </div>

        <h2 className="panel-title mt">{t('set.bahasa')}</h2>
        <div className="chip-row">
          {(['id', 'en'] as Lang[]).map((lg) => (
            <button
              key={lg}
              type="button"
              className={'chip' + (prefs.lang === lg ? ' is-active' : '')}
              onClick={() => setPrefs({ lang: lg })}
            >
              {lg === 'id' ? 'Bahasa Indonesia' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">{t('set.data')}</h2>
        <div className="chip-row">
          <button type="button" className="btn btn-ghost" onClick={ekspor}>
            {t('set.ekspor')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            {t('set.impor')}
          </button>
          <button type="button" className="btn btn-danger" onClick={reset}>
            {t('set.reset')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) impor(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
