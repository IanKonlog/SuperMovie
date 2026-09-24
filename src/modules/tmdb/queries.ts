const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const MAX_OVERVIEW = 2000;
const MAX_TITLE = 300;

export type { TmdbSearchResult } from "./types";

import type {
  PersonCredit,
  PersonDetails,
  Recommendation,
  RecommendationSource,
  TmdbSearchResult,
  TitleCastMember,
  TitleDetails,
  CollectionInfo,
  NextEpisode,
  TitleProvider,
  TitleReview,
  TitleVideo,
} from "./types";

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is not set (see .env.example)");
  }
  return key;
}

function tmdbHeaders(): HeadersInit {
  const key = apiKey();
  if (key.startsWith("eyJ")) {
    return { Authorization: `Bearer ${key}` };
  }
  return {};
}

function tmdbUrl(path: string, params: Record<string, string>): string {
  const url = new URL(TMDB_BASE + path);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  const key = apiKey();
  if (!key.startsWith("eyJ")) {
    url.searchParams.set("api_key", key);
  }
  return url.toString();
}

function boundedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function boundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function isoDateOrNull(value: unknown): string | null {
  const s = boundedString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function posterUrlOrNull(path: unknown): string | null {
  if (typeof path !== "string" || !/^\/[\w./-]{1,150}$/.test(path)) return null;
  return POSTER_BASE + path;
}

function backdropUrlOrNull(path: unknown): string | null {
  if (typeof path !== "string" || !/^\/[\w./-]{1,150}$/.test(path)) return null;
  return BACKDROP_BASE + path;
}

type RawResult = Record<string, unknown>;

const genreCache = new Map<"MOVIE" | "SERIES", Promise<Map<number, string>>>();

function genreNames(type: "MOVIE" | "SERIES"): Promise<Map<number, string>> {
  const cached = genreCache.get(type);
  if (cached) return cached;

  const promise = fetch(
    tmdbUrl(`/genre/${type === "MOVIE" ? "movie" : "tv"}/list`, {
      language: "en-US",
    }),
    { headers: tmdbHeaders(), signal: AbortSignal.timeout(8000) },
  )
    .then((res) => (res.ok ? res.json() : { genres: [] }))
    .then((data) => {
      const map = new Map<number, string>();
      const list = (data as { genres?: unknown }).genres;
      if (Array.isArray(list)) {
        for (const g of list as RawResult[]) {
          const id = boundedNumber(g.id, 0, 1_000_000);
          const name = boundedString(g.name, 60);
          if (id !== null && name) map.set(id, name);
        }
      }
      return map;
    })
    .catch(() => new Map<number, string>());

  genreCache.set(type, promise);
  return promise;
}

function parseResult(
  raw: RawResult,
  genres: Map<number, string>,
): TmdbSearchResult | null {
  const tmdbId = boundedNumber(raw.id, 1, 100_000_000);
  const title =
    boundedString(raw.title, MAX_TITLE) || boundedString(raw.name, MAX_TITLE);
  if (tmdbId === null || !title) return null;

  const genreIds = Array.isArray(raw.genre_ids) ? raw.genre_ids : [];
  const names: string[] = [];
  for (const id of genreIds) {
    const n = boundedNumber(id, 0, 1_000_000);
    if (n !== null && genres.has(n) && names.length < 8) {
      names.push(genres.get(n) as string);
    }
  }

  return {
    tmdbId,
    title,
    overview: boundedString(raw.overview, MAX_OVERVIEW),
    posterUrl: posterUrlOrNull(raw.poster_path),
    backdropUrl: backdropUrlOrNull(raw.backdrop_path),
    releaseDate: isoDateOrNull(raw.release_date ?? raw.first_air_date),
    voteAverage: boundedNumber(raw.vote_average, 0, 10) ?? 0,
    genres: names,
  };
}

export async function searchTmdb(
  query: string,
  type: "MOVIE" | "SERIES",
): Promise<TmdbSearchResult[]> {
  const [res, genres] = await Promise.all([
    fetch(
      tmdbUrl(type === "MOVIE" ? "/search/movie" : "/search/tv", {
        query,
        include_adult: "false",
        language: "en-US",
        page: "1",
      }),
      { headers: tmdbHeaders(), signal: AbortSignal.timeout(8000) },
    ),
    genreNames(type),
  ]);

  if (!res.ok) {
    throw new Error(`TMDB search failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as { results?: unknown };
  if (!Array.isArray(data.results)) return [];

  const parsed: TmdbSearchResult[] = [];
  for (const raw of data.results.slice(0, 12)) {
    if (raw === null || typeof raw !== "object") continue;
    const item = parseResult(raw as RawResult, genres);
    if (item) parsed.push(item);
  }
  return parsed;
}

const responseCache = new Map<
  string,
  { expiresAt: number; promise: Promise<unknown> }
>();

function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = responseCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.promise as Promise<T>;
  }
  const promise = load().catch((error: unknown) => {
    responseCache.delete(key);
    throw error;
  });
  responseCache.set(key, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
}

async function fetchTmdbList(
  path: string,
  type: "MOVIE" | "SERIES",
  take: number,
  page = 1,
): Promise<TmdbSearchResult[]> {
  const [res, genres] = await Promise.all([
    fetch(tmdbUrl(path, { language: "en-US", page: String(page) }), {
      headers: tmdbHeaders(),
      signal: AbortSignal.timeout(8000),
    }),
    genreNames(type),
  ]);
  if (!res.ok) {
    throw new Error(`TMDB request failed (HTTP ${res.status}) for ${path}`);
  }
  const data = (await res.json()) as { results?: unknown };
  if (!Array.isArray(data.results)) return [];

  const parsed: TmdbSearchResult[] = [];
  for (const raw of data.results) {
    if (parsed.length >= take) break;
    if (raw === null || typeof raw !== "object") continue;
    const item = parseResult(raw as RawResult, genres);
    if (item) parsed.push(item);
  }
  return parsed;
}

export const TRENDING_PAGE_SIZE = 20;

export function fetchTrending(
  type: "MOVIE" | "SERIES",
  page = 1,
): Promise<TmdbSearchResult[]> {
  return cached(`trending:${type}:${page}`, 3 * 60 * 60 * 1000, () =>
    fetchTmdbList(
      type === "MOVIE" ? "/trending/movie/week" : "/trending/tv/week",
      type,
      TRENDING_PAGE_SIZE,
      page,
    ),
  );
}

export type SeasonInfo = { seasonNumber: number; episodeCount: number };

export async function fetchSeriesSeasons(
  tmdbId: number,
): Promise<SeasonInfo[]> {
  return cached(`seasons:${tmdbId}`, 24 * 60 * 60 * 1000, async () => {
    const res = await fetch(tmdbUrl(`/tv/${tmdbId}`, { language: "en-US" }), {
      headers: tmdbHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`TMDB series details failed (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { seasons?: unknown };
    if (!Array.isArray(data.seasons)) return [];

    const seasons: SeasonInfo[] = [];
    for (const raw of data.seasons) {
      if (raw === null || typeof raw !== "object") continue;
      const record = raw as RawResult;
      const seasonNumber = boundedNumber(record.season_number, 0, 200);
      const episodeCount = boundedNumber(record.episode_count, 0, 500);
      // Skip specials (season 0) and empty seasons.
      if (
        seasonNumber === null ||
        episodeCount === null ||
        seasonNumber < 1 ||
        episodeCount < 1
      ) {
        continue;
      }
      seasons.push({ seasonNumber, episodeCount });
    }
    return seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
  });
}

const REC_TOP_RANKS = 5;
const REC_PER_SOURCE = 15;
const REC_MAX_RESULTS = 36;

function recWeight(rank: number): number {
  return rank < REC_TOP_RANKS ? REC_TOP_RANKS - rank : 1;
}

export async function getRecommendations(
  sources: RecommendationSource[],
  excludeKeys: string[],
  limit = REC_MAX_RESULTS,
): Promise<Recommendation[]> {
  if (sources.length === 0) return [];
  // TMDB ids are only unique per type: a movie and a series can share a numeric id.
  const exclude = new Set(excludeKeys);

  const settled = await Promise.allSettled(
    sources.map((source) =>
      cached(`rec:${source.type}:${source.tmdbId}`, 24 * 60 * 60 * 1000, () =>
        fetchTmdbList(
          source.type === "MOVIE"
            ? `/movie/${source.tmdbId}/recommendations`
            : `/tv/${source.tmdbId}/recommendations`,
          source.type,
          REC_PER_SOURCE,
        ),
      ),
    ),
  );

  const scored = new Map<
    string,
    {
      item: TmdbSearchResult;
      type: "MOVIE" | "SERIES";
      score: number;
      because: Set<string>;
    }
  >();

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status !== "fulfilled") continue;
    const source = sources[i];

    for (let rank = 0; rank < result.value.length; rank++) {
      const item = result.value[rank];
      const key = `${source.type}:${item.tmdbId}`;
      if (exclude.has(key)) continue;

      const entry = scored.get(key) ?? {
        item,
        type: source.type,
        score: 0,
        because: new Set<string>(),
      };
      entry.score += (source.rating / 10) * recWeight(rank);
      if (entry.because.size < 3) entry.because.add(source.title);
      scored.set(key, entry);
    }
  }

  const sorted = [...scored.values()].sort((a, b) => b.score - a.score);

  // Daily rotation: shuffle inside equal-score tiers so the shelf is fresh
  // each day without ever promoting weak matches over strong ones.
  const today = new Date().toISOString().slice(0, 10);
  let seed = 1779033703;
  for (let i = 0; i < today.length; i++) {
    seed = Math.imul(seed ^ today.charCodeAt(i), 3432918353);
  }
  const tiers: (typeof sorted)[] = [];
  for (const entry of sorted) {
    const bucket = Math.round(entry.score * 4) / 4;
    const last = tiers[tiers.length - 1];
    if (last && Math.round(last[0].score * 4) / 4 === bucket) {
      last.push(entry);
    } else {
      tiers.push([entry]);
    }
  }
  const rotated = tiers.flatMap((tier) => {
    if (tier.length < 2) return tier;
    const rand = () => {
      seed = Math.imul(seed ^ (seed >>> 15), seed | 1);
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61);
      return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = tier.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [tier[i], tier[j]] = [tier[j], tier[i]];
    }
    return tier;
  });

  return rotated.slice(0, limit).map(({ item, type, because }) => ({
    tmdbId: item.tmdbId,
    type,
    title: item.title,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    overview: item.overview || null,
    releaseDate: item.releaseDate,
    voteAverage: item.voteAverage,
    genres: item.genres,
    because: [...because],
  }));
}

