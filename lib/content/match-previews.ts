import fs from "node:fs";
import path from "node:path";

import {
  getArticleBySlug,
  getArticlesByCollection,
  getRelatedArticles,
  type Article,
} from "@/lib/content/articles";
import { compareDatesDesc } from "@/lib/utils/date";
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

function normalizePreviewText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getPreviewSortDate(article: Article) {
  return article.matchDate ?? article.publishedAt;
}

function getArticleDateKey(article: Article) {
  return getPreviewSortDate(article).slice(0, 10);
}

function matchesFixtureOpponent(article: Article, fixture: Fixture) {
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

function matchesFixtureDate(article: Article, fixture: Fixture) {
  return getArticleDateKey(article) === fixture.date;
}

export function getAllMatchPreviews() {
  return getArticlesByCollection("match-previews")
    .filter(isPublishedMatchPreview)
    .sort((left, right) => compareDatesDesc(getPreviewSortDate(left), getPreviewSortDate(right)));
}

export function getMatchPreviewForFixture(fixture: Fixture) {
  const previews = getAllMatchPreviews();

  if (fixture.previewSlug) {
    const previewBySlug = previews.find((article) => article.slug === fixture.previewSlug);

    if (previewBySlug) {
      return previewBySlug;
    }
  }

  return (
    previews.find(
      (article) => matchesFixtureOpponent(article, fixture) && matchesFixtureDate(article, fixture),
    )
    ?? null
  );
}

export function getNextMatchPreviewFeature() {
  const nextFixture = getNextFixture();

  if (!nextFixture) {
    return null;
  }

  const article = getMatchPreviewForFixture(nextFixture);

  return article ? { article, fixture: nextFixture } : null;
}

export function getNextMatchPreview() {
  return getNextMatchPreviewFeature()?.article ?? null;
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
