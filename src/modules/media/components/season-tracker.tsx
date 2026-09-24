"use client";

import { useTransition } from "react";
import { ensureSeasons, setSeasonProgress } from "../actions";
import type { SeasonDTO } from "../constants";

const buttonClasses =
  "flex h-7 w-7 items-center justify-center rounded-full border border-line text-sm transition hover:bg-surface-2 disabled:opacity-30";

export function SeasonTracker({
  mediaItemId,
  seasons,
  canBackfill,
}: {
  mediaItemId: string;
  seasons: SeasonDTO[];
  canBackfill: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function update(seasonNumber: number, watchedCount: number) {
    const formData = new FormData();
    formData.set("mediaItemId", mediaItemId);
    formData.set("seasonNumber", String(seasonNumber));
    formData.set("watchedCount", String(watchedCount));
    startTransition(async () => {
      await setSeasonProgress(formData);
    });
  }

  function backfill() {
    const formData = new FormData();
    formData.set("mediaItemId", mediaItemId);
    startTransition(async () => {
      await ensureSeasons(formData);
    });
  }

  if (seasons.length === 0) {
    if (!canBackfill) {
      return (
        <p className="text-xs text-neutral-500">
          No season data (manual entry).
        </p>
      );
    }
    return (
      <button
        type="button"
        onClick={backfill}
        disabled={pending}
        className="rounded-lg border border-line px-3 py-1.5 text-xs transition hover:bg-surface-2 disabled:opacity-50"
      >
        {pending ? "Loading seasons…" : "Load seasons from TMDB"}
      </button>
    );
  }

  return (
    <ul className={`flex flex-col gap-1.5 ${pending ? "opacity-70" : ""}`}>
      {seasons.map((season) => {
        const done = season.watchedCount >= season.episodeCount;
        const partial = season.watchedCount > 0 && !done;
        return (
          <li
            key={season.id}
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-1.5 text-sm ${
              done
                ? "bg-green-950/40"
                : partial
                  ? "bg-blue-950/40"
                  : "bg-surface-2"
            }`}
          >
            <span className="w-20 shrink-0 font-medium">
              Season {season.seasonNumber}
            </span>
            <span
              className={`w-14 shrink-0 text-center text-xs ${
                done ? "font-medium text-green-400" : "text-neutral-500"
              }`}
            >
              {season.watchedCount}/{season.episodeCount}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Watched one less episode of season ${season.seasonNumber}`}
                disabled={pending || season.watchedCount === 0}
                onClick={() =>
                  update(season.seasonNumber, season.watchedCount - 1)
                }
                className={buttonClasses}
              >
                −
              </button>
              <button
                type="button"
                aria-label={`Watched one more episode of season ${season.seasonNumber}`}
                disabled={pending || done}
                onClick={() =>
                  update(season.seasonNumber, season.watchedCount + 1)
                }
                className={buttonClasses}
              >
                +
              </button>
              <button
                type="button"
                disabled={pending || done}
                onClick={() => update(season.seasonNumber, season.episodeCount)}
                className="ml-1 rounded-full border border-line px-2.5 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-30"
              >
                {done ? "✓ Watched" : "Mark watched"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
