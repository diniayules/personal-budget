// Input angka berformat ribuan (1.000.000). Menyimpan nilai numerik murni
// ke parent lewat onChange, menampilkan versi berformat ke pengguna.

type Props = {
  value: number
  onChange: (n: number) => void
  id?: string
  placeholder?: string
  autoFocus?: boolean
}

export function RupiahInput({ value, onChange, id, placeholder, autoFocus }: Props) {
  const display = value > 0 ? value.toLocaleString('id-ID') : ''
  return (
    <div className="rupiah-input">
      <span className="rupiah-prefix">Rp</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={display}
        placeholder={placeholder ?? '0'}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          onChange(digits ? Number(digits) : 0)
        }}
      />
    </div>
  )
}
