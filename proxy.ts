import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Turns away known AI training and scraping crawlers before any page or
// data is served. Normal browsers, search engines (Googlebot, Bingbot),
// social link previews, Stripe/PayPal webhooks and Vercel crons are not
// matched, so nothing user-facing is affected.
const AI_BOTS =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|Claude-User|Claude-SearchBot|CCBot|Google-Extended|GoogleOther|PerplexityBot|Perplexity-User|Bytespider|Amazonbot|Applebot-Extended|cohere-ai|cohere-training-data-crawler|Diffbot|FacebookBot|meta-externalagent|meta-externalfetcher|ImagesiftBot|Omgili|omgilibot|Timpibot|VelenPublicWebCrawler|Scrapy|YouBot|Ai2Bot|AI2Bot|DuckAssistBot|MistralAI-User|PetalBot|SemrushBot|AhrefsBot|MJ12bot|DataForSeoBot|img2dataset/i;

// Best effort per-IP limiter for /api routes. Memory is per server
// instance, so it will not catch a distributed attack (use the Vercel
// Firewall for that), but it stops one machine from hammering the API.
// The cap is high enough that real users and shared networks never hit it.
const WINDOW_MS = 60_000;
const MAX_API_PER_WINDOW = 300;
const hits = new Map<string, { count: number; start: number }>();

function tooManyApiCalls(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_API_PER_WINDOW;
}

export function proxy(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (tooManyApiCalls(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }
  }
  if (AI_BOTS.test(ua)) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'X-Robots-Tag': 'noindex, nofollow, noai, noimageai' },
    });
  }
  return NextResponse.next();
}

export const config = {
  // Skip static assets, the monitoring tunnel and cron/webhook endpoints.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|monitoring|api/cron|api/webhooks|api/push|api/stripe|api/paypal|manifest.json|sw.js|icon-|apple-touch-icon).*)',
  ],
};
