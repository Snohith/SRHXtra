"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Article, Category } from "@srh/contracts";
import { ApiError, api } from "@/lib/api";
import { RequireAuth, canPublish, useAuth } from "@/lib/auth";
import { isBodyEmpty } from "@/lib/content";
import ArticleForm from "@/components/ArticleForm";
import StatusBadge from "@/components/StatusBadge";

interface Checklist {
  ok: boolean;
  label: string;
}

function readiness(article: Article): Checklist[] {
  return [
    { ok: article.title.trim().length > 0, label: "Title" },
    { ok: !isBodyEmpty(article.body), label: "Body content" },
    { ok: article.categoryId != null, label: "Category" },
    { ok: !!article.excerpt?.trim(), label: "Summary" },
    { ok: !!article.coverImageUrl, label: "Featured image" },
  ];
}

function Editor({ id }: { id: string }) {
  const { me } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([api.getArticle(id), api.categories()]);
      setArticle(a);
      setCategories(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load article.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(kind: "submit" | "publish") {
    if (!article) return;
    setError(null);
    setNotice(null);
    setActing(true);
    try {
      const next =
        kind === "submit"
          ? await api.submitArticle(article.id)
          : await api.publishArticle(article.id);
      setArticle(next);
      setNotice(
        kind === "submit"
          ? "Submitted for review — a revision was recorded."
          : "Published — a revision was recorded.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${kind} failed.`);
    } finally {
      setActing(false);
    }
  }

  if (loading) return <p className="muted">Loading article…</p>;
  if (!article) return <div className="alert error">{error ?? "Article not found."}</div>;

  const checks = readiness(article);
  const ready = checks.every((c) => c.ok);
  const editable = article.status === "DRAFT";
  const mayPublish = canPublish(me);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{article.title}</h1>
          <p className="sub">
            <StatusBadge status={article.status} /> · by {article.authorName ?? "—"} · updated{" "}
            {new Date(article.updatedAt).toLocaleString()}
          </p>
        </div>
        <Link className="btn" href="/articles">
          ← All articles
        </Link>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert ok">{notice}</div>}

      <div className="panel">
        <h2>Publishing</h2>
        <ul className="checklist">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "yes" : "no"}>
              {c.ok ? "✓" : "○"} {c.label}
            </li>
          ))}
        </ul>
        {!ready && (
          <p className="muted small">
            Complete every item before submitting — the review queue should never hold
            unfinished drafts.
          </p>
        )}
        <div className="btnrow">
          {article.status === "DRAFT" && (
            <button
              className="btn primary"
              type="button"
              disabled={acting || !ready}
              title={!ready ? "Complete all checklist items first." : "Send to review"}
              onClick={() => void transition("submit")}
            >
              {acting ? "Working…" : "Submit for review"}
            </button>
          )}
          {article.status === "IN_REVIEW" && mayPublish && (
            <button
              className="btn primary"
              type="button"
              disabled={acting}
              onClick={() => void transition("publish")}
            >
              {acting ? "Publishing…" : "Publish"}
            </button>
          )}
          {article.status === "IN_REVIEW" && !mayPublish && (
            <p className="muted small">
              Awaiting review — publishing requires an editor, publisher, or admin role.
              Your role: {me?.roles.join(", ") ?? "none"}.
            </p>
          )}
          {article.status === "PUBLISHED" && (
            <p className="muted small">
              Published {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : ""} —
              articles are forward-only, so this page is now read-only.
            </p>
          )}
        </div>
      </div>

      {editable ? (
        <ArticleForm
          article={article}
          categories={categories}
          savingLabel="Save draft"
          onSaved={(next) => {
            setArticle(next);
            setNotice("Draft saved — a revision was recorded.");
          }}
        />
      ) : (
        <div className="panel">
          <h2>Content (read-only)</h2>
          <p className="muted small">
            Only drafts can be edited — every save, submit, and publish records a new
            revision on the server.
          </p>
        </div>
      )}
    </>
  );
}

export default function EditArticlePage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <Editor id={params.id} />
    </RequireAuth>
  );
}
