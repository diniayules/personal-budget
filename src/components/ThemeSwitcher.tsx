import type { Theme } from '../types'
import { setPrefs, usePrefs } from '../lib/prefs'

const THEMES: { id: Theme; label: string; dot: string }[] = [
  { id: 'pop', label: 'Krem', dot: '#C0563A' },
  { id: 'mint', label: 'Mint', dot: '#16C79A' },
  { id: 'dark', label: 'Gelap', dot: '#0F172A' },
]

export function ThemeSwitcher() {
  const { theme } = usePrefs()
  return (
    <div className="theme-switcher" role="group" aria-label="Tema">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'theme-chip' + (t.id === theme ? ' is-active' : '')}
          onClick={() => setPrefs({ theme: t.id })}
          title={t.label}
          aria-label={t.label}
        >
          <span className="theme-dot" style={{ background: t.dot }} />
          <span className="theme-label">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
