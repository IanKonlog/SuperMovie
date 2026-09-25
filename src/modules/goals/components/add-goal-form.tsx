"use client";

import { useActionState } from "react";
import { createGoal, type GoalActionState } from "../actions";
import { GOAL_KINDS, GOAL_KIND_LABELS, GOAL_MIN_YEAR } from "../constants";

const initial: GoalActionState = {};

export function AddGoalForm({ year }: { year: number }) {
  const [state, action, pending] = useActionState(createGoal, initial);
  const years = [year, year - 1];
  const shownYears = years.filter((y) => y >= GOAL_MIN_YEAR);

  return (
    <details className="rounded-lg border border-line bg-surface-2 p-3">
      <summary className="cursor-pointer text-xs text-muted transition hover:text-foreground">
        + New goal
      </summary>
      <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Type</span>
          <select
            name="kind"
            className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none focus:border-muted"
          >
            {GOAL_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {GOAL_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Target</span>
          <input
            type="number"
            name="target"
            required
            min={1}
            max={10000}
            defaultValue={24}
            className="w-20 rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none focus:border-muted"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Year</span>
          <select
            name="year"
            defaultValue={year}
            className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none focus:border-muted"
          >
            {shownYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-background transition hover:bg-accent/80 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add goal"}
        </button>
        {state.error && (
          <p className="w-full text-xs text-red-500">{state.error}</p>
        )}
      </form>
    </details>
  );
}
