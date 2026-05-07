import fs from "node:fs";
import path from "node:path";

import {
  getArticleBySlug,
  getArticlesByCollection,
  getRelatedArticles,
  type Article,
} from "@/lib/content/articles";
import { getNextFixture, type Fixture } from "@/lib/content/schedule";
import { resolveContentPath } from "@/lib/utils/paths";
import { getTeamInfo } from "@/lib/utils/team-info";

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

function normalizePreviewText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesFixture(article: Article, fixture: Fixture) {
  const opponent = getTeamInfo(fixture.opponent);
  const haystack = normalizePreviewText(`${article.slug} ${article.title} ${article.tags.join(" ")}`);
  const aliases = [
    fixture.opponent,
    opponent.name,
    opponent.code,
    `${opponent.code} vs SRH`,
    `SRH vs ${opponent.code}`,
    `${opponent.name} vs Sunrisers Hyderabad`,
    `Sunrisers Hyderabad vs ${opponent.name}`,
  ].map(normalizePreviewText);

  return aliases.some((alias) => alias.length > 0 && haystack.includes(alias));
}

export function getNextMatchPreview() {
  const previews = getAllMatchPreviews();
  const nextFixture = getNextFixture();

  if (!nextFixture) {
    return previews[0] ?? null;
  }

  return previews.find((article) => matchesFixture(article, nextFixture)) ?? previews[0] ?? null;
}

export function getArchivedMatchPreviews() {
  const nextPreview = getNextMatchPreview();

  return getAllMatchPreviews().filter((article) => article.slug !== nextPreview?.slug);
}

export function getLatestMatchPreviews(limit = 3) {
  const nextPreview = getNextMatchPreview();
  const archive = getArchivedMatchPreviews();

  return (nextPreview ? [nextPreview, ...archive] : archive).slice(0, limit);
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
