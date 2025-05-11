import styles from './TxResultToast.module.css'

export type Props = {
  msg: string
  onDone: () => void
}

export default function TxResultToast({ msg, onDone }: Props) {
  return (
    <div className={styles.toast} onClick={onDone}>
      {msg}
    </div>
  )
}
