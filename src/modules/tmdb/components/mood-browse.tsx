"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Poster } from "@/modules/media/components/poster";
import { discoverByMoodAction } from "../actions";
import { titleHref } from "../links";

const RUNTIMES = [
  { value: "", label: "Any length" },
  { value: "90", label: "≤ 90 min" },
  { value: "120", label: "≤ 2 h" },
  { value: "150", label: "≤ 2.5 h" },
];

type MoodResult = {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
};

export function MoodBrowse({ genres }: { genres: string[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [runtime, setRuntime] = useState("");
  const [results, setResults] = useState<MoodResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(genre: string) {
    setPicked((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 3
          ? prev
          : [...prev, genre],
    );
  }

  function find() {
    if (picked.length === 0) {
      setError("Pick at least one genre.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const state = await discoverByMoodAction(picked, runtime);
      if (state.error) setError(state.error);
      setResults(state.results);
    });
  }

  return (
    <section aria-label="Browse by mood" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Movie night</h2>
      <div className="flex flex-wrap items-center gap-2">
        {genres.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => toggle(genre)}
            aria-pressed={picked.includes(genre)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              picked.includes(genre)
                ? "bg-accent font-medium text-background"
                : "border border-line text-muted hover:bg-surface-2"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={runtime}
          onChange={(e) => setRuntime(e.target.value)}
          aria-label="Maximum runtime"
          className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none"
        >
          {RUNTIMES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={find}
          disabled={pending}
          className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-bold text-background transition hover:bg-foreground/80 disabled:opacity-50"
        >
          {pending ? "Finding…" : "Find a movie"}
        </button>
        {error && (
          <span className="self-center text-sm text-red-500">{error}</span>
        )}
      </div>
      {results !== null && results.length === 0 && !error && (
        <p className="text-sm text-muted">
          Nothing matched — try fewer genres or a longer runtime.
        </p>
      )}
      {results !== null && results.length > 0 && (
        <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
          {results.map((item) => (
            <Link
              key={item.tmdbId}
              href={titleHref("MOVIE", item.tmdbId)}
              className="w-32 shrink-0 transition duration-200 hover:scale-105"
            >
              <Poster
                posterUrl={item.posterUrl}
                title={item.title}
                size={128}
              />
              <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                {item.title}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted">
                {item.voteAverage > 0 && (
                  <>
                    <span className="text-amber-400">★</span>
                    <span>{item.voteAverage.toFixed(1)}</span>
                    {item.releaseDate && (
                      <span>· {item.releaseDate.slice(0, 4)}</span>
                    )}
                  </>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
