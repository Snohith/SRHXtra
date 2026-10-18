import type { ArticleStatus } from "@srh/contracts";

const LABELS: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const CLASSES: Record<ArticleStatus, string> = {
  DRAFT: "draft",
  IN_REVIEW: "review",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  ARCHIVED: "archived",
};

export default function StatusBadge({ status }: { status: ArticleStatus }) {
  return <span className={`badge ${CLASSES[status]}`}>{LABELS[status]}</span>;
}
