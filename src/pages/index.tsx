// src/pages/index.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <div
      className="bg-radial"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: '100vh',
        padding: '0 10px',
      }}
    >
      <style jsx>{`
        @media (max-width: 600px) {
          h1 {
            font-size: 2.2rem !important;
            height: 44px !important;
          }
          p {
            font-size: 1rem !important;
            margin-bottom: 2rem !important;
          }
          .bg-radial {
            padding: 0 2vw;
          }
          div[style*='display: flex'][style*='gap: 1rem'] {
            flex-direction: column !important;
            gap: 0.5rem !important;
            width: 100%;
          }
          a {
            width: 100%;
            text-align: center;
            font-size: 1rem;
          }
        }
      `}</style>
      {/* ヘッダ右上に About リンク */}
      {/*<header style={{ position: 'absolute', top: 20, right: 20 }}>
        <Link
          href="/Contact"
          style={{ color: '#000', textDecoration: 'none', fontWeight: '500' }}
        >
          Contact
        </Link>
      </header>*/}

      <h1 style={{ fontSize: '6rem', marginBottom: '6px',height: '99px' }}>
        MVW
        </h1>
      <p
        style={{
          fontSize: '1.2rem',
          letterSpacing: '0.2em',
          marginBottom: '4.5rem',
        }}
      >
        MULTI VIEW WALLET
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link
          href="/signup"
          style={{
            padding: '0.6rem 2rem',
            background: '#000',
            color: '#fff',
            borderRadius: '999px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          Sign Up / Access
        </Link>
        <Link
          href="/about"
          style={{
            padding: '0.6rem 2rem',
            background: '#000',
            color: '#fff',
            borderRadius: '999px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          About
        </Link>
      </div>

      <footer style={{ position: 'absolute', bottom: 20, fontSize: '0.75rem' }}>
        ©︎ 2025 Pattaravadee
      </footer>
    </div>
  )
}