import { useSyncExternalStore } from 'react'
import type { FontPair, FontSize, Lang, TabunganJenis, Theme } from '../types'

// Preferensi tampilan disimpan PER-PERANGKAT (localStorage), bukan di data
// transaksi. Tiap browser/HP punya tema, font, ukuran teks, dan bahasa sendiri.
// Pola sama dengan prefs.tsx di project absensi (useSyncExternalStore).

export type Prefs = {
  theme: Theme
  fontPair: FontPair
  fontSize: FontSize
  lang: Lang
  /** Jenis tabungan yang aktif/tampil di menu. */
  tabunganTabs: Record<TabunganJenis, boolean>
}

export const PREFS_DEFAULTS: Prefs = {
  theme: 'pop',
  fontPair: 'playful',
  fontSize: 'normal',
  lang: 'id',
  tabunganTabs: { uang: true, saham: true, emas: true },
}

const KEY = 'personal-budget:prefs:v1'

const THEMES: Theme[] = ['pop', 'dark', 'toystory', 'spongebob']
const FONT_PAIRS: FontPair[] = ['playful', 'modern', 'editorial', 'minimal', 'oui']
const FONT_SIZES: FontSize[] = ['small', 'normal', 'large', 'xlarge']
const LANGS: Lang[] = ['id', 'en']

function parse(raw: string | null): Prefs {
  if (!raw) return PREFS_DEFAULTS
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof Prefs, unknown>>
    const tabs = p.tabunganTabs as Partial<Record<TabunganJenis, unknown>> | undefined
    const tab = (k: TabunganJenis) =>
      typeof tabs?.[k] === 'boolean' ? (tabs[k] as boolean) : PREFS_DEFAULTS.tabunganTabs[k]
    return {
      theme: THEMES.includes(p.theme as Theme) ? (p.theme as Theme) : PREFS_DEFAULTS.theme,
      fontPair: FONT_PAIRS.includes(p.fontPair as FontPair)
        ? (p.fontPair as FontPair)
        : PREFS_DEFAULTS.fontPair,
      fontSize: FONT_SIZES.includes(p.fontSize as FontSize)
        ? (p.fontSize as FontSize)
        : PREFS_DEFAULTS.fontSize,
      lang: LANGS.includes(p.lang as Lang) ? (p.lang as Lang) : PREFS_DEFAULTS.lang,
      tabunganTabs: { uang: tab('uang'), saham: tab('saham'), emas: tab('emas') },
    }
  } catch {
    return PREFS_DEFAULTS
  }
}

let cache: Prefs = parse(
  typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null,
)

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = parse(e.newValue)
      cb()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot(): Prefs {
  return cache
}

export function getPrefs(): Prefs {
  return cache
}

export function setPrefs(patch: Partial<Prefs>): void {
  cache = { ...cache, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('[prefs] gagal menyimpan', e)
  }
  emit()
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
