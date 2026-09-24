import { ImportForm } from "@/modules/media/components/import-form";
import { LibrarySection } from "@/modules/media/components/library-section";
import { Pagination } from "@/modules/media/components/pagination";
import {
  isMediaType,
  isWatchStatus,
  WATCH_STATUSES,
  WATCH_STATUS_LABELS,
} from "@/modules/media/constants";
import {
  getLibraryGenreCounts,
  getMediaStats,
  getSeasonsByItemId,
  listLibraryPage,
} from "@/modules/media/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const statusParam = first(params.status);
  const typeParam = first(params.type);
  const qParam = (first(params.q) ?? "").trim().slice(0, 100);
  const favoritesOnly = first(params.fav) === "1";
  const genreParam = (first(params.genre) ?? "").trim().slice(0, 60);
  const genre = genreParam || undefined;
  const status = isWatchStatus(statusParam) ? statusParam : undefined;
  const type = isMediaType(typeParam) ? typeParam : undefined;
  const q = qParam || undefined;
  const page = Math.max(1, Number(first(params.page)) || 1);

  const [library, stats, seasonsByItem, genreCounts] = await Promise.all([
    listLibraryPage({ status, type, q, genre, favoritesOnly, page }),
    getMediaStats(),
    getSeasonsByItemId(),
    getLibraryGenreCounts(),
  ]);

  const seasonsRecord = Object.fromEntries(seasonsByItem);

  function href(overrides: {
    status?: string;
    type?: string;
    q?: string;
    genre?: string;
    fav?: string;
    page?: number;
  }) {
    const qs = new URLSearchParams();
    const s = overrides.status !== undefined ? overrides.status : status;
    const t = overrides.type !== undefined ? overrides.type : type;
    const query = overrides.q !== undefined ? overrides.q : q;
    const g = overrides.genre !== undefined ? overrides.genre : genre;
    const fav =
      overrides.fav !== undefined ? overrides.fav : favoritesOnly ? "1" : "";
    if (s) qs.set("status", s);
    if (t) qs.set("type", t);
    if (query) qs.set("q", query);
    if (g) qs.set("genre", g);
    if (fav) qs.set("fav", fav);
    if (overrides.page && overrides.page > 1)
      qs.set("page", String(overrides.page));
    const encoded = qs.toString();
    return encoded ? `/library?${encoded}` : "/library";
  }

  const tabClasses = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition ${
      active
        ? "bg-foreground font-medium text-background"
        : "border border-line text-muted hover:bg-surface-2"
    }`;

  return (
    <div className="page-enter flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">
        My library{" "}
        <span className="text-base font-normal text-muted">
          {library.total} title{library.total === 1 ? "" : "s"}
        </span>
      </h1>

      <form action="/library" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {type && <input type="hidden" name="type" value={type} />}
        {favoritesOnly && <input type="hidden" name="fav" value="1" />}
        <input
          name="q"
          defaultValue={q ?? ""}
          maxLength={100}
          placeholder="Search your library…"
          aria-label="Search your library"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-muted"
        />
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-2 text-sm transition hover:bg-surface-2"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={href({ status: "", page: 1 })}
          className={tabClasses(!status)}
        >
          All ({stats.total})
        </Link>
        {WATCH_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s, page: 1 })}
            className={tabClasses(status === s)}
          >
            {WATCH_STATUS_LABELS[s]} ({stats.counts.get(s) ?? 0})
          </Link>
        ))}
        <Link
          href={href({ fav: favoritesOnly ? "" : "1", page: 1 })}
          className={tabClasses(favoritesOnly)}
          aria-pressed={favoritesOnly}
        >
          ★ Favorites
        </Link>

        <div className="flex w-full flex-wrap gap-2 pt-1">
          <Link
            href={href({ genre: "", page: 1 })}
            className={`rounded-full px-3 py-1 text-xs transition ${
              genre === undefined
                ? "bg-accent font-medium text-white"
                : "border border-line text-muted hover:bg-surface-2"
            }`}
          >
            All genres
          </Link>
          {genreCounts.slice(0, 12).map(({ genre: name, count }) => (
            <Link
              key={name}
              href={href({ genre: name, page: 1 })}
              className={`rounded-full px-3 py-1 text-xs transition ${
                genre === name
                  ? "bg-accent font-medium text-white"
                  : "border border-line text-muted hover:bg-surface-2"
              }`}
            >
              {name} ({count})
            </Link>
          ))}
        </div>

        <div className="ml-auto flex gap-2 text-sm">
          <Link
            href={href({ type: "", page: 1 })}
            className={type ? "text-muted hover:underline" : "font-bold"}
          >
            Everything
          </Link>
          <span className="text-line">|</span>
          <Link
            href={href({ type: "MOVIE", page: 1 })}
            className={
              type === "MOVIE" ? "font-bold" : "text-muted hover:underline"
            }
          >
            Movies
          </Link>
          <span className="text-line">|</span>
          <Link
            href={href({ type: "SERIES", page: 1 })}
            className={
              type === "SERIES" ? "font-bold" : "text-muted hover:underline"
            }
          >
            Series
          </Link>
        </div>
      </div>

      <LibrarySection
        page={library.page}
        items={library.items}
        seasonsByItem={seasonsRecord}
        emptyMessage={
          q
            ? `No matches for "${q}".`
            : "Nothing here yet. Use the search in the top bar to add your first movie or series."
        }
        pagination={
          <Pagination
            page={library.page}
            pageCount={library.pageCount}
            hrefFor={(p) => href({ page: p })}
          />
        }
      />

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <a
          href="/api/export"
          className="self-start text-sm text-muted underline transition hover:text-foreground"
        >
          Export library as JSON
        </a>
        <ImportForm />
      </div>
    </div>
  );
}
