import { db } from "@/lib/db";
import type {
  LibrarySort,
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
  tag?: string;
  decadePrefix?: string;
  sort?: LibrarySort;
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
    ...(filters.tag ? { tags: { has: filters.tag } } : {}),
    ...(filters.decadePrefix
      ? { releaseDate: { startsWith: filters.decadePrefix } }
      : {}),
    ...(filters.favoritesOnly ? { isFavorite: true } : {}),
  };

  const sort = filters.sort ?? "recent";
  const orderBy =
    sort === "added"
      ? [{ createdAt: "desc" as const }]
      : sort === "title"
        ? [{ title: "asc" as const }]
        : sort === "rating"
          ? [{ rating: { sort: "desc" as const, nulls: "last" as const } }]
          : sort === "year"
            ? [
                {
                  releaseDate: {
                    sort: "desc" as const,
                    nulls: "last" as const,
                  },
                },
              ]
            : sort === "rewatches"
              ? [{ watchCount: "desc" as const }]
              : [{ updatedAt: "desc" as const }];

  const [items, total] = await Promise.all([
    db.mediaItem.findMany({
      where,
      orderBy,
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
  const select = { tmdbId: true, type: true, rating: true, title: true };
  const [topRows, recentRows] = await Promise.all([
    db.mediaItem.findMany({
      where: { rating: { gte: 7 }, tmdbId: { not: null } },
      orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select,
    }),
    // Reactive seeds: freshly rated titles steer the shelf immediately.
    db.mediaItem.findMany({
      where: { rating: { gte: 5 }, tmdbId: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select,
    }),
  ]);

  function map(row: (typeof topRows)[number]) {
    return row.tmdbId === null || row.rating === null
      ? []
      : [
          {
            tmdbId: row.tmdbId,
            type: row.type,
            rating: row.rating,
            title: row.title,
          },
        ];
  }

  const merged: RecommendationSourceItem[] = [];
  const seen = new Set<string>();
  for (const row of [...topRows, ...recentRows]) {
    if (merged.length >= 10) break;
    const item = map(row)[0];
    if (!item) continue;
    const key = `${item.type}:${item.tmdbId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

export async function getHiddenRecommendationKeys(): Promise<string[]> {
  const rows = await db.hiddenRecommendation.findMany({
    select: { key: true },
  });
  return rows.map((row) => row.key);
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

export async function getLibraryTagCounts(): Promise<GenreCount[]> {
  const rows = await db.mediaItem.findMany({ select: { tags: true } });
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ genre: tag, count }))
    .sort((a, b) => b.count - a.count);
}

export type DecadeCount = { decade: string; prefix: string; count: number };

export async function getLibraryDecades(): Promise<DecadeCount[]> {
  const rows = await db.mediaItem.findMany({
    where: { releaseDate: { not: null } },
    select: { releaseDate: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    const releaseDate = row.releaseDate as string;
    if (!/^\d{4}/.test(releaseDate)) continue;
    const prefix = releaseDate.slice(0, 3);
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([prefix, count]) => ({ decade: `${prefix}0s`, prefix, count }))
    .sort((a, b) => b.prefix.localeCompare(a.prefix));
}

export type StatsItem = {
  id: string;
  title: string;
  type: MediaTypeValue;
  status: WatchStatusValue;
  rating: number | null;
  isFavorite: boolean;
  tmdbId: number | null;
  posterUrl: string | null;
  releaseDate: string | null;
  genres: string[];
};

export async function getStatsItems(): Promise<StatsItem[]> {
  return db.mediaItem.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      rating: true,
      isFavorite: true,
      tmdbId: true,
      posterUrl: true,
      releaseDate: true,
      genres: true,
    },
  });
}

export async function getWantToWatch(): Promise<StatsItem[]> {
  return db.mediaItem.findMany({
    where: { status: "WANT_TO_WATCH" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      rating: true,
      isFavorite: true,
      tmdbId: true,
      posterUrl: true,
      releaseDate: true,
      genres: true,
    },
  });
}

export async function getWatchedEpisodeKeys(): Promise<
  Record<string, string[]>
> {
  const rows = await db.episodeWatched.findMany({
    select: { mediaItemId: true, seasonNumber: true, episodeNumber: true },
  });
  const byItem: Record<string, string[]> = {};
  for (const row of rows) {
    const list = (byItem[row.mediaItemId] ??= []);
    list.push(`S${row.seasonNumber}E${row.episodeNumber}`);
  }
  return byItem;
}

export async function getRecentActivity(limit = 15) {
  return db.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, message: true, createdAt: true },
  });
}

export async function getShareToken(): Promise<string | null> {
  const share = await db.shareToken.findFirst({ select: { token: true } });
  return share ? share.token : null;
}
