"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { deleteMediaItem, updateMediaItem, type ActionState } from "../actions";
import { Poster } from "./poster";
import { SeasonTracker } from "./season-tracker";
import { titleHref } from "@/modules/tmdb/links";
import {
  WATCH_STATUSES,
  WATCH_STATUS_LABELS,
  type MediaItemDTO,
  type SeasonDTO,
} from "../constants";

const initialState: ActionState = {};

export function MediaDetailPanel({
  item,
  seasons,
  watchedKeys,
  onClose,
}: {
  item: MediaItemDTO;
  seasons: SeasonDTO[];
  watchedKeys: string[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [state, detailAction, detailPending] = useActionState(
    updateMediaItem,
    initialState,
  );
  const [expanded, setExpanded] = useState(false);
  const [showSeasons, setShowSeasons] = useState(
    item.type === "SERIES" && seasons.length > 0,
  );

  function patchField(name: string, value: string) {
    const formData = new FormData();
    formData.set("id", item.id);
    formData.set(name, value);
    startTransition(async () => {
      await updateMediaItem(initialState, formData);
    });
  }

  const latestSeason = [...seasons].reverse().find((s) => s.watchedCount > 0);
  const progressLine = latestSeason
    ? `S${latestSeason.seasonNumber} · ${latestSeason.watchedCount}/${latestSeason.episodeCount}`
    : item.progressNote;

  const selectClasses =
    "rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none focus:border-muted";
  const chipClasses =
    "rounded-lg border border-line px-2.5 py-1.5 text-sm transition hover:bg-surface-2 disabled:opacity-40";

  return (
    <div className="pop-enter relative rounded-xl border border-line bg-surface p-4">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute top-3 right-3 text-lg text-muted transition hover:text-foreground"
      >
        ✕
      </button>

      <div className="flex gap-4">
        {item.posterUrl && (
          <div className="w-24 shrink-0 sm:w-28">
            <Poster posterUrl={item.posterUrl} title={item.title} size={112} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {item.type === "MOVIE" ? "Movie" : "Series"}
            </span>
            {item.releaseDate && (
              <span className="text-xs text-muted">
                {item.releaseDate.slice(0, 4)}
              </span>
            )}
            <button
              type="button"
              aria-label={
                item.isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              aria-pressed={item.isFavorite}
              disabled={pending}
              onClick={() => patchField("favorite", String(!item.isFavorite))}
              className={`ml-auto text-xl leading-none transition disabled:opacity-40 ${
                item.isFavorite
                  ? "text-amber-400"
                  : "text-neutral-600 hover:text-neutral-400"
              }`}
            >
              {item.isFavorite ? "★" : "☆"}
            </button>
          </div>

          <h3 className="mt-1 pr-8 text-xl font-bold">
            {item.tmdbId !== null ? (
              <Link
                href={titleHref(item.type, item.tmdbId)}
                className="transition hover:text-accent"
              >
                {item.title}
              </Link>
            ) : (
              item.title
            )}
          </h3>
          {item.genres.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {item.genres.join(" · ")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
            {item.rating != null && <span>My rating: {item.rating}/10</span>}
            {item.rating != null &&
              item.voteAverage != null &&
              item.voteAverage > 0 && (
                <span>TMDB {item.voteAverage.toFixed(1)}</span>
              )}
            {progressLine && <span>Progress: {progressLine}</span>}
          </div>
          {item.comment && (
            <p className="mt-2 text-sm text-muted">{item.comment}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <select
          aria-label="Status"
          value={item.status}
          disabled={pending}
          onChange={(e) => patchField("status", e.target.value)}
          className={selectClasses}
        >
          {WATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WATCH_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Rating"
          value={item.rating ?? ""}
          disabled={pending}
          onChange={(e) => patchField("rating", e.target.value)}
          className={selectClasses}
        >
          <option value="">Rate</option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}/10
            </option>
          ))}
        </select>
        {item.type === "SERIES" && (
          <button
            type="button"
            aria-expanded={showSeasons}
            onClick={() => setShowSeasons((v) => !v)}
            className={chipClasses}
          >
            Seasons
            {seasons.length > 0 && (
              <span className="ml-1.5 text-xs text-muted">
                {seasons.filter((s) => s.watchedCount >= s.episodeCount).length}
                /{seasons.length}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className={chipClasses}
        >
          {expanded ? "Less" : "Notes"}
        </button>
        {item.tmdbId !== null && (
          <Link
            href={titleHref(item.type, item.tmdbId)}
            className={chipClasses + " font-medium"}
          >
            View page ↗
          </Link>
        )}
        <form
          action={deleteMediaItem}
          onSubmit={(e) => {
            if (!confirm(`Delete "${item.title}"?`)) e.preventDefault();
          }}
          className="ml-auto"
        >
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            aria-label={`Delete ${item.title}`}
            className="rounded-lg px-2.5 py-1.5 text-sm text-red-500 transition hover:bg-red-950/60"
          >
            Delete
          </button>
        </form>
      </div>

      {state.error && (
        <p className="mt-2 text-sm text-red-500">{state.error}</p>
      )}

      {item.type === "SERIES" && showSeasons && (
        <div className="mt-3 border-t border-line pt-3">
          <SeasonTracker
            mediaItemId={item.id}
            seasons={seasons}
            watchedKeys={watchedKeys}
            tmdbId={item.tmdbId}
          />
        </div>
      )}

      {expanded && (
        <form action={detailAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="id" value={item.id} />
          <input
            name="progressNote"
            defaultValue={item.progressNote ?? ""}
            maxLength={500}
            placeholder="Where you left off, e.g. S2E5"
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-muted"
          />
          <textarea
            name="comment"
            defaultValue={item.comment ?? ""}
            maxLength={500}
            placeholder="Notes (max 500 chars)"
            rows={2}
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-muted"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={detailPending}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-background transition hover:bg-accent/80 disabled:opacity-50"
            >
              {detailPending ? "Saving…" : "Save"}
            </button>
            {state.error && (
              <span className="text-sm text-red-500">{state.error}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
