import type { Metadata } from "next";

import "./globals.css";

const URL = "https://indian-alpha.vercel.app";
const TITLE = "India Alpha — Sovereign Founder Intelligence";
const DESC =
  "75 episodes of WTF + The BarberShop, distilled into 8 verified playbooks, 51 sourced strategies, 39 market gaps and a 71-resource link-verified founder library. Built for Nikhil Kamath and Shantanu Deshpande.";

export const metadata: Metadata = {
  metadataBase: new globalThis.URL(URL),
  title: TITLE,
  description: DESC,
  applicationName: "India Alpha",
  authors: [{ name: "Sravan Sridhar" }],
  keywords: [
    "Indian founders",
    "WTF Podcast",
    "Nikhil Kamath",
    "Shantanu Deshpande",
    "BarberShop",
    "founder library",
    "venture capital India",
    "DPIIT",
    "Rainmatter",
    "WTFund",
  ],
  openGraph: {
    type: "website",
    url: URL,
    siteName: "India Alpha",
    title: TITLE,
    description: DESC,
    locale: "en_IN",
    // images auto-wired from app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    // images auto-wired from app/twitter-image.tsx (falls back to opengraph-image)
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  themeColor: "#0a0a0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
