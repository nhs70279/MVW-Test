import React, { useState, useEffect } from 'react'
import styles from './SendReceiveModal.module.css'
import { fetchAssets } from '../utils/getBalances'
import { ChainConfig } from '@/config/chains'
import { PublicKey as SolPubKey } from '@solana/web3.js'

interface Props {
  fromPriv: string
  chain:    ChainConfig
  symbol:   string
  defaultTo:string
  address:  string
  onClose:  () => void
  onTxResult:(hash: string) => void
}

interface FeeEstimationResult {
  fee: string;
  details?: {
    gasLimit?: number;
    gasPrice?: number;
    computeUnits?: number;
    minUtxo?: number;
    feeRate?: number;
    size?: number;
  };
}

export default function SendReceiveModal({
  fromPriv,
  chain,
  symbol,
  defaultTo,
  address,
  onClose,
  onTxResult
}: Props) {
  const [to, setTo] = useState(defaultTo)
  const [amt, setAmt] = useState('')
  const [fee, setFee] = useState('0')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string|null>(null)
  const [balance, setBalance] = useState<string>('0')
  const [feeDetails, setFeeDetails] = useState<FeeEstimationResult['details']>(undefined)
  const [fromAddr, setFromAddr] = useState<string>(address)

  // 入力が変わるたびに手数料を見積もる
  useEffect(() => {
    // Solanaアドレスのバリデーション関数
    function isValidSolanaAddress(address: string): boolean {
      try {
        new SolPubKey(address)
        return true
      } catch {
        return false
      }
    }

    if (!amt) {
      setFee('0')
      setFeeDetails(undefined)
      setErr(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { sendTx, estimateFee } = await import('../utils/sendTx')
        const dummySolAddress = '11111111111111111111111111111111';
        const toForFee = (chain.kind === 'solana' && !to)
          ? dummySolAddress
          : to;
        const result = await estimateFee({
          chain,
          from: fromAddr,
          to: toForFee,
          amount: amt,
          symbol
        })
        if (!cancelled) {
          setFee(result.fee)
          setFeeDetails(result.details)
          // アドレスが無効な場合のみエラー表示
          if (chain.kind === 'solana' && to && !isValidSolanaAddress(to)) {
            setErr('宛先アドレスが無効です')
          } else {
            setErr(null)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setFee('0')
          setFeeDetails(undefined)
          if (error instanceof Error && error.message.includes('insufficient funds')) {
            setErr('残高が足りません')
          } else {
            setErr('Fee estimation failed')
          }
        }
      }
    })()
    return () => { cancelled = true }
  }, [chain, fromAddr, to, amt, symbol])

  // fromAddrはpropsのaddressをそのまま使う
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setFromAddr(address)
        const assets = await fetchAssets(chain, address)
        // 送金対象のsymbolまたはnativeCurrency.symbolに一致する残高を取得
        const asset = assets.find(a => a.symbol === symbol || a.symbol === chain.nativeCurrency.symbol)
        if (!cancelled && asset) setBalance(asset.balance)
      } catch {
        if (!cancelled) setBalance('0')
      }
    })()
    return () => { cancelled = true }
  }, [address, chain, symbol])

  // 受取額 = 入力額 − ネットワーク手数料
  const a = parseFloat(amt || '0')
  const f = parseFloat(fee || '0')
  const canSend = a > 0 && parseFloat(balance) >= (a + f) && !loading
  const finalAmt = a > f ? (a - f).toFixed(chain.nativeCurrency?.decimals ?? 18) : '0'

  // 最大送金可能額 = 残高 - fee
  const maxSendable = (() => {
    const b = parseFloat(balance || '0')
    const f = parseFloat(fee || '0')
    return b > f ? (b - f).toFixed(chain.nativeCurrency?.decimals ?? 18) : '0'
  })()

  const onSend = async () => {
    setLoading(true)
    setErr(null)
    try {
      const { sendTx } = await import('../utils/sendTx')
      const hash = await sendTx({
        chain,
        from: address,
        to,
        amount: finalAmt,
        symbol,
        privKey: fromPriv
      })
      onTxResult(`${symbol} Tx sent! hash: ${hash}`)
      onClose()
    } catch (e: any) {
      setErr(e.message || 'Tx failed')
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h3>Send {symbol}</h3>

        <div className={styles.row}>
          <label className={styles.label}>To</label>
          <input
            className={styles.input}
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>

        <div className={styles.row}>
          <label className={styles.label}>Amount</label>
          <input
            className={styles.input}
            value={amt}
            onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
          />
        </div>

        <p className={styles.fee}>
          Network fee:&nbsp;<b>{fee ? `${fee} ${symbol}` : '—'}</b>
        </p>

        <p style={{ fontSize: '.85rem', color: '#666', margin: '0 0 4px' }}>
          {chain.nativeCurrency.symbol}残高: <b>{balance} {chain.nativeCurrency.symbol}</b>
        </p>

        {amt && parseFloat(balance) < (parseFloat(amt) + parseFloat(fee)) && (
          <p className={styles.err}>
            {chain.nativeCurrency.symbol}が足りません。送金額とガス代を合わせて<b>{(parseFloat(amt) + parseFloat(fee)).toFixed(6)} {chain.nativeCurrency.symbol}</b>必要です。
          </p>
        )}

        {feeDetails && (
          <div className={styles.feeDetails}>
            {chain.kind === 'evm' && (
              <>
                <p>Gas Limit: {feeDetails.gasLimit}</p>
                <p>Gas Price: {feeDetails.gasPrice} gwei</p>
              </>
            )}
            {chain.kind === 'solana' && (
              <p>Compute Units: {feeDetails.computeUnits}</p>
            )}
            {chain.kind === 'cardano' && (
              <p>Min UTXO: {feeDetails.minUtxo} ADA</p>
            )}
            {chain.kind === 'bitcoin' && (
              <>
                <p>Fee Rate: {feeDetails.feeRate} sat/byte</p>
                <p>Size: {feeDetails.size} bytes</p>
              </>
            )}
          </div>
        )}

        <p className={styles.final}>
          Recipient gets:&nbsp;<b>{canSend ? parseFloat(finalAmt).toFixed(6) : '—'} {symbol}</b>
        </p>

        {/* エラー表示（残高不足以外のみ） */}
        {err && !err.includes('足りません') && <p className={styles.err}>{err}</p>}

        <div className={styles.btnRow}>
          <button
            className={styles.sendBtn}
            onClick={onSend}
            disabled={!canSend || !fee}
          >
            {loading ? 'Sending…' : 'Send'}
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
} 