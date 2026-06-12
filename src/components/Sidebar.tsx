import { useEffect, useState } from 'react'
import type { TabunganJenis, Wallet, WalletId } from '../types'
import { WALLET_IKON_PILIHAN } from '../storage'
import { rupiah } from '../format'
import { useLang } from '../i18n'
import { Icons } from './Icons'
import { ThemeSwitcher } from './ThemeSwitcher'

export type NavId =
  | WalletId
  | 'tabungan:uang'
  | 'tabungan:saham'
  | 'tabungan:emas'
  | 'harga'
  | 'pengaturan'

/** Tiga bagian tabungan yang tampil sebagai menu terpisah di sidebar. */
export const TABUNGAN_NAV: { id: NavId; jenis: TabunganJenis; ikon: string; labelKey: string }[] = [
  { id: 'tabungan:uang', jenis: 'uang', ikon: '💵', labelKey: 'nav.tabUang' },
  { id: 'tabungan:saham', jenis: 'saham', ikon: '📈', labelKey: 'nav.tabSaham' },
  { id: 'tabungan:emas', jenis: 'emas', ikon: '🥇', labelKey: 'nav.tabEmas' },
]

type Props = {
  active: NavId
  open: boolean
  onClose: () => void
  onNavigate: (id: NavId) => void
  wallets: Wallet[]
  saldoPerWallet: Record<WalletId, number>
  tabunganTotals: Record<TabunganJenis, number>
  onAddWallet: (nama: string, ikon: string) => void
}

export function Sidebar({
  active,
  open,
  onClose,
  onNavigate,
  wallets,
  saldoPerWallet,
  tabunganTotals,
  onAddWallet,
}: Props) {
  const { t } = useLang()
  const [adding, setAdding] = useState(false)
  const [nama, setNama] = useState('')
  const [ikon, setIkon] = useState(WALLET_IKON_PILIHAN[0])

  function resetAdd() {
    setAdding(false)
    setNama('')
    setIkon(WALLET_IKON_PILIHAN[0])
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) return
    onAddWallet(nama, ikon)
    resetAdd()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function go(id: NavId) {
    onNavigate(id)
    onClose()
  }

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={'sidebar' + (open ? ' is-open' : '')}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">💰</div>
          <div className="sidebar-brand-text">
            <span className="kicker">{t('app.brandKicker')}</span>
            <span className="name">{t('app.brandName')}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-group">
            <div className="sidebar-group-head">{t('nav.dompet')}</div>
            {wallets.map((w) => {
              const isActive = w.id === active
              return (
                <button
                  key={w.id}
                  type="button"
                  className={'wallet-link' + (isActive ? ' is-active' : '')}
                  onClick={() => go(w.id)}
                >
                  <span className="wallet-ikon">{w.ikon}</span>
                  <span className="wallet-text">
                    <span className="wallet-nama">{w.nama}</span>
                    <span className="wallet-saldo">{rupiah(saldoPerWallet[w.id] ?? 0)}</span>
                  </span>
                  {isActive && (
                    <span className="wallet-arrow">
                      <Icons.chevron />
                    </span>
                  )}
                </button>
              )
            })}

            {adding ? (
              <form className="wallet-add" onSubmit={submitAdd}>
                <div className="wallet-ikon-pick">
                  {WALLET_IKON_PILIHAN.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      className={'wallet-ikon-opt' + (ikon === emo ? ' is-active' : '')}
                      onClick={() => setIkon(emo)}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  autoFocus
                  value={nama}
                  placeholder={t('dompet.namaPlaceholder')}
                  onChange={(e) => setNama(e.target.value)}
                />
                <div className="wallet-add-actions">
                  <button type="submit" className="btn btn-primary btn-sm">
                    {t('form.simpan')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={resetAdd}>
                    {t('form.batal')}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="wallet-add-btn" onClick={() => setAdding(true)}>
                <span className="wallet-ikon">＋</span>
                <span className="wallet-text">
                  <span className="wallet-nama">{t('dompet.tambah')}</span>
                </span>
              </button>
            )}

          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-head">{t('nav.tabungan')}</div>
            {TABUNGAN_NAV.map((item) => {
              const isActive = item.id === active
              return (
                <button
                  key={item.id}
                  type="button"
                  className={'wallet-link' + (isActive ? ' is-active' : '')}
                  onClick={() => go(item.id)}
                >
                  <span className="wallet-ikon">{item.ikon}</span>
                  <span className="wallet-text">
                    <span className="wallet-nama">{t(item.labelKey)}</span>
                    <span className="wallet-saldo">{rupiah(tabunganTotals[item.jenis])}</span>
                  </span>
                  {isActive && (
                    <span className="wallet-arrow">
                      <Icons.chevron />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-head">{t('nav.lacak')}</div>
            <button
              type="button"
              className={'sidebar-link' + (active === 'harga' ? ' is-active' : '')}
              onClick={() => go('harga')}
            >
              <span className="sidebar-link-ikon">
                <Icons.tag />
              </span>
              <span className="sidebar-link-label">{t('nav.harga')}</span>
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-head">{t('nav.sistem')}</div>
            <button
              type="button"
              className={'sidebar-link' + (active === 'pengaturan' ? ' is-active' : '')}
              onClick={() => go('pengaturan')}
            >
              <span className="sidebar-link-ikon">
                <Icons.settings />
              </span>
              <span className="sidebar-link-label">{t('nav.pengaturan')}</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-foot">
          <ThemeSwitcher />
        </div>
      </aside>
    </>
  )
}
