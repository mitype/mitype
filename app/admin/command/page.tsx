'use client';
// /admin/command — Command Center.
//
// Admin only (same gate as /admin). A single-screen dashboard: a slowly
// rotating, color-shifting particle core in the middle, Mitype vitals on the
// left, book shelf and tasks on the right, and a written daily briefing.
// Open it at startup by setting https://mitypeapp.com/admin/command as the
// browser home page or a Mac login item.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

interface Vitals {
  members: number;
  new24h: number;
  new7d: number;
  active: number;
  trialing: number;
  pastDue: number;
  referred: number;
  referrers: number;
}

// Edit these as the business changes.
const BOOKS = [
  { title: 'The Timeline: 80s', status: 'Live', price: '$9.99', note: 'Book 1', href: 'https://www.amazon.com/dp/B0HR4JBL32' },
  { title: 'The Timeline: 90s', status: 'In review', price: '$9.99', note: 'Book 2, review takes up to 72 hours', href: 'https://kdp.amazon.com/en_US/bookshelf' },
];

const TASKS = [
  'Add the 90s book to Author Central when it goes live',
  'Post the 80s launch posts (Launch_posts.md)',
  'Stage 4 videos as drafts on TikTok, Instagram, Facebook',
  'Check KDP orders and royalties',
];

const LINKS = [
  { label: 'KDP Bookshelf', href: 'https://kdp.amazon.com/en_US/bookshelf' },
  { label: 'KDP Reports', href: 'https://kdpreports.amazon.com/dashboard' },
  { label: 'Author Central', href: 'https://author.amazon.com/home' },
  { label: 'Firefly', href: 'https://firefly.adobe.com/generate/image' },
  { label: 'Admin', href: '/admin' },
  { label: 'Moments', href: '/moments' },
];

const PALETTE: [number, number, number][] = [
  [255, 176, 96], // amber
  [255, 122, 112], // coral
  [236, 96, 140], // rose
  [255, 200, 130], // gold
];

function mix(a: number[], b: number[], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `${c[0]},${c[1]},${c[2]}`;
}

