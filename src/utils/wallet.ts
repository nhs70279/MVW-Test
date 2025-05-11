import { ethers, JsonRpcProvider } from 'ethers';
import { CHAINS } from '../config/chains';

export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic?: string;
  derivationPath?: string;
}

export class WalletManager {
  private static instance: WalletManager;
  private provider: JsonRpcProvider;

  private constructor() {
    this.provider = new JsonRpcProvider(CHAINS.worldchainTestnet.rpc);
  }

  public static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  // ランダムなウォレットを生成
  public async createRandomWallet(): Promise<WalletInfo> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase,
    };
  }

  // BIP39/44を使用したHDウォレットを生成
  public async createHDWallet(mnemonic: string, path: string = "m/44'/60'/0'/0/0"): Promise<WalletInfo> {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic,
      derivationPath: path,
    };
  }

  // 残高を取得
  public async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  // トランザクションを送信
  public async sendTransaction(
    fromWallet: WalletInfo,
    toAddress: string,
    amount: string
  ): Promise<string> {
    const wallet = new ethers.Wallet(fromWallet.privateKey, this.provider);
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount),
    });
    return tx.hash;
  }
} 