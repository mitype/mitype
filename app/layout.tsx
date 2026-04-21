import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mitype — Find Your Type",
  description: "A dating platform for creative professionals. Connect with musicians, artists, writers, photographers and more who share your passions.",
  manifest: "/manifest.json",
  themeColor: "#c8956c",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mitype",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  openGraph: {
    title: "Mitype — Find Your Type",
    description: "Connect with creative professionals who share your passions.",
    type: "website",
    url: "https://mitypeapp.com",
  },
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
        <meta name="theme-color" content="#c8956c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mitype" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}