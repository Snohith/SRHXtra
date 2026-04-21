#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import {
  absoluteUrl,
  cleanString,
  fetchText,
  logSection,
  parseArgs,
  removeFileIfExists,
  resolveProjectPath,
  slugify,
  stripTags,
  uniqueBy,
  fetchJsonp,
  writeJsonFileIfChanged,
} from "./lib/sync-utils.mjs";

const GALLERY_URL = "https://www.sunrisershyderabad.in/gallery";
const galleryDirPath = resolveProjectPath("content", "gallery", "albums");
const generatedFilePrefix = "official-gallery-";

function parseGalleryListing(html) {
  const blockPattern =
    /<a class="group block" href="([^"]+)"><div class="relative overflow-hidden aspect-video rounded-sm cursor-pointer">[\s\S]*?<img src="([^"]+)" alt="([^"]+)"[\s\S]*?<p class="text-white font-orbitron text-xs font-semibold leading-tight uppercase tracking-wide">([^<]+)<\/p>[\s\S]*?<p class="text-white font-orbitron text-xs font-semibold leading-tight uppercase tracking-wide">IPL SEASON[\s\S]*?(\d{4})<\/p>/g;
  const items = [];
  let match;

  while ((match = blockPattern.exec(html)) !== null) {
    items.push({
      href: absoluteUrl(match[1], GALLERY_URL),
      coverImageUrl: cleanString(match[2]),
      title: cleanString(stripTags(match[4])),
      season: cleanString(match[5]),
      coverAlt: cleanString(match[3]),
    });
  }

  return uniqueBy(items, (item) => item.href);
}

function extractGalleryContent(html) {
  const marker = '\\"content\\":{\\"match\\":';
  const objectPrefix = '\\"content\\":';
  const markerIndex = html.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error("Could not find embedded gallery payload.");
  }

  const startIndex = markerIndex + objectPrefix.length;
  let depth = 0;
  let inString = false;
  let endIndex = -1;

  for (let index = startIndex; index < html.length; index += 1) {
    const char = html[index];
    const previousChar = html[index - 1];

    if (char === '"' && previousChar !== "\\") {
      inString = !inString;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        endIndex = index + 1;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error("Could not parse embedded gallery payload boundaries.");
  }

  const jsonFragment = html
    .slice(startIndex, endIndex)
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">");

  return JSON.parse(jsonFragment);
}

function buildAlbum(listingItem, detailData) {
  const { match, items } = detailData;
  const title = `${match.matchName} | ${match.matchLabel}`;
  const publishedAt = items[0]?.publishedAt ?? match.scheduledAt;
  const updatedAt = items[0]?.updatedAt ?? items[0]?.createdAt ?? match.scheduledAt;
  const slug = `${generatedFilePrefix}${slugify(match.fixtureId)}`;

  return {
    slug,
    title,
    description: `Official SunRisers Hyderabad match gallery from ${match.matchName} featuring ${match.matchLabel} at ${match.venue}, ${match.city}.`,
    publishedAt,
    updatedAt,
    coverImage: listingItem.coverImageUrl || items[0]?.thumbnailUrl || items[0]?.imageUrl,
    coverAlt: listingItem.coverAlt || title,
    coverImageSourceUrl: listingItem.coverImageUrl || items[0]?.thumbnailUrl || items[0]?.imageUrl,
    tags: [
      "Official",
      "Gallery",
      `IPL ${match.season}`,
      match.homeTeam?.shortName,
      match.awayTeam?.shortName,
    ].filter(Boolean),
    seoTitle: title,
    seoDescription: match.resultText
      ? `${title}. ${match.resultText}.`
      : `Official SRH gallery from ${title}.`,
    sourceName: "SunRisers Hyderabad",
    sourceUrl: listingItem.href,
    editorialStatus: "verified",
    licensing: {
      status: "manual-review-required",
      notes: "Official gallery images are referenced from source URLs only. Review rights before downloading or rehosting locally.",
    },
    photos: items
      .filter((item) => item.category === "PHOTO")
      .map((item, index) => ({
        src: item.imageUrl,
        alt: cleanString(item.caption) || `${title} photo ${index + 1}`,
        caption: cleanString(item.caption) || undefined,
        width: null,
        height: null,
        sourceUrl: item.imageUrl,
        publishedAt: item.publishedAt ?? null,
        createdAt: item.createdAt ?? null,
        updatedAt: item.updatedAt ?? null,
      })),
  };
}

