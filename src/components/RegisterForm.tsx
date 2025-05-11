// src/components/RegisterForm.tsx
import { useState, useEffect } from 'react';
import SlideToConfirmModal from './SlideToConfirmModal';
import SendReceiveModal from './SendReceiveModal';
import TxResultToast from './TxResultToast';
import type { WalletInfo } from '../utils/generateWallets';
import { calcFP } from '../utils/fingerprint';
import {
  fetchAssets,
  fetchPortfolioByAsset,
  Asset,
} from '../utils/getBalances';
import { getFingerprints, addFingerprint } from '../utils/firebase';
import styles from './RegisterForm.module.css';
import Link from 'next/link'; // Linkは現在使用されていませんが、将来のために残しておきます
import { FaBitcoin, FaEthereum } from 'react-icons/fa';
import { SiBinance, SiPolygon, SiSolana, SiCardano } from 'react-icons/si';
import { TbWorld } from 'react-icons/tb'; // Worldcoin (WLD) のアイコンとして使用
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faPaperPlane, faQrcode, faSync } from '@fortawesome/free-solid-svg-icons'; // faSync を追加
import QrModal from './QrModal';

/** トークンシンボル→アイコン */
const TokenIcon = ({ symbol }: { symbol: string }) => {
  switch (symbol.toUpperCase()) { // 大文字・小文字を区別しないように
    case 'BTC': return <FaBitcoin />;
    case 'ETH': return <FaEthereum />;
    case 'BNB': return <SiBinance />;
    case 'MATIC': return <SiPolygon />;
    case 'SOL': return <SiSolana />;
    case 'WLD': return <TbWorld />; // Worldcoin アイコン
    case 'ADA': return <SiCardano />;
    default: return null;
  }
};

// シンボル→chain.id マッピング
const SYM2CHAIN: Record<string,string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'bnb',
  MATIC: 'polygon',
  SOL: 'solana',
  ADA: 'cardano',
};

