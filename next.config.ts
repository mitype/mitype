import type { NextConfig } from "next";

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

export default nextConfig;
