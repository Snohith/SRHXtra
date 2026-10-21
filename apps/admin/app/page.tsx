"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  FileClock,
  Images,
  Inbox,
  Plus,
  Sparkles,
  SquarePen,
} from "lucide-react";
import { ArticleStatusSchema } from "@srh/contracts";
import type { ActivityItem, AdminStats, ArticleStatus } from "@srh/contracts";
import { ApiError, api } from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { countUp, formatDateTime, greeting, timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";

/** Worker rows are written without an actor — the scheduled publisher is "The scheduler". */
function actorName(item: ActivityItem): string {
  if (item.actorName) return item.actorName;
  return item.action === "article.publish.scheduled"
    ? "The scheduler"
    : "Unknown";
}

/** Human sentence for one audit entry; the actor and status badge render around it. */
function describe(item: ActivityItem) {
  const title = item.articleTitle ? (
    <span className="feed-target">“{item.articleTitle}”</span>
  ) : item.resourceType === "article" ? (
    // Titles only go missing when the article row itself is gone.
    <span className="muted">an article that no longer exists</span>
  ) : (
    <code className="small">{item.resourceId.slice(0, 8)}…</code>
  );
  switch (item.action) {
    case "article.create":
      return <>created {title}</>;
    case "article.update":
      return <>edited {title}</>;
    case "article.submit":
      return <>submitted {title} for review</>;
    case "article.publish":
      return <>published {title}</>;
    case "article.publish.scheduled":
      return <>auto-published {title} on schedule</>;
    case "article.schedule":
      return <>scheduled {title} to publish automatically</>;
    case "article.schedule.cancel":
      return <>cancelled the scheduled publish of {title}</>;
    case "article.request_changes":
      return <>sent {title} back to the author for changes</>;
    case "article.archive":
      return <>archived {title}</>;
    case "article.restore":
      return <>restored {title} from the archive</>;
    case "article.revision.restore":
      return typeof item.metadata?.version === "number" ? (
        <>
          restored version {item.metadata.version} of {title}
        </>
      ) : (
        <>restored an earlier version of {title}</>
      );
    default:
      // Unmapped (older/newer) action: "article.foo_bar" → "foo bar", not raw codes.
      return (
        <>
          {item.action.replace(/^article\./, "").replace(/[._]/g, " ")} {title}
        </>
      );
  }
}

/** Second line with the specifics: when a schedule fires, the reviewer's note. */
function describeDetail(item: ActivityItem): string | null {
  if (item.action === "article.schedule") {
    const at = item.metadata?.scheduledFor;
    if (typeof at === "string") return `Goes live ${formatDateTime(at)}`;
  }
  if (item.action === "article.request_changes") {
    const note = item.metadata?.note;
    if (typeof note === "string" && note.trim())
      return `Review note: “${note.trim()}”`;
  }
  return null;
}

/** Status at the time of the action (metadata), not the article's status today. */
function statusAtAction(item: ActivityItem): ArticleStatus | null {
  const meta = item.metadata ?? {};
  const raw =
    typeof meta.status === "string"
      ? meta.status
      : typeof meta.to === "string"
        ? meta.to
        : null;
  const parsed = ArticleStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Animated number for the stat cards. */
function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => countUp(value, setN), [value]);
  return <>{n}</>;
}

const STATUS_ROWS = [
  { key: "published", label: "Published", cls: "published" },
  { key: "inReview", label: "In review", cls: "in_review" },
  { key: "scheduled", label: "Scheduled", cls: "scheduled" },
  { key: "drafts", label: "Drafts", cls: "draft" },
  { key: "archived", label: "Archived", cls: "archived" },
] as const;

const STATUS_FILTER: Record<string, string> = {
  published: "PUBLISHED",
  inReview: "IN_REVIEW",
  scheduled: "SCHEDULED",
  drafts: "DRAFT",
  archived: "ARCHIVED",
};

