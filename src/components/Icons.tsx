// Ikon SVG inline (ukuran mengikuti font-size, lihat `svg { width: 1em }`).
// Pola sama dengan Icons.tsx di project absensi.

type P = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Icons = {
  wallet: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0H5a2 2 0 0 0-2 2Z" />
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5" />
      <circle cx="17" cy="13" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  user: ({ className }: P) => (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  ),
  home: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  ),
  plus: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  ),
  edit: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  ),
  settings: ({ className }: P) => (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L16 3H8l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 3 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2L8 21h8l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />
    </svg>
  ),
  arrowDown: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  ),
  arrowUp: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  ),
  chevron: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  menu: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  close: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  tag: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M4 13V5a1 1 0 0 1 1-1h8l7 7a1.5 1.5 0 0 1 0 2l-6 6a1.5 1.5 0 0 1-2 0l-7-7Z" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  piggy: ({ className }: P) => (
    <svg {...base} className={className}>
      <path d="M3 12a6 6 0 0 1 6-6h4a6 6 0 0 1 6 5h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1.3a6 6 0 0 1-1.7 2v2h-3v-1.3a6 6 0 0 1-2 .3H9a6 6 0 0 1-2-.3V20H4v-2.4A6 6 0 0 1 3 13Z" />
      <path d="M9 6c0-1.7 1.3-3 3-3" />
      <circle cx="15.5" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
}
