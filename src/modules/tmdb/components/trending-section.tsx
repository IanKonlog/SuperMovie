"use client";

import { useState, useTransition } from "react";
import { PosterRow } from "@/modules/media/components/poster-row";
import { QuickAdd } from "@/modules/media/components/quick-add";
import { useHoverPanel } from "@/modules/media/components/use-hover-panel";
import { fetchTrendingAction } from "../actions";
import { titleHref } from "../links";
import type { TmdbSearchResult } from "../types";

const PAGE_SIZE = 20;

type Selection = TmdbSearchResult & {
  type: "MOVIE" | "SERIES";
  key: string;
  anchor: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

function Row({
  items,
  type,
  onHoverOpen,
  onHoverClose,
}: {
  items: TmdbSearchResult[];
  type: "MOVIE" | "SERIES";
  onHoverOpen: (
    item: TmdbSearchResult,
    type: "MOVIE" | "SERIES",
    anchor: Selection["anchor"],
  ) => void;
  onHoverClose: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <PosterRow
      items={items.map((item) => ({
        key: `${type}:${item.tmdbId}`,
        posterUrl: item.posterUrl,
        title: item.title,
        rating: item.voteAverage > 0 ? item.voteAverage : undefined,
        year: item.releaseDate?.slice(0, 4),
        href: titleHref(type, item.tmdbId),
        onHoverStart: (anchor) => onHoverOpen(item, type, anchor),
        onHoverEnd: onHoverClose,
      }))}
    />
  );
}

function LoadMoreButton({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="self-start rounded-full border border-line px-4 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
    >
      {pending ? "Loading…" : "Load more"}
    </button>
  );
}

export function TrendingSection({
  movies,
  series,
}: {
  movies: TmdbSearchResult[];
  series: TmdbSearchResult[];
}) {
  const panel = useHoverPanel<Selection>();
  const [movieItems, setMovieItems] = useState(movies);
  const [seriesItems, setSeriesItems] = useState(series);
  const [nextPage, setNextPage] = useState({ MOVIE: 2, SERIES: 2 });
  const [exhausted, setExhausted] = useState({
    MOVIE: movies.length < PAGE_SIZE,
    SERIES: series.length < PAGE_SIZE,
  });
  const [pending, startTransition] = useTransition();

  function loadMore(type: "MOVIE" | "SERIES") {
    const page = nextPage[type];
    setNextPage((prev) => ({ ...prev, [type]: page + 1 }));
    startTransition(async () => {
      const result = await fetchTrendingAction(type, page);
      if (result.error) return;
      const fresh = result.results;
      setExhausted((prev) => ({ ...prev, [type]: fresh.length < PAGE_SIZE }));
      if (type === "MOVIE") {
        setMovieItems((prev) => {
          const seen = new Set(prev.map((i) => i.tmdbId));
          return [...prev, ...fresh.filter((i) => !seen.has(i.tmdbId))];
        });
      } else {
        setSeriesItems((prev) => {
          const seen = new Set(prev.map((i) => i.tmdbId));
          return [...prev, ...fresh.filter((i) => !seen.has(i.tmdbId))];
        });
      }
    });
  }

  if (movieItems.length === 0 && seriesItems.length === 0) return null;

  return (
    <section aria-label="Trending this week" className="flex flex-col gap-6">
      {movieItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Trending movies</h2>
          <Row
            items={movieItems}
            type="MOVIE"
            onHoverOpen={(item, type, anchor) =>
              panel.hoverOpen({
                ...item,
                type,
                key: `${type}:${item.tmdbId}`,
                anchor,
              })
            }
            onHoverClose={panel.hoverClose}
          />
          {!exhausted.MOVIE && (
            <LoadMoreButton
              onClick={() => loadMore("MOVIE")}
              pending={pending}
            />
          )}
        </div>
      )}
      {seriesItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Trending series</h2>
          <Row
            items={seriesItems}
            type="SERIES"
            onHoverOpen={(item, type, anchor) =>
              panel.hoverOpen({
                ...item,
                type,
                key: `${type}:${item.tmdbId}`,
                anchor,
              })
            }
            onHoverClose={panel.hoverClose}
          />
          {!exhausted.SERIES && (
            <LoadMoreButton
              onClick={() => loadMore("SERIES")}
              pending={pending}
            />
          )}
        </div>
      )}
      {panel.active && (
        <QuickAdd
          item={panel.active}
          anchor={panel.active.anchor}
          onClose={panel.close}
          onPanelMouseEnter={panel.keepAlive}
          onPanelMouseLeave={panel.hoverClose}
        />
      )}
    </section>
  );
}
