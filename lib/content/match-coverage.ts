import {
  getArticleBySlug,
  getArticlesByCollection,
  getRelatedArticles,
  type Article,
} from "@/lib/content/articles";
import { compareDatesDesc } from "@/lib/utils/date";
import { getLatestResult, type Fixture } from "@/lib/content/schedule";

function getMatchReportSortDate(article: Article) {
  return article.matchDate ?? article.publishedAt;
}

function sortMatchReports(left: Article, right: Article) {
  return compareDatesDesc(getMatchReportSortDate(left), getMatchReportSortDate(right));
}

function dedupeBySlug(articles: Article[]) {
  const seenSlugs = new Set<string>();

  return articles.filter((article) => {
    if (seenSlugs.has(article.slug)) {
      return false;
    }

    seenSlugs.add(article.slug);
    return true;
  });
}

export function getAllMatchReports() {
  return dedupeBySlug(getArticlesByCollection("match-coverage").sort(sortMatchReports));
}

export function getMatchReportBySlug(slug: string) {
  return getArticleBySlug("match-coverage", slug);
}

export function getMatchReportForFixture(fixture: Fixture | null) {
  if (!fixture?.reportSlug) {
    return null;
  }

  return getMatchReportBySlug(fixture.reportSlug);
}

export function getLatestMatchReport() {
  return getMatchReportForFixture(getLatestResult()) ?? getAllMatchReports()[0] ?? null;
}

export function getRelatedMatchReports(article: Article, limit = 3) {
  return getRelatedArticles(article, limit);
}
