// src/pages/wallet.tsx
import Link from 'next/link'
import RestoreForm from '@/components/RegisterForm'

export default function WalletPage() {
  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: 600,
        margin: 'auto',
        fontFamily: 'sans-serif',
      }}
    >
      <header style={{ marginBottom: '1rem' }}>
        <Link
          href="/"
          style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}
        >
          ← Home
        </Link>
      </header>

      <h1 style={{ fontSize: '1.5rem', margin: '1.5rem 0', textAlign: 'center' }}>
        マルチチェーン ウォレット復元
      </h1>

      <RestoreForm />
    </div>
  )
}
