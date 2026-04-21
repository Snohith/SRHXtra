import type { ReactNode } from "react";

import { Outfit, Plus_Jakarta_Sans } from "next/font/google";

import "@/styles/globals.css";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getSiteConfig } from "@/lib/content/site";
import { getOrganizationJsonLd } from "@/lib/seo/jsonld";
import { buildBaseMetadata } from "@/lib/seo/metadata";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = buildBaseMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  const site = getSiteConfig();
  const organizationJsonLd = getOrganizationJsonLd();

  return (
    <html className={`${outfit.variable} ${jakarta.variable}`} lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="font-body">
        <div className="min-h-screen">
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            type="application/ld+json"
          />
          <Navbar site={site} />
          <main className="shell-wide py-8 sm:py-10 lg:py-12">{children}</main>
          <Footer site={site} />
        </div>
      </body>
    </html>
  );
}
