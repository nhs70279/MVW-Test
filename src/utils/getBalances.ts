// src/utils/getBalances.ts
import { JsonRpcProvider, Contract, Network, isAddress } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import type { WalletInfo } from './generateWallets';
import type { ChainConfig } from '../config/chains';
import { getAda } from './cardanoCache';

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

export interface Asset {
  chain: ChainConfig;
  balance: string;
  symbol: string;
}

// アドレス検証関数
function validateAddress(address: string, chain: ChainConfig): boolean {
  if (chain.kind === 'evm') {
    return isAddress(address);
  }
  if (chain.kind === 'solana') {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
  if (chain.kind === 'bitcoin') {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  }
  if (chain.kind === 'cardano') {
    return /^addr1[a-z0-9]{98}$/.test(address);
  }
  return false;
}

// ERC20トークンのバランス取得
async function getERC20Balance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  walletAddress: string,
  decimals: number
): Promise<string> {
  try {
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
    
    // コントラクトの存在確認
    const code = await provider.getCode(tokenAddress);
    if (code === '0x') {
      console.warn(`No contract found at address ${tokenAddress}`);
      return '0';
    }

    // バランス取得
    const balanceBigInt: bigint = await tokenContract.balanceOf(walletAddress);
    return new Decimal(balanceBigInt.toString())
      .dividedBy(Decimal.pow(10, decimals))
      .toFixed(decimals);
  } catch (e) {
    console.error(`Error fetching ERC20 balance for ${tokenAddress}:`, e);
    return '0';
  }
}

export async function fetchAssets(
  chain: ChainConfig,
  address: string
): Promise<Asset[]> {
  const out: Asset[] = [];

  if (!validateAddress(address, chain)) {
    console.warn(`Invalid address for chain ${chain.name}: ${address}`);
    return [];
  }

  if (chain.kind === 'evm') {
    if (!chain.chainId) {
      console.warn(`Chain ID missing for EVM chain ${chain.name}`);
      return [];
    }

    console.log(`Fetching balance for ${chain.name} (${chain.chainId}) at address: ${address}`);
    console.log(`Using RPC: ${chain.rpc}`);

    // ── staticNetwork オプションでチェーンIDを固定 ──
    const provider = new JsonRpcProvider(
      chain.rpc,
      undefined,
      { staticNetwork: Network.from(chain.chainId) }
    );

    // ネイティブ残高（ETH or WLD）の取得 → ETHのみ
    const nativeBalance = await provider.getBalance(address);
    const nativeBalanceFormatted = new Decimal(nativeBalance.toString())
      .dividedBy(Decimal.pow(10, 18))
      .toFixed(18);
    
    out.push({
      chain,
      balance: nativeBalanceFormatted,
      symbol: 'ETH',
    });

    // ERC-20トークンの残高取得
    if (chain.tokens && chain.tokens.length) {
      for (const tokenCfg of chain.tokens) {
        if (!validateAddress(tokenCfg.address, chain)) {
          console.warn(
            `Invalid ERC20 token address for ${tokenCfg.symbol} on ${chain.name}: ${tokenCfg.address}`
          );
          continue;
        }

        const balance = await getERC20Balance(
          provider,
          tokenCfg.address,
          address,
          tokenCfg.decimals
        );

        // balanceが0でも必ずpush
        out.push({
          chain,
          balance,
          symbol: tokenCfg.symbol,
        });
      }
    }
    return out;
  }

  if (chain.kind === 'bitcoin') {
    try {
      // Use Next.js API route as a proxy to avoid CORS
      const res = await fetch(`/api/btc-balance?address=${address}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.statusText} – ${txt}`);
      }
      const data = await res.json() as any;
      const sats = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) || 0;
      const amount = new Decimal(sats).dividedBy(1e8).toFixed(8);
      return [{ chain, balance: amount, symbol: 'BTC' }];
    } catch (e) {
      console.error(`Error fetching Bitcoin balance for ${address}:`, e);
      return [{ chain, balance: '0', symbol: 'BTC' }];
    }
  }

  if (chain.kind === 'solana') {
    try {
      const conn = new Connection(chain.rpc, 'confirmed');
      const lamports = await conn.getBalance(new PublicKey(address));
      const amount = new Decimal(lamports).dividedBy(1e9).toFixed(9);
      return [{ chain, balance: amount, symbol: 'SOL' }];
    } catch (e) {
      console.error(`Error fetching Solana balance for ${address}:`, e);
      return [{ chain, balance: '0', symbol: 'SOL' }];
    }
  }

  if (chain.kind === 'cardano') {
    try {
      const projectId = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID;
      if (!projectId) throw new Error('BLOCKFROST project ID missing');
      const adaAmount = await getAda(address, projectId);
      return [{ chain, balance: adaAmount, symbol: 'ADA' }];
    } catch (e) {
      console.error(`Error fetching Cardano balance for ${address}:`, e);
      return [{ chain, balance: '0', symbol: 'ADA' }];
    }
  }

  console.warn(`Unsupported chain kind: ${chain.kind} on ${chain.name}`);
  return [];
}

