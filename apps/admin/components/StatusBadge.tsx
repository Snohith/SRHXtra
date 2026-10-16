import type { ArticleStatus } from "@srh/contracts";

export default function StatusBadge({ status }: { status: ArticleStatus }) {
  const cls = status === "DRAFT" ? "draft" : status === "IN_REVIEW" ? "review" : "published";
  const label = status === "IN_REVIEW" ? "In review" : status === "DRAFT" ? "Draft" : "Published";
  return <span className={`badge ${cls}`}>{label}</span>;
}
