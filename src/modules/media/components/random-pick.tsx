"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { titleHref } from "@/modules/tmdb/links";
import type { MediaTypeValue } from "../constants";

type PickItem = {
  id: string;
  title: string;
  type: MediaTypeValue;
  posterUrl: string | null;
  releaseDate: string | null;
  genres: string[];
  tmdbId: number | null;
};

export function RandomPick({ items }: { items: PickItem[] }) {
  const [pick, setPick] = useState<PickItem | null>(null);

  function spin() {
    if (items.length === 0) return;
    const next = items[Math.floor(Math.random() * items.length)];
    setPick(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={spin}
        disabled={items.length === 0}
        className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
      >
        🎲 Surprise me
        {items.length > 0 && (
          <span className="ml-1 opacity-60">({items.length})</span>
        )}
      </button>

      {pick && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Random pick: ${pick.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPick(null)}
        >
          <div
            className="pop-enter w-full max-w-sm overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4 p-4">
              {pick.posterUrl && (
                <div className="w-28 shrink-0">
                  <Image
                    src={pick.posterUrl}
                    alt={`Poster for ${pick.title}`}
                    width={112}
                    height={168}
                    className="h-auto w-full rounded-lg"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Tonight&apos;s pick
                </p>
                <h2 className="text-xl font-bold">{pick.title}</h2>
                <p className="text-xs text-muted">
                  {pick.type === "MOVIE" ? "Movie" : "Series"}
                  {pick.releaseDate && ` · ${pick.releaseDate.slice(0, 4)}`}
                  {pick.genres.length > 0 &&
                    ` · ${pick.genres.slice(0, 2).join(", ")}`}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {pick.tmdbId !== null && (
                    <Link
                      href={titleHref(pick.type, pick.tmdbId)}
                      onClick={() => setPick(null)}
                      className="rounded-md bg-foreground px-3 py-1.5 text-xs font-bold text-background transition hover:bg-foreground/80"
                    >
                      Open ↗
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={spin}
                    className="rounded-md border border-line px-3 py-1.5 text-xs transition hover:bg-surface-2"
                  >
                    Spin again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
