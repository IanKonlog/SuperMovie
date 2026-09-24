export type TmdbSearchResult = {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
  genres: string[];
};

export type SearchState = {
  results: TmdbSearchResult[];
  error?: string;
};

export type RecommendationSource = {
  tmdbId: number;
  type: "MOVIE" | "SERIES";
  rating: number;
  title: string;
};

export type Recommendation = {
  tmdbId: number;
  type: "MOVIE" | "SERIES";
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number;
  genres: string[];
  because: string[];
};

export type TitleCastMember = {
  personId: number;
  name: string;
  character: string;
  profileUrl: string | null;
};

export type PersonCredit = {
  tmdbId: number;
  type: "MOVIE" | "SERIES";
  title: string;
  character: string;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
  genres: string[];
};

export type PersonDetails = {
  personId: number;
  name: string;
  biography: string;
  profileUrl: string | null;
  knownFor: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  credits: PersonCredit[];
};

export type TitleProvider = { name: string; logoUrl: string | null };

export type TitleReview = {
  author: string;
  content: string;
  createdAt: string | null;
  rating: number | null;
};

export type TitleVideo = {
  key: string;
  name: string;
  videoType: string;
  official: boolean;
  publishedAt: string | null;
};

export type NextEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  name: string;
  isPremiere: boolean;
};

export type TitleDetails = {
  tmdbId: number;
  type: "MOVIE" | "SERIES";
  title: string;
  tagline: string | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
  genres: string[];
  runtimeMinutes: number | null;
  numberOfSeasons: number | null;
  status: string | null;
  nextEpisode: NextEpisode | null;
  cast: TitleCastMember[];
  youtubeKey: string | null;
  videos: TitleVideo[];
  providers: {
    stream: TitleProvider[];
    rent: TitleProvider[];
    buy: TitleProvider[];
  };
  justWatchUrl: string | null;
  reviews: TitleReview[];
};
