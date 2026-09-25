"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { GOAL_MIN_YEAR, isGoalKind } from "./constants";

export type GoalActionState = { error?: string; success?: boolean };

function revalidateGoals() {
  revalidatePath("/", "layout");
}

export async function createGoal(
  _prev: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  await requireSession();

  const kind = formData.get("kind");
  if (!isGoalKind(kind)) return { error: "Invalid goal type." };

  const targetRaw = Number(formData.get("target"));
  if (!Number.isInteger(targetRaw) || targetRaw < 1 || targetRaw > 10000) {
    return { error: "Target must be between 1 and 10000." };
  }

  const currentYear = new Date().getFullYear();
  const yearRaw = Number(formData.get("year") ?? currentYear);
  if (
    !Number.isInteger(yearRaw) ||
    yearRaw < GOAL_MIN_YEAR ||
    yearRaw > currentYear + 1
  ) {
    return { error: "Invalid year." };
  }

  try {
    await db.goal.create({
      data: { kind, target: targetRaw, year: yearRaw },
    });
  } catch {
    return {
      error: `You already have a ${kind.toLowerCase()} goal for ${yearRaw}.`,
    };
  }

  revalidateGoals();
  return { success: true };
}

export async function deleteGoal(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.goal.deleteMany({ where: { id } });
  revalidateGoals();
}
