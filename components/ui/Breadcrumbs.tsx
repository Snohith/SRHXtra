import Link from "next/link";

import { cx } from "@/lib/utils/classes";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cx("text-[10px] font-bold uppercase tracking-[0.2em] text-muted", className)}>
      <ol className="flex flex-wrap items-center gap-3">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-3">
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-accent">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-accent" : ""}>{item.label}</span>
              )}
              {!isLast ? <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/20" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

