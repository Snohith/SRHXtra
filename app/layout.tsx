import type { ReactNode } from "react";

import { Outfit, Plus_Jakarta_Sans } from "next/font/google";

import "@/styles/globals.css";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getSiteConfig } from "@/lib/content/site";
import { getOrganizationJsonLd, getWebsiteJsonLd } from "@/lib/seo/jsonld";
import { buildBaseMetadata, buildBaseViewport } from "@/lib/seo/metadata";

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

export const metadata = {
  ...buildBaseMetadata(),
  verification: {
    google: "Aml-PVKvuQ9NV_ptwl8NC1zkrlr6Jcof1JBhpBwI2_0",
  },
};

export const viewport = buildBaseViewport();

export default function RootLayout({ children }: { children: ReactNode }) {
  const site = getSiteConfig();
  const organizationJsonLd = getOrganizationJsonLd();
  const websiteJsonLd = getWebsiteJsonLd();

  return (
    <html className={`${outfit.variable} ${jakarta.variable}`} lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-RC7HGXJQ7M"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-RC7HGXJQ7M');
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-body">
        <div className="min-h-screen">
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            type="application/ld+json"
          />
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
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
