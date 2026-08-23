// Input pasangan "jumlah/berat + satuan", mis. 7 kg. Nilai desimal boleh
// ditulis dengan koma (1,5) maupun titik (1.5); parent selalu menerima number.

import { useState } from 'react'
import { SATUAN } from '../lib/satuan'
import { useLang } from '../i18n'

type Props = {
  jumlah: number
  satuan: string
  onJumlah: (n: number) => void
  onSatuan: (s: string) => void
  /** Label a11y untuk kolom jumlah (baris rincian tidak punya <label>). */
  ariaLabel?: string
}

export function JumlahSatuan({ jumlah, satuan, onJumlah, onSatuan, ariaLabel }: Props) {
  const { t } = useLang()
  // Simpan teks mentah supaya user bisa mengetik "1," tanpa langsung dinormalisasi.
  const [teks, setTeks] = useState<string | null>(null)
  const tampil = teks ?? (jumlah > 0 ? String(jumlah).replace('.', ',') : '')

  return (
    <div className="qty-input">
      <input
        type="text"
        inputMode="decimal"
        className="qty-jumlah"
        aria-label={ariaLabel ?? t('harga.jumlah')}
        value={tampil}
        placeholder="1"
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, '')
          setTeks(raw)
          const n = Number(raw.replace(',', '.'))
          onJumlah(Number.isFinite(n) ? n : 0)
        }}
        onBlur={() => setTeks(null)}
      />
      <select
        className="qty-satuan"
        aria-label={t('harga.satuan')}
        value={satuan}
        onChange={(e) => onSatuan(e.target.value)}
      >
        {SATUAN.map((s) => (
          <option key={s.id} value={s.id}>
            {t('satuan.' + s.id)}
          </option>
        ))}
      </select>
    </div>
  )
}
