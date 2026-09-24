"use client";

import Link from "next/link";
import { useState } from "react";
import { Poster } from "@/modules/media/components/poster";
import {
  QuickAdd,
  type QuickAddAnchor,
} from "@/modules/media/components/quick-add";
import {
  isTouchOnly,
  useHoverPanel,
} from "@/modules/media/components/use-hover-panel";
import { titleHref } from "@/modules/tmdb/links";
import type { PersonCredit } from "@/modules/tmdb/types";

type Selection = PersonCredit & {
  key: string;
  anchor: QuickAddAnchor;
};

const TABS = [
  { key: "ALL", label: "All" },
  { key: "MOVIE", label: "Movies" },
  { key: "SERIES", label: "Series" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const GENRE_CHIP_CAP = 12;

export function PersonCredits({ credits }: { credits: PersonCredit[] }) {
  const [tab, setTab] = useState<TabKey>("ALL");
  const [genre, setGenre] = useState<string | null>(null);
  const panel = useHoverPanel<Selection>();

  const genreCounts = new Map<string, number>();
  for (const credit of credits) {
    for (const name of credit.genres) {
      genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
    }
  }
  const genreChips = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, GENRE_CHIP_CAP);

  const counts = {
    ALL: credits.length,
    MOVIE: credits.filter((c) => c.type === "MOVIE").length,
    SERIES: credits.filter((c) => c.type === "SERIES").length,
  };
  const visible = credits.filter(
    (c) =>
      (tab === "ALL" || c.type === tab) &&
      (genre === null || c.genres.includes(genre)),
  );

  const tabClasses = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition ${
      active
        ? "bg-foreground font-medium text-background"
        : "border border-line text-muted hover:bg-surface-2"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={tabClasses(tab === key)}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {genreChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGenre(null)}
            aria-pressed={genre === null}
            className={`rounded-full px-3 py-1 text-xs transition ${
              genre === null
                ? "bg-accent font-medium text-white"
                : "border border-line text-muted hover:bg-surface-2"
            }`}
          >
            All genres
          </button>
          {genreChips.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setGenre(genre === name ? null : name)}
              aria-pressed={genre === name}
              className={`rounded-full px-3 py-1 text-xs transition ${
                genre === name
                  ? "bg-accent font-medium text-white"
                  : "border border-line text-muted hover:bg-surface-2"
              }`}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No credits in this category.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
          {visible.map((credit, index) => (
            <li
              key={`${credit.type}:${credit.tmdbId}`}
              className="card-enter"
              style={{ "--i": index } as React.CSSProperties}
            >
              <Link
                href={titleHref(credit.type, credit.tmdbId)}
                onClick={(e) => {
                  if (!isTouchOnly()) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  panel.toggleTouch({
                    ...credit,
                    key: `${credit.type}:${credit.tmdbId}`,
                    anchor: {
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                    },
                  });
                }}
                className="block w-full transition duration-200 ease-out hover:z-10 hover:scale-105 hover:drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
              >
                <Poster
                  posterUrl={credit.posterUrl}
                  title={credit.title}
                  size={160}
                />
                <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                  {credit.title}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  {credit.voteAverage > 0 && (
                    <>
                      <span className="text-amber-400">★</span>
                      <span>{credit.voteAverage.toFixed(1)}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>
                    {credit.character || credit.releaseDate?.slice(0, 4)}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {panel.active && (
        <QuickAdd
          item={{
            title: panel.active.title,
            type: panel.active.type,
            tmdbId: panel.active.tmdbId,
            posterUrl: panel.active.posterUrl,
            overview: null,
            releaseDate: panel.active.releaseDate,
            voteAverage: panel.active.voteAverage,
            genres: [],
          }}
          anchor={panel.active.anchor}
          onClose={panel.close}
          onPanelMouseEnter={panel.keepAlive}
          onPanelMouseLeave={panel.hoverClose}
        />
      )}
    </div>
  );
}
