// src/components/SlideToConfirmModal.tsx
import { useRef, useState } from 'react'
import styles from './SlideToConfirmModal.module.css'

type Props = {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function SlideToConfirmModal({ message, onConfirm, onCancel }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText.trim().toLowerCase() === 'confirm';

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <p className={styles.title}>{message}</p>
        <input
          className={styles.input}
          type="text"
          placeholder="Confirm"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          autoFocus
        />
        <button
          className={styles.createBtn}
          onClick={onConfirm}
          disabled={!isConfirmed}
        >
          create
        </button>
        <button className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
