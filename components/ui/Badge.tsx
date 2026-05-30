import { cx } from "@/lib/utils/classes";

interface BadgeProps {
  children: string;
  tone?: "accent" | "neutral" | "success";
  className?: string;
}

const toneClasses = {
  accent: "border border-accent/30 bg-accent/10 text-accent font-bold",
  neutral: "border border-border bg-black/[0.04] text-muted",
  success: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 font-bold",
};

export function Badge({ children, tone = "accent", className }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.24em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

