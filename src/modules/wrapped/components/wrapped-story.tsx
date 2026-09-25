"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { WrappedData } from "../queries";

const SLIDE_MS = 9000;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return (
    <span className="wrapped-pop block font-mono text-6xl font-semibold tracking-tighter tabular-nums sm:text-7xl">
      {children}
    </span>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
      {children}
    </p>
  );
}

function Glow({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute h-72 w-72 rounded-full bg-accent/15 blur-3xl ${className}`}
    />
  );
}

export function WrappedStory({ data }: { data: WrappedData }) {
  const { year } = data;
  const [index, setIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const autoAdvance = !prefersReducedMotion;
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = [
    {
      key: "intro",
      node: (
        <>
          <Glow className="-top-20 -right-20" />
          <div className="wrapped-slide flex flex-col items-center gap-5 text-center">
            <Kicker>Supermovie Wrapped</Kicker>
            <Big>{year}</Big>
            <p className="wrapped-pop-slow text-sm text-muted">
              Your year in stories — a look back at everything you watched and
              read.
            </p>
          </div>
        </>
      ),
    },
    {
      key: "hours",
      node: (
        <>
          <Glow className="top-1/4 -left-24" />
          <div className="wrapped-slide flex flex-col items-center gap-4 text-center">
            <Kicker>Time in the dark</Kicker>
            <Big>{data.hoursWatched.toLocaleString("en-US")}</Big>
            <p className="text-sm text-muted">hours watched</p>
            <p className="wrapped-pop-slow max-w-xs text-xs text-muted">
              {data.moviesCompleted} movie
              {data.moviesCompleted === 1 ? "" : "s"}
              {" · "}
              {data.episodesWatched} episodes across {data.seriesCompleted}{" "}
              series
            </p>
          </div>
        </>
      ),
    },
    {
      key: "genres",
      node: (
        <>
          <Glow className="-bottom-24 right-0" />
          <div className="wrapped-slide flex flex-col items-center gap-5 text-center">
            <Kicker>Your taste</Kicker>
            <div className="flex flex-wrap justify-center gap-2">
              {data.topGenres.map(({ genre, count }) => (
                <span
                  key={genre}
                  className="wrapped-pop rounded-full border border-line bg-surface px-3 py-1 text-xs"
                >
                  {genre}{" "}
                  <span className="font-mono tabular-nums text-muted">
                    {count}
                  </span>
                </span>
              ))}
            </div>
            {data.topDecade && (
              <p className="wrapped-pop-slow text-sm text-muted">
                and you kept coming back to the{" "}
                <span className="font-medium text-foreground">
                  {data.topDecade}
                </span>
              </p>
            )}
          </div>
        </>
      ),
    },
    {
      key: "ratings",
      node: (
        <>
          <Glow className="-top-16 left-1/3" />
          <div className="wrapped-slide flex flex-col items-center gap-5 text-center">
            <Kicker>How you rate</Kicker>
            {data.averageRating !== null ? (
              <Big>{data.averageRating.toFixed(1)}</Big>
            ) : (
              <Big>—</Big>
            )}
            <div className="flex h-16 items-end gap-1" aria-hidden>
              {data.ratingHistogram.map((count, i) => {
                const max = Math.max(...data.ratingHistogram, 1);
                return (
                  <div
                    key={i}
                    className={`w-2.5 rounded-t-sm ${count > 0 ? "bg-accent" : "bg-surface-2"}`}
                    style={{
                      height: `${count > 0 ? Math.max((count / max) * 100, 8) : 6}%`,
                    }}
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted">
              out of 10 across {data.ratingsGiven} rated{" "}
              {data.ratingsGiven === 1 ? "title" : "titles"}
            </p>
          </div>
        </>
      ),
    },
    {
      key: "best",
      node: (
        <div className="absolute inset-0">
          {data.best?.posterUrl && (
            <Image
              src={data.best.posterUrl}
              alt=""
              fill
              sizes="100vw"
              className="wrapped-zoom object-cover opacity-40"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="wrapped-slide relative flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <Kicker>Your #1 of {year}</Kicker>
            <p className="wrapped-pop max-w-md text-3xl font-semibold tracking-tight">
              {data.best?.title ?? "Still deciding…"}
            </p>
            {data.best && (
              <p className="wrapped-pop-slow font-mono text-sm tabular-nums text-muted">
                ★ {data.best.rating}/10
                {data.best.year ? ` · ${data.best.year}` : ""}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "books",
      node: (
        <>
          <Glow className="-bottom-20 -left-16" />
          <div className="wrapped-slide flex flex-col items-center gap-4 text-center">
            <Kicker>Off the screen, onto the page</Kicker>
            <Big>{data.pagesRead.toLocaleString("en-US")}</Big>
            <p className="text-sm text-muted">
              pages read across {data.booksFinished} finished{" "}
              {data.booksFinished === 1 ? "book" : "books"}
            </p>
            {data.bestBook && (
              <p className="wrapped-pop-slow max-w-xs text-xs text-muted">
                and your favourite was{" "}
                <span className="font-medium text-foreground">
                  {data.bestBook.title}
                </span>
                {data.bestBook.rating !== null &&
                  ` · ★ ${data.bestBook.rating}/10`}
              </p>
            )}
          </div>
        </>
      ),
    },
    {
      key: "outro",
      node: (
        <>
          <Glow className="-top-24 right-1/4" />
          <div className="wrapped-slide flex flex-col items-center gap-6 text-center">
            <Kicker>That was {year}</Kicker>
            <p className="max-w-xs text-xl font-semibold tracking-tight">
              See you in the credits.
            </p>
            {data.notable.length > 0 && (
              <div className="flex justify-center gap-1.5" aria-hidden>
                {data.notable.slice(0, 6).map((item, i) => (
                  <div
                    key={i}
                    className="h-16 w-11 overflow-hidden rounded-sm bg-surface-2"
                  >
                    {item.posterUrl && (
                      <Image
                        src={item.posterUrl}
                        alt=""
                        width={44}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="wrapped-pop-slow flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setReplayKey((k) => k + 1);
                }}
                className="rounded-md border border-line px-4 py-2 text-sm transition hover:bg-surface-2"
              >
                Replay
              </button>
              <Link
                href="/stats"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition hover:bg-accent/80"
              >
                View full stats
              </Link>
            </div>
          </div>
        </>
      ),
    },
  ];

  const isLast = index === slides.length - 1;

  const go = useCallback(
    (delta: 1 | -1) => {
      setIndex((current) =>
        Math.min(Math.max(current + delta, 0), slides.length - 1),
      );
    },
    [slides.length],
  );

  useEffect(() => {
    if (!autoAdvance || isLast) return;
    const timer = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [autoAdvance, isLast, index, go, replayKey]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={`Wrapped ${year} story`}
      className="relative h-[72dvh] min-h-[540px] w-full overflow-hidden rounded-xl border border-line bg-background"
    >
      <div className="absolute top-0 right-0 left-0 z-20 flex gap-1.5 p-3">
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-line"
          >
            {i < index && <div className="h-full w-full bg-accent" />}
            {i === index &&
              (autoAdvance && !isLast ? (
                <div
                  key={`${index}-${replayKey}`}
                  className="wrapped-progress h-full bg-accent"
                  style={
                    { "--wrapped-ms": `${SLIDE_MS}ms` } as React.CSSProperties
                  }
                />
              ) : (
                <div className="h-full w-full bg-accent" />
              ))}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-8">
        {slides[index].node}
      </div>

      <button
        type="button"
        aria-label="Previous story"
        onClick={() => go(-1)}
        className="absolute inset-y-0 left-0 z-10 w-1/4 cursor-w-resize focus-visible:outline-2 focus-visible:outline-accent"
      />
      <button
        type="button"
        aria-label="Next story"
        onClick={() => go(1)}
        className="absolute inset-y-0 right-0 z-10 w-1/4 cursor-e-resize focus-visible:outline-2 focus-visible:outline-accent"
      />

      <p className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 font-mono text-[10px] tabular-nums text-muted">
        {index + 1} / {slides.length} · tap sides or use arrow keys
      </p>
    </div>
  );
}
