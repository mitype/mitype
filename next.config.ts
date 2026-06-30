import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Derive the Supabase hostname so next/image can optimize avatars from
// Supabase Storage. Falls back to the known production host if the env var
// isn't set at build time (prevents cryptic build errors on Vercel).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseHostname = "xjwttqlmpkldgyikgiut.supabase.co";
try {
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname;
} catch {
  // ignore invalid URL, use fallback
}

// Security headers applied to every response. These are a baseline
// "defense in depth" layer — the actual access control is enforced by
// Supabase RLS + the per-page subscription gates, but these headers
// reduce the impact of any class of attacker even if something does
// slip through.
const securityHeaders = [
  // Tell browsers never to load the site over plain HTTP. Two-year max-age.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block the site from being iframed (clickjacking defense).
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full URL to other origins on link clicks.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down browser permissions to the surfaces we actually use.
  // We use mic (voice notes), camera (avatar uploads), and clipboard
  // (copy invite link). Everything else is denied.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), gyroscope=(), payment=(self)",
  },
  // Don't expose the X-Powered-By: Next.js header that advertises the stack.
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Strip the X-Powered-By header so we don't advertise the stack.
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    // Next.js 16 requires qualities to be explicitly allowlisted.
    qualities: [60, 75, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
};

// Wrap with Sentry to upload source maps + tunnel /monitoring to bypass
// ad-blockers. The `silent` flag stops the wrapper from spamming the
// build log on every deploy. `widenClientFileUpload` makes sure source
// maps cover lazy-loaded chunks too so stack traces stay readable.
export default withSentryConfig(nextConfig, {
  org: "mitype",
  project: "mitypeapp",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
