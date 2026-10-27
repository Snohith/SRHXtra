"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { GA_ID, track } from "@/lib/analytics";

/**
 * GA4 tag + App Router page views.
 *
 * Mounted once in the root layout, so every current and future page — new
 * articles included — is measured without per-page work. `send_page_view` is
 * off and the page view is sent from the route effect instead: client-side
 * navigations are then counted exactly once, and the first load is not
 * double-counted.
 */
export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_ID) return;
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    // StrictMode re-runs effects in dev; also skips no-op re-renders.
    if (lastPath.current === path) return;
    lastPath.current = path;
    track("page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });
(window.__gaQueue || []).forEach(function (e) { gtag('event', e[0], e[1]); });
window.__gaQueue = [];`}
      </Script>
    </>
  );
}
