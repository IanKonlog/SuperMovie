import { db } from "@/lib/db";
import type {
  MediaItemDTO,
  MediaTypeValue,
  SeasonDTO,
  WatchStatusValue,
} from "./constants";

export function listMediaItems(filters?: {
  status?: WatchStatusValue;
  type?: MediaTypeValue;
}) {
  return db.mediaItem.findMany({
    where: {
      status: filters?.status,
      type: filters?.type,
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export type LibraryPage = {
  items: MediaItemDTO[];
  total: number;
  page: number;
  pageCount: number;
};

export const LIBRARY_PAGE_SIZE = 24;

export async function listLibraryPage(filters: {
  status?: WatchStatusValue;
  type?: MediaTypeValue;
  q?: string;
  genre?: string;
  favoritesOnly?: boolean;
  page: number;
}): Promise<LibraryPage> {
  const page = Math.max(1, filters.page);
  const where = {
    status: filters.status,
    type: filters.type,
    ...(filters.q
      ? { title: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
    ...(filters.genre ? { genres: { has: filters.genre } } : {}),
    ...(filters.favoritesOnly ? { isFavorite: true } : {}),
  };

  const [items, total] = await Promise.all([
    db.mediaItem.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * LIBRARY_PAGE_SIZE,
      take: LIBRARY_PAGE_SIZE,
    }),
    db.mediaItem.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE)),
  };
}

export async function getMediaStats() {
  const grouped = await db.mediaItem.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  return { counts, total };
}

export type GenreProfileEntry = { genre: string; avg: number; count: number };

export async function getGenreProfile(): Promise<GenreProfileEntry[]> {
  const rated = await db.mediaItem.findMany({
    where: { rating: { not: null } },
    select: { rating: true, genres: true },
  });

  const sums = new Map<string, { total: number; count: number }>();
  for (const item of rated) {
    for (const genre of item.genres) {
      const entry = sums.get(genre) ?? { total: 0, count: 0 };
      entry.total += item.rating ?? 0;
      entry.count += 1;
      sums.set(genre, entry);
    }
  }

  return [...sums.entries()]
    .map(([genre, { total, count }]) => ({
      genre,
      avg: Math.round((total / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 5);
}

export type RecommendationSourceItem = {
  tmdbId: number;
  type: MediaTypeValue;
  rating: number;
  title: string;
};

export async function getRecommendationSources(): Promise<
  RecommendationSourceItem[]
> {
  const rows = await db.mediaItem.findMany({
    where: { rating: { gte: 7 }, tmdbId: { not: null } },
    orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
    take: 8,
    select: { tmdbId: true, type: true, rating: true, title: true },
  });
  return rows.flatMap((row) =>
    row.tmdbId === null || row.rating === null
      ? []
      : [
          {
            tmdbId: row.tmdbId,
            type: row.type,
            rating: row.rating,
            title: row.title,
          },
        ],
  );
}

export async function getLibraryTmdbKeys(): Promise<string[]> {
  const rows = await db.mediaItem.findMany({
    where: { tmdbId: { not: null } },
    select: { tmdbId: true, type: true },
  });
  return rows.flatMap((row) =>
    row.tmdbId === null ? [] : [`${row.type}:${row.tmdbId}`],
  );
}

export async function getSeasonsByItemId(): Promise<Map<string, SeasonDTO[]>> {
  const rows = await db.mediaSeason.findMany({
    orderBy: [{ mediaItemId: "asc" }, { seasonNumber: "asc" }],
  });
  const map = new Map<string, SeasonDTO[]>();
  for (const row of rows) {
    const list = map.get(row.mediaItemId) ?? [];
    list.push({
      id: row.id,
      seasonNumber: row.seasonNumber,
      episodeCount: row.episodeCount,
      watchedCount: row.watchedCount,
    });
    map.set(row.mediaItemId, list);
  }
  return map;
}

export type LibraryEntrySummary = {
  id: string;
  status: WatchStatusValue;
  rating: number | null;
};

export async function getLibraryEntryForTitle(
  tmdbId: number,
  type: MediaTypeValue,
): Promise<LibraryEntrySummary | null> {
  const row = await db.mediaItem.findFirst({
    where: { tmdbId, type },
    select: { id: true, status: true, rating: true },
  });
  if (!row) return null;
  return { id: row.id, status: row.status, rating: row.rating };
}

export type GenreCount = { genre: string; count: number };

export async function getLibraryGenreCounts(): Promise<GenreCount[]> {
  const rows = await db.mediaItem.findMany({ select: { genres: true } });
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const genre of row.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}
