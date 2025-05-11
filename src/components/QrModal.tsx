import { useEffect, useState } from 'react'
import styles from './QrModal.module.css'
import QRCode from 'qrcode'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet, faKey } from '@fortawesome/free-solid-svg-icons'

interface Props {
  address: string
  privateKey?: string
  onClose: () => void
  chainName: string
}

export default function QrModal({ address, privateKey, onClose, chainName }: Props) {
  const [activeTab, setActiveTab] = useState<'address' | 'privateKey'>('address')
  const displayValue = activeTab === 'address' ? address : privateKey

  // Canvas に QR を描画
  useEffect(() => {
    if (!displayValue) return
    const canvas = document.getElementById('qr') as HTMLCanvasElement
    QRCode.toCanvas(canvas, displayValue, { width: 240 })
  }, [displayValue])

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>{chainName}</h3>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'address' ? styles.active : ''}`}
            onClick={() => setActiveTab('address')}
          >
            <FontAwesomeIcon icon={faWallet} />
            <span>Wallet Address</span>
          </button>
          {privateKey && (
            <button 
              className={`${styles.tab} ${activeTab === 'privateKey' ? styles.active : ''}`}
              onClick={() => setActiveTab('privateKey')}
            >
              <FontAwesomeIcon icon={faKey} />
              <span>Private Key</span>
            </button>
          )}
        </div>

        <canvas id="qr" className={styles.canvas}/>
        <p className={styles.addr}>{displayValue}</p>
        <button className={styles.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
