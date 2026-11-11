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

// Deliberately no subscriber, payment or revenue figures on this screen.
interface Vitals {
  members: number;
  new24h: number;
  new7d: number;
  active: number;
  trialing: number;
  referred: number;
  referrers: number;
}

interface Product {
  id: string;
  path: string;
  img: string; // short-lived signed link to the private photo
  name: string;
  store: string;
  link: string;
  status: 'needs_link' | 'no_commission' | 'ready' | 'posted';
  commission: string;
  shopmy_link: string;
}

const STATUS_LABEL: Record<Product['status'], string> = {
  needs_link: 'Needs link',
  no_commission: 'No commission, skipped',
  ready: 'Ready for your yes or no',
  posted: 'Posted on ShopMy',
};

// Shrinks a photo before upload (keeps it well under the 5 MB limit).
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo.'))), 'image/jpeg', 0.85)
  );
}

// Edit these as the business changes.
const BOOKS = [
  { title: 'The Timeline: 80s', status: 'Live', note: 'Book 1 of The Timeline', href: 'https://www.amazon.com/dp/B0HR4JBL32' },
  { title: 'The Timeline: 90s', status: 'Live', note: 'Book 2 of The Timeline', href: 'https://www.amazon.com/dp/B0HR8SMDH6' },
];

// Snapshot read from each account on Nov 11. Refreshed when Claude re-reads the accounts.
const SOCIALS_AS_OF = 'Nov 11';
const SOCIALS = [
  { name: 'Instagram', big: '5,071', unit: 'followers', lines: ['32.1K views, last 30 days', '825 interactions', '159 profile visits, 4 link taps'] },
  { name: 'TikTok', big: '3K', unit: 'followers', lines: ['14.7K video views, last 7 days', '386 likes, 35 comments, 13 shares', '90 profile views'] },
  { name: 'Facebook', big: '1.2K', unit: 'views from Instagram, 30 days', lines: ['Page insights not read yet'] },
  { name: 'YouTube', big: '--', unit: 'not connected yet', lines: ['Studio blocks my reader, needs a different method'] },
  { name: 'TuneCore', big: '--', unit: 'streams only, no earnings shown', lines: ['Not connected yet'] },
];

// Ideas for growth. Nothing is posted or changed until you press Approve and then ask Claude to run it.
const IDEAS = [
  { id: 'ig-link', title: 'Put both Timeline books in your Instagram bio link', why: '4 link taps in 30 days. A link to the series page gives those taps somewhere to sell.' },
  { id: 'tt-shop', title: 'Check TikTok Shop for books and Christmas products', why: 'TikTok Studio lists Monetization tools. Shop and affiliate access depend on follower and region rules.' },
  { id: 'amz-assoc', title: 'Join Amazon Associates for commission links', why: 'Earn commission on products you feature, including your own Amazon books and gift picks.' },
  { id: 'reel-set', title: 'Post a two-book Timeline reel (80s and 90s)', why: 'Reels drive 64% of your Instagram views and 97% come from non-followers.' },
  { id: 'xmas-shop', title: 'Add Christmas finds to your Mitype shop with photos and links', why: 'Seasonal demand peaks soon. Use the product uploader below.' },
];

const TASKS = [
  'Post the launch posts for both Timeline books',
  'Stage 4 videos as drafts on TikTok, Instagram, Facebook',
  'Photograph the Christmas products and add them below',
  'Connect YouTube and X to the dashboard',
];

