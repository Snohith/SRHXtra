import Link from "next/link";

import { ShareButtons } from "@/components/articles/ShareButtons";
import type { Article } from "@/lib/content/articles";
import { extractHeadings } from "@/lib/content/toc";
import { formatDisplayDate } from "@/lib/utils/date";
import { estimateReadingTime } from "@/lib/utils/text";

interface StoryRailProps {
  article: Article;
  toc?: { id: string; text: string }[];
}

const MATCH_FACTS = [
  { label: "Fixture", value: "India vs Afghanistan · 1st T20I" },
  { label: "Venue", value: "Delhi" },
  { label: "Result", value: "India won by 7 wickets" },
  { label: "Top score", value: "Abhishek 82 (32) · 7×4 · 7×6" },
  { label: "At No. 3", value: "Kishan 42" },
  { label: "Partnership", value: "121 runs" },
];

export function StoryRail({ article, toc }: StoryRailProps) {
  const headings = toc ?? extractHeadings(article.content);
  const readingTime = estimateReadingTime(article.content);
  const isMatchStory = article.slug === "abhishek-sharma-82-ishan-kishan-42-afghanistan-t20i-2026";

  return (
    <aside className="grid content-start gap-4 sm:gap-5 lg:sticky lg:top-32">
      {headings.length > 0 ? (
        <nav
          aria-label="In this story"
          className="rounded-3xl border border-border bg-white p-6 shadow-premium sm:p-7"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">
            In this story · {readingTime} min
          </p>
          <ol className="mt-4 grid gap-1">
            {headings.map((heading, index) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className="group flex items-baseline gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-muted transition hover:bg-accent-soft hover:text-foreground"
                >
                  <span className="font-mono text-xs font-bold text-accent/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-snug">{heading.text}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {isMatchStory ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-foreground text-white shadow-premium">
          <p className="border-b border-white/10 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
            Match facts
          </p>
          <dl>
            {MATCH_FACTS.map((fact) => (
              <div
                key={fact.label}
                className="grid gap-0.5 border-b border-white/[0.07] px-6 py-3.5 last:border-0"
              >
                <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                  {fact.label}
                </dt>
                <dd className="text-sm font-bold leading-snug">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-white p-6 shadow-premium sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">News</p>
          <p className="mt-3 text-base font-bold text-foreground">Off the field</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            This desk covers squad moves and announcements. For what happened on the pitch, read
            the match reports.
          </p>
          <Link
            className="mt-4 inline-flex text-sm font-bold text-accent"
            href="/sunrisers-hyderabad/news/"
          >
            All news →
          </Link>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-white p-6 shadow-premium sm:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
          Share this story
        </p>
        <div className="mt-4">
          <ShareButtons title={article.title} path={article.url} />
        </div>
        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
          Published {formatDisplayDate(article.publishedAt)}
          {article.updatedAt ? ` · Updated ${formatDisplayDate(article.updatedAt)}` : ""}
        </p>
      </div>
    </aside>
  );
}
