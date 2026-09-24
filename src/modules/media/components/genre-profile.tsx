import type { GenreProfileEntry } from "../queries";

export function GenreProfile({ profile }: { profile: GenreProfileEntry[] }) {
  if (profile.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">Your genres:</span>
      {profile.map(({ genre, avg, count }) => (
        <span
          key={genre}
          className="rounded-full border border-line bg-surface px-3 py-1 text-xs"
        >
          {genre} <strong className="text-foreground">{avg.toFixed(1)}</strong>
          <span className="text-muted"> ({count})</span>
        </span>
      ))}
    </div>
  );
}
