"use client";

import Link from "next/link";
import { useState } from "react";
import { Poster } from "./poster";
import { titleHref } from "@/modules/tmdb/links";
import { MediaDetailPanel } from "./media-detail-panel";
import {
  WATCH_STATUS_LABELS,
  type MediaItemDTO,
  type SeasonDTO,
} from "../constants";

const STATUS_DOT: Record<string, string> = {
  WATCHING: "bg-blue-500",
  WANT_TO_WATCH: "bg-amber-500",
  COMPLETED: "bg-green-600",
  ON_HOLD: "bg-neutral-500",
  DROPPED: "bg-red-600",
};

export function LibrarySection({
  page,
  items,
  seasonsByItem,
  emptyMessage,
  pagination,
}: {
  page: number;
  items: MediaItemDTO[];
  seasonsByItem: Record<string, SeasonDTO[]>;
  emptyMessage: string;
  pagination: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <ul
          key={page}
          className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6"
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              className="card-enter"
              style={{ "--i": index } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedId(item.id === selectedId ? null : item.id)
                }
                aria-expanded={item.id === selectedId}
                aria-label={`Manage ${item.title}`}
                className="relative w-full text-left transition duration-200 ease-out hover:scale-[1.04] hover:drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
              >
                <Poster
                  posterUrl={item.posterUrl}
                  title={item.title}
                  size={160}
                />
                {item.isFavorite && (
                  <span
                    aria-label="Favorite"
                    className="absolute top-1 right-1 text-sm text-amber-400 drop-shadow"
                  >
                    ★
                  </span>
                )}
              </button>
              {item.tmdbId !== null ? (
                <Link
                  href={titleHref(item.type, item.tmdbId)}
                  aria-label={`Open ${item.title} page`}
                  className="mt-1.5 block line-clamp-1 text-xs font-medium underline-offset-2 transition hover:text-accent hover:underline"
                >
                  {item.title} ↗
                </Link>
              ) : (
                <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                  {item.title}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-xs text-muted">
                {item.voteAverage !== null && item.voteAverage > 0 && (
                  <>
                    <span className="text-amber-400">★</span>
                    <span>{item.voteAverage.toFixed(1)}</span>
                    <span>·</span>
                  </>
                )}
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`}
                />
                {WATCH_STATUS_LABELS[item.status]}
              </p>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="pop-enter">
          <MediaDetailPanel
            item={selected}
            seasons={seasonsByItem[selected.id] ?? []}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {pagination}
    </div>
  );
}
