import Link from "next/link";
import { PosterRow } from "@/modules/media/components/poster-row";
import { ShareButton } from "@/modules/media/components/share-button";
import {
  getRecentActivity,
  getSeasonsByItemId,
  getShareToken,
  getStatsItems,
} from "@/modules/media/queries";
import { getBookStats } from "@/modules/books/queries";
import { fetchRuntimeMinutes } from "@/modules/tmdb/queries";
import { titleHref } from "@/modules/tmdb/links";
import {
  ActivityIcon,
  BookIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FilmIcon,
  ShareIcon,
} from "@/lib/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your stats — SuperMovie" };

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="flex flex-col justify-between gap-3 p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </span>
    </Card>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.max(Math.round((value / max) * 100), 4) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="line-clamp-1">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Histogram({ counts }: { counts: Map<number, number> }) {
  const max = Math.max(...counts.values(), 1);
  return (
    <div className="flex h-40 items-end gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
        const count = counts.get(score) ?? 0;
        const pct = Math.round((count / max) * 100);
        return (
          <div
            key={score}
            className="flex h-full flex-1 flex-col justify-end gap-1"
          >
            <span className="text-center font-mono text-[10px] tabular-nums text-muted">
              {count > 0 ? count : ""}
            </span>
            <div
              className={`rounded-t-sm ${count > 0 ? "bg-accent" : "bg-surface-2"}`}
              style={{ height: `${count > 0 ? Math.max(pct, 3) : 2}%` }}
            />
            <span className="text-center font-mono text-[10px] tabular-nums text-muted">
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function relativeDay(date: Date): string {
  const days = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toISOString().slice(0, 10);
}

export default async function StatsPage() {
  const [items, seasonsByItem, books, activity, shareToken] = await Promise.all(
    [
      getStatsItems(),
      getSeasonsByItemId(),
      getBookStats(),
      getRecentActivity(12),
      getShareToken(),
    ],
  );

  const completed = items.filter((i) => i.status === "COMPLETED");
  const watching = items.filter((i) => i.status === "WATCHING");
  const rated = items.filter((i) => i.rating !== null);

  // Hours watched: movies by runtime, series by episodes x avg length.
  const withTmdb = items.filter(
    (i) => i.tmdbId !== null && i.status !== "WANT_TO_WATCH",
  );
  const runtimes = await Promise.all(
    withTmdb.map((i) =>
      fetchRuntimeMinutes(i.type, i.tmdbId as number).catch(() => null),
    ),
  );
  let minutesWatched = 0;
  withTmdb.forEach((item, idx) => {
    const runtime = runtimes[idx];
    if (runtime === null) return;
    if (item.type === "MOVIE") {
      if (item.status === "COMPLETED") minutesWatched += runtime;
    } else {
      const seasons = seasonsByItem.get(item.id) ?? [];
      const episodes = seasons.reduce((sum, s) => sum + s.watchedCount, 0);
      minutesWatched += episodes * runtime;
    }
  });
  const hoursWatched = Math.round(minutesWatched / 60);

  const genreCounts = new Map<string, number>();
  for (const item of completed) {
    for (const genre of item.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const decadeCounts = new Map<string, number>();
  for (const item of completed) {
    if (!item.releaseDate) continue;
    const decade = `${item.releaseDate.slice(0, 3)}0s`;
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
  }
  const decades = [...decadeCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const ratingCounts = new Map<number, number>();
  for (const item of rated) {
    ratingCounts.set(
      item.rating as number,
      (ratingCounts.get(item.rating as number) ?? 0) + 1,
    );
  }
  const averageRating =
    rated.length > 0
      ? rated.reduce((sum, i) => sum + (i.rating as number), 0) / rated.length
      : null;

  const topRated = items
    .filter((i) => i.rating !== null && i.rating >= 8 && i.tmdbId !== null)
    .sort((a, b) => (b.rating as number) - (a.rating as number))
    .slice(0, 10);

  const bookSegments = [
    {
      label: "Finished",
      count: books.byStatus.get("FINISHED") ?? 0,
      tint: "bg-foreground",
    },
    {
      label: "Reading",
      count: books.byStatus.get("READING") ?? 0,
      tint: "bg-foreground/60",
    },
    {
      label: "Want to read",
      count: books.byStatus.get("WANT_TO_READ") ?? 0,
      tint: "bg-foreground/30",
    },
    {
      label: "Abandoned",
      count: books.byStatus.get("ABANDONED") ?? 0,
      tint: "bg-foreground/15",
    },
  ].filter((s) => s.count > 0);
  const segmentTotal = bookSegments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="page-enter flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your stats</h1>
        <p className="mt-1 text-sm text-muted">
          A live picture of everything you watch and read.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<FilmIcon />} label="Titles tracked" value={items.length} />
        <Kpi icon={<ClockIcon />} label="Hours watched" value={hoursWatched} />
        <Kpi
          icon={<CheckCircleIcon />}
          label="Completed"
          value={completed.length}
        />
        <Kpi icon={<EyeIcon />} label="Watching now" value={watching.length} />
        <Kpi
          icon={<BookIcon />}
          label="Books finished"
          value={books.byStatus.get("FINISHED") ?? 0}
        />
        <Kpi
          icon={<BookOpenIcon />}
          label="Pages read"
          value={books.pagesRead.toLocaleString("en-US")}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {ratingCounts.size > 0 && (
          <Card>
            <SectionHeader
              title="How you rate"
              subtitle={
                averageRating !== null
                  ? `average ${averageRating.toFixed(1)}/10 · ${rated.length} rated`
                  : undefined
              }
            />
            <Histogram counts={ratingCounts} />
          </Card>
        )}

        {topGenres.length > 0 && (
          <Card>
            <SectionHeader
              title="Genres you finish"
              subtitle={`${topGenres.length} of ${genreCounts.size}`}
            />
            <div className="flex flex-col gap-3">
              {topGenres.map(([genre, count]) => (
                <BarRow
                  key={genre}
                  label={genre}
                  value={count}
                  max={topGenres[0][1]}
                />
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {decades.length > 0 && (
          <Card>
            <SectionHeader title="Eras you finish" subtitle="by decade" />
            <div className="flex flex-wrap gap-2">
              {decades.map(([decade, count]) => (
                <span
                  key={decade}
                  className="rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs"
                >
                  {decade}{" "}
                  <span className="font-mono tabular-nums text-muted">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        )}

        {books.total > 0 && (
          <Card>
            <SectionHeader
              title="Books"
              subtitle={`${books.total} on the shelf`}
            />
            <div className="flex flex-col gap-4">
              {segmentTotal > 0 && (
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                  {bookSegments.map((segment) => (
                    <div
                      key={segment.label}
                      className={segment.tint}
                      style={{
                        width: `${(segment.count / segmentTotal) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              )}
              <dl className="flex flex-col gap-2 text-sm">
                {bookSegments.map((segment) => (
                  <div
                    key={segment.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <dt className="flex items-center gap-2 text-muted">
                      <span
                        className={`h-2 w-2 rounded-full ${segment.tint}`}
                      />
                      {segment.label}
                    </dt>
                    <dd className="font-mono text-xs tabular-nums">
                      {segment.count}
                    </dd>
                  </div>
                ))}
                {books.averageRating !== null && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Average rating</dt>
                    <dd className="font-mono text-xs tabular-nums">
                      {books.averageRating.toFixed(1)}/10
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>
        )}
      </div>

      {topRated.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Your hall of fame</h2>
          <PosterRow
            items={topRated.map((item) => ({
              key: item.id,
              posterUrl: item.posterUrl,
              title: item.title,
              badge: item.rating !== null ? `★ ${item.rating}` : undefined,
              href:
                item.tmdbId !== null
                  ? titleHref(item.type, item.tmdbId)
                  : undefined,
            }))}
          />
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        {activity.length > 0 && (
          <Card>
            <SectionHeader title="Recent activity" subtitle="latest 12" />
            <ol className="flex flex-col">
              {activity.map((event, index) => (
                <li
                  key={event.id}
                  className={`flex items-baseline gap-3 py-2 ${
                    index > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <ActivityIcon className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-muted" />
                  <span className="min-w-0 flex-1 text-sm">
                    {event.message}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {relativeDay(event.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-muted">
            <ShareIcon />
            <h2 className="text-sm font-medium text-foreground">
              Share your taste
            </h2>
          </div>
          <p className="text-sm text-muted">
            A public, read-only wall of your top-rated titles and genre profile.
          </p>
          <ShareButton activeToken={shareToken ? `/s/${shareToken}` : null} />
        </Card>
      </div>

      <Link
        href="/library"
        className="self-start text-sm text-muted underline transition hover:text-foreground"
      >
        ← Back to library
      </Link>
    </div>
  );
}
