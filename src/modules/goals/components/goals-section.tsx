import { deleteGoal } from "../actions";
import { AddGoalForm } from "./add-goal-form";
import { getGoalsWithProgress } from "../queries";

export async function GoalsSection({ year }: { year: number }) {
  const goals = await getGoalsWithProgress(year);

  return (
    <section aria-label="Goals" className="card-enter flex flex-col gap-3">
      <h2 className="text-lg font-bold">
        Goals <span className="font-mono text-muted tabular-nums">{year}</span>
      </h2>
      {goals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
          No goals for {year} yet. Set one — future you will thank you.
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          {goals.map((goal) => {
            const pct = Math.min(
              Math.round((goal.current / Math.max(goal.target, 1)) * 100),
              100,
            );
            return (
              <div key={goal.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {goal.complete && (
                      <span
                        aria-label="Goal reached"
                        className="text-green-500"
                      >
                        ✓
                      </span>
                    )}
                    <span className="truncate">
                      {goal.target} {goal.label}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {goal.current} / {goal.target}
                    </span>
                    <form action={deleteGoal}>
                      <input type="hidden" name="id" value={goal.id} />
                      <button
                        type="submit"
                        aria-label={`Delete goal: ${goal.target} ${goal.label} in ${goal.year}`}
                        className="text-muted transition hover:text-foreground"
                      >
                        ✕
                      </button>
                    </form>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${goal.complete ? "bg-green-500" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AddGoalForm year={year} />
    </section>
  );
}
