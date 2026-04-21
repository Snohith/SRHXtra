import type { MetadataRoute } from "next";

import { getAllArticles } from "@/lib/content/articles";
import { getAllGalleryAlbums } from "@/lib/content/gallery";
import { getPointsTable } from "@/lib/content/points-table";
import { getSchedule } from "@/lib/content/schedule";
import { getSquad } from "@/lib/content/squad";
import { buildAbsoluteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const schedule = getSchedule();
  const squad = getSquad();
  const articles = getAllArticles();
  const albums = getAllGalleryAlbums();
  const pointsTable = getPointsTable();
  const staticRoutes = [
    { route: "/", lastModified: articles[0]?.updatedAt ?? articles[0]?.publishedAt ?? schedule.updatedAt },
    { route: "/news/", lastModified: articles.find((article) => article.collection === "news")?.updatedAt ?? articles.find((article) => article.collection === "news")?.publishedAt ?? schedule.updatedAt },
    { route: "/match-coverage/", lastModified: articles.find((article) => article.collection === "match-coverage")?.updatedAt ?? articles.find((article) => article.collection === "match-coverage")?.publishedAt ?? schedule.updatedAt },
    { route: "/points-table/", lastModified: pointsTable?.updatedAt ?? schedule.updatedAt },
    { route: "/gallery/", lastModified: albums[0]?.updatedAt ?? albums[0]?.publishedAt ?? schedule.updatedAt },
    { route: "/schedule/", lastModified: schedule.updatedAt },
    { route: "/squad/", lastModified: squad.updatedAt },
    { route: "/about-us/", lastModified: schedule.updatedAt },
  ];

  const articleRoutes = articles.map((article) => ({
    route: article.url,
    lastModified: article.updatedAt ?? article.publishedAt,
  }));
  const galleryRoutes = albums.map((album) => ({
    route: album.url,
    lastModified: album.updatedAt ?? album.publishedAt,
  }));
  const squadRoutes = squad.players.map((player) => ({
    route: `/squad/${player.slug}/`,
    lastModified: squad.updatedAt,
  }));
  const scheduleRoutes = schedule.fixtures
    .filter((fixture) => fixture.reportSlug)
    .map((fixture) => ({
      route: `/match-coverage/${fixture.reportSlug}/`,
      lastModified: schedule.updatedAt,
    }));

  return [...staticRoutes, ...articleRoutes, ...galleryRoutes, ...squadRoutes, ...scheduleRoutes]
    .filter((entry, index, items) => items.findIndex((candidate) => candidate.route === entry.route) === index)
    .map((entry) => ({
      url: buildAbsoluteUrl(entry.route),
      lastModified: new Date(entry.lastModified),
    }));
}
