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
        "flex flex-col gap-8 sm:items-end sm:justify-between sm:flex-row",
        isCenter && "sm:flex-col sm:items-center sm:text-center",
        isHero && "border-b border-white/5 pb-10 sm:pb-16",
        className,
      )}
    >
      <div className={cx(
        "max-w-4xl", 
        align === "start" && !isHero && "border-l-2 border-accent/30 pl-6 sm:pl-8"
      )}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <HeadingTag className={cx(
          "mt-3 leading-[1.1] font-black uppercase tracking-tight",
          isHero ? "editorial-title" : "section-title"
        )}>
          {title}
        </HeadingTag>
        {description ? <p className={cx("mt-6 body-copy max-w-3xl", isHero && "text-xl sm:text-2xl")}>{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 pb-1">{action}</div> : null}
    </div>
  );
}
