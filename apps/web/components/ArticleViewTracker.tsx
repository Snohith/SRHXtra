"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Fires an `article_view` event with the story's metadata, so reports can be
 * grouped by category and author — not just by URL. Part of the article
 * template, so future posts are tracked automatically.
 */
export default function ArticleViewTracker({
  slug,
  title,
  category,
  author,
}: {
  slug: string;
  title: string;
  category?: string | null;
  author?: string | null;
}) {
  useEffect(() => {
    track("article_view", {
      article_slug: slug,
      article_title: title,
      article_category: category ?? undefined,
      article_author: author ?? undefined,
    });
  }, [slug, title, category, author]);

  return null;
}