const LINKS = [
  { label: 'KDP Bookshelf', href: 'https://kdp.amazon.com/en_US/bookshelf' },
  { label: 'KDP Reports', href: 'https://kdpreports.amazon.com/dashboard' },
  { label: 'Author Central', href: 'https://author.amazon.com/home' },
  { label: 'Firefly', href: 'https://firefly.adobe.com/generate/image' },
  { label: 'TikTok Studio', href: 'https://www.tiktok.com/tiktokstudio' },
  { label: 'Instagram', href: 'https://www.instagram.com/accounts/insights/' },
  { label: 'YouTube Studio', href: 'https://studio.youtube.com' },
  { label: 'Amazon series page', href: 'https://kdp.amazon.com/en_US/bookshelf' },
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
  const [showVitals, setShowVitals] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [updated, setUpdated] = useState<Date | null>(null);
  const [err, setErr] = useState('');
  // The page renders blank until the admin check finishes, so reading browser
  // storage here cannot cause a server/client mismatch.
  const [decisions, setDecisions] = useState<Record<string, 'yes' | 'no'>>(() => {
    try {
      return typeof window === 'undefined' ? {} : JSON.parse(localStorage.getItem('cc-decisions') || '{}');
    } catch {
      return {};
    }
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [shopMsg, setShopMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function decide(id: string, d: 'yes' | 'no') {
    const next = { ...decisions, [id]: d };
    setDecisions(next);
    try { localStorage.setItem('cc-decisions', JSON.stringify(next)); } catch { /* optional */ }
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from('dashboard_products')
      .select('id, image_path, name, store, link, status, commission, shopmy_link')
      .order('created_at', { ascending: false });
    if (error) {
      setShopMsg('Product storage is not set up yet. Run supabase-dashboard-products.sql in Supabase.');
      return;
    }
    const rows = (data ?? []) as {
      id: string; image_path: string; name: string; store: string; link: string;
      status: Product['status']; commission: string; shopmy_link: string;
    }[];
    const signed = rows.length
      ? await supabase.storage.from('dashboard-products').createSignedUrls(rows.map((r) => r.image_path), 3600)
      : { data: [] as { path: string | null; signedUrl: string }[] };
    const urlByPath = new Map((signed.data ?? []).map((s) => [s.path ?? '', s.signedUrl]));
    setProducts(
      rows.map((r) => ({
        id: r.id, path: r.image_path, img: urlByPath.get(r.image_path) ?? '',
        name: r.name, store: r.store, link: r.link,
        status: r.status, commission: r.commission, shopmy_link: r.shopmy_link,
      }))
    );
    setShopMsg('');
  }

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setShopMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        const blob = await shrink(f);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from('dashboard-products').upload(path, blob, { contentType: 'image/jpeg' });
        if (up.error) {
          setShopMsg('Upload failed. Run supabase-dashboard-products.sql in Supabase if you have not yet.');
          return;
        }
        const ins = await supabase.from('dashboard_products').insert({ user_id: user.id, image_path: path });
        if (ins.error) {
          await supabase.storage.from('dashboard-products').remove([path]);
          setShopMsg('Could not save the product.');
          return;
        }
      }
      await loadProducts();
    } catch {
      setShopMsg('Could not add that photo.');
    } finally {
      setBusy(false);
    }
  }

  // Typing updates the screen; leaving the field saves it.
  function editProduct(id: string, patch: Partial<Product>) {
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function saveProduct(p: Product) {
    const { error } = await supabase
      .from('dashboard_products')
      .update({ name: p.name, store: p.store, link: p.link })
      .eq('id', p.id);
    if (error) setShopMsg('Could not save your changes.');
  }

  async function removeProduct(p: Product) {
    await supabase.storage.from('dashboard-products').remove([p.path]);
    const { error } = await supabase.from('dashboard_products').delete().eq('id', p.id);
    if (error) {
      setShopMsg('Could not remove that product.');
      return;
    }
    setProducts((list) => list.filter((x) => x.id !== p.id));
  }

  // Member numbers are only fetched when the Mitype numbers panel is opened.
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
      referred: profs.filter((p) => p.referred_by).length,
      referrers: profs.filter((p) => p.is_referrer).length,
    });
    setUpdated(new Date());
    setErr('');
  }

  function toggleVitals() {
    if (showVitals) {
      setShowVitals(false);
      setV(null);
      return;
    }
    setShowVitals(true);
    load();
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
      loadProducts();
    })();
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return <div style={{ minHeight: '100dvh', background: '#0b0706' }} />;
  }

  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const brief: string[] = [];
  brief.push('Both Timeline books are live on Amazon and linked as a series.');
  brief.push('Instagram has 5,071 followers and TikTok about 3K. Most views come from people who do not follow you yet, so new posts reach new audiences.');
  const waiting = IDEAS.filter((i) => !decisions[i.id]).length;
  if (waiting > 0) brief.push(`${waiting} growth idea${waiting === 1 ? ' is' : 's are'} waiting for your yes or no.`);
  if (products.length > 0) brief.push(`${products.length} product photo${products.length === 1 ? ' is' : 's are'} in the shop queue.`);

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
        .cc-two{display:grid;gap:14px;grid-template-columns:1fr;position:relative;z-index:2}
        .cc-btn{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid rgba(255,170,130,.3);background:transparent;color:#f3e6dc;font-size:13px;font-family:inherit;cursor:pointer;transition:background-color .16s ease,transform .12s ease}
        .cc-btn:active{transform:scale(.97)}
        .cc-btn.on{background:rgba(255,160,90,.18);border-color:rgba(255,190,130,.6);color:#ffd9bd}
        .cc-btn.off{background:rgba(236,96,140,.14);border-color:rgba(236,120,160,.5)}
        .cc-prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:12px}
        .cc-prod{display:flex;flex-direction:column;gap:6px}
        .cc-prod img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}
        .cc-prod input{min-height:36px;border-radius:8px;border:1px solid rgba(255,170,130,.22);background:rgba(0,0,0,.25);color:#f3e6dc;padding:0 10px;font-size:16px;font-family:inherit}
        @media(min-width:1000px){
          .cc-two{grid-template-columns:1fr 1fr}
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
          <div className="cc-mono">Mitype</div>
          <button type="button" className={`cc-btn${showVitals ? ' on' : ''}`} onClick={toggleVitals} aria-expanded={showVitals}>
            {showVitals ? 'Hide Mitype numbers' : 'Show Mitype numbers'}
          </button>
          {err ? <div className="cc-card">{err}</div> : null}
          {showVitals ? (
            <>
              <div className="cc-row">
                <Stat label="Users" value={v?.members ?? '...'} hint={v ? `+${v.new7d} this week` : undefined} />
                <Stat label="New today" value={v?.new24h ?? '...'} />
              </div>
              <div className="cc-row">
                <Stat label="Subscribers" value={v ? v.active : '...'} hint="paid" />
                <Stat label="In trial" value={v ? v.trialing : '...'} />
              </div>
              <Stat label="Referred" value={v?.referred ?? '...'} hint={v ? `${v.referrers} referrers` : undefined} />
              <div className="cc-hint">
                {updated ? `Updated ${updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Loading'}
              </div>
            </>
          ) : null}

          <div className="cc-mono" style={{ marginTop: 6 }}>Social reach · as of {SOCIALS_AS_OF}</div>
          {SOCIALS.map((s) => (
            <div key={s.name} className="cc-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div className="cc-label">{s.name}</div>
                <div className="cc-hint">{s.unit}</div>
              </div>
              <div className="cc-num" style={{ fontSize: 28 }}>{s.big}</div>
              {s.lines.map((l) => (
                <div key={l} className="cc-hint">{l}</div>
              ))}
            </div>
          ))}
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
                    <div className="cc-hint">{b.note}</div>
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

      <div className="cc-two" style={{ marginTop: 14 }}>
        <section className="cc-card" aria-label="Growth ideas">
          <div className="cc-label" style={{ marginBottom: 4 }}>Growth ideas · your yes or no</div>
          <div className="cc-hint" style={{ marginBottom: 6 }}>Approving only marks it as a go. Nothing is posted or changed until you ask Claude to run it.</div>
          {IDEAS.map((i) => {
            const d = decisions[i.id];
            return (
              <div key={i.id} className="cc-task">
                <div style={{ fontSize: 15 }}>{i.title}</div>
                <div className="cc-hint" style={{ marginBottom: 8 }}>{i.why}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" className={`cc-btn${d === 'yes' ? ' on' : ''}`} onClick={() => decide(i.id, 'yes')}>Approve</button>
                  <button type="button" className={`cc-btn${d === 'no' ? ' off' : ''}`} onClick={() => decide(i.id, 'no')}>Skip</button>
                  {d ? <span className="cc-hint">{d === 'yes' ? 'Approved' : 'Skipped'}</span> : null}
                </div>
              </div>
            );
          })}
        </section>

        <section className="cc-card" aria-label="Product uploader">
          <div className="cc-label" style={{ marginBottom: 4 }}>ShopMy products</div>
          <div className="cc-hint" style={{ marginBottom: 10 }}>
            Upload a photo and note the store. Then tell Claude to process your products. Claude finds the product page, checks the commission on ShopMy, skips anything that does not pay, and shows you each one for a yes or no before it is posted.
          </div>
          <label className="cc-btn on" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            {busy ? 'Adding...' : 'Upload photos'}
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
          </label>
          <div className="cc-prods">
            {products.map((p) => (
              <div key={p.id} className="cc-prod">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={p.name || 'Product photo'} />
                <input placeholder="Item name" value={p.name} onChange={(e) => editProduct(p.id, { name: e.target.value })} onBlur={() => saveProduct(p)} />
                <input placeholder="Store (Target, Costco)" value={p.store} onChange={(e) => editProduct(p.id, { store: e.target.value })} onBlur={() => saveProduct(p)} />
                <input placeholder="Link (optional)" value={p.link} onChange={(e) => editProduct(p.id, { link: e.target.value })} onBlur={() => saveProduct(p)} />
                <div className="cc-hint">
                  {STATUS_LABEL[p.status]}
                  {p.commission ? ` · ${p.commission} commission` : ''}
                </div>
                <button type="button" className="cc-btn" onClick={() => removeProduct(p)}>Remove</button>
              </div>
            ))}
          </div>
          {shopMsg ? <div className="cc-hint" style={{ marginTop: 10, color: '#f2a0b5' }}>{shopMsg}</div> : null}
          {products.length === 0 && !shopMsg ? <div className="cc-hint" style={{ marginTop: 10 }}>No products yet.</div> : null}
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
