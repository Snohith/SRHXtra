import fs from "node:fs";
import path from "node:path";

import {
  getArticleBySlug,
  getArticlesByCollection,
  getRelatedArticles,
  type Article,
} from "@/lib/content/articles";
import { resolveContentPath } from "@/lib/utils/paths";

const MATCH_PREVIEWS_DIR = resolveContentPath("match-previews");

function isPublishedMatchPreview(article: Article) {
  const publishedAt = new Date(article.publishedAt).getTime();

  return (
    !article.draft
    && article.editorialStatus !== "draft-review"
    && Number.isFinite(publishedAt)
    && publishedAt <= Date.now()
  );
}

export function getAllMatchPreviews() {
  return getArticlesByCollection("match-previews").filter(isPublishedMatchPreview);
}

export function getLatestMatchPreviews(limit = 3) {
  return getAllMatchPreviews().slice(0, limit);
}

export function getMatchPreviewBySlug(slug: string) {
  const article = getArticleBySlug("match-previews", slug);

  return article && isPublishedMatchPreview(article) ? article : null;
}

export function getMatchPreviewSlugs() {
  return getAllMatchPreviews().map((article) => article.slug);
}

export function getMatchPreviewSourceSlugs() {
  return fs
    .readdirSync(MATCH_PREVIEWS_DIR)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => path.basename(fileName, path.extname(fileName)));
}

export function getRelatedMatchPreviews(article: Article, limit = 3) {
  return getRelatedArticles(article, limit).filter(isPublishedMatchPreview);
}
