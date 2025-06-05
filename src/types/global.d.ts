// src/types/global.d.ts

// 既存の宣言
declare module 'micro-bip32';

// 追加：tweetnacl／ecpair の型を any で許容
declare module 'tweetnacl' {
  const nacl: any;
  export = nacl;
}

declare module 'ecpair' {
  const factory: any;
  export { factory as ECPairFactory };
}

// 追加: bs58 を型定義なしで扱えるよう宣言
declare module 'bs58';
