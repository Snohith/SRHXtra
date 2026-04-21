#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import {
  absoluteUrl,
  cleanString,
  fetchText,
  logList,
  logSection,
  parseArgs,
  parseDateToIso,
  removeFileIfExists,
  resolveProjectPath,
  slugify,
  stripTags,
  uniqueBy,
  writeJsonFileIfChanged,
  writeTextFileIfChanged,
} from "./lib/sync-utils.mjs";

const IPL_NEWS_URL = "https://www.iplt20.com/teams/sunrisers-hyderabad/news";
const newsDirPath = resolveProjectPath("content", "news");
const newsFeedFilePath = resolveProjectPath("content", "data", "official-news-feed.json");
const MATCH_ARTICLE_PATTERN = /\b(match report|preview|vs\b| v |scorecard|thriller|won by|lost by)\b/i;
const NEWS_INCLUDE_PATTERN = /\b(sunrisers hyderabad|srh)\b/i;
const NEWS_TOPIC_PATTERN = /\b(replacement|replacements|injury|injured|captain|appointed|sign|signed|pick|picked|squad|availability|coach|coaching|management|support staff)\b/i;

function normalizeSourceImageUrl(value, baseUrl) {
  const rawValue = cleanString(value);

  if (!rawValue) {
    return null;
  }

  const absolute = absoluteUrl(rawValue, baseUrl);
  if (!absolute.includes("/_next/image?url=")) {
    return absolute;
  }

  const parsed = new URL(absolute);
  const encodedUrl = parsed.searchParams.get("url");
  return encodedUrl ? decodeURIComponent(encodedUrl) : absolute;
}

function parseIplNewsListing(html) {
  const blockPattern =
    /<div class="latest-slider-wrap position-relative">[\s\S]*?<a href="([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<li class="textTwoLine[^"]*">([\s\S]*?)<\/li>[\s\S]*?<span class="d-flex align-items-center me-2">\s*([^<]+)\s*<\/span>/g;
  const items = [];
  let match;

  while ((match = blockPattern.exec(html)) !== null) {
    items.push({
      href: cleanString(match[1]),
      coverImageUrl: normalizeSourceImageUrl(match[2], IPL_NEWS_URL),
      coverImageAlt: cleanString(stripTags(match[3])),
      publishedAt: parseDateToIso(match[4]),
      title: cleanString(stripTags(match[3])),
      sourceName: "IPL T20",
    });
  }

  return uniqueBy(items, (item) => item.href);
}

function isEligibleNewsItem(item) {
  if (MATCH_ARTICLE_PATTERN.test(item.title)) {
    return false;
  }

  return NEWS_INCLUDE_PATTERN.test(item.title) && NEWS_TOPIC_PATTERN.test(item.title);
}

function extractFirstParagraph(paragraphs, title) {
  return (
    paragraphs
      .map((entry) => cleanString(entry))
      .find((entry) =>
        entry.length > 40
        && entry.toLowerCase() !== title.toLowerCase()
        && !/^ipl media advisory$/i.test(entry)
        && !/^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}$/i.test(entry),
      )
    ?? null
  );
}

