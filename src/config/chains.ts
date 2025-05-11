// src/config/chains.ts

import { Network } from 'ethers'
import type { ChainConfig } from './types'

// トークンの型定義
export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  logo?: string;
}

// EVMベースのチェーンで使用するトークンの型定義
export type EvmToken = Token;

// Ethereum Mainnet tokens
const ethereumTokens: Token[] = [
  {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    logo: '/tokens/btc.png'
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ethereum',
    logo: '/tokens/eth.png'
  }
]

// BNB Chain tokens
const bnbTokens: Token[] = [
  {
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    symbol: 'WBNB',
    decimals: 18,
    name: 'Wrapped BNB',
    logo: '/tokens/bnb.png'
  },
  {
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
    symbol: 'BTCB',
    decimals: 18,
    name: 'Bitcoin BEP20',
    logo: '/tokens/btc.png'
  }
]

// Polygon tokens
const polygonTokens: Token[] = [
  {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    symbol: 'WMATIC',
    decimals: 18,
    name: 'Wrapped MATIC',
    logo: '/tokens/matic.png'
  },
  {
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    logo: '/tokens/btc.png'
  }
]

export const CHAINS: Record<string, ChainConfig> = {
  'ethereum': {
    id: 'ethereum',
    name: 'Ethereum',
    kind: 'evm',
    rpc: process.env.NEXT_PUBLIC_ETHEREUM_RPC || 'https://eth-mainnet.g.alchemy.com/v2/aorqQElXhdEfemkvYJkVZtbdM5o1nL4_',
    path: 'm/44\'/60\'/0\'/0',
    chainId: 1,
    tokens: ethereumTokens,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  'bnb': {
    id: 'bnb',
    name: 'BNB',
    kind: 'evm',
    rpc: process.env.NEXT_PUBLIC_BNB_RPC || 'https://bnb-mainnet.g.alchemy.com/v2/aorqQElXhdEfemkvYJkVZtbdM5o1nL4_',
    path: 'm/44\'/60\'/0\'/0',
    chainId: 56,
    tokens: bnbTokens,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },
  'polygon': {
    id: 'polygon',
    name: 'Polygon',
    kind: 'evm',
    rpc: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-mainnet.g.alchemy.com/v2/aorqQElXhdEfemkvYJkVZtbdM5o1nL4_',
    path: 'm/44\'/60\'/0\'/0',
    chainId: 137,
    tokens: polygonTokens,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  'bitcoin': {
    id: 'bitcoin',
    name: 'Bitcoin',
    kind: 'bitcoin',
    rpc: process.env.NEXT_PUBLIC_BITCOIN_RPC || 'https://blockstream.info/api',
    path: 'm/44\'/0\'/0\'/0',
    chainId: 0,
    tokens: [], // Bitcoin doesn't use ERC20 tokens
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8
    }
  },
  'solana': {
    id: 'solana',
    name: 'Solana',
    kind: 'solana',
    rpc: process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://solana-mainnet.g.alchemy.com/v2/aorqQElXhdEfemkvYJkVZtbdM5o1nL4_',
    path: 'm/44\'/501\'/0\'/0',
    chainId: 0,
    tokens: [], // Solana uses SPL tokens, not ERC20
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9
    }
  },
  'cardano': {
    id: 'cardano',
    name: 'Cardano',
    kind: 'cardano',
    rpc: process.env.NEXT_PUBLIC_CARDANO_RPC || 'https://cardano-mainnet.blockfrost.io/api/v0',
    path: 'm/1852\'/1815\'/0\'/0',
    chainId: 0,
    tokens: [], // Cardano uses native tokens, not ERC20
    nativeCurrency: {
      name: 'Cardano',
      symbol: 'ADA',
      decimals: 6
    }
  }
}

export const DEFAULT_CHAIN = CHAINS.ethereum;

// ヘルパー関数
export function getChainConfigById(id: string): ChainConfig | undefined {
  return CHAINS[id]
}

export function getAllChains(): ChainConfig[] {
  // チェーンの順序を固定
  const chainOrder = ['ethereum', 'bnb', 'polygon', 'bitcoin', 'solana', 'cardano']
  return chainOrder.map(id => CHAINS[id]).filter(Boolean)
}

export function hasChain(id: string): boolean {
  return id in CHAINS
}

// ChainConfig型をエクスポート
export type { ChainConfig } from './types'
