"use server";

import { requireSession } from "@/lib/auth";
import { isMediaType } from "@/modules/media/constants";
import { fetchSeriesSeasons, fetchTrending, searchTmdb } from "./queries";
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
