import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_URL } from "@/lib/api";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SRH News — Sunrisers Hyderabad news, reports & analysis",
    template: "%s · SRH News",
  },
  description:
    "Breaking SRH news, match reports, squad updates, and tactical analysis for Sunrisers Hyderabad fans.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "SRH News",
    title: "SRH News — Sunrisers Hyderabad news, reports & analysis",
    description:
      "Breaking SRH news, match reports, squad updates, and tactical analysis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SRH News — Sunrisers Hyderabad news, reports & analysis",
    description:
      "Breaking SRH news, match reports, squad updates, and tactical analysis.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main id="content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
