"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ensureSeasons, setEpisodeWatched, setSeasonWatched } from "../actions";
import type { SeasonDTO } from "../constants";
import { fetchSeasonEpisodesAction } from "@/modules/tmdb/actions";

type EpisodeMeta = {
  episodeNumber: number;
  name: string;
  airDate: string | null;
};

export function SeasonTracker({
  mediaItemId,
  seasons,
  watchedKeys,
  tmdbId,
}: {
  mediaItemId: string;
  seasons: SeasonDTO[];
  watchedKeys: string[];
  tmdbId: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    seasons.find((s) => s.watchedCount < s.episodeCount)?.seasonNumber ??
      seasons[seasons.length - 1]?.seasonNumber ??
      null,
  );
  const [episodeMeta, setEpisodeMeta] = useState<EpisodeMeta[] | null>(null);
  const [loadedSeason, setLoadedSeason] = useState<number | null>(null);

  useEffect(() => {
    if (tmdbId === null || selectedSeason === null) return;
    let cancelled = false;
    fetchSeasonEpisodesAction(tmdbId, selectedSeason).then((state) => {
      if (cancelled) return;
      setEpisodeMeta(state.episodes);
      setLoadedSeason(selectedSeason);
    });
    return () => {
      cancelled = true;
    };
  }, [tmdbId, selectedSeason]);

  const metaLoading =
    selectedSeason !== null && loadedSeason !== selectedSeason;

  const serverWatched = useMemo(() => new Set(watchedKeys), [watchedKeys]);

  function isWatched(seasonNumber: number, episodeNumber: number): boolean {
    const key = `S${seasonNumber}E${episodeNumber}`;
    const override = overrides.get(key);
    return override !== undefined ? override : serverWatched.has(key);
  }

  function seasonWatchedCount(season: SeasonDTO): number {
    let count = 0;
    for (let e = 1; e <= season.episodeCount; e++) {
      if (isWatched(season.seasonNumber, e)) count += 1;
    }
    return count;
  }

  function toggleEpisode(seasonNumber: number, episodeNumber: number) {
    const key = `S${seasonNumber}E${episodeNumber}`;
    const next = !isWatched(seasonNumber, episodeNumber);
    setOverrides((prev) => new Map(prev).set(key, next));
    const formData = new FormData();
    formData.set("mediaItemId", mediaItemId);
    formData.set("seasonNumber", String(seasonNumber));
    formData.set("episodeNumber", String(episodeNumber));
    formData.set("watched", String(next));
    startTransition(async () => {
      await setEpisodeWatched(formData);
    });
  }

  function markSeason(seasonNumber: number, watched: boolean) {
    const season = seasons.find((s) => s.seasonNumber === seasonNumber);
    if (!season) return;
    setOverrides((prev) => {
      const next = new Map(prev);
      for (let e = 1; e <= season.episodeCount; e++) {
        next.set(`S${seasonNumber}E${e}`, watched);
      }
      return next;
    });
    const formData = new FormData();
    formData.set("mediaItemId", mediaItemId);
    formData.set("seasonNumber", String(seasonNumber));
    formData.set("watched", String(watched));
    startTransition(async () => {
      await setSeasonWatched(formData);
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
    if (tmdbId === null) {
      return (
        <p className="text-xs text-muted">No season data (manual entry).</p>
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

  const current =
    seasons.find((s) => s.seasonNumber === selectedSeason) ?? null;
  const currentWatched = current ? seasonWatchedCount(current) : 0;
  const metaByNumber = new Map(
    (episodeMeta ?? []).map((e) => [e.episodeNumber, e]),
  );

  return (
    <div className={`flex flex-col gap-3 ${pending ? "opacity-70" : ""}`}>
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
        {seasons.map((season) => {
          const watched = seasonWatchedCount(season);
          const done = watched >= season.episodeCount;
          const partial = watched > 0 && !done;
          const active = season.seasonNumber === selectedSeason;
          return (
            <button
              key={season.id}
              type="button"
              onClick={() => setSelectedSeason(season.seasonNumber)}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? "bg-foreground text-background"
                  : done
                    ? "border border-green-800 text-green-400"
                    : partial
                      ? "border border-blue-800 text-blue-400"
                      : "border border-line text-muted hover:bg-surface-2"
              }`}
            >
              S{season.seasonNumber}
              <span className="ml-1 opacity-70">
                {watched}/{season.episodeCount}
              </span>
            </button>
          );
        })}
      </div>

      {current && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              Season {current.seasonNumber}
            </span>
            <span className="text-xs text-muted">
              {currentWatched}/{current.episodeCount} watched
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={currentWatched >= current.episodeCount}
                onClick={() => markSeason(current.seasonNumber, true)}
                className="rounded-full border border-line px-2.5 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-30"
              >
                Mark season
              </button>
              <button
                type="button"
                disabled={currentWatched === 0}
                onClick={() => markSeason(current.seasonNumber, false)}
                className="rounded-full border border-line px-2.5 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-30"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {Array.from({ length: current.episodeCount }, (_, i) => i + 1).map(
              (episodeNumber) => {
                const watched = isWatched(current.seasonNumber, episodeNumber);
                const meta = metaByNumber.get(episodeNumber);
                const label = meta
                  ? `S${current.seasonNumber}E${episodeNumber}: ${meta.name}`
                  : `S${current.seasonNumber}E${episodeNumber}`;
                return (
                  <button
                    key={episodeNumber}
                    type="button"
                    title={label}
                    aria-label={`${label}${watched ? " (watched)" : ""}`}
                    aria-pressed={watched}
                    onClick={() =>
                      toggleEpisode(current.seasonNumber, episodeNumber)
                    }
                    className={`flex h-9 items-center justify-center rounded-md text-xs font-medium transition ${
                      watched
                        ? "bg-accent text-background"
                        : "border border-line text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    {episodeNumber}
                  </button>
                );
              },
            )}
          </div>
          {metaLoading && (
            <p className="text-xs text-muted">Loading episode titles…</p>
          )}
        </>
      )}
    </div>
  );
}
