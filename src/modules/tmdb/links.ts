export function titleHref(type: "MOVIE" | "SERIES", tmdbId: number): string {
  return `/title/${type === "MOVIE" ? "movie" : "tv"}/${tmdbId}`;
}

export function personHref(personId: number): string {
  return `/person/${personId}`;
}
