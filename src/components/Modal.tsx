import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog?.showModal()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dialog?.open) {
        event.preventDefault()
        closeRef.current()
      }
    }
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('keydown', escape)
      dialog?.close()
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])
  return <dialog className="modal" ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); closeRef.current() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal-inner">
      <div className="modal-header"><div><span className="eyebrow">A LITTLE PLACE FOR BIG IMAGINATIONS</span><h2 id={titleId}>{title}</h2></div><button className="round-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
      {children}
    </div>
  </dialog>
}
