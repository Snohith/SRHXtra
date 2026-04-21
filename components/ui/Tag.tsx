import { cx } from "@/lib/utils/classes";

interface TagProps {
  label: string;
  className?: string;
}

export function Tag({ label, className }: TagProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border border-border bg-white/5 px-3 py-1 text-xs text-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}

