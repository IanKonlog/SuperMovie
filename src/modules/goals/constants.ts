export const GOAL_KINDS = ["TITLES", "MOVIES", "SERIES", "BOOKS"] as const;
export type GoalKindValue = (typeof GOAL_KINDS)[number];

export const GOAL_KIND_LABELS: Record<GoalKindValue, string> = {
  TITLES: "titles",
  MOVIES: "movies",
  SERIES: "series",
  BOOKS: "books",
};

export const GOAL_MIN_YEAR = 2019;

export function isGoalKind(value: unknown): value is GoalKindValue {
  return (
    typeof value === "string" &&
    (GOAL_KINDS as readonly string[]).includes(value)
  );
}
