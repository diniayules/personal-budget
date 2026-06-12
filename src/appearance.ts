// =============================================================
// appearance.ts · Pasangan font & ukuran teks — diterapkan ke :root
// sebagai CSS custom properties. Sama pola dengan project absensi.
// =============================================================
import type { FontPair, FontSize } from './types'

type Pair = { label: string; display: string; body: string; preview: string }

export const FONT_PAIRS: Record<FontPair, Pair> = {
  playful: { label: 'Neraca', display: 'Newsreader', body: 'Plus Jakarta Sans', preview: 'Aa Bb 123' },
  modern: { label: 'Modern', display: 'Inter', body: 'Inter', preview: 'Aa Bb 123' },
  editorial: { label: 'Editorial', display: 'Space Mono', body: 'Plus Jakarta Sans', preview: 'Aa Bb 123' },
  minimal: { label: 'Minimal', display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', preview: 'Aa Bb 123' },
  oui: { label: 'Permen', display: 'Nunito', body: 'Nunito', preview: 'Aa Bb 123' },
}

export const FONT_PAIR_LIST: FontPair[] = ['playful', 'modern', 'editorial', 'minimal', 'oui']
export const FONT_SIZE_LIST: FontSize[] = ['small', 'normal', 'large', 'xlarge']

export const FONT_SIZE_META: Record<FontSize, { label: string; scale: number }> = {
  small: { label: 'Kecil', scale: 0.9 },
  normal: { label: 'Normal', scale: 1.0 },
  large: { label: 'Besar', scale: 1.1 },
  xlarge: { label: 'Sangat Besar', scale: 1.22 },
}

export function applyAppearance(fontPair: FontPair, fontSize: FontSize): void {
  const pair = FONT_PAIRS[fontPair] ?? FONT_PAIRS.playful
  const root = document.documentElement
  root.style.setProperty('--font-display', `"${pair.display}", system-ui, sans-serif`)
  root.style.setProperty('--font-body', `"${pair.body}", system-ui, sans-serif`)
  root.style.setProperty('--text-scale', String(FONT_SIZE_META[fontSize].scale))
}