const WATCH_REGION = "US";
const CAST_SIZE = 12;
const MAX_REVIEWS = 4;

function profileUrlOrNull(path: unknown): string | null {
  if (typeof path !== "string" || !/^\/[\w.-]{1,150}$/.test(path)) return null;
  return "https://image.tmdb.org/t/p/w185" + path;
}

function logoUrlOrNull(path: unknown): string | null {
  if (typeof path !== "string" || !/^\/[\w.-]{1,150}$/.test(path)) return null;
  return "https://image.tmdb.org/t/p/w92" + path;
}

let guestSession: { id: string; expiresAt: number } | null = null;

async function getGuestSessionId(forceRefresh = false): Promise<string> {
  if (!forceRefresh && guestSession && guestSession.expiresAt > Date.now()) {
    return guestSession.id;
  }
  const res = await fetch(tmdbUrl("/authentication/guest_session/new", {}), {
    headers: tmdbHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`TMDB guest session failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { guest_session_id?: unknown };
  const id =
    typeof data.guest_session_id === "string" &&
    /^[\w-]{10,80}$/.test(data.guest_session_id)
      ? data.guest_session_id
      : null;
  if (!id) throw new Error("TMDB guest session response invalid");
  guestSession = { id, expiresAt: Date.now() + 20 * 60 * 60 * 1000 };
  return id;
}

async function postRating(
  type: "MOVIE" | "SERIES",
  tmdbId: number,
  value: number,
  sessionId: string,
): Promise<Response> {
  const base = type === "MOVIE" ? "movie" : "tv";
  return fetch(
    tmdbUrl(`/${base}/${tmdbId}/rating`, {
      guest_session_id: sessionId,
    }),
    {
      method: "POST",
      headers: { ...tmdbHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
      signal: AbortSignal.timeout(8000),
    },
  );
}

export async function sendRatingToTmdb(
  type: "MOVIE" | "SERIES",
  tmdbId: number,
  rating: number,
): Promise<void> {
  let sessionId = await getGuestSessionId();
  let res = await postRating(type, tmdbId, rating, sessionId);
  // Session may have expired server-side: refresh once and retry.
  if (res.status === 401 || res.status === 403) {
    sessionId = await getGuestSessionId(true);
    res = await postRating(type, tmdbId, rating, sessionId);
  }
  if (!res.ok) {
    throw new Error(`TMDB rating failed (HTTP ${res.status})`);
  }
}

export async function deleteRatingFromTmdb(
  type: "MOVIE" | "SERIES",
  tmdbId: number,
): Promise<void> {
  const sessionId = await getGuestSessionId();
  const base = type === "MOVIE" ? "movie" : "tv";
  const res = await fetch(
    tmdbUrl(`/${base}/${tmdbId}/rating`, {
      guest_session_id: sessionId,
    }),
    {
      method: "DELETE",
      headers: tmdbHeaders(),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) {
    throw new Error(`TMDB rating delete failed (HTTP ${res.status})`);
  }
}

function youtubeKeyOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !/^[\w-]{8,20}$/.test(value)) return null;
  return value;
}

function parseVideoList(results: unknown): TitleVideo[] {
  const list = Array.isArray(results) ? results : [];
  const videos: TitleVideo[] = [];
  for (const raw of list) {
    if (raw === null || typeof raw !== "object") continue;
    const record = raw as RawResult;
    if (record.site !== "YouTube") continue;
    const key = youtubeKeyOrNull(record.key);
    if (!key) continue;
    videos.push({
      key,
      name: boundedString(record.name, 150) || "Video",
      videoType: boundedString(record.type, 30) || "Clip",
      official: record.official === true,
      publishedAt: isoDateOrNull(
        typeof record.published_at === "string"
          ? record.published_at.slice(0, 10)
          : null,
      ),
    });
  }
  return videos;
}

export async function fetchSeasonVideos(
  tmdbId: number,
  seasonNumber: number,
): Promise<TitleVideo[]> {
  return cached(
    `seasonVideos:${tmdbId}:${seasonNumber}`,
    24 * 60 * 60 * 1000,
    async () => {
      const res = await fetch(
        tmdbUrl(`/tv/${tmdbId}/season/${seasonNumber}/videos`, {
          language: "en-US",
        }),
        { headers: tmdbHeaders(), signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) {
        throw new Error(`TMDB season videos failed (HTTP ${res.status})`);
      }
      const data = (await res.json()) as { results?: unknown };
      return parseVideoList(data.results);
    },
  );
}

export async function getTitlePage(
  type: "MOVIE" | "SERIES",
  tmdbId: number,
): Promise<TitleDetails> {
  return cached(`title:${type}:${tmdbId}`, 24 * 60 * 60 * 1000, async () => {
    const base = type === "MOVIE" ? "movie" : "tv";
    const request = (path: string) =>
      fetch(tmdbUrl(path, { language: "en-US" }), {
        headers: tmdbHeaders(),
        signal: AbortSignal.timeout(8000),
      });

    const [detailsRes, creditsRes, videosRes, providersRes, reviewsRes] =
      await Promise.all([
        request(`/${base}/${tmdbId}`),
        request(`/${base}/${tmdbId}/credits`),
        request(`/${base}/${tmdbId}/videos`),
        request(`/${base}/${tmdbId}/watch/providers`),
        request(`/${base}/${tmdbId}/reviews`),
      ]);

    if (!detailsRes.ok) {
      throw new Error(`TMDB details failed (HTTP ${detailsRes.status})`);
    }

    const details = (await detailsRes.json()) as RawResult;

    let collection: CollectionInfo | null = null;
    const belongsRaw = details.belongs_to_collection;
    if (belongsRaw !== null && typeof belongsRaw === "object") {
      const belongs = belongsRaw as RawResult;
      const collectionName = boundedString(belongs.name, 150);
      const collectionId = boundedNumber(belongs.id, 1, 1_000_000);
      if (collectionName && collectionId !== null) {
        const partsRes = await request(`/collection/${collectionId}`);
        const parts: CollectionInfo["parts"] = [];
        if (partsRes.ok) {
          const partsData = (await partsRes.json()) as {
            parts?: unknown;
          };
          const list = Array.isArray(partsData.parts) ? partsData.parts : [];
          for (const raw of list) {
            if (raw === null || typeof raw !== "object") continue;
            const record = raw as RawResult;
            const partId = boundedNumber(record.id, 1, 100_000_000);
            const partTitle =
              boundedString(record.title, MAX_TITLE) ||
              boundedString(record.name, MAX_TITLE);
            if (partId === null || !partTitle) continue;
            parts.push({
              tmdbId: partId,
              title: partTitle,
              posterUrl: posterUrlOrNull(record.poster_path),
              releaseDate: isoDateOrNull(record.release_date),
              voteAverage: boundedNumber(record.vote_average, 0, 10) ?? 0,
            });
          }
        }
        parts.sort((a, b) =>
          (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999"),
        );
        collection = { name: collectionName, parts };
      }
    }
    const title =
      boundedString(details.title, MAX_TITLE) ||
      boundedString(details.name, MAX_TITLE);
    if (!title) throw new Error("TMDB details missing title");

    const nextEpisodeRef = parseEpisodeRef(details.next_episode_to_air);
    const lastEpisodeRef = parseEpisodeRef(details.last_episode_to_air);
    const nextEpisode: NextEpisode | null =
      nextEpisodeRef === null
        ? null
        : {
            ...nextEpisodeRef,
            isPremiere:
              lastEpisodeRef === null ||
              nextEpisodeRef.seasonNumber > lastEpisodeRef.seasonNumber,
          };

    const detailGenres = Array.isArray(details.genres) ? details.genres : [];
    const genres: string[] = [];
    for (const raw of detailGenres) {
      if (raw === null || typeof raw !== "object") continue;
      const name = boundedString((raw as RawResult).name, 60);
      if (name && genres.length < 8) genres.push(name);
    }

    const creditsData = creditsRes.ok
      ? ((await creditsRes.json()) as { cast?: unknown })
      : { cast: [] };
    const cast: TitleCastMember[] = [];
    if (Array.isArray(creditsData.cast)) {
      for (const raw of creditsData.cast) {
        if (cast.length >= CAST_SIZE) break;
        if (raw === null || typeof raw !== "object") continue;
        const record = raw as RawResult;
        const name = boundedString(record.name, 100);
        if (!name) continue;
        const personId = boundedNumber(record.id, 1, 100_000_000);
        if (personId === null) continue;
        cast.push({
          personId,
          name,
          character: boundedString(record.character, 100),
          profileUrl: profileUrlOrNull(record.profile_path),
        });
      }
    }

    let youtubeKey: string | null = null;
    let seriesVideos: TitleVideo[] = [];
    if (videosRes.ok) {
      const videos = (await videosRes.json()) as { results?: unknown };
      seriesVideos = parseVideoList(videos.results);
      const best =
        seriesVideos.find((v) => v.videoType === "Trailer" && v.official) ??
        seriesVideos.find((v) => v.videoType === "Trailer") ??
        seriesVideos[0];
      youtubeKey = best?.key ?? null;
    }

    const emptyProviders = { stream: [], rent: [], buy: [] };
    let providers: {
      stream: TitleProvider[];
      rent: TitleProvider[];
      buy: TitleProvider[];
    } = { ...emptyProviders };
    let justWatchUrl: string | null = null;
    if (providersRes.ok) {
      const data = (await providersRes.json()) as RawResult;
      const results =
        data.results !== null && typeof data.results === "object"
          ? (data.results as RawResult)
          : {};
      const region =
        results[WATCH_REGION] !== null &&
        typeof results[WATCH_REGION] === "object"
          ? (results[WATCH_REGION] as RawResult)
          : {};

      function parseProviders(key: string): TitleProvider[] {
        const list = Array.isArray(region[key]) ? region[key] : [];
        const parsed: TitleProvider[] = [];
        for (const raw of list) {
          if (parsed.length >= 8) break;
          if (raw === null || typeof raw !== "object") continue;
          const record = raw as RawResult;
          const name = boundedString(record.provider_name, 80);
          if (!name) continue;
          parsed.push({ name, logoUrl: logoUrlOrNull(record.logo_path) });
        }
        return parsed;
      }

      providers = {
        stream: parseProviders("flatrate"),
        rent: parseProviders("rent"),
        buy: parseProviders("buy"),
      };
      const justWatch = boundedString(region.link, 500);
      justWatchUrl = /^https:\/\/[\w./?=&%-]+$/.test(justWatch)
        ? justWatch
        : null;
    }

    const reviews: TitleReview[] = [];
    if (reviewsRes.ok) {
      const data = (await reviewsRes.json()) as { results?: unknown };
      const list = Array.isArray(data.results) ? data.results : [];
      for (const raw of list) {
        if (reviews.length >= MAX_REVIEWS) break;
        if (raw === null || typeof raw !== "object") continue;
        const record = raw as RawResult;
        const author = boundedString(record.author, 100);
        const content = boundedString(record.content, 1500);
        if (!author || !content) continue;
        const authorDetails =
          record.author_details !== null &&
          typeof record.author_details === "object"
            ? (record.author_details as RawResult)
            : {};
        reviews.push({
          author,
          content,
          createdAt: isoDateOrNull(
            typeof record.created_at === "string"
              ? record.created_at.slice(0, 10)
              : null,
          ),
          rating: boundedNumber(authorDetails.rating, 0, 10),
        });
      }
    }

    return {
      tmdbId,
      type,
      title,
      tagline: boundedString(details.tagline, 200) || null,
      overview: boundedString(details.overview, MAX_OVERVIEW),
      posterUrl: posterUrlOrNull(details.poster_path),
      backdropUrl: backdropUrlOrNull(details.backdrop_path),
      releaseDate: isoDateOrNull(
        details.release_date ?? details.first_air_date,
      ),
      voteAverage: boundedNumber(details.vote_average, 0, 10) ?? 0,
      genres,
      runtimeMinutes:
        type === "MOVIE" ? boundedNumber(details.runtime, 1, 1000) : null,
      numberOfSeasons:
        type === "SERIES"
          ? boundedNumber(details.number_of_seasons, 1, 200)
          : null,
      status: boundedString(details.status, 40) || null,
      nextEpisode,
      collection,
      cast,
      youtubeKey,
      videos: seriesVideos,
      providers,
      justWatchUrl,
      reviews,
    };
  });
}

function parseEpisodeRef(raw: unknown): {
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  name: string;
} | null {
  if (raw === null || typeof raw !== "object") return null;
  const record = raw as RawResult;
  const seasonNumber = boundedNumber(record.season_number, 0, 200);
  const episodeNumber = boundedNumber(record.episode_number, 0, 1000);
  if (seasonNumber === null || episodeNumber === null) return null;
  return {
    seasonNumber,
    episodeNumber,
    airDate: isoDateOrNull(record.air_date),
    name: boundedString(record.name, 150) || "Episode",
  };
}

export async function getPersonPage(personId: number): Promise<PersonDetails> {
  return cached(`person:${personId}`, 24 * 60 * 60 * 1000, async () => {
    const request = (path: string) =>
      fetch(tmdbUrl(path, { language: "en-US" }), {
        headers: tmdbHeaders(),
        signal: AbortSignal.timeout(8000),
      });

    const [personRes, creditsRes] = await Promise.all([
      request(`/person/${personId}`),
      request(`/person/${personId}/combined_credits`),
    ]);
    if (!personRes.ok) {
      throw new Error(`TMDB person failed (HTTP ${personRes.status})`);
    }

    const person = (await personRes.json()) as RawResult;
    const name = boundedString(person.name, 120);
    if (!name) throw new Error("TMDB person missing name");

    const credits: PersonCredit[] = [];
    if (creditsRes.ok) {
      const [movieGenres, tvGenres] = await Promise.all([
        genreNames("MOVIE"),
        genreNames("SERIES"),
      ]);
      const data = (await creditsRes.json()) as { cast?: unknown };
      const list = Array.isArray(data.cast) ? data.cast : [];
      const seen = new Set<string>();
      for (const raw of list) {
        if (raw === null || typeof raw !== "object") continue;
        const record = raw as RawResult;
        if (record.media_type !== "movie" && record.media_type !== "tv") {
          continue;
        }
        const tmdbId = boundedNumber(record.id, 1, 100_000_000);
        const creditTitle =
          boundedString(record.title, MAX_TITLE) ||
          boundedString(record.name, MAX_TITLE);
        if (tmdbId === null || !creditTitle) continue;
        const key = `${record.media_type}:${tmdbId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const genreMap = record.media_type === "movie" ? movieGenres : tvGenres;
        const rawGenreIds = Array.isArray(record.genre_ids)
          ? record.genre_ids
          : [];
        const genres: string[] = [];
        for (const gid of rawGenreIds) {
          const id = boundedNumber(gid, 0, 1_000_000);
          if (id === null) continue;
          const name = genreMap.get(id);
          if (name && genres.length < 8) genres.push(name);
        }

        credits.push({
          tmdbId,
          type: record.media_type === "movie" ? "MOVIE" : "SERIES",
          title: creditTitle,
          character: boundedString(record.character, 100),
          posterUrl: posterUrlOrNull(record.poster_path),
          releaseDate: isoDateOrNull(
            record.release_date ?? record.first_air_date,
          ),
          voteAverage: boundedNumber(record.vote_average, 0, 10) ?? 0,
          genres,
        });
      }
    }

    credits.sort((a, b) => {
      const dateA = a.releaseDate ?? "0000";
      const dateB = b.releaseDate ?? "0000";
      return dateB.localeCompare(dateA);
    });

    return {
      personId,
      name,
      biography: boundedString(person.biography, 4000),
      profileUrl: profileUrlOrNull(person.profile_path),
      knownFor: boundedString(person.known_for_department, 60) || null,
      birthday: isoDateOrNull(person.birthday),
      deathday: isoDateOrNull(person.deathday),
      placeOfBirth: boundedString(person.place_of_birth, 200) || null,
      credits,
    };
  });
}

