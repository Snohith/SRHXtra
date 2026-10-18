"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Article,
  ArticleRevision,
  ArticleRevisionSummary,
  ArticleStatus,
} from "@srh/contracts";
import { ApiError, api, resolveImageUrl } from "@/lib/api";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  articleId: string;
  status: ArticleStatus;
  onRestored: (article: Article) => void;
}

const RESTORABLE = new Set<ArticleStatus>(["DRAFT", "PUBLISHED"]);

function statusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "IN_REVIEW":
      return "In review";
    case "SCHEDULED":
      return "Scheduled";
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

/**
 * Revision history panel: every save/submit/publish snapshots a version
 * server-side. This lists them, previews one inline, and can restore a
 * version's content (history stays append-only — restore writes a new
 * revision).
 */
export default function RevisionHistory({
  articleId,
  status,
  onRestored,
}: Props) {
  const [revisions, setRevisions] = useState<ArticleRevisionSummary[] | null>(
    null,
  );
  const [openVersion, setOpenVersion] = useState<number | null>(null);
  const [viewing, setViewing] = useState<ArticleRevision | null>(null);
  const [cleanBody, setCleanBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRevisions(await api.revisions(articleId));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load history.",
      );
    }
  }, [articleId]);

  useEffect(() => {
    setRevisions(null);
    setOpenVersion(null);
    setViewing(null);
    setError(null);
    void load();
  }, [load]);

  useEffect(() => {
    if (openVersion == null) {
      setViewing(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const rev = await api.revision(articleId, openVersion);
        const clean = await sanitizeHtml(rev.body);
        if (alive) {
          setViewing(rev);
          setCleanBody(clean);
        }
      } catch (err) {
        if (alive)
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load that revision.",
          );
      }
    })();
    return () => {
      alive = false;
    };
  }, [articleId, openVersion]);

  async function restore(version: number) {
    if (
      !window.confirm(
        `Restore version ${version}? Current content stays in history — the restore writes a new revision.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.restoreRevision(articleId, version);
      onRestored(next);
      setOpenVersion(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  const canRestore = RESTORABLE.has(status);
  const hasRevisions = revisions !== null && revisions.length > 0;

  return (
    <div className="panel">
      <h2>History</h2>
      {error && <div className="alert error">{error}</div>}
      {revisions === null ? (
        <p className="muted">Loading revisions…</p>
      ) : revisions.length === 0 ? (
        <p className="muted small">No revisions recorded yet.</p>
      ) : (
        <ul className="revlist">
          {revisions.map((r) => (
            <li key={r.version}>
              <span>
                <strong>v{r.version}</strong>{" "}
                <span className="revitemmeta">
                  {statusLabel(r.status)} · {r.createdBy ?? "Unknown"} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </span>
              <span className="btnrow">
                <button
                  className="btn small"
                  type="button"
                  onClick={() =>
                    setOpenVersion(openVersion === r.version ? null : r.version)
                  }
                >
                  {openVersion === r.version ? "Close" : "View"}
                </button>
                {canRestore && (
                  <button
                    className="btn small"
                    type="button"
                    disabled={busy}
                    onClick={() => void restore(r.version)}
                  >
                    Restore
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {openVersion != null && viewing && viewing.version === openVersion && (
        <div className="revpreview">
          <h3>{viewing.title}</h3>
          <p className="revitemmeta">
            /{viewing.slug} · v{viewing.version} · {statusLabel(viewing.status)}{" "}
            · {new Date(viewing.createdAt).toLocaleString()}
          </p>
          {viewing.excerpt && <p className="muted">{viewing.excerpt}</p>}
          {resolveImageUrl(viewing.coverImageUrl) && (
            <img
              className="cover"
              src={resolveImageUrl(viewing.coverImageUrl) as string}
              alt="Featured image"
            />
          )}
          <div
            className="body"
            dangerouslySetInnerHTML={{ __html: cleanBody }}
          />
        </div>
      )}
      {!canRestore && hasRevisions && (
        <p className="muted small" style={{ marginTop: 10 }}>
          Restore is available for drafts and published stories — cancel the
          schedule or move the story first.
        </p>
      )}
    </div>
  );
}
