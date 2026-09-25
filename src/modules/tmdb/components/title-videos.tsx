"use client";

import Image from "next/image";
import { useState } from "react";
import type { TitleVideo } from "../types";

type SeasonGroup = { seasonNumber: number; videos: TitleVideo[] };

function VideoThumb({
  video,
  active,
  onPlay,
}: {
  video: TitleVideo;
  active: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className={`w-40 shrink-0 text-left transition duration-200 hover:scale-[1.04] ${
        active ? "opacity-100" : "opacity-80 hover:opacity-100"
      }`}
    >
      <div
        className={`relative aspect-video overflow-hidden rounded-lg border ${
          active ? "border-accent" : "border-line"
        }`}
      >
        <Image
          src={`https://i.ytimg.com/vi/${video.key}/mqdefault.jpg`}
          alt={video.name}
          fill
          sizes="160px"
          className="object-cover"
          unoptimized
        />
        <span className="absolute bottom-1 left-1 rounded-sm bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold">
          {video.videoType}
        </span>
      </div>
      <p
        className={`mt-1.5 line-clamp-1 text-xs font-medium ${
          active ? "text-accent" : ""
        }`}
      >
        {video.name}
      </p>
    </button>
  );
}

export function TitleVideos({
  seriesVideos,
  seasons,
}: {
  seriesVideos: TitleVideo[];
  seasons: SeasonGroup[];
}) {
  const availableSeasons = seasons.filter((s) => s.videos.length > 0);
  const hasSeriesVideos = seriesVideos.length > 0;
  const [groupSeason, setGroupSeason] = useState<number | null>(
    hasSeriesVideos ? null : (availableSeasons[0]?.seasonNumber ?? null),
  );
  const [playing, setPlaying] = useState<string | null>(null);

  if (!hasSeriesVideos && availableSeasons.length === 0) return null;

  const activeVideos =
    groupSeason === null
      ? seriesVideos
      : (seasons.find((s) => s.seasonNumber === groupSeason)?.videos ?? []);
  const current =
    activeVideos.find((v) => v.key === playing) ?? activeVideos[0] ?? null;

  function selectGroup(season: number | null) {
    setGroupSeason(season);
    setPlaying(null);
  }

  return (
    <section id="trailer" aria-label="Videos" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Videos</h2>

      <div className="flex flex-wrap gap-2">
        {hasSeriesVideos && (
          <button
            type="button"
            onClick={() => selectGroup(null)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              groupSeason === null
                ? "bg-foreground font-medium text-background"
                : "border border-line text-muted hover:bg-surface-2"
            }`}
          >
            Series
          </button>
        )}
        {availableSeasons.map(({ seasonNumber }) => (
          <button
            key={seasonNumber}
            type="button"
            onClick={() => selectGroup(seasonNumber)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              groupSeason === seasonNumber
                ? "bg-foreground font-medium text-background"
                : "border border-line text-muted hover:bg-surface-2"
            }`}
          >
            Season {seasonNumber}
          </button>
        ))}
      </div>

      {current && (
        <div className="flex w-full justify-center">
          <div className="pop-enter relative aspect-video w-[86%] max-w-2xl overflow-hidden rounded-xl border border-line bg-black">
            <iframe
              key={current.key}
              src={`https://www.youtube.com/embed/${current.key}`}
              title={current.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      )}

      <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
        {activeVideos.map((video) => (
          <VideoThumb
            key={video.key}
            video={video}
            active={current?.key === video.key}
            onPlay={() => setPlaying(video.key)}
          />
        ))}
      </div>
    </section>
  );
}
