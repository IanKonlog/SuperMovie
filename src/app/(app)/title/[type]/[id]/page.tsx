import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  WATCH_STATUS_LABELS,
  type MediaTypeValue,
} from "@/modules/media/constants";
import { getLibraryEntryForTitle } from "@/modules/media/queries";
import { ReviewCard } from "./review-card";
import { TitleAddButton } from "@/modules/tmdb/components/title-add-button";
import {
  fetchSeasonVideos,
  fetchSimilar,
  getTitlePage,
} from "@/modules/tmdb/queries";
import { Poster } from "@/modules/media/components/poster";
import { personHref } from "@/modules/tmdb/links";
import { titleHref } from "@/modules/tmdb/links";
import { PosterRow } from "@/modules/media/components/poster-row";
import { TitleVideos } from "@/modules/tmdb/components/title-videos";
import { TrailerPlayer } from "@/modules/tmdb/components/trailer-player";
import type { QuickAddItem } from "@/modules/media/components/quick-add";
import type { TitleVideo } from "@/modules/tmdb/types";

export const dynamic = "force-dynamic";

type Params = { type: string; id: string };

function parseParams(params: Params): {
  type: MediaTypeValue;
  tmdbId: number;
} | null {
  if (params.type !== "movie" && params.type !== "tv") return null;
  const tmdbId = Number(params.id);
  if (!Number.isInteger(tmdbId) || tmdbId < 1 || tmdbId > 100_000_000) {
    return null;
  }
  return { type: params.type === "movie" ? "MOVIE" : "SERIES", tmdbId };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const parsed = parseParams(await params);
  if (!parsed) return {};
  const title = await getTitlePage(parsed.type, parsed.tmdbId).catch(
    () => null,
  );
  return title ? { title: `${title.title} — SuperMovie` } : {};
}

