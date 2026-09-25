import { db } from "@/lib/db";
import { fetchRuntimeMinutes } from "@/modules/tmdb/queries";

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

  // Hours: movies by runtime, series by watched episodes x runtime.
  const withTmdb = items.filter((i) => i.tmdbId !== null);
  const runtimes = await Promise.all(
    withTmdb
      .slice(0, RUNTIME_LOOKUP_CAP)
      .map((i) =>
        fetchRuntimeMinutes(i.type, i.tmdbId as number).catch(() => null),
      ),
  );

  const runtimeByItem = new Map<string, number>();
  withTmdb.slice(0, RUNTIME_LOOKUP_CAP).forEach((item, idx) => {
    if (runtimes[idx] !== null) {
      runtimeByItem.set(item.id, runtimes[idx] as number);
    }
  });

  const seasons = await db.mediaSeason.findMany({
    where: { mediaItemId: { in: items.map((i) => i.id) } },
    select: { mediaItemId: true, watchedCount: true },
  });
  const episodesByItem = new Map<string, number>();
  for (const season of seasons) {
    episodesByItem.set(
      season.mediaItemId,
      (episodesByItem.get(season.mediaItemId) ?? 0) + season.watchedCount,
    );
  }

  let minutesWatched = 0;
  let episodesWatched = 0;
  for (const item of items) {
    const runtime = runtimeByItem.get(item.id);
    if (runtime === undefined) continue;
    if (item.type === "MOVIE") {
      minutesWatched += runtime;
    } else {
      const episodes = episodesByItem.get(item.id) ?? 0;
      episodesWatched += episodes;
      minutesWatched += episodes * runtime;
    }
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
