import Link from 'next/link';

// Branded 404 so a mistyped or outdated link does not dead end on a blank
// default page.
export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 24,
      gap: 14,
    }}>
      <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--brand-personal)', margin: 0 }}>
        Error 404
      </p>
      <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.6px', color: 'var(--brand-text-primary)', margin: 0 }}>
        We could not find that page
      </h1>
      <p style={{ fontSize: 15, color: 'var(--brand-personal-text-mid)', maxWidth: 380, lineHeight: 1.55, margin: 0 }}>
        The link may be mistyped or the page may have moved. Head back and keep networking your creativity.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        <Link href="/dashboard" style={{
          padding: '13px 26px', background: 'var(--brand-personal)', color: 'white',
          borderRadius: 100, fontWeight: 800, fontSize: 14, textDecoration: 'none',
        }}>
          Go to dashboard
        </Link>
        <Link href="/" style={{
          padding: '13px 26px', background: 'white', color: 'var(--brand-personal)',
          border: '1.5px solid rgba(200,149,108,0.5)', borderRadius: 100, fontWeight: 800, fontSize: 14, textDecoration: 'none',
        }}>
          Home
        </Link>
      </div>
    </main>
  );
}
