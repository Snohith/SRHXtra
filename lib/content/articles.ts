import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { compareDatesDesc } from "@/lib/utils/date";
import { resolveContentPath } from "@/lib/utils/paths";
import { createExcerpt } from "@/lib/utils/text";
import {
  assertEditorialStatus,
  assertRequiredDateString,
  assertRequiredString,
  assertRequiredStringArray,
  type EditorialStatus,
} from "@/lib/content/validation";

export type ArticleCollection = "news" | "match-coverage";

export interface ArticleFrontmatter {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  category: string;
  tags: string[];
  coverImage: string;
  coverAlt: string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  relatedSlugs?: string[];
  draft?: boolean;
  editorialStatus?: EditorialStatus;
  sourceName?: string;
  sourceUrl?: string;
}

export interface StoryCardItem {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: string;
  tags: string[];
  coverImage: string;
  coverAlt: string;
  url: string;
  sourceName?: string;
  isExternal?: boolean;
}

export interface Article extends ArticleFrontmatter, StoryCardItem {
  collection: ArticleCollection;
  content: string;
}

const ARTICLE_DIRECTORIES: Record<ArticleCollection, string> = {
  news: resolveContentPath("news"),
  "match-coverage": resolveContentPath("match-coverage"),
};

function readArticleFile(collection: ArticleCollection, filePath: string): Article {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(fileContent);
  const frontmatter = data as Partial<ArticleFrontmatter>;
  const slug = String(frontmatter.slug ?? path.basename(filePath, path.extname(filePath)));
  const title = assertRequiredString(frontmatter.title, "title", filePath);
  const excerpt =
    typeof frontmatter.excerpt === "string" && frontmatter.excerpt.trim().length > 0
      ? frontmatter.excerpt.trim()
      : createExcerpt(content);
  const publishedAt = assertRequiredDateString(frontmatter.publishedAt, "publishedAt", filePath);
  const author = assertRequiredString(frontmatter.author, "author", filePath);
  const category = assertRequiredString(frontmatter.category, "category", filePath);
  const tags = assertRequiredStringArray(frontmatter.tags, "tags", filePath);
  const coverImage = assertRequiredString(frontmatter.coverImage, "coverImage", filePath);
  const coverAlt = assertRequiredString(frontmatter.coverAlt, "coverAlt", filePath);
  const editorialStatus = assertEditorialStatus(frontmatter.editorialStatus, filePath);

  return {
    slug,
    title,
    excerpt,
    publishedAt,
    updatedAt: frontmatter.updatedAt
      ? assertRequiredDateString(frontmatter.updatedAt, "updatedAt", filePath)
      : undefined,
    author,
    category,
    tags,
    coverImage,
    coverAlt,
    featured: Boolean(frontmatter.featured),
    seoTitle: frontmatter.seoTitle ? String(frontmatter.seoTitle) : undefined,
    seoDescription: frontmatter.seoDescription
      ? String(frontmatter.seoDescription)
      : undefined,
    ogImage: frontmatter.ogImage ? String(frontmatter.ogImage) : undefined,
    relatedSlugs: Array.isArray(frontmatter.relatedSlugs)
      ? frontmatter.relatedSlugs.map(String)
      : [],
    draft: Boolean(frontmatter.draft),
    editorialStatus,
    sourceName: frontmatter.sourceName ? String(frontmatter.sourceName) : undefined,
    sourceUrl: frontmatter.sourceUrl ? String(frontmatter.sourceUrl) : undefined,
    collection,
    content,
    url: `/${collection}/${slug}/`,
  };
}

export function getArticlesByCollection(collection: ArticleCollection) {
  return fs
    .readdirSync(ARTICLE_DIRECTORIES[collection])
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) =>
      readArticleFile(collection, path.join(ARTICLE_DIRECTORIES[collection], fileName)),
    )
    .filter((article) => !article.draft)
    .sort((left, right) => compareDatesDesc(left.publishedAt, right.publishedAt));
}

export function getAllArticles() {
  return (Object.keys(ARTICLE_DIRECTORIES) as ArticleCollection[])
    .flatMap((collection) => getArticlesByCollection(collection))
    .sort((left, right) => compareDatesDesc(left.publishedAt, right.publishedAt));
}

export function getArticleBySlug(collection: ArticleCollection, slug: string) {
  return getArticlesByCollection(collection).find((article) => article.slug === slug) ?? null;
}

export function getArticleSlugs(collection: ArticleCollection) {
  return getArticlesByCollection(collection).map((article) => article.slug);
}

export function getLatestArticles(collection: ArticleCollection, limit = 3) {
  return getArticlesByCollection(collection).slice(0, limit);
}

export function getRelatedArticles(article: Article, limit = 3) {
  const collectionArticles = getArticlesByCollection(article.collection).filter(
    (entry) => entry.slug !== article.slug,
  );

  const preferred = collectionArticles.filter((entry) =>
    article.relatedSlugs?.includes(entry.slug),
  );

  if (preferred.length >= limit) {
    return preferred.slice(0, limit);
  }

  const fallback = collectionArticles.filter((entry) =>
    entry.tags.some((tag) => article.tags.includes(tag)),
  );

  return [...preferred, ...fallback]
    .filter((entry, index, items) => items.findIndex((candidate) => candidate.slug === entry.slug) === index)
    .slice(0, limit);
}
