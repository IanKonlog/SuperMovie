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

function revalidateMedia() {
  revalidatePath("/", "layout");
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

  let createdId: string;
  try {
    const created = await db.mediaItem.create({
      data: {
        title,
        type,
        status: finalStatus,
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
    const watchedUpdates = seasons
      .filter((s) =>
        effective === null ? true : markPrevious && s.seasonNumber < effective,
      )
      .map((s) =>
        db.mediaSeason.update({
          where: { id: s.id },
          data: { watchedCount: s.episodeCount },
        }),
      );
    if (watchedUpdates.length > 0) {
      await db.$transaction(watchedUpdates).catch(() => undefined);
    }
  }

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

  try {
    const result = await db.mediaItem.updateMany({
      where: { id },
      data,
    });
    if (result.count === 0) return { error: "Item not found." };

    if (data.status === "COMPLETED") {
      const item = await db.mediaItem.findUnique({
        where: { id },
        select: { type: true },
      });
      if (item?.type === "SERIES") {
        const seasons = await db.mediaSeason.findMany({
          where: { mediaItemId: id },
          select: { id: true, episodeCount: true },
        });
        await db.$transaction(
          seasons.map((season) =>
            db.mediaSeason.update({
              where: { id: season.id },
              data: { watchedCount: season.episodeCount },
            }),
          ),
        );
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

export async function deleteMediaItem(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.mediaItem.deleteMany({ where: { id } });
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

export async function setSeasonProgress(formData: FormData): Promise<void> {
  await requireSession();

  const mediaItemId = String(formData.get("mediaItemId") ?? "");
  const seasonNumber = boundedInt(formData.get("seasonNumber"), 200);
  const watchedCount = boundedInt(formData.get("watchedCount"), 500);
  if (!mediaItemId || seasonNumber === null || watchedCount === null) return;

  const season = await db.mediaSeason.findUnique({
    where: {
      mediaItemId_seasonNumber: { mediaItemId, seasonNumber },
    },
    select: { id: true, episodeCount: true },
  });
  if (!season) return;

  const clamped = Math.min(watchedCount, season.episodeCount);
  await db.mediaSeason.updateMany({
    where: { id: season.id },
    data: { watchedCount: clamped },
  });
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
