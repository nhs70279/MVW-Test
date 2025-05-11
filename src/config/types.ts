// トークンの型定義
export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logo?: string;
}

// チェーンの型定義
export interface ChainConfig {
  id: string;
  name: string;
  kind: 'evm' | 'bitcoin' | 'solana' | 'cardano';
  rpc: string;
  path: string;
  chainId: number;
  tokens?: Token[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  // AA/WorldChain用追加
  entryPointAddress?: string;
  factoryAddress?: string;
  paymasterPolicyId?: string;
  apiKey?: string;
  paymasterAddress?: string;
} 