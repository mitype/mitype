import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "./lib/toast";
import { InstallPrompt } from "./components/InstallPrompt";
import { UnreadTitleSync } from "./components/UnreadTitleSync";
import { NewMessageToastListener } from "./components/NewMessageToastListener";
import { PresenceTracker } from "./components/PresenceTracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mitypeapp.com"),
  title: "Mitype — Find Your Type of Creator",
  description:
    "A creative networking platform where musicians, writers, artists, photographers, chefs and other creators connect, collaborate, and build friendships around shared crafts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mitype",
  },
  openGraph: {
    title: "Mitype — Find Your Type of Creator",
    description:
      "A creative networking platform for musicians, writers, artists, photographers, chefs, and creators of every kind to connect, collaborate, and build friendships.",
    type: "website",
    url: "https://www.mitypeapp.com",
    siteName: "Mitype",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mitype — Find Your Type of Creator",
    description:
      "A creative networking platform for musicians, writers, artists, photographers, chefs, and creators of every kind to connect, collaborate, and build friendships.",
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
        <InstallPrompt />
        <UnreadTitleSync />
        <NewMessageToastListener />
        <PresenceTracker />
      </body>
    </html>
  );
}
