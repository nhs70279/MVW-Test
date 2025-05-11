import { JsonRpcProvider, parseUnits, formatUnits } from 'ethers';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Psbt } from 'bitcoinjs-lib';
import { ChainConfig } from '../config/chains';

// 手数料計算の設定
const FEE_SETTINGS = {
  EVM: {
    GAS_BUFFER: 1.4,
    MIN_GAS_LIMIT: 21000,
    MAX_GAS_LIMIT: 1000000,
    PRIORITY_FEE_MULTIPLIER: 1.5,
  },
  SOLANA: {
    BASE_FEE: 5000, // lamports
    COMPUTE_UNIT_LIMIT: 200000,
    COMPUTE_UNIT_PRICE: 0.000001, // SOL per compute unit
  },
  CARDANO: {
    MIN_FEE_A: 44,
    MIN_FEE_B: 155381,
    COINS_PER_UTXO_BYTE: 4310,
    KEY_DEPOSIT: 2000000,
    POOL_DEPOSIT: 500000000,
  },
  BITCOIN: {
    MIN_FEE_RATE: 1, // sat/byte
    MAX_FEE_RATE: 100, // sat/byte
    TARGET_CONFIRMATION_BLOCKS: 3,
    SEGWIT_DISCOUNT: 0.75, // SegWitトランザクションの手数料割引
  },
};

