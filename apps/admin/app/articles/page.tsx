"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Archive,
  ArchiveRestore,
  ChevronsUpDown,
  Eye,
  Inbox,
  Plus,
  Search,
  X,
} from "lucide-react";
import type {
  ArticleSummary,
  ArticleSort,
  BulkArticleAction,
  BulkArticlesResponse,
  Category,
  SortDirection,
} from "@srh/contracts";
import { ApiError, api } from "@/lib/api";
import { RequireAuth, canPublish, useAuth } from "@/lib/auth";
import { formatDate, timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

interface SortState {
  field: ArticleSort;
  dir: SortDirection;
}

function SortableTh({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: ArticleSort;
  sort: SortState;
  onSort: (field: ArticleSort) => void;
}) {
  const active = sort.field === field;
  return (
    <th
      className={`sortable${active ? " active" : ""}`}
      onClick={() => onSort(field)}
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      {label}
      <span className="sortarrow">
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp size={12} strokeWidth={2.6} />
          ) : (
            <ArrowDown size={12} strokeWidth={2.6} />
          )
        ) : (
          <ChevronsUpDown size={12} />
        )}
      </span>
    </th>
  );
}

function openLabel(s: ArticleSummary["status"]): string {
  if (s === "DRAFT") return "Edit";
  if (s === "IN_REVIEW") return "Review";
  return "View";
}

