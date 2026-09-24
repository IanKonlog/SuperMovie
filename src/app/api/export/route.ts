import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const items = await db.mediaItem.findMany({
    include: { seasons: true },
    orderBy: { createdAt: "asc" },
  });

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => ({
      title: item.title,
      type: item.type,
      status: item.status,
      rating: item.rating,
      isFavorite: item.isFavorite,
      progressNote: item.progressNote,
      comment: item.comment,
      tmdbId: item.tmdbId,
      posterUrl: item.posterUrl,
      overview: item.overview,
      releaseDate: item.releaseDate,
      voteAverage: item.voteAverage,
      genres: item.genres,
      seasons: item.seasons.map((s) => ({
        seasonNumber: s.seasonNumber,
        episodeCount: s.episodeCount,
        watchedCount: s.watchedCount,
      })),
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="supermovie-export.json"',
    },
  });
}
