import { db } from "@/lib/db";
import { GOAL_KIND_LABELS, type GoalKindValue } from "./constants";

export type GoalWithProgress = {
  id: string;
  kind: GoalKindValue;
  label: string;
  target: number;
  year: number;
  current: number;
  complete: boolean;
};

export async function getGoalsWithProgress(
  year: number,
): Promise<GoalWithProgress[]> {
  const [goals, mediaByType, booksFinished] = await Promise.all([
    db.goal.findMany({
      where: { year },
      orderBy: { createdAt: "asc" },
    }),
    db.mediaItem.groupBy({
      by: ["type"],
      where: {
        status: "COMPLETED",
        completedAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      _count: { _all: true },
    }),
    db.book.count({
      where: {
        status: "FINISHED",
        completedAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
    }),
  ]);

  const movies = mediaByType.find((g) => g.type === "MOVIE")?._count._all ?? 0;
  const series = mediaByType.find((g) => g.type === "SERIES")?._count._all ?? 0;
  const currentForKind: Record<GoalKindValue, number> = {
    TITLES: movies + series,
    MOVIES: movies,
    SERIES: series,
    BOOKS: booksFinished,
  };

  return goals.map((goal) => ({
    id: goal.id,
    kind: goal.kind,
    label: GOAL_KIND_LABELS[goal.kind],
    target: goal.target,
    year: goal.year,
    current: currentForKind[goal.kind],
    complete: currentForKind[goal.kind] >= goal.target,
  }));
}