function Core() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const N = window.innerWidth < 700 ? 420 : 900;
    const pts = Array.from({ length: N }, () => {
      // Uniform point on a sphere, with a little depth jitter.
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const k = 0.55 + Math.random() * 0.45;
      return { x: r * Math.cos(th) * k, y: u * k, z: r * Math.sin(th) * k, s: 0.6 + Math.random() * 1.6 };
    });

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const time = reduce ? 0 : t / 1000;
      ctx.clearRect(0, 0, w, h);

      // Slow color drift across the palette.
      const p = (time / 9) % PALETTE.length;
      const i0 = Math.floor(p);
      const f = p - i0;
      const col = mix(PALETTE[i0], PALETTE[(i0 + 1) % PALETTE.length], f);

      const R = Math.min(w, h) * 0.36;
      const cx = w / 2;
      const cy = h / 2;
      const ay = time * 0.12;
      const ax = Math.sin(time * 0.05) * 0.35 + 0.25;
      const cyA = Math.cos(ay), syA = Math.sin(ay);
      const cxA = Math.cos(ax), sxA = Math.sin(ax);

      // Soft glow.
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      g.addColorStop(0, `rgba(${col},0.16)`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const proj: { x: number; y: number; z: number; s: number }[] = [];
      for (const q of pts) {
        const x = q.x * cyA + q.z * syA;
        let z = -q.x * syA + q.z * cyA;
        const y = q.y * cxA - z * sxA;
        z = q.y * sxA + z * cxA;
        const persp = 1 / (1.9 - z * 0.7);
        proj.push({ x: cx + x * R * persp * 1.9, y: cy + y * R * persp * 1.9, z, s: q.s * persp });
      }

      // Faint links between near neighbors (sampled, to stay cheap).
      ctx.lineWidth = 0.6;
      const step = N > 600 ? 3 : 2;
      for (let a = 0; a < proj.length; a += step) {
        for (let b = a + 1; b < Math.min(a + 14, proj.length); b++) {
          const dx = proj[a].x - proj[b].x;
          const dy = proj[a].y - proj[b].y;
          const d = dx * dx + dy * dy;
          if (d < 1400) {
            ctx.strokeStyle = `rgba(${col},${0.16 * (1 - d / 1400)})`;
            ctx.beginPath();
            ctx.moveTo(proj[a].x, proj[a].y);
            ctx.lineTo(proj[b].x, proj[b].y);
            ctx.stroke();
          }
        }
      }

      for (const q of proj) {
        const a = 0.25 + 0.75 * ((q.z + 1) / 2);
        ctx.fillStyle = `rgba(${col},${a})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.s * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="cc-card">
      <div className="cc-label">{label}</div>
      <div className="cc-num">{value}</div>
      {hint ? <div className="cc-hint">{hint}</div> : null}
    </div>
  );
}

export default function CommandCenter() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [v, setV] = useState<Vitals | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [updated, setUpdated] = useState<Date | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    const [profRes, subRes] = await Promise.all([
      supabase.from('profiles').select('user_id, created_at, referred_by, is_referrer'),
      supabase.from('subscriptions').select('user_id, status'),
    ]);
    if (profRes.error) {
      setErr('Could not load member data.');
      return;
    }
    const profs = (profRes.data ?? []) as { user_id: string; created_at: string; referred_by: string | null; is_referrer: boolean | null }[];
    const subs = (subRes.data ?? []) as { user_id: string; status: string | null }[];
    const t = Date.now();
    setV({
      members: profs.length,
      new24h: profs.filter((p) => t - new Date(p.created_at).getTime() < 864e5).length,
      new7d: profs.filter((p) => t - new Date(p.created_at).getTime() < 7 * 864e5).length,
      active: subs.filter((s) => s.status === 'active').length,
      trialing: subs.filter((s) => s.status === 'trialing').length,
      pastDue: subs.filter((s) => s.status === 'past_due').length,
      referred: profs.filter((p) => p.referred_by).length,
      referrers: profs.filter((p) => p.is_referrer).length,
    });
    setUpdated(new Date());
    setErr('');
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle();
      if (!me?.is_admin) {
        router.replace('/dashboard');
        return;
      }
      setReady(true);
      load();
    })();
    const clock = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(load, 5 * 60 * 1000);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return <div style={{ minHeight: '100dvh', background: '#0b0706' }} />;
  }

  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const brief: string[] = [];
  if (v) {
    brief.push(
      v.new24h > 0
        ? `${v.new24h} new member${v.new24h === 1 ? '' : 's'} joined in the last 24 hours.`
        : 'No new members in the last 24 hours.'
    );
    brief.push(`${v.active + v.trialing} members have access (${v.active} paid, ${v.trialing} in trial).`);
    if (v.pastDue > 0) brief.push(`${v.pastDue} payment${v.pastDue === 1 ? ' is' : 's are'} past due. Worth a look.`);
  }
  brief.push('The 90s book is in KDP review. Add it to Author Central once it is live.');

  return (
    <main className="cc-root">
      <style>{`
        .cc-root{min-height:100dvh;background:radial-gradient(120% 90% at 50% 40%,#1a0f0b 0%,#0b0706 60%,#060403 100%);color:#f3e6dc;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;position:relative;overflow:hidden;padding:max(16px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom))}
        .cc-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#b98c78}
        .cc-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;position:relative;z-index:2;margin-bottom:16px}
        .cc-grid{display:grid;gap:14px;grid-template-columns:1fr;position:relative;z-index:2}
        .cc-center{position:relative;min-height:320px;order:-1}
        .cc-name{position:absolute;left:0;right:0;bottom:6%;text-align:center;pointer-events:none}
        .cc-name h1{margin:0;font-weight:300;font-size:clamp(36px,8vw,72px);letter-spacing:.32em;text-indent:.32em;color:#f7ebe2;text-shadow:0 0 28px rgba(255,150,110,.35)}
        .cc-col{display:flex;flex-direction:column;gap:12px}
        .cc-card{border:1px solid rgba(255,170,130,.16);background:rgba(28,16,12,.55);border-radius:14px;padding:14px 16px;backdrop-filter:blur(6px)}
        .cc-label{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#b98c78}
        .cc-num{font-size:34px;font-weight:300;line-height:1.15;font-variant-numeric:tabular-nums;color:#ffd9bd}
        .cc-hint{font-size:12px;color:#9c7a69;margin-top:2px}
        .cc-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .cc-book{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,170,130,.1)}
        .cc-book:first-of-type{border-top:0}
        .cc-pill{font-size:11px;padding:3px 10px;border-radius:999px;border:1px solid rgba(255,170,130,.35);white-space:nowrap}
        .cc-pill.live{color:#ffc58f;background:rgba(255,160,90,.12)}
        .cc-pill.rev{color:#f2a0b5;background:rgba(236,96,140,.1)}
        .cc-task{font-size:14px;line-height:1.45;padding:8px 0;border-top:1px solid rgba(255,170,130,.1);color:#ead8cb}
        .cc-task:first-of-type{border-top:0}
        .cc-links{display:flex;flex-wrap:wrap;gap:8px}
        .cc-link{min-height:44px;display:inline-flex;align-items:center;padding:0 14px;border-radius:10px;border:1px solid rgba(255,170,130,.22);color:#f3e6dc;text-decoration:none;font-size:13px;transition:background-color .16s ease,transform .12s ease}
        .cc-link:active{transform:scale(.97)}
        @media (hover:hover) and (pointer:fine){.cc-link:hover{background:rgba(255,160,100,.12)}}
        .cc-brief p{margin:0 0 8px;font-size:14px;line-height:1.55;color:#ead8cb}
        a.cc-bl{color:inherit;text-decoration:none}
        @media(min-width:1000px){
          .cc-grid{grid-template-columns:minmax(260px,1fr) minmax(0,1.5fr) minmax(280px,1fr);align-items:stretch}
          .cc-center{order:0;min-height:calc(100dvh - 120px)}
        }
        @media (prefers-reduced-motion:reduce){.cc-link{transition:none}}
      `}</style>

      <div className="cc-top">
        <div>
          <div className="cc-mono">Mitype command center</div>
          <div style={{ fontSize: 22, fontWeight: 300, marginTop: 4 }}>{greet}, Yasom</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="cc-num" style={{ fontSize: 26 }}>
            {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </div>
          <div className="cc-hint">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="cc-grid">
        <section className="cc-col" aria-label="Mitype vitals">
          <div className="cc-mono">Vitals</div>
          {err ? <div className="cc-card">{err}</div> : null}
          <div className="cc-row">
            <Stat label="Members" value={v?.members ?? '...'} hint={v ? `+${v.new7d} this week` : undefined} />
            <Stat label="New today" value={v?.new24h ?? '...'} />
          </div>
          <div className="cc-row">
            <Stat label="Paid" value={v?.active ?? '...'} />
            <Stat label="In trial" value={v?.trialing ?? '...'} />
          </div>
          <div className="cc-row">
            <Stat label="Past due" value={v?.pastDue ?? '...'} />
            <Stat label="Referred" value={v?.referred ?? '...'} hint={v ? `${v.referrers} referrers` : undefined} />
          </div>
          <div className="cc-hint">
            {updated ? `Updated ${updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, refreshes every 5 minutes` : 'Loading'}
          </div>
        </section>

        <section className="cc-center" aria-label="Core">
          <Core />
          <div className="cc-name">
            <h1>MITYPE</h1>
            <div className="cc-mono" style={{ marginTop: 6 }}>Command core · online</div>
          </div>
        </section>

        <section className="cc-col" aria-label="Books, tasks and links">
          <div className="cc-mono">Book shelf</div>
          <div className="cc-card">
            {BOOKS.map((b) => (
              <a key={b.title} className="cc-bl" href={b.href} target="_blank" rel="noreferrer">
                <div className="cc-book">
                  <div>
                    <div style={{ fontSize: 15 }}>{b.title}</div>
                    <div className="cc-hint">{b.price} · {b.note}</div>
                  </div>
                  <span className={`cc-pill ${b.status === 'Live' ? 'live' : 'rev'}`}>{b.status}</span>
                </div>
              </a>
            ))}
          </div>

          <div className="cc-mono">Open tasks</div>
          <div className="cc-card">
            {TASKS.map((t) => (
              <div key={t} className="cc-task">{t}</div>
            ))}
          </div>

          <div className="cc-mono">Quick access</div>
          <div className="cc-links">
            {LINKS.map((l) =>
              l.href.startsWith('/') ? (
                <Link key={l.label} href={l.href} className="cc-link">{l.label}</Link>
              ) : (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="cc-link">{l.label}</a>
              )
            )}
          </div>
        </section>
      </div>

      <section className="cc-card cc-brief" style={{ marginTop: 14, position: 'relative', zIndex: 2 }} aria-label="Daily briefing">
        <div className="cc-label" style={{ marginBottom: 8 }}>Daily briefing</div>
        {brief.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    </main>
  );
}
