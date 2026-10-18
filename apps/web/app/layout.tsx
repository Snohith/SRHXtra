import type { Metadata } from "next";
import ContentProtection from "@/components/ContentProtection";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_URL } from "@/lib/api";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "SRH Xtra",
  title: {
    default: "SRH Xtra — Sunrisers Hyderabad news, reports & analysis",
    template: "%s · SRH Xtra",
  },
  description:
    "Breaking SRH news, match reports, squad updates, and tactical analysis for Sunrisers Hyderabad.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "SRH Xtra",
    title: "SRH Xtra — Sunrisers Hyderabad news, reports & analysis",
    description:
      "Breaking SRH news, match reports, squad updates, and tactical analysis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SRH Xtra — Sunrisers Hyderabad news, reports & analysis",
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
      <body id="top">
        <ContentProtection />
        <SiteHeader />
        <main id="content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
