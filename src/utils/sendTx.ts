import {
    JsonRpcProvider,
    Wallet,
    parseUnits,
    formatUnits,
    Contract,
    getAddress
  } from 'ethers';
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction as SolTx,
    PublicKey as SolPubKey
  } from '@solana/web3.js';
import * as Cardano from '@emurgo/cardano-serialization-lib-browser';
import { payments, Psbt } from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import type { ChainConfig, EvmToken } from '../config/chains';
import { estimateFee as estimateFeeUtil } from './feeEstimator';
import {
  createSimpleSmartAccount,
  createSmartAccountClient,
  LocalAccountSigner,
  defaultPaymasterAndData,
  getEntryPoint,
} from "@alchemy/aa-core";
import { http } from "viem";

// ECPair 初期化
const ECPair = ECPairFactory(ecc);

const ERC20_ABI_TRANSFER = [
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

interface Transaction {
  chain: ChainConfig;
  from: string;
  to: string;
  amount: string;
  symbol?: string;
  privKey?: string | Uint8Array;
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

/**
 * ネットワーク手数料を見積もり、ネイティブ単位 (ETH, SOL, ADA, BTC) で文字列を返す
 */
export async function estimateFee(tx: Transaction): Promise<FeeEstimationResult> {
  const { chain, to, amount, symbol } = tx;
  const actualSymbol = symbol || chain.nativeCurrency.symbol;

  try {
    if (chain.kind === 'evm') {
      const provider = new JsonRpcProvider(chain.rpc, chain.chainId);
      const result = await estimateFeeUtil(chain, to, amount);
      return {
        fee: result.fee,
        details: {
          gasLimit: result.details?.gasLimit,
          gasPrice: result.details?.gasPrice ? parseFloat(result.details.gasPrice) : undefined,
          computeUnits: result.details?.computeUnits,
          minUtxo: result.details?.minUtxo ? parseFloat(result.details.minUtxo) : undefined,
          feeRate: result.details?.feeRate,
          size: result.details?.size,
        },
      };
    }

    if (chain.kind === 'solana') {
      const connection = new Connection(chain.rpc, 'confirmed');
      const transaction = new SolTx().add(
        SystemProgram.transfer({
          fromPubkey: new SolPubKey(tx.from),
          toPubkey: new SolPubKey(to),
          lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL),
        })
      );
      const result = await estimateFeeUtil(chain, to, amount, { psbt: new Psbt() });
      return {
        fee: result.fee,
        details: {
          gasLimit: result.details?.gasLimit,
          gasPrice: result.details?.gasPrice ? parseFloat(result.details.gasPrice) : undefined,
          computeUnits: result.details?.computeUnits,
          minUtxo: result.details?.minUtxo ? parseFloat(result.details.minUtxo) : undefined,
          feeRate: result.details?.feeRate,
          size: result.details?.size,
        },
      };
    }

    if (chain.kind === 'cardano') {
      // Cardanoのトランザクションサイズと入出力数を推定
      const estimatedTxSize = 200; // 仮の値、実際のトランザクション構築時に更新
      const estimatedInputs = 1;
      const estimatedOutputs = 2;
      const result = await estimateFeeUtil(chain, to, amount, {
        txSize: estimatedTxSize,
        numInputs: estimatedInputs,
        numOutputs: estimatedOutputs,
      });
      return {
        fee: result.fee,
        details: {
          gasLimit: result.details?.gasLimit,
          gasPrice: result.details?.gasPrice ? parseFloat(result.details.gasPrice) : undefined,
          computeUnits: result.details?.computeUnits,
          minUtxo: result.details?.minUtxo ? parseFloat(result.details.minUtxo) : undefined,
          feeRate: result.details?.feeRate,
          size: result.details?.size,
        },
      };
    }

    if (chain.kind === 'bitcoin') {
      const psbt = new Psbt();
      // 仮のPSBTを作成（実際のトランザクション構築時に更新）
      const estimatedFeeRate = 20; // sat/byte
      const result = await estimateFeeUtil(chain, to, amount, {
        psbt,
        feeRate: estimatedFeeRate,
      });
      return {
        fee: result.fee,
        details: {
          gasLimit: result.details?.gasLimit,
          gasPrice: result.details?.gasPrice ? parseFloat(result.details.gasPrice) : undefined,
          computeUnits: result.details?.computeUnits,
          minUtxo: result.details?.minUtxo ? parseFloat(result.details.minUtxo) : undefined,
          feeRate: result.details?.feeRate,
          size: result.details?.size,
        },
      };
    }

    throw new Error(`Unsupported chain kind for fee estimation: ${chain.kind}`);
  } catch (error: unknown) {
    console.error('Fee estimation error:', error);
    throw new Error(`Failed to estimate fee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * トランザクションを送信する
 */
export async function sendTx(tx: Transaction): Promise<string> {
  const { chain, from, to, amount, symbol, privKey } = tx;
  const actualSymbol = symbol || chain.nativeCurrency.symbol;

  try {
    if (chain.kind === 'evm') {
      const provider = new JsonRpcProvider(chain.rpc, chain.chainId);
      const wallet = new Wallet(privKey as string || from, provider);
      const tx = await wallet.sendTransaction({
        to,
        value: parseUnits(amount, chain.nativeCurrency.decimals),
      });
      return tx.hash;
    }

    if (chain.kind === 'solana') {
      const connection = new Connection(chain.rpc, 'confirmed');
      const keypair = Keypair.fromSecretKey(new Uint8Array(privKey ? JSON.parse(privKey as string) : []));
      const transaction = new SolTx().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new SolPubKey(to),
          lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL),
        })
      );
      const signature = await connection.sendTransaction(transaction, [keypair]);
      return signature;
    }

    if (chain.kind === 'cardano') {
      // Cardanoのトランザクション送信処理
      throw new Error('Cardano transaction sending is not implemented yet');
    }

    if (chain.kind === 'bitcoin') {
      // Bitcoinのトランザクション送信処理
      throw new Error('Bitcoin transaction sending is not implemented yet');
    }

    throw new Error(`Unsupported chain kind for transaction: ${chain.kind}`);
  } catch (error: unknown) {
    console.error('Transaction error:', error);
    throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
} 