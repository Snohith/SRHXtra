"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActivityItem, AdminStats } from "@srh/contracts";
import { ApiError, api } from "@/lib/api";
import { RequireAuth } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";

function actionLabel(action: string): string {
  switch (action) {
    case "article.create":
      return "created";
    case "article.update":
      return "edited";
    case "article.submit":
      return "submitted for review";
    case "article.publish":
      return "published";
    case "article.publish.scheduled":
      return "auto-published (scheduled)";
    case "article.schedule":
      return "scheduled";
    case "article.schedule.cancel":
      return "cancelled the schedule for";
    case "article.request_changes":
      return "requested changes on";
    case "article.archive":
      return "archived";
    case "article.restore":
      return "restored";
    case "article.revision.restore":
      return "restored a revision of";
    default:
      return action;
  }
}

function Dashboard() {
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

  if (loading) return <p className="muted">Loading dashboard…</p>;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">
            Editorial pipeline at a glance — live from the database.
          </p>
        </div>
        <Link className="btn primary" href="/articles/new">
          New article
        </Link>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="grid-cards">
        <div className="card">
          <div className="label">Published</div>
          <div className="num">{stats?.published ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Drafts</div>
          <div className="num">{stats?.drafts ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Awaiting review</div>
          <div className="num">{stats?.inReview ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Scheduled</div>
          <div className="num">{stats?.scheduled ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Archived</div>
          <div className="num">{stats?.archived ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Total articles</div>
          <div className="num">{stats?.total ?? 0}</div>
        </div>
      </div>
      <div className="panel">
        <h2>Recent activity</h2>
        {activity.length === 0 ? (
          <p className="muted small">No editorial actions recorded yet.</p>
        ) : (
          <ul className="activity">
            {activity.map((item) => (
              <li key={item.id}>
                <strong>{item.actorName ?? "Unknown"}</strong>{" "}
                {actionLabel(item.action)}{" "}
                {item.articleTitle ? (
                  <>
                    “{item.articleTitle}”{" "}
                    {item.articleStatus && (
                      <StatusBadge status={item.articleStatus} />
                    )}
                  </>
                ) : (
                  <code className="small">{item.resourceId.slice(0, 8)}…</code>
                )}
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
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
