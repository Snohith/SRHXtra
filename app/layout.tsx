import type { ReactNode } from "react";

import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";

import "@/styles/globals.css";
import TempDown from "@/components/TempDown";
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
  title: "Temporarily Down",
};

export const viewport = buildBaseViewport();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${outfit.variable} ${jakarta.variable}`}
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <meta name="darkreader-lock" />
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-RC7HGXJQ7M"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RC7HGXJQ7M');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning className="font-body">
        <TempDown />
      </body>
    </html>
  );
}
