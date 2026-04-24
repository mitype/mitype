import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "./lib/toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mitypeapp.com"),
  title: "Mitype — Find Your Type",
  description:
    "A dating platform for creative professionals. Connect with musicians, artists, writers, photographers and more who share your passions.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mitype",
  },
  openGraph: {
    title: "Mitype — Find Your Type",
    description:
      "Connect with creative professionals who share your passions — musicians, writers, artists, photographers and more.",
    type: "website",
    url: "https://www.mitypeapp.com",
    siteName: "Mitype",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mitype — Find Your Type",
    description:
      "Connect with creative professionals who share your passions.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c8956c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mitype" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
