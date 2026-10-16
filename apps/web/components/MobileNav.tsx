"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/squad", label: "Squad" },
  { href: "/matches", label: "Matches" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="menu-btn"
        type="button"
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        onClick={() => setOpen(!open)}
      >
        {open ? "✕ Close" : "☰ Menu"}
      </button>
      {open && (
        <nav className="nav-mobile" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