export type NextEpisodeInfo = {
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  name: string;
};

export async function fetchNextEpisode(
  tmdbId: number,
): Promise<NextEpisodeInfo | null> {
  return cached(`nextEpisode:${tmdbId}`, 12 * 60 * 60 * 1000, async () => {
    const res = await fetch(tmdbUrl(`/tv/${tmdbId}`, { language: "en-US" }), {
      headers: tmdbHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`TMDB tv details failed (HTTP ${res.status})`);
    }
    const data = (await res.json()) as RawResult;
    const ref = parseEpisodeRef(data.next_episode_to_air);
    return ref;
  });
}

/** Movie runtime in minutes, or average episode length for a series. */
export async function fetchRuntimeMinutes(
  type: "MOVIE" | "SERIES",
  tmdbId: number,
): Promise<number | null> {
  return cached(`runtime:${type}:${tmdbId}`, 24 * 60 * 60 * 1000, async () => {
    const base = type === "MOVIE" ? "movie" : "tv";
    const res = await fetch(
      tmdbUrl(`/${base}/${tmdbId}`, { language: "en-US" }),
      {
        headers: tmdbHeaders(),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      throw new Error(`TMDB runtime failed (HTTP ${res.status})`);
    }
    const data = (await res.json()) as RawResult;
    if (type === "MOVIE") {
      return boundedNumber(data.runtime, 1, 1000);
    }
    const runtimes = Array.isArray(data.episode_run_time)
      ? data.episode_run_time
      : [];
    const valid = runtimes
      .map((n) => boundedNumber(n, 5, 400))
      .filter((n): n is number => n !== null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  });
}