// ---------------------------------------------------------------
// ここから fetchPortfolioByAsset を必ず export
// ---------------------------------------------------------------

export async function fetchPortfolioByAsset(
  wallets: WalletInfo[]
): Promise<Record<string, { total: string; breakdown: Record<string, string> }>> {
  // 中間型：Decimal を使って集計
  type PerChainAssets = {
    chainName: string;
    assets: { symbol: string; amount: InstanceType<typeof Decimal> }[];
  };

  // 各ウォレットごとに fetchAssets を呼び出し
  const perChainPromises = wallets.map(async w => {
    let raw: Asset[] = [];
    try {
      raw = await fetchAssets(w.chain, w.address);
      console.log(`Fetched assets for ${w.chain.name}:`, raw);
    } catch (e) {
      console.error(`Failed assets for ${w.chain.name} (${w.address}):`, e);
    }
    const dAssets = raw.map(a => ({
      symbol: a.symbol,
      amount: new Decimal(a.balance),
    }));
    return { chainName: w.chain.name, assets: dAssets } as PerChainAssets;
  });

  const perChain = await Promise.all(perChainPromises);
  console.log('Per chain assets:', perChain);

  // 全シンボルの集合を作成
  const symbols = Array.from(new Set(perChain.flatMap(c => c.assets.map(a => a.symbol))));
  console.log('All symbols:', symbols);

  // 集計オブジェクト
  const portfolio: Record<string, { total: string; breakdown: Record<string, string> }> = {};

  for (const sym of symbols) {
    let total = new Decimal(0);
    const breakdown: Record<string, string> = {};

    for (const chainData of perChain) {
      const sum = chainData.assets
        .filter(a => a.symbol === sym)
        .reduce((s, a) => s.plus(a.amount), new Decimal(0));
      
      // 0より大きい値は全て表示
      if (sum.greaterThan(0)) {
        // 小数点以下の桁数を適切に設定
        const decimals = sym === 'ETH' ? 18 : 
                        sym === 'BTC' || sym === 'WBTC' ? 8 :
                        sym === 'SOL' ? 9 :
                        sym === 'ADA' ? 6 : 8;
        
        breakdown[chainData.chainName] = sum.toFixed(decimals);
        total = total.plus(sum);
      }
    }

    // 0より大きい値は全て表示
    if (total.greaterThan(0)) {
      // 小数点以下の桁数を適切に設定
      const decimals = sym === 'ETH' ? 18 : 
                      sym === 'BTC' || sym === 'WBTC' ? 8 :
                      sym === 'SOL' ? 9 :
                      sym === 'ADA' ? 6 : 8;
      
      portfolio[sym] = { 
        total: total.toFixed(decimals), 
        breakdown 
      };
    }
  }

  console.log('Final portfolio:', portfolio);
  return portfolio;
}
