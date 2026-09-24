"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  deleteRatingFromTmdb,
  fetchSeriesSeasons,
  sendRatingToTmdb,
} from "@/modules/tmdb/queries";
import { isMediaType, isWatchStatus, type WatchStatusValue } from "./constants";

export type ActionState = { error?: string; success?: boolean };

const MAX_TEXT = 500;

const WATCH_STATUS_LABELS_SAFE: Record<string, string> = {
  WATCHING: "watching",
  WANT_TO_WATCH: "want to watch",
  COMPLETED: "completed",
  ON_HOLD: "on hold",
  DROPPED: "dropped",
};

function revalidateMedia() {
  revalidatePath("/", "layout");
}

function logActivity(kind: string, message: string) {
  return db.activityEvent
    .create({ data: { kind, message } })
    .catch(() => undefined);
}

async function setSeasonWatchedState(
  mediaItemId: string,
  seasonNumber: number,
  watched: boolean,
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.episodeWatched.deleteMany({
      where: { mediaItemId, seasonNumber },
    });
    let count = 0;
    if (watched) {
      const season = await tx.mediaSeason.findUnique({
        where: { mediaItemId_seasonNumber: { mediaItemId, seasonNumber } },
        select: { episodeCount: true },
      });
      if (season && season.episodeCount > 0) {
        await tx.episodeWatched.createMany({
          data: Array.from({ length: season.episodeCount }, (_, i) => ({
            mediaItemId,
            seasonNumber,
            episodeNumber: i + 1,
          })),
        });
        count = season.episodeCount;
      }
    }
    await tx.mediaSeason.updateMany({
      where: { mediaItemId, seasonNumber },
      data: { watchedCount: count },
    });
  });
}

async function setEpisodeWatchedState(
  mediaItemId: string,
  seasonNumber: number,
  episodeNumber: number,
  watched: boolean,
): Promise<void> {
  await db.$transaction(async (tx) => {
    if (watched) {
      await tx.episodeWatched
        .upsert({
          where: {
            mediaItemId_seasonNumber_episodeNumber: {
              mediaItemId,
              seasonNumber,
              episodeNumber,
            },
          },
          update: {},
          create: { mediaItemId, seasonNumber, episodeNumber },
        })
        .catch(() => undefined);
    } else {
      await tx.episodeWatched.deleteMany({
        where: { mediaItemId, seasonNumber, episodeNumber },
      });
    }
    const count = await tx.episodeWatched.count({
      where: { mediaItemId, seasonNumber },
    });
    await tx.mediaSeason.updateMany({
      where: { mediaItemId, seasonNumber },
      data: { watchedCount: count },
    });
  });
}

function optionalInt(
  value: FormDataEntryValue | null,
): number | null | "invalid" {
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 100_000_000) return "invalid";
  return n;
}

function optionalTextField(
  value: FormDataEntryValue | null,
  max: number,
): string | null | "invalid" {
  if (value === null) return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (trimmed.length > max) return "invalid";
  return trimmed || null;
}

function tmdbPosterUrlOrThrow(
  value: FormDataEntryValue | null,
): string | null | "invalid" {
  const url = optionalTextField(value, 200);
  if (url === null || url === "invalid") return url;
  if (!/^https:\/\/image\.tmdb\.org\/t\/p\/[\w./-]+$/.test(url))
    return "invalid";
  return url;
}

