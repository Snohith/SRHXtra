"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CircleX,
  ListChecks,
  PenLine,
  Rocket,
  Send,
} from "lucide-react";
import type { Article, Category } from "@srh/contracts";
import { ApiError, api } from "@/lib/api";
import { RequireAuth, canPublish, useAuth } from "@/lib/auth";
import { isBodyEmpty } from "@/lib/content";
import { timeAgo } from "@/lib/format";
import ArticleForm from "@/components/ArticleForm";
import Avatar from "@/components/Avatar";
import RevisionHistory from "@/components/RevisionHistory";
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

function EditorSkeleton() {
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="sk sk-title" style={{ width: 320, height: 24 }} />
          <div className="sk sk-line" style={{ width: 220, marginTop: 10 }} />
        </div>
      </div>
      <div className="panel">
        <div className="sk sk-line" style={{ width: 130 }} />
        <div className="hstack" style={{ marginTop: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              className="sk"
              key={i}
              style={{ width: 104, height: 30, borderRadius: 999 }}
            />
          ))}
        </div>
      </div>
      <div className="editor-grid">
        <div className="editor-main">
          <div className="sk" style={{ height: 54, borderRadius: 12 }} />
          <div className="sk" style={{ height: 44, borderRadius: 12 }} />
          <div className="sk" style={{ height: 120, borderRadius: 12 }} />
          <div className="sk" style={{ height: 420, borderRadius: 14 }} />
        </div>
        <div className="editor-rail">
          <div className="sk" style={{ height: 96, borderRadius: 15 }} />
          <div className="sk" style={{ height: 210, borderRadius: 15 }} />
        </div>
      </div>
    </>
  );
}

