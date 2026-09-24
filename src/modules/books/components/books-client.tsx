"use client";

import Image from "next/image";
import {
  Fragment,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  addBook,
  deleteBook,
  searchBooksAction,
  updateBook,
  type BookActionState,
} from "../actions";
import { BOOK_STATUSES, BOOK_STATUS_LABELS, type BookDTO } from "../constants";
import type { BookSearchResult } from "../queries";

const initial: BookActionState = {};

const STATUS_DOT: Record<string, string> = {
  READING: "bg-blue-500",
  WANT_TO_READ: "bg-amber-500",
  FINISHED: "bg-green-600",
  ABANDONED: "bg-neutral-500",
};

function Cover({
  coverUrl,
  title,
  size,
}: {
  coverUrl: string | null;
  title: string;
  size: number;
}) {
  return coverUrl ? (
    <Image
      src={coverUrl}
      alt={`Cover of ${title}`}
      width={size}
      height={Math.round(size * 1.5)}
      className="h-auto w-full rounded-md"
      unoptimized
    />
  ) : (
    <div
      style={{ aspectRatio: "2 / 3" }}
      className="flex w-full items-center justify-center rounded-md bg-surface-2 p-2 text-center text-xs text-muted"
    >
      {title.slice(0, 40)}
    </div>
  );
}

function BookSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [state, addAction, adding] = useActionState(addBook, initial);
  const requestId = useRef(0);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await searchBooksAction(trimmed);
      if (requestId.current === id) {
        setResults(result.results);
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={100}
        placeholder="Search Google Books…"
        aria-label="Search books"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-muted"
      />

      {searching && (
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="w-20 animate-pulse rounded bg-surface-2"
              style={{ aspectRatio: "2 / 3" }}
            />
          ))}
        </div>
      )}

      {selected && (
        <form
          action={addAction}
          className="pop-enter flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="title" value={selected.title} />
          <input
            type="hidden"
            name="authors"
            value={selected.authors.join(",")}
          />
          <input
            type="hidden"
            name="googleBooksId"
            value={selected.googleBooksId}
          />
          {selected.coverUrl && (
            <input type="hidden" name="coverUrl" value={selected.coverUrl} />
          )}
          {selected.pageCount !== null && (
            <input type="hidden" name="pageCount" value={selected.pageCount} />
          )}
          {selected.publishedDate && (
            <input
              type="hidden"
              name="publishedDate"
              value={selected.publishedDate}
            />
          )}
          {selected.description && (
            <input
              type="hidden"
              name="description"
              value={selected.description}
            />
          )}
          <div className="w-16 shrink-0">
            <Cover
              coverUrl={selected.coverUrl}
              title={selected.title}
              size={64}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{selected.title}</p>
            <p className="line-clamp-1 text-xs text-muted">
              {selected.authors.join(", ") || "Unknown author"}
              {selected.pageCount !== null && ` · ${selected.pageCount} pages`}
            </p>
            {state.error && (
              <p className="mt-1 text-sm text-red-500">{state.error}</p>
            )}
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-muted">Status</span>
            <select
              name="status"
              defaultValue="READING"
              className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none"
            >
              {BOOK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOOK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-white/80 disabled:opacity-50"
            >
              {adding ? "Adding…" : "＋ Add"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {results !== null && !searching && results.length === 0 && (
        <p className="text-sm text-muted">No books found.</p>
      )}

      {results !== null && !searching && results.length > 0 && !selected && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {results.map((book) => (
            <button
              key={book.googleBooksId}
              type="button"
              onClick={() => setSelected(book)}
              className="text-left transition hover:scale-[1.03]"
            >
              <Cover coverUrl={book.coverUrl} title={book.title} size={128} />
              <p className="mt-1.5 line-clamp-2 text-xs font-medium">
                {book.title}
              </p>
              <p className="line-clamp-1 text-xs text-muted">
                {book.authors[0] ?? ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookPanel({ book, onClose }: { book: BookDTO; onClose: () => void }) {
  const [state] = useActionState(updateBook, initial);
  const [, startTransition] = useTransition();
  const done = book.pageCount !== null && book.currentPage >= book.pageCount;

  function patch(name: string, value: string) {
    const formData = new FormData();
    formData.set("id", book.id);
    formData.set(name, value);
    startTransition(async () => {
      await updateBook(initial, formData);
    });
  }

  const selectClasses =
    "rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none";

  return (
    <div className="pop-enter relative rounded-xl border border-line bg-surface p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-3 right-3 text-lg text-muted transition hover:text-foreground"
      >
        ✕
      </button>
      <div className="flex gap-4">
        <div className="w-20 shrink-0">
          <Cover coverUrl={book.coverUrl} title={book.title} size={80} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="pr-8 text-lg font-bold">{book.title}</h3>
          <p className="text-xs text-muted">
            {book.authors.join(", ") || "Unknown author"}
            {book.pageCount !== null && ` · ${book.pageCount} pages`}
          </p>
          {book.rating !== null && (
            <p className="text-sm text-muted">Your rating: {book.rating}/10</p>
          )}
          {book.pageCount !== null && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Earlier pages"
                disabled={book.currentPage === 0}
                onClick={() =>
                  patch(
                    "currentPage",
                    String(Math.max(book.currentPage - 25, 0)),
                  )
                }
                className="h-7 rounded-full border border-line px-2 text-xs disabled:opacity-30"
              >
                −25p
              </button>
              <span className="text-sm">
                page {book.currentPage} / {book.pageCount}
              </span>
              <button
                type="button"
                aria-label="Later pages"
                disabled={done}
                onClick={() =>
                  patch(
                    "currentPage",
                    String(
                      Math.min(book.currentPage + 25, book.pageCount ?? 0),
                    ),
                  )
                }
                className="h-7 rounded-full border border-line px-2 text-xs disabled:opacity-30"
              >
                +25p
              </button>
              {done && (
                <span className="text-xs font-medium text-green-500">
                  Finished ✓
                </span>
              )}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <select
              aria-label="Status"
              value={book.status}
              onChange={(e) => patch("status", e.target.value)}
              className={selectClasses}
            >
              {BOOK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOOK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              aria-label="Rating"
              value={book.rating ?? ""}
              onChange={(e) => patch("rating", e.target.value)}
              className={selectClasses}
            >
              <option value="">Rate</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}/10
                </option>
              ))}
            </select>
            <form
              action={deleteBook}
              onSubmit={(e) => {
                if (!confirm(`Delete "${book.title}"?`)) e.preventDefault();
              }}
              className="ml-auto"
            >
              <input type="hidden" name="id" value={book.id} />
              <button
                type="submit"
                className="rounded-lg px-2 py-1.5 text-sm text-red-500 transition hover:bg-red-950/60"
              >
                Delete
              </button>
            </form>
          </div>
          {state.error && <p className="text-sm text-red-500">{state.error}</p>}
        </div>
      </div>
    </div>
  );
}

export function BooksClient({ books }: { books: BookDTO[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <BookSearch />

      {books.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          No books yet. Search above to add your first.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
          {books.map((book, index) => (
            <Fragment key={book.id}>
              <li
                className="card-enter"
                style={{ "--i": index } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedId(book.id === selectedId ? null : book.id)
                  }
                  aria-expanded={book.id === selectedId}
                  aria-label={`Manage ${book.title}`}
                  className="relative w-full text-left transition duration-200 ease-out hover:scale-[1.04]"
                >
                  <Cover
                    coverUrl={book.coverUrl}
                    title={book.title}
                    size={160}
                  />
                  {book.rating !== null && book.rating >= 8 && (
                    <span className="absolute top-1 right-1 text-sm text-amber-400 drop-shadow">
                      ★
                    </span>
                  )}
                </button>
                <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                  {book.title}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[book.status]}`}
                  />
                  {BOOK_STATUS_LABELS[book.status]}
                </p>
              </li>
              {book.id === selectedId && (
                <li className="pop-enter col-span-full pb-2">
                  <BookPanel book={book} onClose={() => setSelectedId(null)} />
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