export async function addMediaItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();

  const title = String(formData.get("title") ?? "").trim();
  const type = formData.get("type");
  const status = formData.get("status") ?? "WATCHING";

  if (title.length < 1 || title.length > 200) {
    return { error: "Title is required (max 200 characters)." };
  }
  if (!isMediaType(type)) {
    return { error: "Invalid media type." };
  }
  if (typeof status === "string" && !isWatchStatus(status)) {
    return { error: "Invalid status." };
  }

  const tmdbId = optionalInt(formData.get("tmdbId"));
  if (tmdbId === "invalid") return { error: "Invalid metadata." };
  const posterUrl = tmdbPosterUrlOrThrow(formData.get("posterUrl"));
  if (posterUrl === "invalid") return { error: "Invalid poster URL." };
  const overview = optionalTextField(formData.get("overview"), 2000);
  if (overview === "invalid") return { error: "Invalid overview." };
  const releaseDate = optionalTextField(formData.get("releaseDate"), 10);
  if (releaseDate === "invalid") {
    return { error: "Invalid release date." };
  }
  if (releaseDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return { error: "Invalid release date." };
  }
  const voteAverageRaw = optionalTextField(formData.get("voteAverage"), 8);
  if (voteAverageRaw === "invalid")
    return { error: "Invalid rating metadata." };
  let voteAverage: number | null = null;
  if (voteAverageRaw !== null) {
    const n = Number(voteAverageRaw);
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      return { error: "Invalid rating metadata." };
    }
    voteAverage = n;
  }
  const genresRaw = optionalTextField(formData.get("genres"), 400);
  if (genresRaw === "invalid") return { error: "Invalid genres." };
  const genres = genresRaw
    ? genresRaw
        .split(",")
        .map((g) => g.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const currentSeasonRaw = formData.get("currentSeason");
  let currentSeason: number | null = null;
  if (currentSeasonRaw !== null && currentSeasonRaw !== "") {
    const n = Number(currentSeasonRaw);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      return { error: "Invalid season." };
    }
    currentSeason = n;
  }
  const markPrevious = formData.get("markPrevious") === "true";
  const finalStatus = isWatchStatus(status) ? status : "WATCHING";

  const ratingRaw = formData.get("rating");
  let rating: number | null = null;
  if (ratingRaw !== null && ratingRaw !== "") {
    const n = Number(ratingRaw);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return { error: "Rating must be an integer from 1 to 10." };
    }
    rating = n;
  }

  let createdId: string;
  try {
    const created = await db.mediaItem.create({
      data: {
        title,
        type,
        status: finalStatus,
        rating,
        tmdbId,
        posterUrl,
        overview,
        releaseDate,
        voteAverage,
        genres,
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch {
    return { error: "Could not save. Please try again." };
  }

  if (rating !== null && tmdbId !== null) {
    await sendRatingToTmdb(type, tmdbId, rating).catch(() => undefined);
  }

  if (type === "SERIES" && tmdbId !== null) {
    await seedSeasons(createdId, tmdbId, finalStatus === "COMPLETED").catch(
      () => undefined,
    );
  }

  if (
    type === "SERIES" &&
    (finalStatus === "COMPLETED" || currentSeason !== null)
  ) {
    const seasons = await db.mediaSeason
      .findMany({
        where: { mediaItemId: createdId },
        select: { id: true, seasonNumber: true, episodeCount: true },
      })
      .catch(() => []);
    const maxSeason = seasons.reduce((m, s) => Math.max(m, s.seasonNumber), 0);
    const effective =
      currentSeason === null ? null : Math.min(currentSeason, maxSeason);
    const previousSeasons = seasons.filter((s) =>
      effective === null ? true : markPrevious && s.seasonNumber < effective,
    );
    for (const s of previousSeasons) {
      await setSeasonWatchedState(createdId, s.seasonNumber, true).catch(
        () => undefined,
      );
    }
  }

  logActivity("added", `Added ${title}`);
  revalidateMedia();
  return { success: true };
}

async function seedSeasons(
  mediaItemId: string,
  tmdbId: number,
  allWatched = false,
): Promise<void> {
  const seasons = await fetchSeriesSeasons(tmdbId);
  if (seasons.length === 0) return;
  await db.mediaSeason.createMany({
    data: seasons.map((s) => ({
      mediaItemId,
      seasonNumber: s.seasonNumber,
      episodeCount: s.episodeCount,
      watchedCount: allWatched ? s.episodeCount : 0,
    })),
    skipDuplicates: true,
  });
  if (allWatched) {
    await db.episodeWatched.createMany({
      data: seasons.flatMap((s) =>
        Array.from({ length: s.episodeCount }, (_, i) => ({
          mediaItemId,
          seasonNumber: s.seasonNumber,
          episodeNumber: i + 1,
        })),
      ),
      skipDuplicates: true,
    });
  }
}

export async function updateMediaItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing item id." };

  const status = formData.get("status");
  const ratingRaw = formData.get("rating");
  const progressNote = String(formData.get("progressNote") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  const data: {
    status?: WatchStatusValue;
    rating?: number | null;
    isFavorite?: boolean;
    progressNote?: string | null;
    comment?: string | null;
  } = {};

  if (status !== null) {
    if (!isWatchStatus(status)) return { error: "Invalid status." };
    data.status = status;
  }

  const favoriteRaw = formData.get("favorite");
  if (favoriteRaw !== null) {
    if (favoriteRaw !== "true" && favoriteRaw !== "false") {
      return { error: "Invalid favorite flag." };
    }
    data.isFavorite = favoriteRaw === "true";
  }

  if (ratingRaw !== null) {
    if (ratingRaw === "") {
      data.rating = null;
    } else {
      const rating = Number(ratingRaw);
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        return { error: "Rating must be an integer from 1 to 10." };
      }
      data.rating = rating;
    }
  }

  if (progressNote !== null) {
    if (progressNote.length > MAX_TEXT) {
      return { error: "Progress note is too long." };
    }
    data.progressNote = progressNote || null;
  }

  if (comment !== null) {
    if (comment.length > MAX_TEXT) {
      return { error: "Comment is too long." };
    }
    data.comment = comment || null;
  }

  if (Object.keys(data).length === 0) return { success: true };

  const before = await db.mediaItem.findUnique({
    where: { id },
    select: { title: true, status: true, rating: true },
  });

  try {
    const result = await db.mediaItem.updateMany({
      where: { id },
      data,
    });
    if (result.count === 0) return { error: "Item not found." };

    if (before) {
      if (data.status !== undefined && data.status !== before.status) {
        logActivity(
          "status",
          `Marked ${before.title} ${WATCH_STATUS_LABELS_SAFE[data.status]}`,
        );
      }
      if (data.rating !== undefined && data.rating !== before.rating) {
        logActivity(
          "rating",
          data.rating === null
            ? `Cleared rating for ${before.title}`
            : `Rated ${before.title} ${data.rating}/10`,
        );
      }
    }

    if (data.status === "COMPLETED") {
      const item = await db.mediaItem.findUnique({
        where: { id },
        select: { type: true },
      });
      if (item?.type === "SERIES") {
        const seasons = await db.mediaSeason.findMany({
          where: { mediaItemId: id },
          select: { seasonNumber: true },
        });
        for (const season of seasons) {
          await setSeasonWatchedState(id, season.seasonNumber, true).catch(
            () => undefined,
          );
        }
      }
    }
  } catch {
    return { error: "Could not update. Please try again." };
  }

  if (data.rating !== undefined) {
    // Best-effort sync to TMDB; never fails the local update.
    const item = await db.mediaItem
      .findUnique({ where: { id }, select: { tmdbId: true, type: true } })
      .catch(() => null);
    if (item?.tmdbId != null) {
      const sync =
        data.rating === null
          ? deleteRatingFromTmdb(item.type, item.tmdbId)
          : sendRatingToTmdb(item.type, item.tmdbId, data.rating);
      await sync.catch(() => undefined);
    }
  }

  revalidateMedia();
  return { success: true };
}

export async function hideRecommendation(formData: FormData): Promise<void> {
  await requireSession();

  const key = String(formData.get("key") ?? "");
  if (!/^(MOVIE|SERIES):[1-9][0-9]{0,8}$/.test(key)) return;

  await db.hiddenRecommendation.upsert({
    where: { key },
    update: {},
    create: { key },
  });
  revalidateMedia();
}

export async function deleteMediaItem(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const target = await db.mediaItem.findUnique({
    where: { id },
    select: { title: true },
  });
  await db.mediaItem.deleteMany({ where: { id } });
  if (target) logActivity("removed", `Removed ${target.title}`);
  revalidateMedia();
}

function boundedInt(
  value: FormDataEntryValue | null,
  max: number,
): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) return null;
  return n;
}

