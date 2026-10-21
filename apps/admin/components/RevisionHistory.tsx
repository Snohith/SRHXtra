"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  FileClock,
  GitCompareArrows,
  History,
  RotateCcw,
} from "lucide-react";
import type {
  Article,
  ArticleRevision,
  ArticleRevisionSummary,
  ArticleStatus,
} from "@srh/contracts";
import { ApiError, api, resolveImageUrl } from "@/lib/api";
import {
  diffBlocks,
  diffWords,
  type BlockDiff,
  type WordDiff,
} from "@/lib/diff";
import { sanitizeHtml } from "@/lib/sanitize";
import { timeAgo } from "@/lib/format";
import StatusBadge from "./StatusBadge";

interface Props {
  article: Article;
  onRestored: (article: Article) => void;
  /** Published restores are workflow-role only (the API enforces it too). */
  canRestorePublished?: boolean;
}

const RESTORABLE = new Set<ArticleStatus>(["DRAFT", "PUBLISHED"]);

/** Article-status words for revision rows (contracts carry a loose string). */
const STATUS_WORDS: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/** Narrow a raw revision status string to a known ArticleStatus. */
function asStatus(status: string): ArticleStatus | null {
  return status in STATUS_WORDS ? (status as ArticleStatus) : null;
}

/** One side of a comparison (revision snapshot or current content). */
interface DiffSide {
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

interface RenderedBlock extends BlockDiff {
  safeHtml?: string;
}

interface DiffView {
  fromVersion: number;
  targetLabel: string;
  title: WordDiff[];
  slug: { changed: boolean; old: string; next: string };
  excerpt: WordDiff[] | null;
  cover: { changed: boolean; old: string | null; next: string | null };
  seoTitle: WordDiff[] | null;
  seoDescription: WordDiff[] | null;
  blocks: RenderedBlock[];
  anyChange: boolean;
}

function allSame(words: WordDiff[]): boolean {
  return words.every((w) => w.type === "same");
}

function revisionToSide(rev: ArticleRevision): DiffSide {
  return {
    title: rev.title,
    slug: rev.slug,
    excerpt: rev.excerpt,
    body: rev.body,
    coverImageUrl: rev.coverImageUrl,
    seoTitle: rev.seoTitle,
    seoDescription: rev.seoDescription,
  };
}

function articleToSide(a: Article): DiffSide {
  return {
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    body: a.body,
    coverImageUrl: a.coverImageUrl,
    seoTitle: a.seoTitle,
    seoDescription: a.seoDescription,
  };
}

/** Inline word-level diff: same text plain, additions underlined green, removals struck red. */
function WordTokens({ words }: { words: WordDiff[] }) {
  return (
    <>
      {words.map((w, i) =>
        w.type === "same" ? (
          <span key={i}>{w.text}</span>
        ) : w.type === "add" ? (
          <ins key={i} className="difftok add">
            {w.text}
          </ins>
        ) : (
          <del key={i} className="difftok del">
            {w.text}
          </del>
        ),
      )}
    </>
  );
}

/**
 * Revision history panel: lists every server-side snapshot, previews one
 * inline, compares any two versions (block + word level diff), and restores
 * a version's content (history stays append-only — restore writes a new
 * revision).
 */
export default function RevisionHistory({
  article,
  onRestored,
  canRestorePublished = true,
}: Props) {
  const articleId = article.id;
  const [revisions, setRevisions] = useState<ArticleRevisionSummary[] | null>(
    null,
  );
  const [openVersion, setOpenVersion] = useState<number | null>(null);
  const [viewing, setViewing] = useState<ArticleRevision | null>(null);
  const [cleanBody, setCleanBody] = useState("");
  const [diffVersion, setDiffVersion] = useState<number | null>(null);
  const [diffTarget, setDiffTarget] = useState<number | "current">("current");
  const [diff, setDiff] = useState<DiffView | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
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
    setDiffVersion(null);
    setDiff(null);
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

  // Build the compare view whenever a version or its comparison target changes.
  useEffect(() => {
    if (diffVersion == null) {
      setDiff(null);
      return;
    }
    let alive = true;
    (async () => {
      setDiffLoading(true);
      setError(null);
      try {
        // "current" re-fetches the live row so autosaved-but-not-resaved
        // edits are included; other targets are revision snapshots.
        const [oldRev, targetSide] = await Promise.all([
          api.revision(articleId, diffVersion),
          diffTarget === "current"
            ? api.getArticle(articleId).then(articleToSide)
            : api.revision(articleId, diffTarget).then(revisionToSide),
        ]);
        const oldSide = revisionToSide(oldRev);
        const blockDiffs = diffBlocks(oldSide.body, targetSide.body);
        const safeBodies = await Promise.all(
          blockDiffs.map((b) => (b.html ? sanitizeHtml(b.html) : "")),
        );
        if (!alive) return;
        const title = diffWords(oldSide.title, targetSide.title);
        const excerptWords = diffWords(
          oldSide.excerpt ?? "",
          targetSide.excerpt ?? "",
        );
        const seoTitleWords = diffWords(
          oldSide.seoTitle ?? "",
          targetSide.seoTitle ?? "",
        );
        const seoDescWords = diffWords(
          oldSide.seoDescription ?? "",
          targetSide.seoDescription ?? "",
        );
        const slugChanged = oldSide.slug !== targetSide.slug;
        const coverChanged =
          (oldSide.coverImageUrl ?? "") !== (targetSide.coverImageUrl ?? "");
        const excerptShown =
          !allSame(excerptWords) ||
          !!oldSide.excerpt?.trim() ||
          !!targetSide.excerpt?.trim();
        const blocks = blockDiffs.map((b, i) => ({
          ...b,
          safeHtml: safeBodies[i],
        }));
        setDiff({
          fromVersion: diffVersion,
          targetLabel:
            diffTarget === "current"
              ? "current saved content"
              : `v${diffTarget}`,
          title,
          slug: {
            changed: slugChanged,
            old: oldSide.slug,
            next: targetSide.slug,
          },
          excerpt: excerptShown ? excerptWords : null,
          cover: {
            changed: coverChanged,
            old: oldSide.coverImageUrl,
            next: targetSide.coverImageUrl,
          },
          seoTitle: allSame(seoTitleWords) ? null : seoTitleWords,
          seoDescription: allSame(seoDescWords) ? null : seoDescWords,
          blocks,
          anyChange:
            !allSame(title) ||
            slugChanged ||
            coverChanged ||
            !allSame(excerptWords) ||
            !allSame(seoTitleWords) ||
            !allSame(seoDescWords) ||
            blocks.some((b) => b.kind !== "same"),
        });
      } catch (err) {
        if (alive)
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not compute the comparison.",
          );
      } finally {
        if (alive) setDiffLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [articleId, diffVersion, diffTarget]);

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
      setDiffVersion(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  function toggleView(version: number) {
    setOpenVersion(openVersion === version ? null : version);
    if (openVersion !== version) setDiffVersion(null);
  }

  function toggleDiff(version: number) {
    if (diffVersion === version) {
      setDiffVersion(null);
    } else {
      setDiffVersion(version);
      setDiffTarget("current");
      setOpenVersion(null);
    }
  }

  const canRestore =
    RESTORABLE.has(article.status) &&
    (article.status !== "PUBLISHED" || canRestorePublished);
  const hasRevisions = revisions !== null && revisions.length > 0;

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">
          <History size={17} />
          History
        </span>
        {revisions && revisions.length > 0 && (
          <span className="count-chip">
            {revisions.length} revision{revisions.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {error && (
        <div className="alert error" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {revisions === null ? (
        <div className="stack">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="sk"
              style={{ height: 46, borderRadius: 12 }}
            />
          ))}
        </div>
      ) : revisions.length === 0 ? (
        <div className="empty" style={{ padding: "30px 12px" }}>
          <span className="empty-ico">
            <FileClock size={22} />
          </span>
          <h3>No revisions yet</h3>
          <p>
            Every explicit save, submit, publish, and restore records a snapshot
            here. Autosaves stay quiet.
          </p>
        </div>
      ) : (
        <ul className="revlist">
          {revisions.map((r) => {
            const revStatus = asStatus(r.status);
            return (
              <li key={r.version} className="revitem">
                <span className="revver">v{r.version}</span>
                <span className="revmeta">
                  {revStatus ? (
                    <StatusBadge status={revStatus} />
                  ) : (
                    <span className="chip">{r.status}</span>
                  )}
                  <span>{r.createdBy ?? "Unknown"}</span>
                  <span aria-hidden="true">·</span>
                  <time
                    dateTime={r.createdAt}
                    title={new Date(r.createdAt).toLocaleString()}
                  >
                    {timeAgo(r.createdAt)}
                  </time>
                </span>
                <span className="btnrow">
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => toggleView(r.version)}
                  >
                    <Eye size={13} />
                    {openVersion === r.version ? "Close" : "View"}
                  </button>
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => toggleDiff(r.version)}
                  >
                    <GitCompareArrows size={13} />
                    {diffVersion === r.version ? "Hide diff" : "Compare"}
                  </button>
                  {canRestore && (
                    <button
                      className="btn small"
                      type="button"
                      disabled={busy}
                      onClick={() => void restore(r.version)}
                    >
                      <RotateCcw size={13} />
                      Restore
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {openVersion != null && viewing && viewing.version === openVersion && (
        <div className="revpreview">
          <h3>{viewing.title}</h3>
          <p className="revmeta">
            /{viewing.slug} · v{viewing.version} ·{" "}
            {new Date(viewing.createdAt).toLocaleString()} · by{" "}
            {viewing.createdBy ?? "unknown"}
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
            className="prose"
            style={{ fontSize: 15 }}
            dangerouslySetInnerHTML={{ __html: cleanBody }}
          />
        </div>
      )}

      {diffVersion != null && (
        <div className="diffpanel">
          <div className="diffhead">
            <strong>
              v{diffVersion}
              {" → "}
              {diff?.targetLabel ??
                (diffTarget === "current"
                  ? "current saved content"
                  : `v${diffTarget}`)}
            </strong>
            <label className="revmeta">
              Compare with{" "}
              <select
                value={String(diffTarget)}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiffTarget(v === "current" ? "current" : Number(v));
                }}
              >
                <option value="current">Current saved content</option>
                {(revisions ?? [])
                  .filter((r) => r.version !== diffVersion)
                  .map((r) => (
                    <option key={r.version} value={r.version}>
                      v{r.version} · {statusWord(r.status)}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {diffLoading || !diff ? (
            <div className="stack">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="sk"
                  style={{ height: 40, borderRadius: 10 }}
                />
              ))}
            </div>
          ) : !diff.anyChange ? (
            <p className="muted mb0">No differences between these versions.</p>
          ) : (
            <>
              <section className="diffsection">
                <h4>Title</h4>
                <p className="difftext">
                  <WordTokens words={diff.title} />
                </p>
              </section>

              {diff.slug.changed && (
                <section className="diffsection">
                  <h4>Slug</h4>
                  <p className="difftext">
                    <del className="difftok del">{diff.slug.old}</del>{" "}
                    <ins className="difftok add">{diff.slug.next}</ins>
                  </p>
                </section>
              )}

              {diff.excerpt && (
                <section className="diffsection">
                  <h4>Summary</h4>
                  <p className="difftext">
                    <WordTokens words={diff.excerpt} />
                  </p>
                </section>
              )}

              {diff.cover.changed && (
                <section className="diffsection">
                  <h4>Featured image</h4>
                  <div className="diffcovers">
                    {resolveImageUrl(diff.cover.old) ? (
                      <figure>
                        <img
                          src={resolveImageUrl(diff.cover.old) as string}
                          alt="Featured image in the older version"
                        />
                        <figcaption className="muted small">
                          v{diffVersion}
                        </figcaption>
                      </figure>
                    ) : (
                      <span className="muted small">
                        No image in v{diffVersion}
                      </span>
                    )}
                    <span className="muted">→</span>
                    {resolveImageUrl(diff.cover.next) ? (
                      <figure>
                        <img
                          src={resolveImageUrl(diff.cover.next) as string}
                          alt="Featured image in the newer version"
                        />
                        <figcaption className="muted small">
                          {diff.targetLabel}
                        </figcaption>
                      </figure>
                    ) : (
                      <span className="muted small">
                        No image in {diff.targetLabel}
                      </span>
                    )}
                  </div>
                </section>
              )}

              {diff.seoTitle && (
                <section className="diffsection">
                  <h4>Meta title</h4>
                  <p className="difftext">
                    <WordTokens words={diff.seoTitle} />
                  </p>
                </section>
              )}

              {diff.seoDescription && (
                <section className="diffsection">
                  <h4>Meta description</h4>
                  <p className="difftext">
                    <WordTokens words={diff.seoDescription} />
                  </p>
                </section>
              )}

              <section className="diffsection">
                <h4>Body</h4>
                <div className="diffbody">
                  {diff.blocks.map((b) =>
                    b.kind === "same" ? (
                      <div
                        key={b.key}
                        className="diffblock same"
                        dangerouslySetInnerHTML={{ __html: b.safeHtml ?? "" }}
                      />
                    ) : b.kind === "change" ? (
                      <div key={b.key} className="diffblock change">
                        <WordTokens words={b.words ?? []} />
                      </div>
                    ) : b.kind === "add" ? (
                      <div
                        key={b.key}
                        className="diffblock add"
                        dangerouslySetInnerHTML={{ __html: b.safeHtml ?? "" }}
                      />
                    ) : (
                      <div
                        key={b.key}
                        className="diffblock remove"
                        dangerouslySetInnerHTML={{ __html: b.safeHtml ?? "" }}
                      />
                    ),
                  )}
                </div>
              </section>

              <p className="muted small difflegend">
                <ins className="difftok add">added</ins>{" "}
                <del className="difftok del">removed</del> — red/left is v
                {diffVersion}, green/right is {diff.targetLabel}.
              </p>
            </>
          )}
        </div>
      )}

      {!canRestore && hasRevisions && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Restore is available for drafts; published restores require an editor,
          publisher, or admin. Cancel the schedule or move the story first if it
          is locked.
        </p>
      )}
    </div>
  );
}

/** Human label for an article status inside the compare select. */
function statusWord(status: string): string {
  return STATUS_WORDS[status] ?? status;
}
