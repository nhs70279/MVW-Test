// src/components/SlideToConfirmModal.tsx
import { useRef, useState } from 'react'
import styles from './SlideToConfirmModal.module.css'

type Props = {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function SlideToConfirmModal({ message, onConfirm, onCancel }: Props) {
  const sliderRef = useRef<HTMLInputElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(0)

  const handleInput = () => {
    if (!sliderRef.current || !handleRef.current) return

    const slider = sliderRef.current
    const handle = handleRef.current

    const trackWidth = slider.offsetWidth
    const handleWidth = handle.offsetWidth

    // 0〜100 の範囲でスライダー値を取得
    const percent = Number(slider.value) / Number(slider.max)

    // クランプ後の x 座標を計算
    const maxX = trackWidth - handleWidth
    const x = Math.min(Math.max(percent * trackWidth, 0), maxX)

    handle.style.left = `${x}px`
    setValue(percent * 100)
  }

  const handleMouseUp = () => {
    // 完了判定：100% になったら確定を呼ぶ
    if (value >= 100) {
      onConfirm()
    } else {
      // 未完了なら戻す
      if (handleRef.current) {
        handleRef.current.style.left = '0px'
      }
      if (sliderRef.current) {
        sliderRef.current.value = '0'
      }
      setValue(0)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <p className={styles.title}>{message}</p>
        <div className={styles.sliderWrapper}>
          <input
            ref={sliderRef}
            type="range"
            min="0"
            max="100"
            defaultValue="0"
            className={styles.slider}
            onInput={handleInput}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
          />
          <div className={styles.caption}>Slide to confirm</div>
          <div ref={handleRef} className={styles.handle}>
            ▶
          </div>
        </div>
        
        <button className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
