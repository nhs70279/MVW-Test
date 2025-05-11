// src/types/coingecko-api.d.ts
declare module 'coingecko-api' {
    export class CoinGeckoClient {
      constructor(opts?: { timeout?: number });
      simple: {
        price(args: {
          ids: string[];
          vs_currencies: string[];
        }): Promise<{ data: Record<string, Record<string, number>> }>;
      };
    }
    export default CoinGeckoClient;
  }
  