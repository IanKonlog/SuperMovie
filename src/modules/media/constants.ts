export const WATCH_STATUSES = [
  "WATCHING",
  "WANT_TO_WATCH",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
] as const;

export type WatchStatusValue = (typeof WATCH_STATUSES)[number];

export const WATCH_STATUS_LABELS: Record<WatchStatusValue, string> = {
  WATCHING: "Watching",
  WANT_TO_WATCH: "Want to watch",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  DROPPED: "Dropped",
};

export const MEDIA_TYPES = ["MOVIE", "SERIES"] as const;
export type MediaTypeValue = (typeof MEDIA_TYPES)[number];

export type MediaItemDTO = {
  id: string;
  title: string;
  type: MediaTypeValue;
  status: WatchStatusValue;
  rating: number | null;
  isFavorite: boolean;
  progressNote: string | null;
  comment: string | null;
  posterUrl: string | null;
  tmdbId: number | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  genres: string[];
};

export type SeasonDTO = {
  id: string;
  seasonNumber: number;
  episodeCount: number;
  watchedCount: number;
};

export function isWatchStatus(value: unknown): value is WatchStatusValue {
  return (
    typeof value === "string" &&
    (WATCH_STATUSES as readonly string[]).includes(value)
  );
}

export function isMediaType(value: unknown): value is MediaTypeValue {
  return (
    typeof value === "string" &&
    (MEDIA_TYPES as readonly string[]).includes(value)
  );
}