function DashboardSkeleton() {
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="sk sk-title" style={{ width: 260, height: 24 }} />
          <div
            className="sk sk-line"
            style={{ width: 180, height: 13, marginTop: 10 }}
          />
        </div>
      </div>
      <div className="stats-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat" key={i}>
            <span
              className="sk"
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                display: "block",
              }}
            />
            <div className="sk sk-line" style={{ width: 84, marginTop: 14 }} />
            <div
              className="sk"
              style={{ width: 58, height: 30, marginTop: 10, borderRadius: 8 }}
            />
          </div>
        ))}
      </div>
      <div className="cols">
        <div className="panel">
          <div className="sk sk-line" style={{ width: 110 }} />
          <div
            className="sk"
            style={{ height: 12, margin: "18px 0", borderRadius: 999 }}
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="sk sk-line"
              style={{
                width: "100%",
                height: 34,
                marginBottom: 8,
                borderRadius: 10,
              }}
            />
          ))}
        </div>
        <div className="panel">
          <div className="sk sk-line" style={{ width: 130 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="hstack" style={{ marginTop: 18 }}>
              <span
                className="sk"
                style={{ width: 30, height: 30, borderRadius: 15 }}
              />
              <span className="sk sk-line" style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Dashboard() {
  const { me } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, a] = await Promise.all([api.stats(), api.activity(10)]);
        if (!cancelled) {
          setStats(s);
          setActivity(a);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load dashboard data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = useMemo(() => {
    const raw = me?.displayName ?? me?.email ?? "";
    const part = raw.split(/[@\s.]/)[0] ?? "";
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : "there";
  }, [me]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );

  if (loading) return <DashboardSkeleton />;

  const total = stats?.total ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p className="sub">
            {today}
            <span className="chip">
              <Sparkles size={12} />
              Pipeline live from the database
            </span>
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn" href="/media">
            <Images size={15} />
            Media library
          </Link>
          <Link className="btn primary" href="/articles/new">
            <Plus size={15} strokeWidth={2.6} />
            New article
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="stats-grid">
        <Link className="stat pub reveal" href="/articles?status=PUBLISHED">
          <span className="stat-ico">
            <FileClock size={18} />
          </span>
          <div className="stat-label">Published</div>
          <div className="stat-num">
            <CountUp value={stats?.published ?? 0} />
          </div>
          <div className="stat-foot">Live on the public site</div>
        </Link>
        <Link className="stat review reveal" href="/articles?status=IN_REVIEW">
          <span className="stat-ico">
            <Inbox size={18} />
          </span>
          <div className="stat-label">Awaiting review</div>
          <div className="stat-num">
            <CountUp value={stats?.inReview ?? 0} />
          </div>
          <div className="stat-foot">Waiting for an editor</div>
        </Link>
        <Link className="stat sched reveal" href="/articles?status=SCHEDULED">
          <span className="stat-ico">
            <CalendarClock size={18} />
          </span>
          <div className="stat-label">Scheduled</div>
          <div className="stat-num">
            <CountUp value={stats?.scheduled ?? 0} />
          </div>
          <div className="stat-foot">Auto-published by the worker</div>
        </Link>
        <Link className="stat draft reveal" href="/articles?status=DRAFT">
          <span className="stat-ico">
            <SquarePen size={18} />
          </span>
          <div className="stat-label">Drafts</div>
          <div className="stat-num">
            <CountUp value={stats?.drafts ?? 0} />
          </div>
          <div className="stat-foot">Not submitted yet</div>
        </Link>
      </div>

      <div className="cols">
        <div className="panel reveal">
          <div className="panel-head">
            <span className="panel-title">Pipeline</span>
            <span className="panel-sub">
              {total} article{total === 1 ? "" : "s"} in total
            </span>
          </div>

          <div className="pipe-bar" aria-hidden="true">
            {STATUS_ROWS.map((row) => {
              const n = stats?.[row.key] ?? 0;
              return (
                <span
                  key={row.key}
                  className={`pipe-seg s-${row.cls}${n === 0 ? " zero" : ""}`}
                  style={{ width: `${pct(n)}%` }}
                />
              );
            })}
          </div>

          <div className="pipe-rows">
            {STATUS_ROWS.map((row) => {
              const n = stats?.[row.key] ?? 0;
              return (
                <Link
                  key={row.key}
                  className="pipe-row"
                  href={`/articles?status=${STATUS_FILTER[row.key]}`}
                >
                  <span className={`dot d-${row.cls}`} />
                  <span className="pipe-name">{row.label}</span>
                  <span className="pipe-count">{n}</span>
                  <span className="pipe-pct">{pct(n)}%</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="panel reveal">
          <div className="panel-head">
            <span className="panel-title">Recent activity</span>
            {activity.length > 0 && (
              <span className="count-chip">{activity.length} events</span>
            )}
          </div>
          {activity.length === 0 ? (
            <div className="empty" style={{ padding: "34px 12px" }}>
              <span className="empty-ico">
                <FileClock size={22} />
              </span>
              <h3>Nothing yet</h3>
              <p>
                Editorial actions — create, submit, publish, archive — land here
                as they happen.
              </p>
            </div>
          ) : (
            <ul className="feed">
              {activity.map((item) => {
                const detail = describeDetail(item);
                const status = statusAtAction(item);
                return (
                  <li key={item.id}>
                    <Avatar name={actorName(item)} />
                    <span className="feed-text">
                      <strong>{actorName(item)}</strong> {describe(item)}{" "}
                      {status && <StatusBadge status={status} />}
                      {detail && <span className="feed-note">{detail}</span>}
                    </span>
                    <time
                      className="feed-time"
                      dateTime={item.createdAt}
                      title={new Date(item.createdAt).toLocaleString()}
                    >
                      {timeAgo(item.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
