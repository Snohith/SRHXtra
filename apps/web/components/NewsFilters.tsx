"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category } from "@srh/contracts";

/** Search / category / sort controls — URL is the source of truth. */
export default function NewsFilters({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const urlSearch = params.get("search") ?? "";

  // URL → state, so Back/Forward (or a shared link) wins over stale input.
  // The debounce effect below then sees the two values equal and stays quiet.
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  // Debounce search typing into the URL (resets to page 1).
  useEffect(() => {
    const current = params.get("search") ?? "";
    if (search === current) return;
    const t = setTimeout(() => {
      const q = new URLSearchParams(params.toString());
      if (search.trim()) q.set("search", search.trim());
      else q.delete("search");
      q.delete("page");
      router.push(`${pathname}?${q}`, { scroll: false });
    }, 400);
    return () => clearTimeout(t);
  }, [search, params, pathname, router]);

  function push(next: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") q.delete(k);
      else q.set(k, v);
    }
    router.push(`${pathname}?${q}`, { scroll: false });
  }

  return (
    <div className="toolbar" role="search" data-reveal="">
      <input
        type="text"
        placeholder="Search headlines…"
        aria-label="Search headlines"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        aria-label="Filter by category"
        value={params.get("category") ?? ""}
        onChange={(e) => push({ category: e.target.value || null, page: null })}
      >
        <option value="">All topics</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort order"
        value={params.get("sort") ?? "newest"}
        onChange={(e) => push({ sort: e.target.value, page: null })}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  );
}
