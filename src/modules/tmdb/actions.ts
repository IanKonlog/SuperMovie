"use server";

import { requireSession } from "@/lib/auth";
import { isMediaType } from "@/modules/media/constants";
import {
  discoverByMood,
  fetchSeriesSeasons,
  fetchTrending,
  searchTmdb,
} from "./queries";
import type { SearchState, TmdbSearchResult } from "./types";

export type { SearchState } from "./types";

export type TrendingPageState = {
  results: TmdbSearchResult[];
  error?: string;
};

export async function searchMediaAction(
  query: unknown,
  type: unknown,
): Promise<SearchState> {
  await requireSession();

  if (typeof query !== "string") {
    return { results: [], error: "Invalid search." };
  }
  const trimmed = query.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return { results: [] };
  }
  if (!isMediaType(type)) {
    return { results: [], error: "Invalid media type." };
  }

  try {
    const results = await searchTmdb(trimmed, type);
    return { results };
  } catch {
    return { results: [], error: "Search is unavailable right now." };
  }
}

export async function fetchTrendingAction(
  type: unknown,
  page: unknown,
): Promise<TrendingPageState> {
  await requireSession();

  if (!isMediaType(type)) {
    return { results: [], error: "Invalid media type." };
  }
  const pageNumber = Number(page);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 100) {
    return { results: [], error: "Invalid page." };
  }

  try {
    const results = await fetchTrending(type, pageNumber);
    return { results };
  } catch {
    return { results: [], error: "Trending is unavailable right now." };
  }
}

export type SeasonListState = {
  seasons: { seasonNumber: number; episodeCount: number }[];
  error?: string;
};

export async function fetchSeasonListAction(
  tmdbId: unknown,
): Promise<SeasonListState> {
  await requireSession();

  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id < 1 || id > 100_000_000) {
    return { seasons: [], error: "Invalid id." };
  }

  try {
    const seasons = await fetchSeriesSeasons(id);
    return {
      seasons: seasons.map((s) => ({
        seasonNumber: s.seasonNumber,
        episodeCount: s.episodeCount,
      })),
    };
  } catch {
    return { seasons: [], error: "Season data is unavailable right now." };
  }
}

export type MoodState = {
  results: {
    tmdbId: number;
    title: string;
    posterUrl: string | null;
    releaseDate: string | null;
    voteAverage: number;
  }[];
  error?: string;
};

export async function discoverByMoodAction(
  genres: unknown,
  maxRuntimeMinutes: unknown,
): Promise<MoodState> {
  await requireSession();

  if (!Array.isArray(genres) || genres.length === 0 || genres.length > 3) {
    return { results: [], error: "Pick 1-3 genres." };
  }
  const names = genres
    .filter((g): g is string => typeof g === "string")
    .map((g) => g.slice(0, 60));
  if (names.length === 0) return { results: [], error: "Invalid genres." };

  const runtime = Number(maxRuntimeMinutes);
  const maxRuntime =
    maxRuntimeMinutes === "" ||
    maxRuntimeMinutes === null ||
    !Number.isFinite(runtime)
      ? null
      : Math.min(Math.max(Math.round(runtime), 40), 300);

  try {
    const results = await discoverByMood(names, maxRuntime);
    return { results };
  } catch {
    return { results: [], error: "Mood search is unavailable right now." };
  }
}