// EVM系チェーンの手数料計算
export async function estimateEvmFee(
  provider: JsonRpcProvider,
  to: string,
  value: string,
  decimals: number
): Promise<{ fee: string; gasLimit: number; gasPrice: string }> {
  try {
    // ガスリミットの見積もり
    const gasEstimate = await provider.estimateGas({ to, value: parseUnits(value, decimals) });
    const gasLimit = Math.min(
      Math.max(Math.ceil(Number(gasEstimate) * FEE_SETTINGS.EVM.GAS_BUFFER), FEE_SETTINGS.EVM.MIN_GAS_LIMIT),
      FEE_SETTINGS.EVM.MAX_GAS_LIMIT
    );

    // ガス価格の取得（EIP-1559対応）
    const feeData = await provider.getFeeData();
    let gasPrice: bigint;
    
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559
      const baseFee = feeData.maxFeePerGas - feeData.maxPriorityFeePerGas;
      const priorityFee = feeData.maxPriorityFeePerGas * BigInt(Math.floor(FEE_SETTINGS.EVM.PRIORITY_FEE_MULTIPLIER * 100)) / BigInt(100);
      gasPrice = baseFee + priorityFee;
    } else if (feeData.gasPrice) {
      // 従来の方式
      gasPrice = feeData.gasPrice;
    } else {
      throw new Error('Unable to get gas price');
    }

    const feeWei = BigInt(gasLimit) * gasPrice;
    return {
      fee: formatUnits(feeWei, decimals),
      gasLimit,
      gasPrice: formatUnits(gasPrice, 9), // gwei
    };
  } catch (error: unknown) {
    console.error('EVM fee estimation error:', error);
    throw new Error(`Failed to estimate EVM fee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Solanaの手数料計算
export async function estimateSolanaFee(
  connection: Connection,
  _transaction: unknown // 未使用
): Promise<{ fee: string; computeUnits: number }> {
  // Solanaの標準的な送金手数料は5000 lamports
  const baseFee = FEE_SETTINGS.SOLANA.BASE_FEE;
  return {
    fee: (baseFee / LAMPORTS_PER_SOL).toFixed(9),
    computeUnits: 0,
  };
}

// Cardanoの手数料計算
export function estimateCardanoFee(
  txSize: number,
  numInputs: number,
  numOutputs: number
): { fee: string; minUtxo: string } {
  try {
    const { MIN_FEE_A, MIN_FEE_B, COINS_PER_UTXO_BYTE } = FEE_SETTINGS.CARDANO;
    
    // 基本手数料の計算
    const baseFee = MIN_FEE_A * txSize + MIN_FEE_B;
    
    // UTXOの最小額の計算
    const minUtxo = Math.ceil(txSize * COINS_PER_UTXO_BYTE);
    
    // 入力と出力の数に基づく追加手数料
    const ioFee = (numInputs + numOutputs) * 10000; // 仮の値、実際の値に調整が必要
    
    const totalFee = baseFee + ioFee;
    return {
      fee: (totalFee / 1e6).toFixed(6), // lovelace to ADA
      minUtxo: (minUtxo / 1e6).toFixed(6),
    };
  } catch (error: unknown) {
    console.error('Cardano fee estimation error:', error);
    throw new Error(`Failed to estimate Cardano fee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Bitcoinの手数料計算
export async function estimateBitcoinFee(
  psbt: Psbt,
  feeRate: number
): Promise<{ fee: string; feeRate: number; size: number }> {
  try {
    // トランザクションサイズの計算
    const txSize = psbt.extractTransaction().virtualSize();
    
    // SegWit割引の適用
    const effectiveSize = Math.ceil(txSize * FEE_SETTINGS.BITCOIN.SEGWIT_DISCOUNT);
    
    // 手数料率の範囲チェック
    const safeFeeRate = Math.min(
      Math.max(feeRate, FEE_SETTINGS.BITCOIN.MIN_FEE_RATE),
      FEE_SETTINGS.BITCOIN.MAX_FEE_RATE
    );
    
    // 手数料の計算
    const fee = effectiveSize * safeFeeRate;
    
    return {
      fee: (fee / 1e8).toFixed(8), // satoshi to BTC
      feeRate: safeFeeRate,
      size: effectiveSize,
    };
  } catch (error: unknown) {
    console.error('Bitcoin fee estimation error:', error);
    throw new Error(`Failed to estimate Bitcoin fee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// メインの手数料見積もり関数
export async function estimateFee(
  chain: ChainConfig,
  to: string,
  amount: string,
  options: {
    txSize?: number;
    numInputs?: number;
    numOutputs?: number;
    psbt?: Psbt;
    feeRate?: number;
  } = {}
): Promise<{
  fee: string;
  details?: {
    gasLimit?: number;
    gasPrice?: string;
    computeUnits?: number;
    minUtxo?: string;
    feeRate?: number;
    size?: number;
  };
}> {
  try {
    switch (chain.kind) {
      case 'evm': {
        const provider = new JsonRpcProvider(chain.rpc, chain.chainId);
        const result = await estimateEvmFee(provider, to, amount, chain.nativeCurrency.decimals);
        return {
          fee: result.fee,
          details: {
            gasLimit: result.gasLimit,
            gasPrice: result.gasPrice,
          },
        };
      }
      
      case 'solana': {
        const connection = new Connection(chain.rpc, 'confirmed');
        const result = await estimateSolanaFee(connection, options.psbt);
        return {
          fee: result.fee,
          details: {
            computeUnits: result.computeUnits,
          },
        };
      }
      
      case 'cardano': {
        if (!options.txSize || !options.numInputs || !options.numOutputs) {
          throw new Error('Missing required parameters for Cardano fee estimation');
        }
        const result = estimateCardanoFee(
          options.txSize,
          options.numInputs,
          options.numOutputs
        );
        return {
          fee: result.fee,
          details: {
            minUtxo: result.minUtxo,
          },
        };
      }
      
      case 'bitcoin': {
        if (!options.psbt || !options.feeRate) {
          throw new Error('Missing required parameters for Bitcoin fee estimation');
        }
        const result = await estimateBitcoinFee(options.psbt, options.feeRate);
        return {
          fee: result.fee,
          details: {
            feeRate: result.feeRate,
            size: result.size,
          },
        };
      }
      
      default:
        throw new Error(`Unsupported chain kind: ${chain.kind}`);
    }
  } catch (error: unknown) {
    console.error('Fee estimation error:', error);
    throw new Error(`Failed to estimate fee: ${error instanceof Error ? error.message : String(error)}`);
  }
} 