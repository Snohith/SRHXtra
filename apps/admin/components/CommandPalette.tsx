"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Images,
  LayoutDashboard,
  LogOut,
  Moon,
  Newspaper,
  Search,
  SquarePen,
  Sun,
} from "lucide-react";
import type { ArticleSummary } from "@srh/contracts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import StatusBadge from "./StatusBadge";

interface Props {
  onClose: () => void;
}

interface Item {
  key: string;
  group: string;
  icon: React.ReactNode;
  title: string;
  sub?: string;
  kbd?: string;
  badge?: React.ReactNode;
  run: () => void;
}

/** ⌘K command palette — jump to pages, search stories, quick actions. */
export default function CommandPalette({ onClose }: Props) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { theme, toggle } = useTheme();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArticleSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus the input the moment the palette opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape always closes, even when focus drifts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = useCallback(
    (path: string) => {
      onClose();
      router.push(path);
    },
    [onClose, router],
  );

  const navItems: Item[] = useMemo(
    () => [
      {
        key: "nav-dashboard",
        group: "Navigate",
        icon: <LayoutDashboard size={16} />,
        title: "Dashboard",
        sub: "Pipeline at a glance",
        run: () => go("/"),
      },
      {
        key: "nav-articles",
        group: "Navigate",
        icon: <Newspaper size={16} />,
        title: "Articles",
        sub: "Search, filter, bulk actions",
        run: () => go("/articles"),
      },
      {
        key: "nav-media",
        group: "Navigate",
        icon: <Images size={16} />,
        title: "Media library",
        sub: "Uploads and featured images",
        run: () => go("/media"),
      },
      {
        key: "nav-new",
        group: "Navigate",
        icon: <SquarePen size={16} />,
        title: "New article",
        sub: "Start a fresh draft",
        kbd: "N",
        run: () => go("/articles/new"),
      },
    ],
    [go],
  );

  const actionItems: Item[] = useMemo(
    () => [
      {
        key: "act-theme",
        group: "Actions",
        icon: theme === "dark" ? <Sun size={16} /> : <Moon size={16} />,
        title:
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        run: () => {
          toggle();
          onClose();
        },
      },
      {
        key: "act-signout",
        group: "Actions",
        icon: <LogOut size={16} />,
        title: "Sign out",
        run: () => {
          onClose();
          signOut();
        },
      },
    ],
    [theme, toggle, onClose, signOut],
  );

  // Debounced server-side article search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.adminArticles({
          page: 1,
          pageSize: 6,
          search: q,
        });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const q = query.trim().toLowerCase();
  const items: Item[] = useMemo(() => {
    const commands = [...navItems, ...actionItems].filter(
      (i) => !q || i.title.toLowerCase().includes(q),
    );
    const articleItems: Item[] =
      q.length >= 2
        ? results.map((a) => ({
            key: `art-${a.id}`,
            group: "Articles",
            icon: <ArrowUpRight size={16} />,
            title: a.title,
            sub: `/${a.slug} · updated ${timeAgo(a.updatedAt)}`,
            badge: <StatusBadge status={a.status} />,
            run: () => go(`/articles/${a.id}`),
          }))
        : [];
    return [...commands, ...articleItems];
  }, [q, navItems, actionItems, results, go]);

  // Keep a valid active index as the list changes.
  useEffect(() => {
    setActive(0);
  }, [query, results.length]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    }
  }

  // Scroll the active row into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup = "";

  return (
    <div className="palette-overlay" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="palette-head">
          <Search size={17} />
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            placeholder="Search articles or jump to a page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search articles or jump to a page"
          />
          <span className="kbd">esc</span>
        </div>

        <div className="palette-body" ref={listRef}>
          {items.length === 0 ? (
            <div className="palette-empty">
              {searching
                ? "Searching stories…"
                : "No commands or stories match that."}
            </div>
          ) : (
            items.map((item, idx) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.key}>
                  {showGroup && (
                    <div className="palette-group">{item.group}</div>
                  )}
                  <button
                    type="button"
                    data-idx={idx}
                    className={`pi${idx === active ? " active" : ""}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={item.run}
                  >
                    <span className="pi-ico">{item.icon}</span>
                    <span className="pi-text">
                      <span className="pi-title">{item.title}</span>
                      {(item.sub || item.badge) && (
                        <span className="pi-meta">
                          {item.sub && (
                            <span className="pi-sub">{item.sub}</span>
                          )}
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {item.kbd && <span className="kbd">{item.kbd}</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="palette-foot">
          <span>
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> navigate
          </span>
          <span>
            <span className="kbd">↵</span> open
          </span>
          <span>
            <span className="kbd">esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
