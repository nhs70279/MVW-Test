// pages/api/balances.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchAssets, Asset } from '@/utils/getBalances'
import type { ChainConfig } from '@/config/chains'

type Wallet = { chain: ChainConfig; address: string }

interface BalanceResponse {
  chain: ChainConfig;
  balance: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ assetsMap: Record<string,Asset[]>; portfolio: Record<string,any> } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  const { wallets } = req.body as { wallets: Wallet[] }
  if (!Array.isArray(wallets)) {
    return res.status(400).json({ error: 'wallets must be an array' })
  }

  try {
    const assetsMap: Record<string, Asset[]> = {}
    for (const w of wallets) {
      assetsMap[w.chain.id] = await fetchAssets(w.chain, w.address)
    }
    // Calculate portfolio from assetsMap instead of using undefined function
    const portfolio = Object.values(assetsMap).reduce((acc, assets) => {
      assets.forEach(asset => {
        if (!acc[asset.symbol]) {
          acc[asset.symbol] = 0
        }
        acc[asset.symbol] += Number(asset.balance)
      })
      return acc
    }, {} as Record<string, number>)
    return res.status(200).json({ assetsMap, portfolio })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal Error' })
  }
}
