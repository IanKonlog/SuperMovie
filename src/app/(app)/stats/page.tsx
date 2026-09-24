import Link from "next/link";
import { PosterRow } from "@/modules/media/components/poster-row";
import { db } from "@/lib/db";
import { ShareButton } from "@/modules/media/components/share-button";
import { getSeasonsByItemId, getStatsItems } from "@/modules/media/queries";
import { fetchRuntimeMinutes } from "@/modules/tmdb/queries";
import { titleHref } from "@/modules/tmdb/links";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your stats — SuperMovie" };

function Bar({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted">
          {value}
          {hint ? ` ${hint}` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function relativeDay(date: Date): string {
  const days = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toISOString().slice(0, 10);
}

export default async function StatsPage() {
  const [items, seasonsByItem, activity, share] = await Promise.all([
    getStatsItems(),
    getSeasonsByItemId(),
    db.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, message: true, createdAt: true },
    }),
    db.shareToken.findFirst({ select: { token: true } }),
  ]);
  const shareToken = share ? `/s/${share.token}` : null;

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
    const score = item.rating as number;
    ratingCounts.set(score, (ratingCounts.get(score) ?? 0) + 1);
  }

  const topRated = items
    .filter((i) => i.rating !== null && i.rating >= 8 && i.tmdbId !== null)
    .sort((a, b) => (b.rating as number) - (a.rating as number))
    .slice(0, 10);

  const statCard =
    "rounded-xl border border-line bg-surface p-4 flex flex-col gap-1";

  return (
    <div className="page-enter flex flex-col gap-8">
      <h1 className="text-2xl font-extrabold">Your stats</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={statCard}>
          <span className="text-3xl font-extrabold text-accent">
            {items.length}
          </span>
          <span className="text-xs text-muted">titles tracked</span>
        </div>
        <div className={statCard}>
          <span className="text-3xl font-extrabold text-accent">
            {completed.length}
          </span>
          <span className="text-xs text-muted">completed</span>
        </div>
        <div className={statCard}>
          <span className="text-3xl font-extrabold text-accent">
            {watching.length}
          </span>
          <span className="text-xs text-muted">watching now</span>
        </div>
        <div className={statCard}>
          <span className="text-3xl font-extrabold text-accent">
            {hoursWatched}
          </span>
          <span className="text-xs text-muted">hours watched</span>
        </div>
      </div>

      {topGenres.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Genres you finish</h2>
          <div className="flex flex-col gap-2.5">
            {topGenres.map(([genre, count]) => (
              <Bar
                key={genre}
                label={genre}
                value={count}
                max={topGenres[0][1]}
                hint="completed"
              />
            ))}
          </div>
        </section>
      )}

      {ratingCounts.size > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">How you rate</h2>
          <div className="flex flex-col gap-2.5">
            {[...ratingCounts.entries()]
              .sort((a, b) => b[0] - a[0])
              .map(([score, count]) => (
                <Bar
                  key={score}
                  label={`${score}/10`}
                  value={count}
                  max={Math.max(...ratingCounts.values())}
                  hint="titles"
                />
              ))}
          </div>
        </section>
      )}

      {decades.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Eras you finish</h2>
          <div className="flex flex-col gap-2.5">
            {decades.map(([decade, count]) => (
              <Bar
                key={decade}
                label={decade}
                value={count}
                max={Math.max(...decades.map(([, c]) => c))}
                hint="completed"
              />
            ))}
          </div>
        </section>
      )}

      {topRated.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Your hall of fame</h2>
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

      {activity.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Recent activity</h2>
          <ol className="flex flex-col gap-2">
            {activity.map((event) => (
              <li
                key={event.id}
                className="flex items-baseline justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              >
                <span>{event.message}</span>
                <span className="shrink-0 text-xs text-muted">
                  {relativeDay(event.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Share your taste</h2>
        <p className="text-sm text-muted">
          A public, read-only wall of your top-rated titles and genre profile.
        </p>
        <ShareButton activeToken={shareToken} />
      </section>

      <Link
        href="/library"
        className="self-start text-sm text-muted underline transition hover:text-foreground"
      >
        ← Back to library
      </Link>
    </div>
  );
}
