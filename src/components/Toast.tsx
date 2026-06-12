import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type Kind = 'ok' | 'warn' | 'info'
type Item = { id: number; kind: Kind; msg: string }

type ToastFn = (kind: Kind, msg: string) => void

const Ctx = createContext<ToastFn | null>(null)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])

  const toast = useCallback<ToastFn>((kind, msg) => {
    const id = ++seq
    setItems((prev) => [...prev, { id, kind, msg }])
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id))
    }, 2600)
  }, [])

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={'toast toast-' + i.kind}>
            {i.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastFn {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return v
}
