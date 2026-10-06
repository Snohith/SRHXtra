"use client";

import { useState } from "react";

interface ShareButtonsProps {
  title: string;
  path: string;
}

export function ShareButtons({ title, path }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const shareTargets = [
    {
      label: "Post on X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(path)}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${path}`)}`,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shareTargets.map((target) => (
        <a
          key={target.label}
          href={target.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-foreground transition hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent"
        >
          {target.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-border bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-accent"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