function validateAlbums(albums) {
  if (albums.length === 0) {
    throw new Error("No official gallery albums were generated.");
  }

  for (const album of albums) {
    if (!album.slug || !album.title || !album.coverImage || album.photos.length === 0) {
      throw new Error(`Incomplete official gallery album: ${album.sourceUrl}`);
    }
  }
}

async function syncIPLPhotosGallery(existingAlbums) {
  const matchCoverageDirPath = resolveProjectPath("content", "match-coverage");
  if (!fs.existsSync(matchCoverageDirPath)) return [];

  let indexHtml;
  try {
    indexHtml = await fetchText('https://www.iplt20.com/photos');
  } catch (error) {
    console.warn(`[official-sync] Failed to fetch IPL photos index:`, error);
    return [];
  }

  const albumsList = [];
  const blocks = indexHtml.split('class="photo-new-gallery"').slice(1);
  blocks.forEach(block => {
    const hrefMatch = block.match(/href="([^"]+)"/);
    const srcMatch = block.match(/data-src="([^"]+)"/);
    const titleMatch = block.match(/<h3>(.*?)<\/h3>/);
    const dateMatch = block.match(/<p>(.*?)<\/p>/);
    if (hrefMatch && srcMatch && titleMatch) {
      albumsList.push({
        href: hrefMatch[1],
        coverImage: srcMatch[1],
        title: titleMatch[1].trim(),
        date: dateMatch ? dateMatch[1].trim() : ''
      });
    }
  });

  const srhMatchAlbums = albumsList.filter(a => a.title.includes('SRH') || a.title.toLowerCase().includes('hyderabad'));
  const newAlbums = [];
  const files = fs.readdirSync(matchCoverageDirPath).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(matchCoverageDirPath, file);
    const content = fs.readFileSync(filePath, "utf8");
    const { data } = matter(content);

    const matchMatch = data.slug.match(/match-(\d+)-/);
    const matchNumber = matchMatch ? matchMatch[1] : "";
    if (!matchNumber) continue;

    const opponentMatch = data.slug.match(/vs-([a-z]+)/);
    const opponent = opponentMatch ? opponentMatch[1].toUpperCase() : "";

    const hasTrueGallery = existingAlbums.some(album => 
      album.title.includes(`${matchNumber}st Match`) ||
      album.title.includes(`${matchNumber}nd Match`) ||
      album.title.includes(`${matchNumber}rd Match`) ||
      album.title.includes(`${matchNumber}th Match`)
    );

    if (hasTrueGallery) continue;

    const srhAlbum = srhMatchAlbums.find(a => 
      (a.title.includes(`Match ${matchNumber}`) || a.title.includes(`Match 0${matchNumber}`)) &&
      (a.title.includes(opponent) || a.title.toLowerCase().includes(opponent.toLowerCase()))
    );

    if (srhAlbum) {
      try {
        const albumHtml = await fetchText(srhAlbum.href);
        const imgMatches = [...albumHtml.matchAll(/<img[^>]*src="([^"]+assets\.bcci\.tv\/watermarkoutput[^"]+)"/gi)];
        const uniqueSrcs = [...new Set(imgMatches.map(m => m[1]))];

        if (uniqueSrcs.length === 0) continue;

        const photos = uniqueSrcs.map((src, index) => ({
          src: src,
          alt: `${data.title} photo ${index + 1}`,
          caption: `Official match photo from ${data.title}`,
          sourceUrl: src,
          publishedAt: data.publishedAt,
          createdAt: data.publishedAt,
          updatedAt: data.updatedAt || data.publishedAt,
        }));

        const teamsMatch = srhAlbum.title.match(/:\s*(.*)/);
        const teamsStr = teamsMatch ? teamsMatch[1].trim() : `${opponent} vs SRH`;

        // Prefer a mid-album photo as the cover: IPL albums lead with crowd/arrival shots,
        // and team/action shots typically appear around the 20% mark.
        const coverIndex = Math.floor(photos.length * 0.2);
        const chosenCover = photos[coverIndex] || photos[0];

        newAlbums.push({
          slug: `official-ipl-gallery-match-${matchNumber}`,
          title: `${matchNumber}${['st', 'nd', 'rd'][(matchNumber % 10) - 1] || 'th'} Match | ${teamsStr}`,
          description: `Official photo gallery for ${data.title} from the IPL Match Centre.`,
          publishedAt: data.publishedAt,
          updatedAt: data.updatedAt || data.publishedAt,
          coverImage: chosenCover.src,
          coverAlt: `${teamsStr} – Official match photo`,
          coverImageSourceUrl: chosenCover.src,
          tags: ["Match Photos", ...(data.tags || []).filter((t) => t !== "Match Report" && t !== "Fallback")],
          seoTitle: `${data.title} Official Photos`,
          seoDescription: `Official photo gallery for ${data.slug}.`,
          sourceName: "IPL T20",
          sourceUrl: srhAlbum.href,
          editorialStatus: "verified",
          sourceKind: "ipl-photos",
          licensing: {
            status: "source-reference-only",
            notes: "Extracted from official IPL match photos.",
          },
          photos: photos,
        });
      } catch (error) {
        console.warn(`[official-sync] Failed to parse IPL photo album ${srhAlbum.href}:`, error);
      }
    }
  }

  return newAlbums;
}

