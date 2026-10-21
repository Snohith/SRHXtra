"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Plus,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import Avatar from "./Avatar";
import CommandPalette from "./CommandPalette";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/articles", label: "Articles", icon: Newspaper },
  { href: "/media", label: "Media", icon: Images },
];

/** Breadcrumb label for the current route. */
function crumbFor(pathname: string): { head: string; tail?: string } {
  if (pathname === "/") return { head: "Overview" };
  if (pathname === "/articles") return { head: "Articles" };
  if (pathname === "/articles/new")
    return { head: "Articles", tail: "New article" };
  if (pathname.startsWith("/articles/"))
    return { head: "Articles", tail: "Editor" };
  if (pathname === "/media") return { head: "Media library" };
  if (pathname === "/login") return { head: "Sign in" };
  return { head: "Admin" };
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, signOut, token } = useAuth();
  const { theme, toggle } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Collapse the mobile drawer on navigation.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Global ⌘K / Ctrl+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const crumb = useMemo(() => crumbFor(pathname), [pathname]);
  const isLogin = pathname === "/login";

  return (
    <div className={`app${isLogin ? " plain" : ""}`}>
      {!isLogin && (
        <>
          <aside className={`side${navOpen ? " open" : ""}`}>
            <div className="side-top">
              <Link className="brand" href="/">
                <span className="brand-mark">X</span>
                <span className="brand-text">
                  SRH <em>Xtra</em>
                  <span className="brand-chip">Newsroom OS</span>
                </span>
              </Link>
              <nav className="nav" aria-label="Primary">
                <div className="nav-label">Workspace</div>
                {LINKS.map((l) => {
                  const active =
                    l.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(l.href);
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      className={`navlink${active ? " active" : ""}`}
                      href={l.href}
                    >
                      <Icon size={17} strokeWidth={2} />
                      {l.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="side-bottom">
              <Link className="side-new" href="/articles/new">
                <Plus size={16} strokeWidth={2.4} />
                New article
              </Link>
              {me ? (
                <div className="side-user">
                  <Avatar name={me.displayName ?? me.email} size={32} />
                  <span className="side-user-info">
                    <span className="side-user-name">
                      {me.displayName ?? me.email}
                    </span>
                    <span className="side-user-roles">
                      {me.roles.join(" · ")}
                    </span>
                  </span>
                  <button
                    className="iconbtn"
                    onClick={signOut}
                    type="button"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link className="navlink" href="/login">
                  Sign in
                </Link>
              )}
            </div>
          </aside>
          {navOpen && (
            <button
              type="button"
              className="scrim"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
            />
          )}
        </>
      )}

      <div className="body">
        {!isLogin && (
          <header className="topbar">
            <button
              className="iconbtn burger"
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="crumb">
              {crumb.tail ? (
                <>
                  <span className="crumb-dim">{crumb.head}</span>
                  <span className="crumb-sep">/</span>
                  <span>{crumb.tail}</span>
                </>
              ) : (
                <span>{crumb.head}</span>
              )}
            </div>
            <div className="topbar-right">
              {token && (
                <button
                  type="button"
                  className="search-trigger"
                  onClick={() => setPaletteOpen(true)}
                >
                  <Search size={15} />
                  <span>Search or jump to…</span>
                  <span className="kbd">⌘K</span>
                </button>
              )}
              <button
                type="button"
                className="iconbtn"
                onClick={toggle}
                title={
                  theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
                }
                aria-label={
                  theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
                }
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          </header>
        )}

        <main className="main">{children}</main>
      </div>

      {paletteOpen && token && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}
