import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "India Alpha · Sovereign Intel",
  description:
    "A 100% offline, native intelligence terminal of business strategies, market gaps and execution playbooks distilled from India's highest-signal founder podcasts.",
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
