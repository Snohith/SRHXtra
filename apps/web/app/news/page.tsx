import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import NewsFilters from "@/components/NewsFilters";
import { getCategories, getFeed } from "@/lib/api";

export const revalidate = 60;

interface SearchParams {
  page?: string;
  category?: string;
  search?: string;
  sort?: string;
}

export const metadata: Metadata = {
  title: "Latest SRH news",
  description:
    "All Sunrisers Hyderabad stories — news, match reports, squad updates, and analysis.",
  alternates: { canonical: "/news" },
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const [feed, categories] = await Promise.all([
    getFeed({
      page,
      pageSize: 12,
      category: params.category || undefined,
      search: params.search || undefined,
      sort,
    }),
    getCategories(),
  ]);

  const pages = Math.max(1, Math.ceil(feed.total / 12));
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.search) q.set("search", params.search);
  if (sort !== "newest") q.set("sort", sort);
  const pageHref = (p: number) => {
    const next = new URLSearchParams(q);
    next.set("page", String(p));
    return `/news?${next}`;
  };

  return (
    <div className="wrap">
      <h1 style={{ margin: "4px 0 2px" }}>News</h1>
      <p className="meta" style={{ marginBottom: 12 }}>
        Every published SRH story, newest first unless you sort otherwise.
      </p>
      <Suspense>
        <NewsFilters categories={categories} />
      </Suspense>
      {feed.data.length === 0 ? (
        <div className="empty" data-reveal="">
          <strong>No stories match.</strong>
          <br />
          Try a different search or topic.
        </div>
      ) : (
        <div className="cards">
          {feed.data.map((a, i) => (
            <ArticleCard key={a.id} article={a} revealDelay={(i % 3) * 60} />
          ))}
        </div>
      )}
      <nav className="pager" aria-label="Pagination" data-reveal="">
        {page > 1 ? (
          <Link className="btn" href={pageHref(page - 1)}>
            ← Newer
          </Link>
        ) : (
          <button className="btn" disabled type="button">
            ← Newer
          </button>
        )}
        <span>
          Page {page} of {pages} · {feed.total}{" "}
          {feed.total === 1 ? "story" : "stories"}
        </span>
        {page < pages ? (
          <Link className="btn" href={pageHref(page + 1)}>
            Older →
          </Link>
        ) : (
          <button className="btn" disabled type="button">
            Older →
          </button>
        )}
      </nav>
    </div>
  );
}
