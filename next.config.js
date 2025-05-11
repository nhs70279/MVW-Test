/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(cfg){
    cfg.experiments = { ...cfg.experiments, asyncWebAssembly:true }
    cfg.module.rules.push({
      test:/\.wasm$/,
      type:'webassembly/async'
    })
    return cfg
  },
  // tiny-secp256k1 が Node の組込みモジュールを参照しないようポリフィル
  resolve: {
    fallback: { fs:false, path:false, os:false }
  },
  devIndicators: false,
}
module.exports = nextConfig
