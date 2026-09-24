import { PosterRow } from "@/modules/media/components/poster-row";
import type { MediaItemDTO, SeasonDTO } from "../constants";

export function CurrentlyWatching({
  items,
  seasonsByItem,
}: {
  items: MediaItemDTO[];
  seasonsByItem: Record<string, SeasonDTO[]>;
}) {
  if (items.length === 0) return null;

  const rowItems = items.map((item) => {
    const latest = [...(seasonsByItem[item.id] ?? [])]
      .reverse()
      .find((s) => s.watchedCount > 0);
    const progress = latest
      ? `S${latest.seasonNumber} · ${latest.watchedCount}/${latest.episodeCount}`
      : item.progressNote;
    return {
      key: item.id,
      posterUrl: item.posterUrl,
      title: item.title,
      rating:
        item.voteAverage && item.voteAverage > 0 ? item.voteAverage : undefined,
      year: item.releaseDate?.slice(0, 4),
      badge: progress ?? undefined,
      href: "/library",
    };
  });

  return (
    <section aria-label="Continue watching">
      <h2 className="mb-2 text-lg font-bold">Continue watching</h2>
      <PosterRow items={rowItems} />
    </section>
  );
}
