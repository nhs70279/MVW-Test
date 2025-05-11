// src/utils/generateWallets.ts
import { BIP32Factory } from 'bip32'
import { CHAINS, ChainConfig, getAllChains } from '../config/chains'
import { Wallet, JsonRpcProvider, Contract } from 'ethers'
import { payments } from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import { Keypair } from '@solana/web3.js'
import { seedFromPassphrase } from './seed'
import { Buffer } from 'buffer'
import {
  Bip32PrivateKey,
  BaseAddress,
  StakeCredential,
  NetworkInfo,
} from '@emurgo/cardano-serialization-lib-browser'

const ECPair = ECPairFactory(ecc)
const bip32 = BIP32Factory(ecc)
// 32ビット整数の範囲内で正しく動作するように修正
const HARDENED = (n: number) => (n | 0x80000000) >>> 0

// パス文字列を数値の配列に変換する関数
function parsePath(path: string): number[] {
  return path
    .split('/')
    .slice(1) // 'm' を除外
    .map(segment => {
      const hardened = segment.endsWith("'")
      const index = parseInt(segment.replace("'", ''))
      return hardened ? HARDENED(index) : index
    })
}

export type WalletInfo = {
  chain: ChainConfig
  address: string
  privKey?: string
}

// ─── Safe4337 Factory 定数 & ABI ───
const SAFE_FACTORY = '0x75cf11467937ce3f2f357ce24ffc3dbf8fd5c226'
const SAFE_ABI = [
  'function getAddress(address owner,uint256 salt) view returns (address)'
] as const

/**
 * WorldChain の SafeL2 アドレスを取得。
 * Factory が自身のアドレスを返してきたら EOA を返す。
 */
async function ensureSafeL2(
  ownerEOA: string,
  provider: JsonRpcProvider,
  salt: bigint = BigInt(0)
): Promise<string> {
  try {
    const factory = new Contract(SAFE_FACTORY, SAFE_ABI, provider)
    const raw: string = await (factory as any).getAddress(ownerEOA, salt)
    const addr = raw.toLowerCase()
    // Factory 自身を返す異常ケースは EOA にフォールバック
    if (addr === SAFE_FACTORY.toLowerCase()) {
      return ownerEOA
    }
    return addr
  } catch (e) {
    console.error('ensureSafeL2 error', e)
    // コール失敗時も安全のため EOA を返す
    return ownerEOA
  }
}

export async function generateWallets(
  passphrase: string
): Promise<WalletInfo[]> {
  console.log('Starting wallet generation...')
  const seed = Buffer.from(await seedFromPassphrase(passphrase))
  const master = bip32.fromSeed(seed)
  const tasks: Array<Promise<WalletInfo>> = []

  // getAllChains()を使用してチェーンの一覧を取得
  const chains = getAllChains()
  console.log('Available chains:', chains.map(c => c.name))

  for (const cfg of chains) {
    console.log(`Processing chain: ${cfg.name} (${cfg.kind})`)
    try {
      const pathNumbers = parsePath(cfg.path)
      const node = pathNumbers.reduce((node, index) => node.derive(index), master)
      console.log(`Derived path: ${cfg.path}`)

      if (cfg.kind === 'evm') {
        console.log(`Generating EVM wallet for ${cfg.name}`)
        // 秘密鍵を直接生成
        const privateKeyBuffer = node.privateKey!
        console.log('Private key buffer length:', privateKeyBuffer.length)
        
        // 各バイトを16進数に変換して結合
        const privateKeyHex = Buffer.from(privateKeyBuffer)
          .toString('hex')
        
        console.log('Generated private key:', privateKeyHex)
        console.log('Private key length:', privateKeyHex.length)
        
        // 秘密鍵の長さを確認
        if (privateKeyHex.length !== 64) {
          console.warn(`Invalid private key length: ${privateKeyHex.length}, expected 64`)
          continue
        }

        // 秘密鍵の形式を確認
        if (!/^[0-9a-f]{64}$/.test(privateKeyHex)) {
          console.warn('Invalid private key format')
          continue
        }

        // プロバイダーの作成
        let provider: JsonRpcProvider
        try {
          console.log(`Creating provider for ${cfg.name} with RPC: ${cfg.rpc}`)
          provider = new JsonRpcProvider(cfg.rpc, cfg.chainId)
        } catch (e) {
          console.error(`Failed to create provider for ${cfg.name}:`, e)
          continue
        }

        // ウォレットの作成
        let eoaWallet: Wallet
        try {
          console.log(`Creating wallet for ${cfg.name}`)
          eoaWallet = new Wallet('0x' + privateKeyHex, provider)
          console.log(`Generated address for ${cfg.name}: ${eoaWallet.address}`)
        } catch (e) {
          console.error(`Failed to create wallet for ${cfg.name}:`, e)
          continue
        }

        tasks.push(Promise.resolve({
          chain: cfg,
          address: eoaWallet.address,
          privKey: privateKeyHex, // 0xプレフィックスなしの64文字の16進数文字列
        }))
        console.log(`Successfully added ${cfg.name} wallet to tasks`)
      } else if (cfg.kind === 'bitcoin') {
        // Bitcoin (P2PKH)
        const privateKeyBuffer = Buffer.from(node.privateKey!)
        const keyPair = ECPair.fromPrivateKey(privateKeyBuffer)
        const { address } = payments.p2pkh({ pubkey: Buffer.from(keyPair.publicKey) })
        tasks.push(Promise.resolve({
          chain: cfg,
          address: address!,
          privKey: keyPair.privateKey!.toString('hex'),
        }))
      } else if (cfg.kind === 'solana') {
        // Solana
        const kp = Keypair.fromSeed(node.privateKey!.slice(0, 32))
        const bs58 = require('bs58');
        tasks.push(Promise.resolve({
          chain: cfg,
          address: kp.publicKey.toBase58(),
          privKey: bs58.encode(kp.secretKey), // Base58形式で出力
        }))
      } else if (cfg.kind === 'cardano') {
        // Cardano
        const rootKey = Bip32PrivateKey.from_bip39_entropy(Buffer.from(seed), new Uint8Array())
        const accKey = rootKey.derive(HARDENED(1852)).derive(HARDENED(1815)).derive(HARDENED(0))
        const utxoPrv = accKey.derive(0).derive(0)
        const stakePrv = accKey.derive(2).derive(0)
        const baseAddr = BaseAddress.new(
          NetworkInfo.mainnet().network_id(),
          StakeCredential.from_keyhash(utxoPrv.to_public().to_raw_key().hash()),
          StakeCredential.from_keyhash(stakePrv.to_public().to_raw_key().hash())
        )
        const address = baseAddr.to_address().to_bech32()
        const privHex = Buffer.from(utxoPrv.to_raw_key().as_bytes()).toString('hex')
        tasks.push(Promise.resolve({
          chain: cfg,
          address,
          privKey: privHex,
        }))
      }
    } catch (e) {
      console.error(`Error generating wallet for chain ${cfg.name}:`, e)
      continue
    }
  }

  console.log('All tasks created, waiting for completion...')
  const results = await Promise.all(tasks)
  console.log('Wallet generation completed. Generated wallets:', results.map(w => w.chain.name))
  return results
}
