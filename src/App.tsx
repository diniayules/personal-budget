import { useEffect, useMemo, useState } from 'react'
import type { TxType, Wallet, WalletId } from './types'
import { newId } from './lib/store'
import { applyAppearance } from './appearance'
import { useAppData } from './lib/useAppData'
import { usePrefs } from './lib/prefs'
import { LangProvider } from './i18n'
import { ToastProvider } from './components/Toast'
import { Sidebar, type NavId } from './components/Sidebar'
import { Icons } from './components/Icons'
import { Dashboard } from './screens/Dashboard'
import { Pengaturan } from './screens/Pengaturan'
import { TabunganScreen } from './screens/Tabungan'
import { HargaBarang } from './screens/HargaBarang'
import { WelcomeModal } from './screens/WelcomeModal'
import './App.css'

function Inner() {
  const { data, loading, setData } = useAppData()
  const prefs = usePrefs()
  const [nav, setNav] = useState<NavId>('pribadi')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Pop-up sapaan: null = tertutup, { lockedWallet } = terbuka.
  // lockedWallet null → tanya jenis lalu dompet (saat halaman dibuka);
  // lockedWallet terisi → tanya jenis saja (saat ganti dompet di sidebar).
  const [welcome, setWelcome] = useState<{ lockedWallet: WalletId | null } | null>({
    lockedWallet: null,
  })
  const [quickNew, setQuickNew] = useState<TxType | null>(null)

  const walletIds = useMemo(() => (data ? data.wallets.map((w) => w.id) : []), [data])
  const isWalletId = (id: NavId): id is WalletId => walletIds.includes(id as WalletId)

  function pickQuick(type: TxType, wallet: WalletId) {
    setWelcome(null)
    setNav(wallet)
    setQuickNew(type)
  }

  function handleNavigate(id: NavId) {
    setNav(id)
    // Tiap berpindah ke dompet, munculkan pop-up sapaan untuk dompet itu.
    if (isWalletId(id)) setWelcome({ lockedWallet: id })
  }

  function addWallet(nama: string, ikon: string) {
    if (!data) return
    const wallet: Wallet = { id: newId(), nama: nama.trim() || 'Dompet', ikon }
    setData({ ...data, wallets: [...data.wallets, wallet] })
    setNav(wallet.id)
  }

  function deleteWallet(id: WalletId) {
    if (!data || data.wallets.length <= 1) return
    setData({
      ...data,
      wallets: data.wallets.filter((w) => w.id !== id),
      // Buang transaksi milik dompet yang dihapus agar tidak jadi yatim.
      transactions: data.transactions.filter((tx) => tx.wallet !== id),
    })
    if (nav === id) setNav(data.wallets.find((w) => w.id !== id)!.id)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme
  }, [prefs.theme])

  useEffect(() => {
    applyAppearance(prefs.fontPair, prefs.fontSize)
  }, [prefs.fontPair, prefs.fontSize])

  const saldoPerWallet = useMemo(() => {
    const acc: Record<WalletId, number> = {}
    if (data) {
      for (const w of data.wallets) acc[w.id] = 0
      for (const tx of data.transactions) {
        if (tx.wallet in acc) acc[tx.wallet] += tx.type === 'income' ? tx.jumlah : -tx.jumlah
      }
    }
    return acc
  }, [data])

  const tabunganTotal = useMemo(
    () => (data ? data.tabungan.reduce((sum, pos) => sum + pos.jumlah, 0) : 0),
    [data],
  )

  if (loading || !data) {
    return <div className="loading">Memuat…</div>
  }

  return (
    <div className="shell">
      <Sidebar
        active={nav}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        wallets={data.wallets}
        saldoPerWallet={saldoPerWallet}
        tabunganTotal={tabunganTotal}
        onAddWallet={addWallet}
      />

      <div className="content">
        <button
          type="button"
          className="topbar-menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Buka menu"
        >
          <Icons.menu />
        </button>

        <main className="main">
          {nav === 'pengaturan' ? (
            <Pengaturan data={data} setData={setData} onDeleteWallet={deleteWallet} />
          ) : nav === 'tabungan' ? (
            <TabunganScreen data={data} setData={setData} />
          ) : nav === 'harga' ? (
            <HargaBarang data={data} setData={setData} />
          ) : (
            <Dashboard
              key={nav}
              wallet={isWalletId(nav) ? nav : data.wallets[0].id}
              data={data}
              setData={setData}
              quickNew={quickNew}
              onQuickConsumed={() => setQuickNew(null)}
            />
          )}
        </main>
      </div>

      {welcome && (
        <WelcomeModal
          wallets={data.wallets}
          lockedWallet={welcome.lockedWallet}
          onPick={pickQuick}
          onClose={() => setWelcome(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <ToastProvider>
        <Inner />
      </ToastProvider>
    </LangProvider>
  )
}
