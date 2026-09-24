import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getStatsItems } from "@/modules/media/queries";
import { getGenreProfile } from "@/modules/media/queries";
import { PosterRow } from "@/modules/media/components/poster-row";
import { titleHref } from "@/modules/tmdb/links";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  const valid = await db.shareToken.findUnique({ where: { token } });
  if (!valid) notFound();

  const [items, genreProfile] = await Promise.all([
    getStatsItems(),
    getGenreProfile(),
  ]);

  const completed = items.filter((i) => i.status === "COMPLETED").length;
  const rated = items.filter((i) => i.rating !== null).length;
  const topRated = items
    .filter((i) => i.rating !== null && i.tmdbId !== null)
    .sort((a, b) => (b.rating as number) - (a.rating as number))
    .slice(0, 12);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <span className="text-lg font-black tracking-tighter text-accent uppercase">
          SuperMovie
        </span>
        <h1 className="text-3xl font-extrabold">A shared library</h1>
        <p className="text-sm text-muted">
          {items.length} titles · {completed} completed · {rated} rated
        </p>
      </header>

      {genreProfile.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {genreProfile.map(({ genre, avg }) => (
            <span
              key={genre}
              className="rounded-full border border-line bg-surface px-3 py-1 text-xs"
            >
              {genre} <strong>{avg.toFixed(1)}</strong>
            </span>
          ))}
        </div>
      )}

      {topRated.length > 0 ? (
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
      ) : (
        <p className="text-sm text-muted">Nothing rated yet.</p>
      )}

      <footer className="mt-auto text-xs text-muted">
        Read-only view · powered by SuperMovie
      </footer>
    </main>
  );
}
