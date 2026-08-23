// Input nama barang dengan saran otomatis dari barang yang pernah dicatat.
// Mengetik huruf yang sama dengan barang lama akan memunculkan daftar nama
// yang cocok; memilih salah satu ikut mengisi satuan yang dulu dipakai.

import { useMemo, useRef, useState } from 'react'
import { cariSaran, type SaranBarang } from '../lib/saranBarang'

type Props = {
  value: string
  onChange: (nama: string) => void
  /** Dipanggil saat sebuah saran dipilih (dari klik atau Enter). */
  onPilih: (s: SaranBarang) => void
  saran: SaranBarang[]
  placeholder?: string
  className?: string
  autoFocus?: boolean
  ariaLabel?: string
}

export function NamaBarangInput({
  value,
  onChange,
  onPilih,
  saran,
  placeholder,
  className,
  autoFocus,
  ariaLabel,
}: Props) {
  const [buka, setBuka] = useState(false)
  const [sorot, setSorot] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const daftar = useMemo(() => cariSaran(saran, value), [saran, value])
  const tampil = buka && daftar.length > 0

  function pilih(s: SaranBarang) {
    onPilih(s)
    setBuka(false)
    setSorot(-1)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && tampil) {
      // Jangan sampai Escape ikut menutup modal saat daftar saran terbuka.
      e.stopPropagation()
      setBuka(false)
      setSorot(-1)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!daftar.length) return
      e.preventDefault()
      if (!tampil) {
        setBuka(true)
        setSorot(0)
        return
      }
      const arah = e.key === 'ArrowDown' ? 1 : -1
      setSorot((i) => (i + arah + daftar.length) % daftar.length)
      return
    }
    if (e.key === 'Enter' && tampil && sorot >= 0) {
      // Enter memilih saran, bukan mengirim form.
      e.preventDefault()
      pilih(daftar[sorot])
    }
  }

  return (
    <div className="autocomplete">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={tampil}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        className={className}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value)
          setBuka(true)
          setSorot(-1)
        }}
        onFocus={() => setBuka(true)}
        onBlur={() => {
          setBuka(false)
          setSorot(-1)
        }}
        onKeyDown={onKeyDown}
      />
      {tampil && (
        <ul className="ac-list" role="listbox">
          {daftar.map((s, i) => (
            <li key={s.nama} role="option" aria-selected={i === sorot}>
              <button
                type="button"
                className={'ac-item' + (i === sorot ? ' is-sorot' : '')}
                // mousedown, bukan click: blur input akan menutup daftar duluan.
                onMouseDown={(e) => {
                  e.preventDefault()
                  pilih(s)
                }}
                onMouseEnter={() => setSorot(i)}
              >
                <span className="ac-nama">
                  <Cocok nama={s.nama} q={value} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Tebalkan bagian nama yang cocok dengan huruf yang sedang diketik. */
function Cocok({ nama, q }: { nama: string; q: string }) {
  const s = q.trim().toLowerCase()
  const at = s ? nama.toLowerCase().indexOf(s) : -1
  if (at < 0) return <>{nama}</>
  return (
    <>
      {nama.slice(0, at)}
      <strong>{nama.slice(at, at + s.length)}</strong>
      {nama.slice(at + s.length)}
    </>
  )
}