export async function setEpisodeWatched(formData: FormData): Promise<void> {
  await requireSession();

  const mediaItemId = String(formData.get("mediaItemId") ?? "");
  const seasonNumber = boundedInt(formData.get("seasonNumber"), 200);
  const episodeNumber = boundedInt(formData.get("episodeNumber"), 500);
  const watched = formData.get("watched") === "true";
  if (!mediaItemId || seasonNumber === null || episodeNumber === null) {
    return;
  }

  await setEpisodeWatchedState(
    mediaItemId,
    seasonNumber,
    episodeNumber,
    watched,
  );
  const parent = await db.mediaItem.findUnique({
    where: { id: mediaItemId },
    select: { title: true },
  });
  if (parent && watched) {
    logActivity(
      "episode",
      `Watched S${seasonNumber}E${episodeNumber} of ${parent.title}`,
    );
  }
  revalidateMedia();
}

export async function setSeasonWatched(formData: FormData): Promise<void> {
  await requireSession();

  const mediaItemId = String(formData.get("mediaItemId") ?? "");
  const seasonNumber = boundedInt(formData.get("seasonNumber"), 200);
  const watched = formData.get("watched") === "true";
  if (!mediaItemId || seasonNumber === null) return;

  const season = await db.mediaSeason.findUnique({
    where: { mediaItemId_seasonNumber: { mediaItemId, seasonNumber } },
    select: { episodeCount: true },
  });
  if (!season) return;

  await setSeasonWatchedState(mediaItemId, seasonNumber, watched);
  const parent = await db.mediaItem.findUnique({
    where: { id: mediaItemId },
    select: { title: true },
  });
  if (parent && watched) {
    logActivity("episode", `Finished S${seasonNumber} of ${parent.title}`);
  }
  revalidateMedia();
}