export default async function TitlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const parsed = parseParams(await params);
  if (!parsed) notFound();

  const title = await getTitlePage(parsed.type, parsed.tmdbId).catch(
    () => null,
  );
  if (!title) notFound();

  const libraryEntry = await getLibraryEntryForTitle(
    parsed.tmdbId,
    parsed.type,
  );
  const similar = await fetchSimilar(parsed.type, parsed.tmdbId).catch(
    () => [],
  );
  const typeLabel = title.type === "MOVIE" ? "Movie" : "Series";
  const addable: QuickAddItem = {
    title: title.title,
    type: title.type,
    tmdbId: title.tmdbId,
    posterUrl: title.posterUrl,
    backdropUrl: title.backdropUrl,
    overview: title.overview || null,
    releaseDate: title.releaseDate,
    voteAverage: title.voteAverage > 0 ? title.voteAverage : null,
    genres: title.genres,
  };

  return (
    <div className="page-enter flex flex-col gap-10">
      {/* Hero */}
      <div className="relative -mx-4 -mt-6 sm:-mx-8 lg:-mx-12">
        <div className="relative h-[440px] lg:h-[540px]">
          {title.backdropUrl && (
            <Image
              src={title.backdropUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-top"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/40 to-transparent" />

          <div className="absolute bottom-0 left-0 flex w-full items-end gap-4 p-5 sm:gap-6 sm:p-10">
            {title.posterUrl && (
              <div className="hidden w-44 shrink-0 overflow-hidden rounded-xl shadow-2xl md:block">
                <Image
                  src={title.posterUrl}
                  alt={`Poster for ${title.title}`}
                  width={220}
                  height={330}
                  className="h-auto w-full"
                  unoptimized
                />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
              <h1 className="text-3xl font-extrabold drop-shadow-lg sm:text-4xl lg:text-5xl">
                {title.title}
              </h1>
              {title.tagline && (
                <p className="text-sm font-medium italic text-muted">
                  {title.tagline}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-green-500">
                  {Math.round(title.voteAverage * 10)}% match
                </span>
                {title.releaseDate && (
                  <span className="text-muted">
                    {title.releaseDate.slice(0, 4)}
                  </span>
                )}
                <span className="text-muted">{typeLabel}</span>
                {title.runtimeMinutes && (
                  <span className="text-muted">{title.runtimeMinutes} min</span>
                )}
                {title.numberOfSeasons && (
                  <span className="text-muted">
                    {title.numberOfSeasons} season
                    {title.numberOfSeasons === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {title.genres.length > 0 && (
                <p className="text-xs text-muted">{title.genres.join(" · ")}</p>
              )}
              {title.overview && (
                <p className="max-w-3xl text-sm text-foreground/80 sm:text-base">
                  {title.overview}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {libraryEntry ? (
                  <>
                    <span className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium">
                      {WATCH_STATUS_LABELS[libraryEntry.status]}
                      {libraryEntry.rating !== null &&
                        ` · ${libraryEntry.rating}/10`}
                    </span>
                    <Link
                      href="/library"
                      className="rounded-md border border-line px-4 py-2 text-sm transition hover:bg-surface-2"
                    >
                      Manage in library
                    </Link>
                  </>
                ) : (
                  <TitleAddButton item={addable} />
                )}
                {title.youtubeKey && (
                  <a
                    href={`https://youtu.be/${title.youtubeKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-line px-4 py-2 text-sm transition hover:bg-surface-2"
                  >
                    ▶ Trailer
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collection */}
      {title.collection && title.collection.parts.length > 1 && (
        <section
          aria-label={`Collection: ${title.collection.name}`}
          className="card-enter flex flex-col gap-3"
        >
          <h2 className="text-lg font-bold">
            From <span className="text-accent">{title.collection.name}</span>
          </h2>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
            {title.collection.parts.map((part) => (
              <Link
                key={`${part.tmdbId}`}
                href={`/title/movie/${part.tmdbId}`}
                className={`w-32 shrink-0 transition duration-200 ease-out ${
                  part.tmdbId === title.tmdbId
                    ? "opacity-100"
                    : "hover:scale-105 hover:drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
                }`}
                aria-current={part.tmdbId === title.tmdbId ? "true" : undefined}
              >
                <div className="relative">
                  <Poster
                    posterUrl={part.posterUrl}
                    title={part.title}
                    size={128}
                  />
                  {part.tmdbId === title.tmdbId && (
                    <span className="absolute inset-0 rounded-lg ring-2 ring-accent" />
                  )}
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                  {part.title}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  {part.voteAverage > 0 && (
                    <>
                      <span className="text-amber-400">★</span>
                      <span>{part.voteAverage.toFixed(1)}</span>
                      {part.releaseDate && (
                        <span>· {part.releaseDate.slice(0, 4)}</span>
                      )}
                    </>
                  )}
                  {part.voteAverage === 0 && part.releaseDate && (
                    <span>{part.releaseDate.slice(0, 4)}</span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cast */}
      {title.cast.length > 0 && (
        <section aria-label="Cast" className="card-enter flex flex-col gap-3">
          <h2 className="text-lg font-bold">Cast</h2>
          <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
            {title.cast.map((member, i) => (
              <Link
                key={`${member.name}-${i}`}
                href={personHref(member.personId)}
                className="w-28 shrink-0 text-center transition duration-200 hover:scale-105"
              >
                <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl border border-line bg-surface-2">
                  {member.profileUrl ? (
                    <Image
                      src={member.profileUrl}
                      alt={`Photo of ${member.name}`}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-muted">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-medium">
                  {member.name}
                </p>
                <p className="line-clamp-1 text-xs text-muted">
                  {member.character}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main + sidebar */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_auto_auto_1fr]">
        <div
          className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-1"
          style={{ minWidth: 0 }}
        >
          {title.type === "SERIES" ? (
            <SeriesVideosSection
              tmdbId={title.tmdbId}
              numberOfSeasons={title.numberOfSeasons}
              seriesVideos={title.videos}
            />
          ) : (
            title.youtubeKey && (
              <section
                id="trailer"
                aria-label="Trailer"
                className="card-enter flex flex-col gap-3"
              >
                <h2 className="text-lg font-bold">Trailer</h2>
                <TrailerPlayer
                  youtubeKey={title.youtubeKey}
                  title={`${title.title} trailer`}
                />
              </section>
            )
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start lg:sticky lg:top-20">
          {title.nextEpisode && (
            <section
              aria-label="Next up"
              className="card-enter rounded-xl border border-accent/40 bg-surface p-4"
            >
              <h2 className="mb-2 text-base font-bold">Next up</h2>
              <p className="text-sm">
                {title.nextEpisode.isPremiere ? (
                  <>
                    <span className="font-semibold text-accent">
                      Season {title.nextEpisode.seasonNumber}
                    </span>{" "}
                    premieres
                  </>
                ) : (
                  <>
                    Next episode:{" "}
                    <span className="font-semibold">
                      S{title.nextEpisode.seasonNumber}E
                      {title.nextEpisode.episodeNumber}
                    </span>
                  </>
                )}
              </p>
              {title.nextEpisode.name !== "Episode" && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                  {title.nextEpisode.name}
                </p>
              )}
              {title.nextEpisode.airDate && (
                <p className="mt-2 text-xs text-muted">
                  {new Date(title.nextEpisode.airDate).toLocaleDateString(
                    "en-US",
                    { dateStyle: "medium" },
                  )}
                  {countdownLabel(title.nextEpisode.airDate)}
                </p>
              )}
            </section>
          )}
          <section
            aria-label="Where to watch"
            className="card-enter rounded-xl border border-line bg-surface p-4"
          >
            <h2 className="mb-3 text-base font-bold">Where to watch</h2>
            {title.providers.stream.length === 0 &&
            title.providers.rent.length === 0 &&
            title.providers.buy.length === 0 ? (
              <p className="text-sm text-muted">
                No streaming information yet
                {title.status && title.status !== "Released"
                  ? " — this title hasn't been released."
                  : " for your region."}
              </p>
            ) : (
              <>
                {(
                  [
                    ["Stream", title.providers.stream],
                    ["Rent", title.providers.rent],
                    ["Buy", title.providers.buy],
                  ] as const
                ).map(([label, providers]) =>
                  providers.length > 0 ? (
                    <div key={label} className="mb-4 last:mb-0">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                        {label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {providers.map((provider) => {
                          const inner = provider.logoUrl ? (
                            <Image
                              src={provider.logoUrl}
                              alt={provider.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="text-[10px] text-muted">
                              {provider.name.slice(0, 3)}
                            </span>
                          );
                          return title.justWatchUrl ? (
                            <a
                              key={provider.name}
                              href={title.justWatchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Watch ${title.title} on ${provider.name} (opens JustWatch in a new tab)`}
                              title={provider.name}
                              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2 transition hover:scale-105 hover:border-accent"
                            >
                              {inner}
                            </a>
                          ) : (
                            <span
                              key={provider.name}
                              title={provider.name}
                              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2"
                            >
                              {inner}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null,
                )}
                <p className="mt-3 text-[11px] text-muted">
                  Region: United States ·{" "}
                  {title.justWatchUrl ? (
                    <a
                      href={title.justWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline transition hover:text-foreground"
                    >
                      streaming info via JustWatch
                    </a>
                  ) : (
                    "streaming info via JustWatch"
                  )}
                </p>
              </>
            )}
          </section>

          <section
            aria-label="Details"
            className="card-enter rounded-xl border border-line bg-surface p-4"
          >
            <h2 className="mb-3 text-base font-bold">Details</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {(
                [
                  ["Type", typeLabel],
                  [
                    "Released",
                    title.releaseDate
                      ? new Date(title.releaseDate).toLocaleDateString(
                          "en-US",
                          {
                            dateStyle: "medium",
                          },
                        )
                      : null,
                  ],
                  ["Status", title.status],
                  [
                    "Runtime",
                    title.runtimeMinutes
                      ? `${Math.floor(title.runtimeMinutes / 60)}h ${title.runtimeMinutes % 60}m`
                      : null,
                  ],
                  [
                    "Seasons",
                    title.numberOfSeasons
                      ? String(title.numberOfSeasons)
                      : null,
                  ],
                  ["TMDB score", `${title.voteAverage.toFixed(1)}/10`],
                  ["Genres", title.genres.join(", ") || null],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="shrink-0 text-muted">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </section>
        </aside>
        {similar.length > 0 && (
          <section
            aria-label="More like this"
            className="card-enter flex min-w-0 flex-col gap-2 lg:col-start-1 lg:row-start-2"
          >
            <h2 className="text-lg font-bold">More like this</h2>
            <PosterRow
              items={similar.map((item) => ({
                key: `${title.type}:${item.tmdbId}`,
                posterUrl: item.posterUrl,
                title: item.title,
                rating: item.voteAverage > 0 ? item.voteAverage : undefined,
                year: item.releaseDate?.slice(0, 4),
                href: titleHref(title.type, item.tmdbId),
              }))}
            />
          </section>
        )}

        {title.reviews.length > 0 && (
          <section
            aria-label="Reviews"
            className="card-enter flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-3"
          >
            <h2 className="text-lg font-bold">Reviews</h2>
            <div className="columns-1 gap-3 xl:columns-2">
              {title.reviews.map((review, i) => (
                <ReviewCard
                  key={`${review.author}-${i}`}
                  author={review.author}
                  createdAt={review.createdAt}
                  rating={review.rating}
                  content={review.content}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

type TitleVideosProps = {
  seriesVideos: TitleVideo[];
};

async function SeriesVideosSection({
  tmdbId,
  numberOfSeasons,
  seriesVideos,
}: {
  tmdbId: number;
  numberOfSeasons: number | null;
  seriesVideos: TitleVideosProps["seriesVideos"];
}) {
  const seasonCount = numberOfSeasons ?? 0;
  const seasons =
    seasonCount > 0
      ? await Promise.all(
          Array.from({ length: seasonCount }, (_, i) =>
            fetchSeasonVideos(tmdbId, i + 1)
              .then((videos) => ({ seasonNumber: i + 1, videos }))
              .catch(() => ({ seasonNumber: i + 1, videos: [] })),
          ),
        )
      : [];

  return (
    <div className="card-enter">
      <TitleVideos seriesVideos={seriesVideos} seasons={seasons} />
    </div>
  );
}

function countdownLabel(airDate: string): string {
  const days = Math.ceil(
    (new Date(airDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return " · today";
  if (days === 1) return " · tomorrow";
  if (days <= 14) return ` · in ${days} days`;
  return "";
}
