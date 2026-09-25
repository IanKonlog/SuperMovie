"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { addMediaItem, type ActionState } from "@/modules/media/actions";
import { searchBooksAction } from "@/modules/books/actions";
import type { BookSearchResult } from "@/modules/books/queries";
import { Poster } from "@/modules/media/components/poster";
import {
  WATCH_STATUSES,
  WATCH_STATUS_LABELS,
  type MediaTypeValue,
} from "@/modules/media/constants";
import { searchMediaAction } from "@/modules/tmdb/actions";
import { titleHref } from "@/modules/tmdb/links";
import type { TmdbSearchResult } from "@/modules/tmdb/types";

const SEARCH_TYPES = ["MOVIE", "SERIES", "BOOK"] as const;
type SearchType = (typeof SEARCH_TYPES)[number];

const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  MOVIE: "Movie",
  SERIES: "Series",
  BOOK: "Book",
};

const initialState: ActionState = {};

type SearchUiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; mediaType: MediaTypeValue; results: TmdbSearchResult[] }
  | { status: "doneBooks"; results: BookSearchResult[] }
  | { status: "error"; message: string };

function MagnifierIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function NavSearch() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SearchType>("MOVIE");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchUiState>({ status: "idle" });
  const [manual, setManual] = useState(false);
  const [manualState, manualAction, manualPending] = useActionState(
    addMediaItem,
    initialState,
  );
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevManualState, setPrevManualState] = useState(manualState);

  if (manualState !== prevManualState) {
    setPrevManualState(manualState);
    if (manualState.success) {
      setOpen(false);
      setQuery("");
      setSearch({ status: "idle" });
      setManual(false);
    }
  }

  const resetAndClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSearch({ status: "idle" });
    setManual(false);
    requestId.current++;
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        resetAndClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, resetAndClose]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (manual || trimmed.length < 2) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearch({ status: "loading" });
      if (type === "BOOK") {
        const result = await searchBooksAction(trimmed);
        if (requestId.current !== id) return;
        setSearch(
          result.error
            ? { status: "error", message: result.error }
            : { status: "doneBooks", results: result.results },
        );
      } else {
        const result = await searchMediaAction(trimmed, type);
        if (requestId.current !== id) return;
        if (result.error) {
          setSearch({ status: "error", message: result.error });
        } else {
          setSearch({
            status: "done",
            mediaType: type,
            results: result.results,
          });
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, type, manual]);

  const inputClasses =
    "w-full bg-transparent text-sm outline-none placeholder:text-muted";

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={resetAndClose}
          className="fixed inset-0 z-30 bg-black/60"
        />
      )}

      <div
        className={`relative z-40 ${
          open ? "max-sm:fixed max-sm:inset-x-3 max-sm:top-3" : ""
        }`}
      >
        <div
          className={`flex h-10 items-center gap-2 overflow-hidden rounded-full border px-3 transition-all duration-300 ease-out ${
            open
              ? "w-full border-line bg-surface sm:w-96"
              : "w-10 border-transparent bg-transparent"
          }`}
        >
          <button
            type="button"
            aria-label={
              open ? "Close search" : "Search movies, series, and books"
            }
            onClick={() => (open ? resetAndClose() : setOpen(true))}
            className="shrink-0 text-muted transition hover:text-foreground"
          >
            <MagnifierIcon />
          </button>
          {open && (
            <>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={100}
                placeholder={
                  type === "BOOK"
                    ? "Search Google Books…"
                    : `Search TMDB for a ${type === "MOVIE" ? "movie" : "series"}…`
                }
                aria-label="Search movies, series, or books"
                className={inputClasses}
              />
              <div className="flex shrink-0 gap-1">
                {SEARCH_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setSearch({ status: "idle" });
                    }}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                      type === t
                        ? "bg-foreground text-background"
                        : "border border-line text-muted hover:bg-surface-2"
                    }`}
                  >
                    {SEARCH_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {open && (
          <div className="absolute right-0 top-full mt-2 max-h-[75vh] w-[20rem] overflow-y-auto rounded-xl border border-line bg-surface p-3 shadow-2xl sm:w-[26rem]">
            {manual ? (
              <form action={manualAction} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium">Title</span>
                  <input
                    name="title"
                    required
                    maxLength={200}
                    placeholder="e.g. Breaking Bad"
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-muted"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium">Type</span>
                  <select
                    name="type"
                    defaultValue={type}
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-muted"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="SERIES">Series</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium">Status</span>
                  <select
                    name="status"
                    defaultValue="WATCHING"
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-muted"
                  >
                    {WATCH_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {WATCH_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                {manualState.error && (
                  <p className="text-sm text-red-500">{manualState.error}</p>
                )}
                <button
                  type="submit"
                  disabled={manualPending}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:bg-accent/80 disabled:opacity-50"
                >
                  {manualPending ? "Adding…" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setManual(false)}
                  className="self-start text-xs text-muted underline hover:text-foreground"
                >
                  Back to search
                </button>
              </form>
            ) : (
              <>
                {search.status === "loading" && (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className="w-full animate-pulse rounded-md bg-surface-2"
                        style={{ aspectRatio: "2 / 3" }}
                      />
                    ))}
                  </div>
                )}
                {search.status === "error" && (
                  <p className="text-sm text-red-500">{search.message}</p>
                )}
                {search.status === "done" && search.results.length === 0 && (
                  <p className="text-sm text-muted">
                    No results for &ldquo;{query.trim()}&rdquo;.
                  </p>
                )}
                {search.status === "idle" && (
                  <p className="text-sm text-muted">
                    Type at least 2 characters to search.
                  </p>
                )}
                {!manual && manualState.error && (
                  <p className="text-sm text-red-500">{manualState.error}</p>
                )}
                {search.status === "done" && search.results.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {search.results.map((item) => (
                      <Link
                        key={item.tmdbId}
                        href={titleHref(search.mediaType, item.tmdbId)}
                        onClick={resetAndClose}
                        className="text-left transition hover:scale-[1.03]"
                      >
                        <Poster
                          posterUrl={item.posterUrl}
                          title={item.title}
                          size={104}
                        />
                        <p className="mt-1 line-clamp-2 text-xs font-medium">
                          {item.title}
                        </p>
                        {item.releaseDate && (
                          <p className="text-xs text-muted">
                            {item.releaseDate.slice(0, 4)}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
                {search.status === "doneBooks" && search.results.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {search.results.map((book) => (
                      <form key={book.googleBooksId} action={manualAction}>
                        <input type="hidden" name="title" value={book.title} />
                        <input
                          type="hidden"
                          name="authors"
                          value={book.authors.join(",")}
                        />
                        <input
                          type="hidden"
                          name="googleBooksId"
                          value={book.googleBooksId}
                        />
                        {book.coverUrl && (
                          <input
                            type="hidden"
                            name="coverUrl"
                            value={book.coverUrl}
                          />
                        )}
                        {book.pageCount !== null && (
                          <input
                            type="hidden"
                            name="pageCount"
                            value={book.pageCount}
                          />
                        )}
                        {book.publishedDate && (
                          <input
                            type="hidden"
                            name="publishedDate"
                            value={book.publishedDate}
                          />
                        )}
                        {book.description && (
                          <input
                            type="hidden"
                            name="description"
                            value={book.description}
                          />
                        )}
                        <input
                          type="hidden"
                          name="status"
                          value="WANT_TO_READ"
                        />
                        <button
                          type="submit"
                          aria-label={`Add ${book.title} to books`}
                          className="text-left transition hover:scale-[1.03]"
                        >
                          <Poster
                            posterUrl={book.coverUrl}
                            title={book.title}
                            size={104}
                          />
                          <p className="mt-1 line-clamp-2 text-xs font-medium">
                            {book.title}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted">
                            {book.authors[0] ?? "Unknown author"}
                          </p>
                        </button>
                      </form>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setManual(true)}
                  className="mt-3 text-xs text-muted underline hover:text-foreground"
                >
                  Title not found? Add manually
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