async function generateFallbackAlbums(existingAlbums) {
  const matchCoverageDirPath = resolveProjectPath("content", "match-coverage");
  if (!fs.existsSync(matchCoverageDirPath)) return [];

  let scheduleData = null;
  try {
    const competitionData = await fetchJsonp('https://scores.iplt20.com/ipl/mc/competition.js');
    const selectedCompetition = competitionData.competition.sort((a,b) => Number(b.SeasonID) - Number(a.SeasonID))[0];
    scheduleData = await fetchJsonp(`https://scores.iplt20.com/ipl/feeds/${selectedCompetition.CompetitionID}-matchschedule.js`);
  } catch (error) {
    console.warn(`[official-sync] Failed to fetch matchschedule for fallback albums:`, error);
  }

  const fallbackAlbums = [];
  const files = fs.readdirSync(matchCoverageDirPath).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(matchCoverageDirPath, file);
    const content = fs.readFileSync(filePath, "utf8");
    const { data } = matter(content);

    if (!data.coverImage) continue;

    const matchMatch = data.slug.match(/match-(\d+)-/);
    const matchNumber = matchMatch ? matchMatch[1] : "";
    
    const opponentMatch = data.slug.match(/vs-([a-z]+)/);
    const opponent = opponentMatch ? opponentMatch[1].toUpperCase() : "";

    const hasTrueGallery = existingAlbums.some(album => 
      album.title.includes(`${matchNumber}st Match`) ||
      album.title.includes(`${matchNumber}nd Match`) ||
      album.title.includes(`${matchNumber}rd Match`) ||
      album.title.includes(`${matchNumber}th Match`)
    );

    if (hasTrueGallery) continue;

    const title = matchNumber ? `${matchNumber}${['st', 'nd', 'rd'][(matchNumber % 10) - 1] || 'th'} Match | Fallback Gallery` : `${data.title} | Fallback`;

    const photos = [
      {
        src: data.coverImage,
        alt: data.coverAlt || title,
        caption: `Official match report cover image for ${data.title}`,
        sourceUrl: data.coverImage,
        publishedAt: data.publishedAt,
        createdAt: data.publishedAt,
        updatedAt: data.updatedAt || data.publishedAt,
      }
    ];

    if (scheduleData && matchNumber) {
      // Find match in schedule data
      const matchLabel = `Match ${matchNumber}`;
      const match = scheduleData.Matchsummary.find(m => m.MatchStatus === 'Post' && m.MatchOrder === matchLabel);
      // If MatchOrder isn't exact, try finding by matching teams (fallback logic).
      const fallbackMatch = scheduleData.Matchsummary.find(m => m.MatchStatus === 'Post' && m.MatchName && m.MatchName.toLowerCase().includes('hyderabad') && (m.RowNo === Number(matchNumber) || String(m.MatchName).includes(opponent)));
      
      const targetMatch = match || fallbackMatch;

      if (targetMatch) {
        const commentaries = [targetMatch.PreMatchCommentary, targetMatch.MatchBreakComments, targetMatch.PostMatchCommentary];
        const extractedImages = [];
        commentaries.forEach(c => {
          if (!c) return;
          const imgMatches = [...c.matchAll(/<img[^>]*src=\"([^\"]+)\"[^>]*>/gi)];
          imgMatches.forEach(m => extractedImages.push(m[1]));
        });

        const uniqueImages = [...new Set(extractedImages)];
        uniqueImages.forEach((imgUrl, idx) => {
          photos.push({
            src: imgUrl,
            alt: `Match infographic ${idx + 1}`,
            caption: `Official match infographic from IPL match center`,
            sourceUrl: imgUrl,
            publishedAt: data.publishedAt,
            createdAt: data.publishedAt,
            updatedAt: data.updatedAt || data.publishedAt,
          });
        });
      }
    }

    fallbackAlbums.push({
      slug: `official-match-report-gallery-${data.slug}`,
      title: title,
      description: `Fallback gallery generated from the official match report for ${data.slug}.`,
      publishedAt: data.publishedAt,
      updatedAt: data.updatedAt || data.publishedAt,
      coverImage: data.coverImage,
      coverAlt: data.coverAlt || title,
      coverImageSourceUrl: data.coverImage,
      tags: ["Fallback", "Match Report", ...(data.tags || []).filter((t) => t !== "Match Report")],
      seoTitle: title,
      seoDescription: `Match report cover image for ${data.slug}.`,
      sourceName: data.sourceName || "IPL T20",
      sourceUrl: data.sourceUrl,
      editorialStatus: "verified",
      licensing: {
        status: "source-reference-only",
        notes: "Fallback gallery containing match report cover and commentary infographics.",
      },
      isFallback: true,
      fallbackType: photos.length > 1 ? "infographics" : "limited-photos",
      sourceKind: photos.length > 1 ? "match-commentary-graphics" : "match-report-cover",
      photos: photos,
    });
  }

  return fallbackAlbums;
}

export async function syncOfficialGallery(options = {}) {
  const { dryRun = false } = options;

  logSection("Fetching official SunRisers gallery");
  console.log(`[official-sync] Source: ${GALLERY_URL}`);
  const listingHtml = await fetchText(GALLERY_URL);
  const listingItems = parseGalleryListing(listingHtml);

  if (listingItems.length === 0) {
    throw new Error("Unable to parse any official gallery albums from the listing page.");
  }

  console.log(`[official-sync] Extracted ${listingItems.length} official gallery albums.`);

  const albums = [];

  for (const listingItem of listingItems) {
    try {
      const detailHtml = await fetchText(listingItem.href);
      const detailData = extractGalleryContent(detailHtml);
      albums.push(buildAlbum(listingItem, detailData));
    } catch (error) {
      console.warn(`[official-sync] Skipping album ${listingItem.href}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const iplAlbums = await syncIPLPhotosGallery(albums);
  if (iplAlbums.length > 0) {
    console.log(`[official-sync] Found ${iplAlbums.length} official real-photo albums from IPL photos index.`);
    albums.push(...iplAlbums);
  }

  const fallbackAlbums = await generateFallbackAlbums(albums);
  if (fallbackAlbums.length > 0) {
    console.log(`[official-sync] Generated ${fallbackAlbums.length} fallback albums from match reports.`);
    albums.push(...fallbackAlbums);
  }

  validateAlbums(albums);

  const changedFiles = [];
  const nextFileNames = new Set();

  for (const album of albums) {
    const fileName = `${album.slug}.json`;
    nextFileNames.add(fileName);
    const changed = writeJsonFileIfChanged(path.join(galleryDirPath, fileName), album, {
      dryRun,
      label: `content/gallery/albums/${fileName}`,
    });

    if (changed) {
      changedFiles.push(fileName);
    }
  }

  const staleGeneratedFiles = fs.readdirSync(galleryDirPath).filter(
    (fileName) => fileName.startsWith(generatedFilePrefix) && !nextFileNames.has(fileName),
  );

  for (const fileName of staleGeneratedFiles) {
    if (removeFileIfExists(path.join(galleryDirPath, fileName), { dryRun })) {
      changedFiles.push(fileName);
    }
  }

  if (changedFiles.length === 0) {
    console.log("[official-sync] No official gallery file changes detected.");
    return false;
  }

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  syncOfficialGallery(args).catch((error) => {
    console.error(`[official-sync] Official gallery sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
