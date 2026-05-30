import type { ElementType, ReactNode } from "react";

import { cx } from "@/lib/utils/classes";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "start" | "center";
  variant?: "default" | "hero";
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "start",
  variant = "default",
  headingLevel = 2,
  className,
}: SectionHeaderProps) {
  const isHero = variant === "hero";
  const isCenter = align === "center";
  const HeadingTag = `h${headingLevel}` as ElementType;

  return (
    <div
      className={cx(
        "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5",
        isCenter && "sm:flex-col sm:items-center sm:text-center",
        isHero && description && "border-b border-border pb-8 sm:pb-14",
        className,
      )}
    >
      <div className={cx(
        "min-w-0 max-w-4xl",
        align === "start" && !isHero && description && "border-l-2 border-accent/30 pl-4 sm:pl-8"
      )}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <HeadingTag className={cx(
          "mt-3 leading-[1.1] font-black uppercase tracking-tight",
          isHero ? "editorial-title" : "section-title"
        )}>
          {title}
        </HeadingTag>
        {description ? <p className={cx("mt-4 body-copy max-w-3xl sm:mt-6", isHero && "text-lg sm:text-2xl")}>{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 pb-1 sm:w-auto">{action}</div> : null}
    </div>
  );
}