export async function ensureSeasons(formData: FormData): Promise<void> {
  await requireSession();

  const mediaItemId = String(formData.get("mediaItemId") ?? "");
  if (!mediaItemId) return;

  const item = await db.mediaItem.findFirst({
    where: { id: mediaItemId, type: "SERIES", tmdbId: { not: null } },
    select: { tmdbId: true, status: true },
  });
  if (!item || item.tmdbId === null) return;

  try {
    await seedSeasons(mediaItemId, item.tmdbId, item.status === "COMPLETED");
  } catch {
    return;
  }
  revalidateMedia();
}

export type ImportState = { error?: string; imported?: number };

type ImportItem = {
  title: string;
  type: string;
  status: string;
  rating: number | null;
  isFavorite: boolean;
  progressNote: string | null;
  comment: string | null;
  tmdbId: number | null;
  posterUrl: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  genres: string[];
  seasons: {
    seasonNumber: number;
    episodeCount: number;
    watchedCount: number;
  }[];
};

export async function importLibrary(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireSession();

  const raw = String(formData.get("json") ?? "").trim();
  if (!raw) return { error: "Paste an export file's contents first." };
  if (raw.length > 5_000_000) return { error: "Import file too large." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "That is not valid JSON." };
  }

  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No items found in this file." };
  }
  if (items.length > 5000) return { error: "Too many items (max 5000)." };

  const existing = await db.mediaItem.findMany({
    select: { title: true, type: true, tmdbId: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.type}:${e.tmdbId ?? e.title}`),
  );

  let imported = 0;
  for (const rawItem of items) {
    if (imported >= 5000) break;
    if (rawItem === null || typeof rawItem !== "object") continue;
    const item = rawItem as Partial<ImportItem>;
    const title =
      typeof item.title === "string" ? item.title.trim().slice(0, 200) : "";
    if (!title) continue;
    const type =
      item.type === "MOVIE" || item.type === "SERIES" ? item.type : null;
    if (!type) continue;
    const key = `${type}:${typeof item.tmdbId === "number" ? item.tmdbId : title}`;
    if (existingKeys.has(key)) continue;

    const status = isWatchStatus(item.status) ? item.status : "WANT_TO_WATCH";
    const rating =
      typeof item.rating === "number" &&
      Number.isInteger(item.rating) &&
      item.rating >= 1 &&
      item.rating <= 10
        ? item.rating
        : null;
    const seasons = Array.isArray(item.seasons) ? item.seasons : [];

    const created = await db.mediaItem
      .create({
        data: {
          title,
          type,
          status,
          rating,
          isFavorite: item.isFavorite === true,
          progressNote:
            typeof item.progressNote === "string"
              ? item.progressNote.slice(0, 500) || null
              : null,
          comment:
            typeof item.comment === "string"
              ? item.comment.slice(0, 500) || null
              : null,
          tmdbId:
            typeof item.tmdbId === "number" &&
            Number.isInteger(item.tmdbId) &&
            item.tmdbId > 0
              ? item.tmdbId
              : null,
          posterUrl:
            typeof item.posterUrl === "string" &&
            /^https:\/\/[\w.-]+\/[\w./-]+$/.test(item.posterUrl)
              ? item.posterUrl.slice(0, 300)
              : null,
          overview:
            typeof item.overview === "string"
              ? item.overview.slice(0, 2000) || null
              : null,
          releaseDate:
            typeof item.releaseDate === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(item.releaseDate)
              ? item.releaseDate
              : null,
          voteAverage:
            typeof item.voteAverage === "number" &&
            item.voteAverage >= 0 &&
            item.voteAverage <= 10
              ? item.voteAverage
              : null,
          genres: Array.isArray(item.genres)
            ? item.genres
                .filter((g): g is string => typeof g === "string")
                .map((g) => g.slice(0, 60))
                .slice(0, 8)
            : [],
        },
        select: { id: true },
      })
      .catch(() => null);
    if (!created) continue;
    existingKeys.add(key);
    imported += 1;

    const seasonRows = seasons
      .filter(
        (s) =>
          s !== null &&
          typeof s === "object" &&
          Number.isInteger(s.seasonNumber) &&
          s.seasonNumber >= 0 &&
          s.seasonNumber <= 200 &&
          Number.isInteger(s.episodeCount) &&
          s.episodeCount >= 0 &&
          s.episodeCount <= 500,
      )
      .map((s) => ({
        mediaItemId: created.id,
        seasonNumber: s.seasonNumber,
        episodeCount: s.episodeCount,
        watchedCount: Math.min(
          Math.max(Number.isInteger(s.watchedCount) ? s.watchedCount : 0, 0),
          s.episodeCount,
        ),
      }));
    if (seasonRows.length > 0) {
      await db.mediaSeason
        .createMany({ data: seasonRows, skipDuplicates: true })
        .catch(() => undefined);
    }
  }

  if (imported > 0) revalidateMedia();
  return { imported };
}

export async function notifyAiringEpisodes(
  entries: { key: string; title: string; detail: string }[],
): Promise<void> {
  const url = process.env.NTFY_URL;
  if (!url || !/^https:\/[\w./-]+$/.test(url) || entries.length === 0) {
    return;
  }

  for (const entry of entries) {
    const already = await db.activityEvent.findFirst({
      where: { kind: "notified", message: entry.key },
      select: { id: true },
    });
    if (already) continue;

    await fetch(url, {
      method: "POST",
      body: `SuperMovie: ${entry.title} — ${entry.detail}`,
      headers: { Title: "New episode" },
      signal: AbortSignal.timeout(5000),
    })
      .then(() =>
        db.activityEvent.create({
          data: { kind: "notified", message: entry.key },
        }),
      )
      .catch(() => undefined);
  }
}