function Editor({ id }: { id: string }) {
  const { me } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([api.getArticle(id), api.categories()]);
      setArticle(a);
      setCategories(c);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load article.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the schedule picker in sync with the story (default: +1 hour).
  useEffect(() => {
    if (!article) return;
    const base = article.scheduledFor
      ? new Date(article.scheduledFor)
      : new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setScheduleAt(
      `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(
        base.getDate(),
      )}T${pad(base.getHours())}:${pad(base.getMinutes())}`,
    );
  }, [article?.id, article?.scheduledFor]);

  async function run(action: () => Promise<Article>, success: string) {
    setError(null);
    setNotice(null);
    setActing(true);
    try {
      const next = await action();
      setArticle(next);
      setNotice(success);
      return next;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  async function archive() {
    if (!article) return;
    const warning =
      article.status === "PUBLISHED"
        ? " It will disappear from the public site immediately."
        : "";
    if (!window.confirm(`Archive “${article.title}”?${warning}`)) return;
    await run(
      () => api.archiveArticle(article.id),
      "Archived — a revision was recorded.",
    );
  }

  async function schedule() {
    if (!article || !scheduleAt) return;
    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 30_000) {
      setError("Pick a time at least 30 seconds in the future.");
      return;
    }
    await run(
      () => api.scheduleArticle(article.id, when.toISOString()),
      `Scheduled — the worker publishes it automatically at ${when.toLocaleString()}.`,
    );
  }

  async function requestChanges() {
    if (!article) return;
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Add a note for the author before sending it back.");
      return;
    }
    const done = await run(
      () => api.requestChanges(article.id, trimmed),
      "Sent back to the author with your note.",
    );
    if (done) {
      setNote("");
      setNoteOpen(false);
    }
  }

  if (loading) return <EditorSkeleton />;
  if (!article)
    return (
      <div className="alert error">
        <AlertCircle size={16} />
        {error ?? "Article not found."}
      </div>
    );

  const checks = readiness(article);
  const ready = checks.every((c) => c.ok);
  const editable =
    article.status === "DRAFT" ||
    (article.status === "PUBLISHED" && canPublish(me));
  const mayPublish = canPublish(me);

  return (
    <>
      <div className="pagehead">
        <div style={{ minWidth: 0 }}>
          <h1>{article.title || "Untitled"}</h1>
          <p className="sub">
            <StatusBadge status={article.status} />
            <span className="hstack" style={{ gap: 6 }}>
              <Avatar name={article.authorName} size={22} />
              {article.authorName ?? "—"}
            </span>
            <span aria-hidden="true">·</span>
            updated{" "}
            <time
              dateTime={article.updatedAt}
              title={new Date(article.updatedAt).toLocaleString()}
            >
              {timeAgo(article.updatedAt)}
            </time>
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn" href="/articles">
            ← All articles
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {notice && <div className="alert ok">{notice}</div>}

      {article.reviewNote && article.status === "DRAFT" && (
        <div className="alert warn">
          <AlertTriangle size={16} />
          <span>
            <strong>Reviewer note:</strong> {article.reviewNote}
          </span>
        </div>
      )}

      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">
            <ListChecks size={17} />
            Workflow
          </span>
          <span className="hstack">
            {ready && article.status === "DRAFT" && (
              <span className="ready-pill">
                <CheckCircle2 size={14} />
                Ready to submit
              </span>
            )}
            <StatusBadge status={article.status} />
          </span>
        </div>

        <ul className="checklist">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "yes" : "no"}>
              {c.ok ? (
                <CheckCircle2 size={14} strokeWidth={2.4} />
              ) : (
                <CircleDashed size={14} strokeWidth={2.4} />
              )}
              {c.label}
            </li>
          ))}
        </ul>

        {!ready &&
          (article.status === "DRAFT" || article.status === "IN_REVIEW") && (
            <p className="muted small" style={{ marginTop: 0 }}>
              Complete every item before submitting — the review queue should
              never hold unfinished drafts.
            </p>
          )}

        {article.status === "DRAFT" && (
          <div className="btnrow">
            <button
              className="btn primary"
              type="button"
              disabled={acting || !ready}
              title={
                !ready
                  ? "Complete all checklist items first."
                  : "Send to review"
              }
              onClick={() =>
                void run(
                  () => api.submitArticle(article.id),
                  "Submitted for review — a revision was recorded.",
                )
              }
            >
              <Send size={15} />
              {acting ? "Working…" : "Submit for review"}
            </button>
            <button
              className="btn danger"
              type="button"
              disabled={acting}
              onClick={() => void archive()}
            >
              <Archive size={14} />
              Archive
            </button>
          </div>
        )}

        {article.status === "IN_REVIEW" && mayPublish && (
          <>
            <div className="btnrow" style={{ marginBottom: 12 }}>
              <button
                className="btn primary"
                type="button"
                disabled={acting}
                onClick={() =>
                  void run(
                    () => api.publishArticle(article.id),
                    "Published — a revision was recorded.",
                  )
                }
              >
                <Rocket size={15} />
                {acting ? "Publishing…" : "Publish now"}
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={acting}
                onClick={() => void archive()}
              >
                <Archive size={14} />
                Archive
              </button>
            </div>
            <div className="hstack" style={{ marginBottom: 12 }}>
              <CalendarClock size={15} className="muted" />
              <label className="hint" htmlFor="schedule-at">
                Schedule
              </label>
              <input
                id="schedule-at"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                style={{ width: "auto" }}
              />
              <button
                className="btn"
                type="button"
                disabled={acting}
                onClick={() => void schedule()}
              >
                Schedule publish
              </button>
            </div>
            {noteOpen ? (
              <div className="stack" style={{ maxWidth: 560 }}>
                <textarea
                  rows={3}
                  placeholder="What needs to change before this can be published?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="btnrow">
                  <button
                    className="btn primary"
                    type="button"
                    disabled={acting}
                    onClick={() => void requestChanges()}
                  >
                    <Send size={14} />
                    Send back to author
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={acting}
                    onClick={() => {
                      setNoteOpen(false);
                      setNote("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn ghost"
                type="button"
                disabled={acting}
                onClick={() => setNoteOpen(true)}
              >
                <PenLine size={14} />
                Request changes…
              </button>
            )}
          </>
        )}

        {article.status === "IN_REVIEW" && !mayPublish && (
          <div className="alert info mb0">
            <CalendarClock size={16} />
            <span>
              Awaiting review — publishing requires an editor, publisher, or
              admin role. Your role: {me?.roles.join(", ") ?? "none"}.
            </span>
          </div>
        )}

        {article.status === "SCHEDULED" && (
          <>
            <p className="muted small">
              Scheduled for{" "}
              <strong>
                {article.scheduledFor
                  ? new Date(article.scheduledFor).toLocaleString()
                  : "—"}
              </strong>{" "}
              — the worker publishes it automatically within seconds of that
              time.
            </p>
            {mayPublish ? (
              <div className="btnrow">
                <button
                  className="btn primary"
                  type="button"
                  disabled={acting}
                  onClick={() =>
                    void run(
                      () => api.publishArticle(article.id),
                      "Published — a revision was recorded.",
                    )
                  }
                >
                  <Rocket size={15} />
                  Publish now
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={acting}
                  onClick={() =>
                    void run(
                      () => api.cancelSchedule(article.id),
                      "Schedule cancelled — back in the review queue.",
                    )
                  }
                >
                  <CircleX size={14} />
                  Cancel schedule
                </button>
                <button
                  className="btn danger"
                  type="button"
                  disabled={acting}
                  onClick={() => void archive()}
                >
                  <Archive size={14} />
                  Archive
                </button>
              </div>
            ) : (
              <p className="muted small">
                Changing the schedule requires an editor, publisher, or admin
                role.
              </p>
            )}
          </>
        )}

        {article.status === "PUBLISHED" && (
          <div className="btnrow">
            <p className="muted small grow mb0">
              Published{" "}
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleString()
                : ""}{" "}
              — saving edits below updates the live story within seconds.
              Archive to unpublish.
            </p>
            <button
              className="btn danger"
              type="button"
              disabled={acting}
              onClick={() => void archive()}
            >
              <Archive size={14} />
              Archive
            </button>
          </div>
        )}

        {article.status === "ARCHIVED" && (
          <div className="btnrow">
            <p className="muted small grow mb0">
              Archived — hidden from the public site. Original content and
              history are untouched.
            </p>
            <button
              className="btn primary"
              type="button"
              disabled={acting}
              onClick={() =>
                void run(
                  () => api.restoreArticle(article.id),
                  "Restored to draft — edit and resubmit when ready.",
                )
              }
            >
              <ArchiveRestore size={15} />
              {acting ? "Restoring…" : "Restore to draft"}
            </button>
          </div>
        )}
      </div>

      {editable ? (
        <ArticleForm
          article={article}
          categories={categories}
          savingLabel={
            article.status === "PUBLISHED" ? "Save changes" : "Save draft"
          }
          onSaved={(next) => {
            setArticle(next);
            setNotice(
              article.status === "PUBLISHED"
                ? "Saved — a revision was recorded and the public story refreshes within seconds."
                : "Draft saved — a revision was recorded.",
            );
          }}
        />
      ) : (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Content (read-only)</span>
          </div>
          <p className="muted small mb0">
            Drafts can be edited by their writer. Published stories can only be
            edited by editors, publishers, and admins — every explicit save,
            submit, and publish records a new revision on the server (draft
            autosaves are quiet). In-review and scheduled stories are locked
            until the workflow moves them on.
          </p>
        </div>
      )}

      <RevisionHistory
        article={article}
        canRestorePublished={mayPublish}
        onRestored={(next) => {
          setArticle(next);
          setNotice(
            "Revision restored — a new revision was recorded on top of history.",
          );
        }}
      />
    </>
  );
}

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RequireAuth>
      <Editor id={id} />
    </RequireAuth>
  );
}
