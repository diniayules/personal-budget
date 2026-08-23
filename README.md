# Catatan Keuangan — Pribadi & Rumah Tangga

Aplikasi pencatat pemasukan & pengeluaran pribadi dengan **dua dompet terpisah**
(Pribadi 👤 dan Rumah Tangga 🏠), masing-masing punya transaksi dan saldonya
sendiri. Berpindah dompet lewat sidebar.

Setup-nya meniru project **absensi-karyawan**: stack, struktur folder, dan pola
arsitektur yang sama — bedanya data disimpan **lokal di browser (localStorage)**
sehingga langsung jalan tanpa konfigurasi backend.

## Stack

- **Vite 8** + **React 19** + **TypeScript** (`tsc -b` strict)
- State write-through via `useAppData` → `localStorage` (analog `lib/db.ts` di absensi)
- Preferensi per-perangkat (tema, font, ukuran teks, bahasa) via `useSyncExternalStore` (`lib/prefs.tsx`)
- i18n ringan id/en (`i18n.tsx`)
- Deploy ke GitHub Pages via `.github/workflows/deploy.yml`

## Struktur

```
src/
  App.tsx              shell + routing antar dompet/pengaturan
  types.ts             model (Transaction, AppData, dll)
  storage.ts           default: nama dompet, kategori
  appearance.ts        pasangan font & ukuran teks
  format.ts            util Rupiah & tanggal
  i18n.tsx             LangProvider + useLang
  lib/
    store.ts           load/save localStorage (analog db.ts)
    useAppData.tsx     hook write-through
    prefs.tsx          preferensi per-perangkat
  components/          Sidebar, Modal, Toast, Icons, RupiahInput, ThemeSwitcher
  screens/             Dashboard, TransaksiModal, Pengaturan
```

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173/personal-budget/
npm run build    # typecheck + build ke dist/
npm run preview
```

## Catatan

- Data tersimpan di `localStorage` (kunci `personal-budget:data:v1`). Bisa
  diekspor/diimpor sebagai JSON di halaman **Pengaturan**.
- **Sinkron antar-gadget (opsional, tanpa akun aplikasi & tanpa server):**
  hubungkan Google Drive milikmu sendiri di halaman **Pengaturan**. Data
  disimpan sebagai satu file di *appDataFolder* (folder tersembunyi khusus app,
  scope minimal `drive.appdata`) lalu sinkron otomatis ke gadget lain yang
  login Google yang sama. Aktifkan dengan mengisi `VITE_GOOGLE_CLIENT_ID` —
  lihat langkah pembuatan Client ID di `.env.example`. Tanpa env ini, panel
  sinkron disembunyikan dan app tetap jalan 100% lokal seperti biasa.
- Kalau nanti mau pindah ke Supabase (seperti absensi), tinggal ganti
  implementasi `lib/store.ts` + `lib/useAppData.tsx` tanpa mengubah UI.
