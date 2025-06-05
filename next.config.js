/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(cfg) {
    cfg.experiments = { ...cfg.experiments, asyncWebAssembly: true };
    cfg.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    // tiny-secp256k1 が Node の組込みモジュールを参照しないようポリフィル
    cfg.resolve = {
      ...cfg.resolve,
      fallback: { fs: false, path: false, os: false },
    };
    return cfg;
  },
  async rewrites() {
    return [
      {
        source: '/_next/static/wasm/:path*',
        destination: '/wasm/:path*',
      },
    ];
  },
}
module.exports = nextConfig