function parseIplExcerpt(html, title) {
  const bodyHtml = html.match(/<div class="news-details-content">([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const paragraphs = [...bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((entry) => stripTags(entry[1]));
  return extractFirstParagraph(paragraphs, title);
}

function buildNewsSummary(item) {
  const bullets = [];
  const titleText = item.title.endsWith(".") ? item.title : `${item.title}.`;

  bullets.push(`- Official IPL team update: ${titleText}`);

  if (item.excerpt) {
    bullets.push(`- Verified summary: ${item.excerpt}`);
  }

  bullets.push(`- Published: ${new Date(item.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.`);
  bullets.push(`- Source: [${item.sourceName}](${item.sourceUrl}).`);

  return [
    "## Verified summary",
    "",
    ...bullets,
    "",
    "## Source note",
    "",
    "This entry is a short verified summary created from an official IPL SRH news item. It intentionally avoids reproducing the original article body in full.",
  ].join("\n");
}

function inferTags(title) {
  const lower = title.toLowerCase();
  const tags = ["Official Update", "SRH"];

  if (lower.includes("replacement") || lower.includes("injury")) {
    tags.push("Squad Update");
  }
  if (lower.includes("captain")) {
    tags.push("Leadership");
  }
  if (lower.includes("squad")) {
    tags.push("Squad Update");
  }

  return [...new Set(tags)];
}

function toMarkdown(item) {
  return `---
slug: ${item.slug}
title: ${item.title}
excerpt: ${item.excerpt ?? "Official SRH team update synced from the IPL team news desk."}
publishedAt: ${item.publishedAt}
updatedAt: ${item.updatedAt}
author: SRHXtra News Desk
category: Team News
tags:
${item.tags.map((tag) => `  - ${tag}`).join("\n")}
coverImage: ${item.coverImage}
coverAlt: ${item.coverAlt}
featured: false
seoTitle: ${item.title}
seoDescription: ${item.excerpt ?? "Official SRH team update synced from the IPL team news desk."}
ogImage: ${item.coverImage}
relatedSlugs: []
draft: false
editorialStatus: verified
sourceName: ${item.sourceName}
sourceUrl: ${item.sourceUrl}
---
${item.body}
`;
}

async function enrichItem(item) {
  const detailHtml = await fetchText(item.href);
  const excerpt = parseIplExcerpt(detailHtml, item.title);
  const slug = `official-news-${slugify(item.title)}`;

  return {
    id: slugify(`${item.title}-${item.publishedAt}`),
    slug,
    title: item.title,
    publishedAt: item.publishedAt,
    updatedAt: item.publishedAt,
    sourceName: item.sourceName,
    sourceUrl: item.href,
    excerpt,
    coverImage: item.coverImageUrl || "/images/articles/news-depth.svg",
    coverAlt: item.coverImageAlt || item.title,
    tags: inferTags(item.title),
    body: buildNewsSummary({
      ...item,
      excerpt,
      sourceUrl: item.href,
    }),
  };
}

function validateItems(items) {
  const missingFields = [];

  for (const item of items) {
    if (!item.slug) {
      missingFields.push(`${item.sourceUrl} -> slug`);
    }
    if (!item.title) {
      missingFields.push(`${item.sourceUrl} -> title`);
    }
    if (!item.publishedAt) {
      missingFields.push(`${item.sourceUrl} -> publishedAt`);
    }
    if (!item.sourceUrl) {
      missingFields.push(`${item.title} -> sourceUrl`);
    }
  }

  if (missingFields.length > 0) {
    logSection("Missing news fields");
    logList(" - ", missingFields);
    throw new Error("Official news feed is incomplete. Aborting write.");
  }
}

function getManagedNewsFiles() {
  if (!fs.existsSync(newsDirPath)) {
    return [];
  }

  return fs
    .readdirSync(newsDirPath)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => path.join(newsDirPath, fileName))
    .filter((filePath) => {
      const { data } = matter(fs.readFileSync(filePath, "utf8"));
      return String(data.sourceName ?? "") === "IPL T20" || path.basename(filePath).startsWith("official-news-");
    });
}

export async function syncOfficialNews(options = {}) {
  const { dryRun = false } = options;

  logSection("Fetching official IPL SRH news listings");
  console.log(`[official-sync] Source: ${IPL_NEWS_URL}`);

  const iplHtml = await fetchText(IPL_NEWS_URL);
  const parsedItems = parseIplNewsListing(iplHtml);
  const filteredItems = parsedItems.filter(isEligibleNewsItem);
  console.log(`[official-sync] Extracted ${parsedItems.length} IPL team news items.`);
  console.log(`[official-sync] Kept ${filteredItems.length} non-match SRH news items after filtering.`);

  if (filteredItems.length === 0) {
    throw new Error("No official non-match SRH news items were found after filtering.");
  }

  const settledResults = await Promise.allSettled(filteredItems.map(enrichItem));
  const enrichedItems = [];
  
  for (let i = 0; i < settledResults.length; i++) {
    const result = settledResults[i];
    if (result.status === "fulfilled") {
      enrichedItems.push(result.value);
    } else {
      console.warn(`[official-sync] Skipping news item ${filteredItems[i].href}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  }

  const sortedItems = enrichedItems.sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
  validateItems(sortedItems);

  const nextFeed = {
    updatedAt: new Date().toISOString(),
    sourcePriority: [IPL_NEWS_URL],
    filterRule: "Keep SRH off-field/team updates only; exclude match reports, previews, and score recaps.",
    items: sortedItems.map((item) => ({
      slug: item.slug,
      title: item.title,
      publishedAt: item.publishedAt,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      excerpt: item.excerpt,
      coverImageUrl: item.coverImage,
      coverImageAlt: item.coverAlt,
      tags: item.tags,
    })),
  };

  const changedFeed = writeJsonFileIfChanged(newsFeedFilePath, nextFeed, {
    dryRun,
    label: "content/data/official-news-feed.json",
  });

  const expectedFiles = new Set();
  let changedFiles = changedFeed;

  for (const item of sortedItems) {
    const filePath = path.join(newsDirPath, `${item.slug}.md`);
    expectedFiles.add(filePath);
    changedFiles = writeTextFileIfChanged(filePath, toMarkdown(item), {
      dryRun,
      label: `content/news/${item.slug}.md`,
    }) || changedFiles;
  }

  const staleFiles = getManagedNewsFiles().filter((filePath) => !expectedFiles.has(filePath));
  if (staleFiles.length > 0) {
    logSection("Removing stale managed news files");
    for (const filePath of staleFiles) {
      changedFiles = removeFileIfExists(filePath, { dryRun }) || changedFiles;
    }
  }

  return changedFiles;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  syncOfficialNews(args).catch((error) => {
    console.error(`[official-sync] Official news sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
