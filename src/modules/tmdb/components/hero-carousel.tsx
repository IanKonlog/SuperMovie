"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QuickAdd } from "@/modules/media/components/quick-add";
import { titleHref } from "../links";
import type { TmdbSearchResult } from "../types";

const SLIDE_MS = 7000;

export type HeroSlide = {
  item: TmdbSearchResult;
  type: "MOVIE" | "SERIES";
  inLibrary: boolean;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState<HeroSlide | null>(null);
  const pausedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current && !reducedMotionRef.current) {
        setIndex((i) => (i + 1) % slides.length);
      }
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      aria-label="Featured"
      className="relative -mx-4 -mt-6 sm:-mx-8 lg:-mx-12"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="relative h-[440px] overflow-hidden sm:h-[500px] lg:h-[560px]">
        {slides.map((slide, i) => {
          const imageSrc = slide.item.backdropUrl ?? slide.item.posterUrl;
          const active = i === index;
          return (
            <div
              key={`${slide.type}:${slide.item.tmdbId}`}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {imageSrc && (
                <Image
                  src={imageSrc}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className={`object-cover object-top transition-transform duration-[7000ms] ease-linear ${
                    active ? "scale-105" : "scale-100"
                  }`}
                  unoptimized
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/40 to-transparent" />

              <div className="absolute bottom-0 left-0 flex max-w-2xl flex-col gap-2 p-6 pb-7 sm:gap-3 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {slide.type === "MOVIE"
                    ? "Featured movie"
                    : "Featured series"}
                </p>
                <h1 className="text-3xl font-extrabold sm:text-5xl">
                  {slide.item.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium text-green-600 dark:text-green-500">
                    {Math.round(slide.item.voteAverage * 10)}% match
                  </span>
                  {slide.item.releaseDate && (
                    <span className="text-muted">
                      {slide.item.releaseDate.slice(0, 4)}
                    </span>
                  )}
                  {slide.item.genres.length > 0 && (
                    <span className="text-muted">
                      {slide.item.genres.slice(0, 3).join(" · ")}
                    </span>
                  )}
                </div>
                {slide.item.overview && (
                  <p className="line-clamp-3 text-sm text-foreground/80 sm:text-base">
                    {slide.item.overview}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-3">
                  {slide.inLibrary ? (
                    <span className="rounded-md border border-line bg-surface/80 px-5 py-2.5 text-sm font-bold">
                      ✓ In your library
                    </span>
                  ) : (
                    <button
                      type="button"
                      tabIndex={active ? 0 : -1}
                      onClick={() => setAdding(slide)}
                      className="rounded-md bg-foreground px-5 py-2.5 text-sm font-bold text-background transition hover:bg-foreground/80"
                    >
                      ＋ Add to library
                    </button>
                  )}
                  <Link
                    href={titleHref(slide.type, slide.item.tmdbId)}
                    tabIndex={active ? 0 : -1}
                    className="rounded-md border border-line px-5 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-surface-2"
                  >
                    More details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {/* Arrows */}
        <button
          type="button"
          aria-label="Previous featured title"
          tabIndex={-1}
          onClick={() =>
            setIndex((i) => (i - 1 + slides.length) % slides.length)
          }
          className="absolute top-1/2 left-4 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl opacity-0 backdrop-blur transition hover:bg-black/80 group-hover:opacity-100 md:flex lg:opacity-40 lg:hover:opacity-100"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next featured title"
          tabIndex={-1}
          onClick={() => setIndex((i) => (i + 1) % slides.length)}
          className="absolute top-1/2 right-4 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl opacity-0 backdrop-blur transition hover:bg-black/80 md:flex lg:opacity-40 lg:hover:opacity-100"
        >
          ›
        </button>

        {/* Dots */}
        <div className="absolute right-6 top-4 flex items-center gap-2 sm:bottom-5 sm:right-10 sm:top-auto">
          {slides.map((slide, i) => (
            <button
              key={`dot-${slide.type}:${slide.item.tmdbId}`}
              type="button"
              aria-label={`Go to ${slide.item.title}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-8 bg-accent"
                  : "w-3 bg-foreground/40 hover:bg-foreground/70"
              }`}
            />
          ))}
        </div>
      </div>

      {adding && (
        <QuickAdd
          item={{
            ...adding.item,
            type: adding.type,
          }}
          onClose={() => setAdding(null)}
        />
      )}
    </section>
  );
}
