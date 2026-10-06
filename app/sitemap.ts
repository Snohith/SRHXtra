import type { MetadataRoute } from "next";

import { getAllArticles } from "@/lib/content/articles";
import { getAllGalleryAlbums } from "@/lib/content/gallery";
import { getAllMatchPreviews } from "@/lib/content/match-previews";
import { getPointsTable } from "@/lib/content/points-table";
import { getSchedule } from "@/lib/content/schedule";
import { getSquad } from "@/lib/content/squad";
import { buildAbsoluteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const schedule = getSchedule();
  const squad = getSquad();
  const articles = getAllArticles();
  const matchPreviews = getAllMatchPreviews();
  const albums = getAllGalleryAlbums();
  const pointsTable = getPointsTable();
  const staticRoutes = [
    { route: "/", lastModified: articles[0]?.updatedAt ?? articles[0]?.publishedAt ?? schedule.updatedAt, changeFrequency: "hourly" as const, priority: 1 },
    { route: "/sunrisers-hyderabad/news/", lastModified: articles.find((article) => article.collection === "news")?.updatedAt ?? articles.find((article) => article.collection === "news")?.publishedAt ?? schedule.updatedAt, changeFrequency: "hourly" as const, priority: 0.95 },
    { route: "/sunrisers-hyderabad/match-previews/", lastModified: matchPreviews[0]?.updatedAt ?? matchPreviews[0]?.publishedAt ?? schedule.updatedAt, changeFrequency: "hourly" as const, priority: 0.94 },
    { route: "/sunrisers-hyderabad/match-coverage/", lastModified: articles.find((article) => article.collection === "match-coverage")?.updatedAt ?? articles.find((article) => article.collection === "match-coverage")?.publishedAt ?? schedule.updatedAt, changeFrequency: "hourly" as const, priority: 0.95 },
    { route: "/sunrisers-hyderabad/points-table/", lastModified: pointsTable?.updatedAt ?? schedule.updatedAt, changeFrequency: "daily" as const, priority: 0.9 },
    { route: "/sunrisers-hyderabad/player-poll/", lastModified: schedule.updatedAt, changeFrequency: "daily" as const, priority: 0.82 },
    { route: "/sunrisers-hyderabad/gallery/", lastModified: albums[0]?.updatedAt ?? albums[0]?.publishedAt ?? schedule.updatedAt, changeFrequency: "daily" as const, priority: 0.85 },
    { route: "/sunrisers-hyderabad/schedule/", lastModified: schedule.updatedAt, changeFrequency: "daily" as const, priority: 0.9 },
    { route: "/sunrisers-hyderabad/squad/", lastModified: squad.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 },
    { route: "/sunrisers-hyderabad/about-us/", lastModified: schedule.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  const articleRoutes = articles
    .filter((article) => article.collection !== "match-previews")
    .map((article) => {
      const image = article.ogImage ?? article.coverImage;
      return {
        route: article.url,
        lastModified: article.updatedAt ?? article.publishedAt,
        changeFrequency: "daily" as const,
        priority: article.collection === "news" ? 0.88 : 0.86,
        images: image ? [buildAbsoluteUrl(image)] : [],
      };
    });
  const matchPreviewRoutes = matchPreviews.map((article) => {
    const image = article.ogImage ?? article.coverImage;
    return {
      route: article.url,
      lastModified: article.updatedAt ?? article.publishedAt,
      changeFrequency: "daily" as const,
      priority: 0.87,
      images: image ? [buildAbsoluteUrl(image)] : [],
    };
  });
  const galleryRoutes = albums.map((album) => ({
    route: album.url,
    lastModified: album.updatedAt ?? album.publishedAt,
    changeFrequency: "weekly" as const,
    priority: 0.75,
    images: [buildAbsoluteUrl(album.coverImage)],
  }));
  const squadRoutes = squad.players.map((player) => ({
    route: `/sunrisers-hyderabad/squad/${player.slug}/`,
    lastModified: squad.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    images: [buildAbsoluteUrl(player.image)],
  }));
  const scheduleRoutes = schedule.fixtures
    .filter((fixture) => fixture.reportSlug)
    .map((fixture) => ({
      route: `/sunrisers-hyderabad/match-coverage/${fixture.reportSlug}/`,
      lastModified: schedule.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.87,
    }));

  return [...staticRoutes, ...articleRoutes, ...matchPreviewRoutes, ...galleryRoutes, ...squadRoutes, ...scheduleRoutes]
    .filter((entry, index, items) => items.findIndex((candidate) => candidate.route === entry.route) === index)
    .map((entry: {
      route: string;
      lastModified: string;
      changeFrequency: "hourly" | "daily" | "weekly" | "monthly";
      priority: number;
      images?: string[];
    }) => ({
      url: buildAbsoluteUrl(entry.route),
      lastModified: new Date(entry.lastModified),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      ...(entry.images && entry.images.length > 0 ? { images: entry.images } : {}),
    }));
}
