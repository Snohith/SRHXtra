"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Article } from "@srh/contracts";
import { ApiError, api } from "@/lib/api";
import { RequireAuth } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";

const PAGE_SIZE = 10;

function ArticlesManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number, s: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminArticles({
        page: p,
        pageSize: PAGE_SIZE,
        status: s || undefined,
        search: q || undefined,
      });
      setArticles(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load articles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, status, committedSearch);
  }, [page, status, committedSearch, load]);

  // Debounce the search box into a committed query (resets to page 1).
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setCommittedSearch(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Articles</h1>
          <p className="sub">Search, filter, and open drafts for editing.</p>
        </div>
        <Link className="btn primary" href="/articles/new">
          New article
        </Link>
      </div>
      <div className="panel">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search title or body…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            <option value="DRAFT">Drafts</option>
            <option value="IN_REVIEW">In review</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        {error && <div className="alert error">{error}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : articles.length === 0 ? (
          <p className="muted">No articles match. Create the first one.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th>Last modified</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    <br />
                    <span className="muted small">
                      /{a.slug} · {a.categoryName ?? "Uncategorized"}
                    </span>
                  </td>
                  <td>{a.authorName ?? "—"}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="small">{new Date(a.updatedAt).toLocaleString()}</td>
                  <td>
                    <Link className="btn" href={`/articles/${a.id}`}>
                      {a.status === "DRAFT" ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pager">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">
            ← Prev
          </button>
          <span>
            Page {page} of {pages} · {total} total
          </span>
          <button
            className="btn"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            type="button"
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}

export default function ArticlesPage() {
  return (
    <RequireAuth>
      <ArticlesManager />
    </RequireAuth>
  );
}