export default function RegisterForm() {
  // ── フォーム state ──
  const [birth, setBirth] = useState(''); // YYYY-MM-DD
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [gender, setGender] = useState<'male'|'female'|'LGBTQ'|''>('');
  const [pin, setPin] = useState('');
  const [country, setCountry] = useState('');
  const [pref, setPref] = useState('');
  const [color, setColor] = useState<'white'|'black'|'grey'|'fulcolor'|''>('');

  // ── ウォレット＋資産 ──
  const [wallets, setWallets] = useState<WalletInfo[]|null>(null);
  const [assetsMap, setAssetsMap] = useState<Record<string,Asset[]>>({}); // 将来的に詳細表示に使う可能性を考慮
  const [portfolio, setPortfolio] = useState<
    Record<string,{ total:string; breakdown: Record<string,string> }>
  >({});

  // ── エラー / 確認モーダル ──
  const [error, setError] = useState<string|null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalPassphrase, setModalPassphrase] = useState('');

  // ── 送金モーダル & トースト & QRモーダル ──
  const [txModal, setTxModal] = useState<{
    symbol: string;
    wallet: WalletInfo;
  }|null>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [qrAddr, setQrAddr] = useState<{ address: string, privateKey?: string, chainName: string } | null>(null);

  /** 登録フォーム送信 */
  const onSubmit = async () => {
    if (!birth||!first||!last||!country||!pref||!gender||!color) {
      setError('Please enter all fields');
      return;
    }
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }
    setError(null);
    const passphrase = [birth, first, last, gender, pin, country, pref, color].join('|');

    // fingerprint 計算
    let fpNow: string;
    try {
      fpNow = await calcFP(passphrase);
    } catch {
      setError('Fingerprint calculation failed.');
      return;
    }

    const fpPrev = await getFingerprints();
    if (fpPrev && !fpPrev.includes(fpNow)) {
      // 入力ミスマッチ → 確認モーダル
      setModalPassphrase(passphrase);
      setShowConfirmModal(true);
      return;
    }
    if (!fpPrev) {
      // 初回登録時はフィンガープリントを追加
      try {
        await addFingerprint(fpNow);
      } catch (e: any) {
        setError('Failed to save fingerprint: ' + e.message);
        return;
      }
    }

    // ウォレット生成
    try {
      const { generateWallets } = await import('../utils/generateWallets');
      const ret = await generateWallets(passphrase);
      setWallets(ret);
    } catch (e: any) {
      setError('Wallet generation error: ' + e.message);
    }
  };

  /** 確認モーダル「はい」 */
  const handleConfirm = async () => {
    setShowConfirmModal(false);
    try {
      // 新しいフィンガープリントを保存
      const { generateWallets } = await import('../utils/generateWallets');
      const newFp = await calcFP(modalPassphrase);
      await addFingerprint(newFp);
      // ウォレット生成
      const ret = await generateWallets(modalPassphrase);
      setWallets(ret);
    } catch (e: any) {
      setError('Wallet generation error (after confirm): ' + e.message);
    }
  };

  /** 資産取得ロジックを関数化 */
  const refreshAll = async () => {
    if (!wallets) return;
    console.log('Refreshing assets...');
    try {
      const m: Record<string, Asset[]> = {};
      for (const w of wallets) {
        m[w.chain.name] = await fetchAssets(w.chain, w.address);
      }
      setAssetsMap(m); // 詳細なアセット情報を保持 (今回は直接使わないが表示用に保持)
      setPortfolio(await fetchPortfolioByAsset(wallets));
      console.log('Assets refreshed.');
    } catch (e: any) {
      console.error('Error refreshing assets:', e);
      setError('Failed to refresh assets: ' + e.message);
    }
  };

  /** 生成後：一度だけ即時フェッチ & 5秒ごとに自動更新 */
  useEffect(() => {
    if (!wallets || wallets.length === 0) return;

    refreshAll(); // 初回フェッチ
    const intervalId = setInterval(refreshAll, 15000); // 更新間隔を15秒に調整

    return () => clearInterval(intervalId); // クリーンアップ関数
  }, [wallets]); // walletsが変更された時のみ再実行

  // ── フォームビュー ──
  const formView = (
    <form className={styles.wrapper} onSubmit={e=>{ e.preventDefault(); onSubmit() }}>
      <header className={styles.header}>
        <h1 className={styles.logo}>MVW</h1>
        <p className={styles.caption}>MULTI&nbsp;VIEW&nbsp;WALLET</p>
        <p className={styles.sub}>Registration&nbsp;&amp;&nbsp;Restore</p>
      </header>
      <div className={styles.form}>
        <label>First name or something key
          <input value={first}
                 onChange={e=>setFirst(e.target.value.toUpperCase())}
                 className={styles.input}/>
        </label>
        <label>Last name or something key
          <input value={last}
                 onChange={e=>setLast(e.target.value.toUpperCase())}
                 className={styles.input}/>
        </label>
        <label>Birthday or something Set
          <input type="date"
                 value={birth}
                 onChange={e=>setBirth(e.target.value)}
                 className={styles.input}/>
        </label>
        <label>Country of Birth or something key
          <input value={country}
                 onChange={e=>setCountry(e.target.value.toUpperCase())}
                 className={styles.input}/>
        </label>
        <label>Prefecture of Birth or something key
          <input value={pref}
                 onChange={e=>setPref(e.target.value.toUpperCase())}
                 className={styles.input}/>
        </label>
        <div className={styles.genderRow}>
          <span>Gender</span>
          {(['male','female','LGBTQ'] as const).map(g=>(
            <button key={g} type="button"
              className={`${styles.genderBtn} ${gender===g?styles.active:''}`}
              onClick={()=>setGender(g)}
            >
              {g==='LGBTQ'?'LGBTQ+':g==='male'?'Male':'Female'}
            </button>
          ))}
        </div>
        <div className={styles.genderRow}>
          <span>Your Tone</span>
          {(['white','black','grey','fulcolor'] as const).map(c=>(
            <button key={c} type="button"
              className={`${styles.genderBtn} ${color===c?styles.active:''}`}
              onClick={()=>setColor(c)}
            >
              {c==='fulcolor'?'Full Color':c.charAt(0).toUpperCase()+c.slice(1)}
            </button>
          ))}
        </div>
        <label>4-digit PIN
          <input type="password" maxLength={4}
                 value={pin}
                 onChange={e=>setPin(e.target.value.replace(/\D/g,''))}
                 className={styles.input}/>
        </label>
        <button type="submit" className={styles.accessBtn}>Access</button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <Link className={styles.backLink} href="/">⬅︎ Back</Link>
      <footer className={styles.copy}>©︎ 2025 Pattaravadee</footer>
    </form>
  );

  // ── ウォレット一覧ビュー ──
  const walletView = wallets && wallets.length > 0 && (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.logo}>MVW</h1>
        <p className={styles.caption}>MULTI&nbsp;VIEW&nbsp;WALLET</p>
      </header>
      <div className={styles.afterWrap}>
        <aside className={styles.side}>
          <h3 className={styles.sideTitle}>Chain Address</h3>
          <ul className={styles.addrList}>
            {wallets.map(w=>(
              <li key={w.chain.id}>
                <span className={styles.chainName}>{w.chain.name}</span>
                <span className={styles.addr}>{w.address.slice(0,12)}…</span>
                <button className={styles.copyBtn}
                  onClick={()=>navigator.clipboard.writeText(w.address)}>
                  <FontAwesomeIcon icon={faCopy}/>
                </button>
                <button className={styles.copyBtn}
                  onClick={()=>setQrAddr({ address: w.address, privateKey: w.privKey, chainName: w.chain.name })}>
                  <FontAwesomeIcon icon={faQrcode} />
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className={styles.assets}>
          <div className={styles.assetsHeader}>
            <h3 className={styles.assetsTitle}>Assets</h3>
            <button
              className={styles.refreshBtn}
              onClick={refreshAll}
            >↻ Refresh</button>
          </div>

          {['BTC','ETH','BNB','MATIC','SOL','ADA'].map(symbol => {
            const info = portfolio[symbol] || { total:'0.00000', breakdown:{} }
            // 小数点第5位までに整形
            const total = isNaN(Number(info.total))
              ? '0.00000'
              : parseFloat(info.total).toFixed(5)
            // チェーンごとの内訳をパーセンテージで表示
            const breakdownText = wallets.map(w => {
              const val = parseFloat(info.breakdown[w.chain.name] ?? '0')
              const totalNum = parseFloat(info.total)
              const percent = totalNum > 0 ? ((val / totalNum) * 100).toFixed(2) : '0.00'
              return `${w.chain.name}: ${percent}%`
            }).join('  |  ')
            // 送金ボタン用ウォレット取得
            const target = wallets.find(w => w.chain.id === SYM2CHAIN[symbol])

            return (
              <div key={symbol} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.icon}>
                    <TokenIcon symbol={symbol}/>
                  </span>
                  <span className={styles.token}>{symbol}</span>
                  <span className={styles.total}>{total}</span>
                  {target && (
                    <button
                      className={styles.sendBtn}
                      onClick={() => setTxModal({ symbol, wallet: target })}
                    >
                      <FontAwesomeIcon icon={faPaperPlane}/>
                    </button>
                  )}
                </div>
                <p className={styles.chainLabel}>Chain</p>
                <p className={styles.breakdown}>{breakdownText}</p>
              </div>
            )
          })}

          <button
            className={styles.backBtn}
            onClick={() => {
              setWallets(null)
              setAssetsMap({})
              setPortfolio({})
              setError(null)
            }}
          >
            Shut down Wallet
          </button>
        </section>
      </div>
    </div>
  );

  return (
    <>
      {wallets && wallets.length > 0 ? walletView : formView}
      {/* 確認モーダル */}
      {showConfirmModal && (
        <SlideToConfirmModal
          message="The information you entered does not match our records. Do you want to create a new wallet with this information?"
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* 送金モーダル */}
      {txModal && (
        <SendReceiveModal
          fromPriv={txModal.wallet.privKey!} // privKeyが存在する前提
          chain={txModal.wallet.chain}
          symbol={txModal.symbol}
          defaultTo="" // デフォルトの宛先は空欄
          address={txModal.wallet.address}
          onClose={() => setTxModal(null)}
          onTxResult={async (hash) => {
            setTxModal(null); // モーダルを閉じる
            setToast(`Transaction submitted: ${hash}`);
            await refreshAll(); // 送金後に残高を更新
          }}
        />
      )}

      {/* トースト */}
      {toast && (
        <TxResultToast msg={toast} onDone={() => setToast(null)} />
      )}

      {/* QRモーダル */}
      {qrAddr && (
        <QrModal
          address={qrAddr.address}
          privateKey={qrAddr.privateKey}
          onClose={() => setQrAddr(null)}
          chainName={qrAddr.chainName}
        />
      )}
    </>
  );
}
