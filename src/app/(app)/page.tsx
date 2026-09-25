import Link from "next/link";
import { CurrentlyWatching } from "@/modules/media/components/currently-watching";
import { PosterRow } from "@/modules/media/components/poster-row";
import { RandomPick } from "@/modules/media/components/random-pick";
import {
  notifyAiringEpisodes,
  notifyStaleWatching,
} from "@/modules/media/actions";
import { GoalsSection } from "@/modules/goals/components/goals-section";
import { MoodBrowse } from "@/modules/tmdb/components/mood-browse";
import { GenreProfile } from "@/modules/media/components/genre-profile";
import {
  getGenreProfile,
  getHiddenRecommendationKeys,
  getLibraryTmdbKeys,
  getRecommendationSources,
  getSeasonsByItemId,
  getWantToWatch,
  listMediaItems,
} from "@/modules/media/queries";
import {
  fetchNextEpisode,
  fetchTrending,
  getRecommendations,
} from "@/modules/tmdb/queries";
import { titleHref } from "@/modules/tmdb/links";
import {
  HeroCarousel,
  type HeroSlide,
} from "@/modules/tmdb/components/hero-carousel";
import { RecommendationsSection } from "@/modules/tmdb/components/recommendations-section";
import { TrendingSection } from "@/modules/tmdb/components/trending-section";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function airingWindow() {
  const now = Date.now();
  return {
    today: new Date(now).toISOString().slice(0, 10),
    tomorrow: new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    horizon: new Date(now + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const genreParam = (first(params.genre) ?? "").trim().slice(0, 60);
  const genre = genreParam || undefined;
  const matchesGenre = (genres: string[]) =>
    genre === undefined || genres.includes(genre);
  const [
    watching,
    genreProfile,
    sources,
    libraryKeys,
    seasonsByItem,
    hiddenKeys,
    wantToWatch,
  ] = await Promise.all([
    listMediaItems({ status: "WATCHING" }),
    getGenreProfile(),
    getRecommendationSources(),
    getLibraryTmdbKeys(),
    getSeasonsByItemId(),
    getHiddenRecommendationKeys(),
    getWantToWatch(),
  ]);

  const returningSoon = (
    await Promise.all(
      watching
        .filter((item) => item.tmdbId !== null)
        .map((item) =>
          fetchNextEpisode(item.tmdbId as number)
            .then((next) => ({ item, next }))
            .catch(() => ({ item, next: null })),
        ),
    )
  ).filter(({ next }) => {
    if (next?.airDate === null || next?.airDate === undefined) return false;
    const { today, horizon } = airingWindow();
    return next.airDate >= today && next.airDate <= horizon;
  });

  const watchingFiltered = watching.filter((item) => matchesGenre(item.genres));

  const seasonsRecord = Object.fromEntries(seasonsByItem);

  const [trendingMovies, trendingSeries, recommendations] = await Promise.all([
    fetchTrending("MOVIE").catch(() => []),
    fetchTrending("SERIES").catch(() => []),
    sources.length > 0
      ? getRecommendations(
          sources.map((s) => ({
            tmdbId: s.tmdbId,
            type: s.type,
            rating: s.rating,
            title: s.title,
          })),
          [...libraryKeys, ...hiddenKeys],
        ).catch(() => [])
      : Promise.resolve([]),
  ]);

  const trendingMoviesFiltered = trendingMovies.filter((item) =>
    matchesGenre(item.genres),
  );
  const trendingSeriesFiltered = trendingSeries.filter((item) =>
    matchesGenre(item.genres),
  );
  const recommendationsFiltered = recommendations.filter((item) =>
    matchesGenre(item.genres),
  );

  const genreCounts = new Map<string, number>();
  for (const item of [
    ...trendingMovies,
    ...trendingSeries,
    ...recommendations,
    ...watching,
  ]) {
    for (const name of item.genres) {
      genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
    }
  }
  const genreChips = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  if (returningSoon.length > 0) {
    const { today, tomorrow } = airingWindow();
    await notifyAiringEpisodes(
      returningSoon
        .filter(
          ({ next }) => next?.airDate === today || next?.airDate === tomorrow,
        )
        .map(({ item, next }) => ({
          key: `${item.type}:${item.tmdbId}:${next?.airDate}:${next?.seasonNumber}:${next?.episodeNumber}`,
          title: item.title,
          detail: `S${next?.seasonNumber}E${next?.episodeNumber} airs ${next?.airDate}`,
        })),
    ).catch(() => undefined);
  }

  await notifyStaleWatching().catch(() => undefined);

  const featured: HeroSlide[] = [];
  const maxRows = Math.max(trendingMovies.length, trendingSeries.length);
  for (let i = 0; i < maxRows && featured.length < 5; i++) {
    const movie = trendingMovies[i];
    const series = trendingSeries[i];
    if (movie) {
      featured.push({
        item: movie,
        type: "MOVIE",
        inLibrary: libraryKeys.includes(`MOVIE:${movie.tmdbId}`),
      });
    }
    if (series && featured.length < 5) {
      featured.push({
        item: series,
        type: "SERIES",
        inLibrary: libraryKeys.includes(`SERIES:${series.tmdbId}`),
      });
    }
  }

  return (
    <div className="page-enter flex flex-col gap-7">
      <HeroCarousel slides={featured} />

      <div className="flex flex-wrap items-center gap-2">
        <RandomPick items={wantToWatch} />
        {genreChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={genre ? "/" : "#"}
              className={`rounded-full px-3 py-1 text-xs transition ${
                genre === undefined
                  ? "bg-accent font-medium text-background"
                  : "border border-line text-muted hover:bg-surface-2"
              }`}
            >
              All genres
            </Link>
            {genreChips.map(([name, count]) => (
              <Link
                key={name}
                href={
                  genre === name ? "/" : `/?genre=${encodeURIComponent(name)}`
                }
                className={`rounded-full px-3 py-1 text-xs transition ${
                  genre === name
                    ? "bg-accent font-medium text-background"
                    : "border border-line text-muted hover:bg-surface-2"
                }`}
              >
                {name} ({count})
              </Link>
            ))}
          </div>
        )}
      </div>

      <MoodBrowse genres={genreChips.slice(0, 8).map(([name]) => name)} />

      {returningSoon.length > 0 && (
        <section aria-label="Returning soon" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Returning soon</h2>
          <PosterRow
            items={returningSoon.map(({ item, next }) => ({
              key: item.id,
              posterUrl: item.posterUrl,
              title: item.title,
              badge: `S${next?.seasonNumber}E${next?.episodeNumber} · ${next?.airDate}`,
              href:
                item.tmdbId !== null
                  ? titleHref(item.type, item.tmdbId)
                  : undefined,
            }))}
          />
        </section>
      )}

      <CurrentlyWatching
        items={watchingFiltered}
        seasonsByItem={seasonsRecord}
      />

      <GoalsSection year={new Date().getFullYear()} />

      <TrendingSection
        movies={trendingMoviesFiltered}
        series={trendingSeriesFiltered}
      />

      {recommendationsFiltered.length > 0 ? (
        <RecommendationsSection recommendations={recommendationsFiltered} />
      ) : (
        <p className="text-sm text-muted">
          {genre
            ? "None of your recommended titles match this genre."
            : "Rate a few titles 7 or higher and recommendations will show up here."}
        </p>
      )}

      <GenreProfile profile={genreProfile} />
    </div>
  );
}
