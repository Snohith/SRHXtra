"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/articles", label: "Articles" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, signOut } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          SRH <span>Xtra</span> · Admin
        </div>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            className={`navlink${pathname === l.href ? " active" : ""}`}
            href={l.href}
          >
            {l.label}
          </Link>
        ))}
        <div className="sidefoot">
          {me ? (
            <>
              <span>
                {me.displayName ?? me.email}
                <br />
                {me.roles.join(", ")}
              </span>
              <button className="btn" onClick={signOut} type="button">
                Sign out
              </button>
            </>
          ) : (
            <Link className="navlink" href="/login">
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
