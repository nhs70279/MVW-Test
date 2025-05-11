// utils/cardanoCache.ts
import Decimal from 'decimal.js'

const cache = new Map<string, { t:number; ada:string }>()

export async function getAda(
  address: string,
  projectId: string
): Promise<string> {
  const hit = cache.get(address)
  if (hit && Date.now() - hit.t < 60_000) return hit.ada

  // ← utxos は未使用アドレスでも空配列で返る（404 にならない）
  const url = `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${address}/utxos`
  const res = await fetch(url, { headers: { project_id: projectId } })

  if (!res.ok) {
    console.warn(`Blockfrost utxos error ${res.status}:`, await res.text())
    cache.set(address, { t: Date.now(), ada: '0' })
    return '0'
  }

  const utxos = await res.json() as Array<{
    amount: { unit: string; quantity: string }[]
  }>

  // 全 UTXO の lovelace を合計
  const totalLovelace = utxos.reduce((sum, u) => {
    const q = u.amount.find(a => a.unit === 'lovelace')?.quantity ?? '0'
    return sum.plus(new Decimal(q))
  }, new Decimal(0))

  const ada = totalLovelace.dividedBy(1e6).toFixed(6)
  cache.set(address, { t: Date.now(), ada })
  return ada
}