function ArticlesManager() {
  const { me } = useAuth();
  const mayPublish = canPublish(me);

  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sort, setSort] = useState<SortState>({
    field: "updated",
    dir: "desc",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");

  // Deep links from the dashboard: /articles?status=PUBLISHED
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("status");
    if (initial && STATUS_TABS.some((t) => t.value === initial)) {
      setStatus(initial);
    }
  }, []);

  const load = useCallback(
    async (p: number, s: string, q: string, cat: string, so: SortState) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.adminArticles({
          page: p,
          pageSize: PAGE_SIZE,
          status: s || undefined,
          search: q || undefined,
          categoryId: cat ? Number(cat) : undefined,
          sort: so.field,
          dir: so.dir,
        });
        setArticles(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load articles.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(page, status, committedSearch, categoryId, sort);
  }, [page, status, committedSearch, categoryId, sort, load]);

  useEffect(() => {
    api
      .categories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  // Debounce the search box into a committed query (resets to page 1).
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setCommittedSearch(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter/sort change starts a fresh page view with no stale selection.
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [status, categoryId, committedSearch, sort]);

  // Keep the status filter shareable via the URL (no navigation).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (status) url.searchParams.set("status", status);
    else url.searchParams.delete("status");
    window.history.replaceState(null, "", url.toString());
  }, [status]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected =
    articles.length > 0 && articles.every((a) => selected.has(a.id));
  const selectedArticles = useMemo(
    () => articles.filter((a) => selected.has(a.id)),
    [articles, selected],
  );
  const showFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showTo = Math.min(page * PAGE_SIZE, total);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const a of articles) next.delete(a.id);
      } else {
        for (const a of articles) next.add(a.id);
      }
      return next;
    });
  }

  function onSort(field: ArticleSort) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: field === "title" ? "asc" : "desc" },
    );
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setCategoryId("");
  }

  const hasFilters = !!(search || status || categoryId);

  async function archive(a: ArticleSummary) {
    if (
      !window.confirm(
        `Archive “${a.title}”?${
          a.status === "PUBLISHED"
            ? " It will disappear from the public site."
            : ""
        }`,
      )
    )
      return;
    setBusyId(a.id);
    setError(null);
    setNotice(null);
    try {
      await api.archiveArticle(a.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
      await load(page, status, committedSearch, categoryId, sort);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not archive article.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function restore(a: ArticleSummary) {
    setBusyId(a.id);
    setError(null);
    setNotice(null);
    try {
      await api.restoreArticle(a.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
      await load(page, status, committedSearch, categoryId, sort);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not restore article.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function summarizeBulk(res: BulkArticlesResponse): string {
    const verb =
      res.action === "archive"
        ? "Archived"
        : res.action === "restore"
          ? "Restored"
          : res.action === "publish"
            ? "Published"
            : "Updated the category for";
    const base = `${verb} ${res.succeeded} article${
      res.succeeded === 1 ? "" : "s"
    }.`;
    if (res.failed === 0) return base;
    const reasons = [
      ...new Set(
        res.results.filter((r) => !r.ok).map((r) => r.error ?? "Unknown error"),
      ),
    ].slice(0, 2);
    return `${base} ${res.failed} skipped — ${reasons.join(" · ")}`;
  }

  async function runBulk(action: BulkArticleAction) {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (action === "archive") {
      const warn = selectedArticles.some((a) => a.status === "PUBLISHED")
        ? " Published stories will disappear from the public site."
        : "";
      if (!window.confirm(`Archive ${ids.length} article(s)?${warn}`)) return;
    }
    if (action === "publish") {
      if (
        !window.confirm(
          `Publish ${ids.length} article(s)? Only stories in review will go live.`,
        )
      )
        return;
    }
    let category: number | undefined;
    if (action === "set-category") {
      category = Number(bulkCategory);
      if (!category) {
        setError("Pick a category for the bulk update first.");
        return;
      }
    }
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.bulkArticles({ ids, action, categoryId: category });
      setNotice(summarizeBulk(res));
      setSelected(new Set());
      await load(page, status, committedSearch, categoryId, sort);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Articles</h1>
          <p className="sub">
            Search, filter, sort — and act on many stories at once.
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn primary" href="/articles/new">
            <Plus size={15} strokeWidth={2.6} />
            New article
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="searchin" style={{ flex: "0 1 320px" }}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search title or body…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search articles"
          />
          {search && (
            <button
              type="button"
              className="searchclear"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            className="btn ghost small"
            type="button"
            onClick={clearFilters}
          >
            <X size={13} />
            Clear filters
          </button>
        )}
        <span className="grow" />
        <div className="segmented" role="tablist" aria-label="Filter by status">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              className={`seg${status === t.value ? " active" : ""}`}
              onClick={() => setStatus(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {notice && <div className="alert ok">{notice}</div>}

      <div className="tablewrap reveal">
        {loading ? (
          <div className="sk-rows">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="sk-row" key={i}>
                <span
                  className="sk sk-line"
                  style={{ width: 15, height: 15 }}
                />
                <div>
                  <div className="sk sk-line" style={{ width: "40%" }} />
                  <div
                    className="sk sk-line"
                    style={{ width: "24%", marginTop: 8, height: 9 }}
                  />
                </div>
                <span className="sk sk-line" style={{ width: 90 }} />
                <span className="sk sk-line" style={{ width: 66 }} />
                <span className="sk sk-line" style={{ width: 74 }} />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="empty">
            <span className="empty-ico">
              <Inbox size={22} />
            </span>
            <h3>{hasFilters ? "No stories match" : "No articles yet"}</h3>
            <p>
              {hasFilters
                ? "Try a different search, status, or category — or clear the filters."
                : "Create the first draft and it will show up right here."}
            </p>
            {hasFilters ? (
              <button className="btn" type="button" onClick={clearFilters}>
                <X size={14} />
                Clear filters
              </button>
            ) : (
              <Link className="btn primary" href="/articles/new">
                <Plus size={15} strokeWidth={2.6} />
                New article
              </Link>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table articles-table">
              <thead>
                <tr>
                  <th className="checkcol">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Select all articles on this page"
                    />
                  </th>
                  <SortableTh
                    label="Title"
                    field="title"
                    sort={sort}
                    onSort={onSort}
                  />
                  <th className="col-author">Author</th>
                  <th>Status</th>
                  <SortableTh
                    label="Published"
                    field="published"
                    sort={sort}
                    onSort={onSort}
                  />
                  <SortableTh
                    label="Updated"
                    field="updated"
                    sort={sort}
                    onSort={onSort}
                  />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className={selected.has(a.id) ? "sel" : ""}>
                    <td className="checkcol">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleOne(a.id)}
                        aria-label={`Select ${a.title}`}
                      />
                    </td>
                    <td>
                      {a.status === "ARCHIVED" ? (
                        <span className="row-title">{a.title}</span>
                      ) : (
                        <Link
                          className="row-title"
                          href={`/articles/${a.id}`}
                          title="Open the editor"
                        >
                          {a.title}
                        </Link>
                      )}
                      <span className="row-sub">
                        <span className="rowsup">/{a.slug}</span>
                        <span aria-hidden="true">·</span>
                        <span className="rowcat">
                          {a.categoryName ?? "Uncategorized"}
                        </span>
                      </span>
                    </td>
                    <td className="col-author">
                      <span className="hstack" style={{ gap: 8 }}>
                        <Avatar name={a.authorName} size={26} />
                        <span className="small">{a.authorName ?? "—"}</span>
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="col-date col-published">
                      {a.publishedAt ? formatDate(a.publishedAt) : "—"}
                    </td>
                    <td className="col-date" title={a.updatedAt}>
                      {timeAgo(a.updatedAt)}
                    </td>
                    <td>
                      <div className="row-actions">
                        {a.status !== "ARCHIVED" && (
                          <Link
                            className="btn small"
                            href={`/articles/${a.id}`}
                          >
                            <Eye size={13} />
                            {openLabel(a.status)}
                          </Link>
                        )}
                        {a.status === "ARCHIVED" ? (
                          <button
                            className="btn small"
                            disabled={busyId === a.id}
                            onClick={() => void restore(a)}
                            type="button"
                          >
                            <ArchiveRestore size={13} />
                            {busyId === a.id ? "Restoring…" : "Restore"}
                          </button>
                        ) : (
                          <button
                            className="btn small ghost"
                            disabled={busyId === a.id}
                            onClick={() => void archive(a)}
                            type="button"
                            title={`Archive ${a.title}`}
                          >
                            <Archive size={13} />
                            {busyId === a.id ? "Archiving…" : "Archive"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pager">
          <span className="pager-info">
            Showing{" "}
            <b>
              {showFrom}–{showTo}
            </b>{" "}
            of <b>{total}</b> stories
          </span>
          <div className="pager-controls">
            <button
              className="btn small"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              type="button"
            >
              ← Prev
            </button>
            <span className="small">
              Page {page} / {pages}
            </span>
            <button
              className="btn small"
              disabled={page >= pages || loading}
              onClick={() => setPage(page + 1)}
              type="button"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bulkbar" role="region" aria-label="Bulk actions">
          <span className="count">{selected.size} selected</span>
          <button
            className="btn small danger"
            disabled={bulkBusy}
            onClick={() => void runBulk("archive")}
            type="button"
          >
            <Archive size={13} />
            Archive
          </button>
          {mayPublish && (
            <button
              className="btn small primary"
              disabled={bulkBusy}
              onClick={() => void runBulk("publish")}
              type="button"
            >
              Publish
            </button>
          )}
          <button
            className="btn small"
            disabled={bulkBusy}
            onClick={() => void runBulk("restore")}
            type="button"
          >
            <ArchiveRestore size={13} />
            Restore
          </button>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            aria-label="Set category for selected articles"
          >
            <option value="">Set category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            className="btn small"
            disabled={bulkBusy || !bulkCategory}
            onClick={() => void runBulk("set-category")}
            type="button"
          >
            Apply
          </button>
          {bulkBusy && <span className="small">Working…</span>}
          <button
            className="btn small ghost bulk-x"
            disabled={bulkBusy}
            onClick={() => setSelected(new Set())}
            type="button"
            aria-label="Clear selection"
          >
            <X size={13} />
            Clear
          </button>
        </div>
      )}
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
