import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Turns away known AI training and scraping crawlers before any page or
// data is served. Normal browsers, search engines (Googlebot, Bingbot),
// social link previews, Stripe/PayPal webhooks and Vercel crons are not
// matched, so nothing user-facing is affected.
const AI_BOTS =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|Claude-User|Claude-SearchBot|CCBot|Google-Extended|GoogleOther|PerplexityBot|Perplexity-User|Bytespider|Amazonbot|Applebot-Extended|cohere-ai|cohere-training-data-crawler|Diffbot|FacebookBot|meta-externalagent|meta-externalfetcher|ImagesiftBot|Omgili|omgilibot|Timpibot|VelenPublicWebCrawler|Scrapy|YouBot|Ai2Bot|AI2Bot|DuckAssistBot|MistralAI-User|PetalBot|SemrushBot|AhrefsBot|MJ12bot|DataForSeoBot|img2dataset/i;

export function proxy(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
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
    '/((?!_next/static|_next/image|favicon.ico|monitoring|api/cron|api/webhooks|api/stripe|api/paypal|manifest.json|icon-|apple-touch-icon).*)',
  ],
};
