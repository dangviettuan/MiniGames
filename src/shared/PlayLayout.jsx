import React, { useEffect, useRef } from 'react'
import './play.css'

export function PlayLayout({ id, title, status, statusTone = '', board, controls, feedback, details, tools, ratio = 1, reserve = 220, minBoard = 280, saved = 'saved' }) {
  const toolsRef = useRef(null)
  useEffect(() => {
    const closeOutside = event => { if (toolsRef.current?.open && !toolsRef.current.contains(event.target)) toolsRef.current.open = false }
    const closeEscape = event => { if (event.key === 'Escape' && toolsRef.current?.open) { toolsRef.current.open = false; toolsRef.current.querySelector('summary')?.focus() } }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape) }
  }, [])
  return <section className={`play-screen play-${id}`} style={{ '--play-ratio': ratio, '--play-reserve': `${reserve}px`, '--play-board-min': `${minBoard}px` }} aria-label={title}>
    <header className="play-heading"><h1>{title}</h1>{tools && <details ref={toolsRef} className="play-tools"><summary aria-label={`Tùy chọn ${title}`}>Tùy chọn <span aria-hidden="true">⋯</span></summary><div className="play-tool-items" onClick={event => { if (event.target.closest('button') && toolsRef.current) { toolsRef.current.open = false; toolsRef.current.querySelector('summary')?.focus() } }}>{tools}</div></details>}</header>
    <div className={`play-status ${statusTone}`}><div role="status" aria-live="polite">{status}</div>{saved === 'unavailable' && <small className="play-save-warning">Không lưu được ván trên thiết bị này. Đừng tải lại trang khi đang chơi.</small>}</div>
    <div className="play-board-area"><div className="play-board-frame">{board}</div></div>
    <div className="play-controls">{controls}</div>
    <div className="play-feedback" role="alert">{feedback || ''}</div>
    {details && <div className="play-details">{details}</div>}
  </section>
}

export function ConfirmDialog({ open, title = 'Tạo ván mới?', children, confirmLabel = 'Tạo ván mới', cancelLabel = 'Tiếp tục ván này', onConfirm, onCancel }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const prior = document.activeElement
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { dialog?.close(); if (prior?.isConnected) prior.focus() }
  }, [open])
  if (!open) return null
  return <dialog ref={ref} className="play-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2>{title}</h2><div>{children || <p>Ván hiện tại và lịch sử nước đi sẽ được thay thế.</p>}</div>
    <div className="play-dialog-actions"><button autoFocus onClick={onCancel}>{cancelLabel}</button><button className="play-danger" onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>
}
