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

const nextConfig: NextConfig = {
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
