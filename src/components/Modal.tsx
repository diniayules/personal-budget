import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Icons } from './Icons'

type Props = {
  judul: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ judul, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{judul}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
            <Icons.close />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
