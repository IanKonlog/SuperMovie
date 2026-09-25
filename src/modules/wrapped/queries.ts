import { db } from "@/lib/db";
import { fetchRuntimeMinutesCached } from "@/modules/tmdb/queries";

export const WRAPPED_MIN_YEAR = 2019;

export type WrappedData = {
  year: number;
  titlesCompleted: number;
  moviesCompleted: number;
  seriesCompleted: number;
  hoursWatched: number;
  episodesWatched: number;
  topGenres: { genre: string; count: number }[];
  topDecade: string | null;
  ratingsGiven: number;
  averageRating: number | null;
  ratingHistogram: number[];
  best: {
    title: string;
    posterUrl: string | null;
    rating: number;
    year: string | null;
  } | null;
  notable: { title: string; posterUrl: string | null; rating: number | null }[];
  booksFinished: number;
  pagesRead: number;
  bestBook: { title: string; author: string; rating: number | null } | null;
  bookAverageRating: number | null;
};

export function parseWrappedYear(
  value: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const year = Number(raw);
  if (!Number.isInteger(year)) return null;
  if (year < WRAPPED_MIN_YEAR || year > 2100) return null;
  return year;
}

// Keep the story snappy: each runtime lookup is a remote TMDB round-trip.
const RUNTIME_LOOKUP_CAP = 60;

export async function getWrappedData(
  year: number,
): Promise<WrappedData | null> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const items = await db.mediaItem.findMany({
    where: { status: "COMPLETED", completedAt: { gte: start, lt: end } },
    select: {
      id: true,
      title: true,
      type: true,
      tmdbId: true,
      posterUrl: true,
      rating: true,
      genres: true,
      releaseDate: true,
      completedAt: true,
    },
    orderBy: { completedAt: "asc" },
  });

  const books = await db.book.findMany({
    where: { status: "FINISHED", completedAt: { gte: start, lt: end } },
    select: {
      title: true,
      authors: true,
      rating: true,
      pageCount: true,
      completedAt: true,
    },
    orderBy: { completedAt: "asc" },
  });

  if (items.length === 0 && books.length === 0) return null;

  // Episodes watched in the year, per series (year-accurate, not the
  // all-time season cache).
  const episodeRows = await db.episodeWatched.findMany({
    where: { watchedAt: { gte: start, lt: end } },
    select: { mediaItemId: true },
  });
  const episodesByItem = new Map<string, number>();
  for (const row of episodeRows) {
    episodesByItem.set(
      row.mediaItemId,
      (episodesByItem.get(row.mediaItemId) ?? 0) + 1,
    );
  }

  // Runtimes: every completed title plus every series with episodes in the
  // year, all through the persistent cache.
  const seriesWithEpisodes = [...episodesByItem.keys()].filter(
    (id) => !items.some((i) => i.id === id),
  );
  const extraSeries =
    seriesWithEpisodes.length > 0
      ? await db.mediaItem.findMany({
          where: { id: { in: seriesWithEpisodes }, tmdbId: { not: null } },
          select: { id: true, type: true, tmdbId: true },
        })
      : [];
  const lookupTargets: {
    id: string;
    type: "MOVIE" | "SERIES";
    tmdbId: number;
  }[] = [
    ...items
      .filter((i) => i.tmdbId !== null)
      .map((i) => ({
        id: i.id,
        type: i.type as "MOVIE" | "SERIES",
        tmdbId: i.tmdbId as number,
      })),
    ...extraSeries.map((s) => ({
      id: s.id,
      type: s.type as "MOVIE" | "SERIES",
      tmdbId: s.tmdbId as number,
    })),
  ].slice(0, RUNTIME_LOOKUP_CAP);

  const runtimes = await Promise.all(
    lookupTargets.map((t) =>
      fetchRuntimeMinutesCached(t.type, t.tmdbId).catch(() => null),
    ),
  );
  const runtimeByItem = new Map<string, number>();
  lookupTargets.forEach((target, idx) => {
    if (runtimes[idx] !== null) {
      runtimeByItem.set(target.id, runtimes[idx] as number);
    }
  });

  // Movies count their runtime when completed; series count every episode
  // watched in the year x the show's average runtime.
  let minutesWatched = 0;
  for (const item of items) {
    if (item.type !== "MOVIE") continue;
    const runtime = runtimeByItem.get(item.id);
    if (runtime !== undefined) minutesWatched += runtime;
  }
  let episodesWatched = 0;
  for (const [itemId, episodes] of episodesByItem) {
    episodesWatched += episodes;
    const runtime = runtimeByItem.get(itemId);
    if (runtime !== undefined) minutesWatched += episodes * runtime;
  }

  const moviesCompleted = items.filter((i) => i.type === "MOVIE").length;
  const seriesCompleted = items.length - moviesCompleted;

  const genreCounts = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, count }));

  const decadeCounts = new Map<string, number>();
  for (const item of items) {
    if (!item.releaseDate) continue;
    const decade = `${item.releaseDate.slice(0, 3)}0s`;
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
  }
  const topDecade =
    [...decadeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const rated = items.filter((i) => i.rating !== null);
  const averageRating =
    rated.length > 0
      ? rated.reduce((sum, i) => sum + (i.rating as number), 0) / rated.length
      : null;
  const ratingHistogram = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1;
    return rated.filter((r) => r.rating === score).length;
  });

  const ranked = [...items].sort(
    (a, b) =>
      (b.rating as number) - (a.rating as number) ||
      (b.completedAt as Date).getTime() - (a.completedAt as Date).getTime(),
  );
  const bestItem = ranked.find((i) => i.rating !== null && i.rating >= 1);
  const notable = ranked.slice(0, 6).map((i) => ({
    title: i.title,
    posterUrl: i.posterUrl,
    rating: i.rating,
  }));

  const booksFinished = books.length;
  const pagesRead = books.reduce((sum, b) => sum + (b.pageCount ?? 0), 0);
  const bookRated = books.filter((b) => b.rating !== null);
  const bookAverageRating =
    bookRated.length > 0
      ? bookRated.reduce((sum, b) => sum + (b.rating as number), 0) /
        bookRated.length
      : null;
  const bestBookRow = [...books].sort(
    (a, b) => (b.rating as number) - (a.rating as number),
  )[0];

  return {
    year,
    titlesCompleted: items.length,
    moviesCompleted,
    seriesCompleted,
    hoursWatched: Math.round(minutesWatched / 60),
    episodesWatched,
    topGenres,
    topDecade,
    ratingsGiven: rated.length,
    averageRating,
    ratingHistogram,
    best: bestItem
      ? {
          title: bestItem.title,
          posterUrl: bestItem.posterUrl,
          rating: bestItem.rating as number,
          year: bestItem.releaseDate?.slice(0, 4) ?? null,
        }
      : null,
    notable,
    booksFinished,
    pagesRead,
    bestBook: bestBookRow
      ? {
          title: bestBookRow.title,
          author: bestBookRow.authors[0] ?? "Unknown author",
          rating: bestBookRow.rating,
        }
      : null,
    bookAverageRating,
  };
}
