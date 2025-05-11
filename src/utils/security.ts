import { ethers } from 'ethers';
import { WalletInfo } from './wallet';

export class SecurityManager {
  private static instance: SecurityManager;
  private readonly ENCRYPTION_KEY: string;

  private constructor() {
    // 環境変数から暗号化キーを取得（本番環境では適切な方法で管理する必要があります）
    this.ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key';
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // ウォレット情報を暗号化
  public async encryptWalletInfo(walletInfo: WalletInfo): Promise<string> {
    const data = JSON.stringify(walletInfo);
    const encryptedData = await this.encrypt(data);
    return encryptedData;
  }

  // ウォレット情報を復号化
  public async decryptWalletInfo(encryptedData: string): Promise<WalletInfo> {
    const decryptedData = await this.decrypt(encryptedData);
    return JSON.parse(decryptedData);
  }

  // データを暗号化
  private async encrypt(data: string): Promise<string> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    const encryptedArray = new Uint8Array(encryptedData);
    const result = new Uint8Array(iv.length + encryptedArray.length);
    result.set(iv);
    result.set(encryptedArray, iv.length);

    return btoa(String.fromCharCode(...result));
  }

  // データを復号化
  private async decrypt(encryptedData: string): Promise<string> {
    const key = await this.getKey();
    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const iv = data.slice(0, 12);
    const encryptedArray = data.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedArray
    );

    return new TextDecoder().decode(decryptedData);
  }

  // 暗号化キーを取得
  private async getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.ENCRYPTION_KEY);
    
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // 秘密鍵の検証
  public validatePrivateKey(privateKey: string): boolean {
    try {
      new ethers.Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  // アドレスの検証
  public validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
} 