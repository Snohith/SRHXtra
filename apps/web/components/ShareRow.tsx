"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

/**
 * Article share actions.
 *
 * WhatsApp and X are plain links, so they work with JavaScript disabled and
 * keep the canonical article URL. Copy-link and native share are progressive
 * enhancements: the button only appears when the browser can do it, and the
 * clipboard path falls back to a temporary textarea (exempt from the site's
 * content-protection copy guard) on older or non-secure contexts.
 */
export default function ShareRow({
  url,
  title,
}: {
  /** Absolute, canonical article URL. */
  url: string;
  title: string;
}) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      setCanNativeShare(
        typeof navigator.share === "function" &&
          (typeof navigator.canShare !== "function" ||
            navigator.canShare({ url, title })),
      );
    } catch {
      // Some embedded browsers expose share but throw from canShare.
      setCanNativeShare(typeof navigator.share === "function");
    }
  }, [url, title]);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  function announce(status: CopyStatus) {
    window.clearTimeout(resetTimer.current);
    setCopyStatus(status);
    resetTimer.current = window.setTimeout(() => setCopyStatus("idle"), 2200);
  }

  async function copyLink() {
    announce((await writeClipboard(url)) ? "copied" : "failed");
  }

  async function shareNative() {
    try {
      await navigator.share({ title, url });
    } catch (error) {
      // A cancelled share sheet is not a failure; anything else falls back to
      // copying so the reader still gets the link.
      if ((error as { name?: string } | null)?.name !== "AbortError") {
        await copyLink();
      }
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  const xHref = `https://x.com/intent/post?${new URLSearchParams({
    text: title,
    url,
    via: "SRH_Xtra",
  })}`;

  return (
    <div className="share-row" role="group" aria-label="Share this article">
      <span className="share-label">Share</span>

      <a
        className="share-btn share-wa"
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
      >
        <WhatsAppIcon />
        <span className="share-text">WhatsApp</span>
      </a>

      <a
        className="share-btn share-x"
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
      >
        <XIcon />
        <span className="share-text">X</span>
      </a>

      <button
        className="share-btn share-copy"
        type="button"
        onClick={copyLink}
        data-status={copyStatus}
        aria-label="Copy link to this article"
      >
        {copyStatus === "copied" ? <CheckIcon /> : <CopyIcon />}
        <span className="share-text">
          {copyStatus === "copied"
            ? "Copied"
            : copyStatus === "failed"
              ? "Copy failed"
              : "Copy link"}
        </span>
      </button>

      {canNativeShare && (
        <button
          className="share-btn share-native"
          type="button"
          onClick={shareNative}
          aria-label="Share this article via your device"
        >
          <ShareIcon />
          <span className="share-text">Share</span>
        </button>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus === "copied"
          ? "Link copied to clipboard."
          : copyStatus === "failed"
            ? "Could not copy the link."
            : ""}
      </span>
    </div>
  );
}

/**
 * Clipboard API first; temporary textarea last. The textarea is intentional:
 * ContentProtection exempts form fields from its copy guard, so the fallback
 * keeps working on HTTP origins and older browsers.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea path */
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "-9999px";
  field.setAttribute("aria-hidden", "true");
  document.body.appendChild(field);
  try {
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

/* Icons: inline so the share row adds no network requests. */

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 5.5v-1A2.5 2.5 0 0 0 13 2H5.5A2.5 2.5 0 0 0 3 4.5V12a2.5 2.5 0 0 0 2.5 2.5h1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </svg>
  );
}
