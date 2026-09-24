"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type ShareState = { url?: string; error?: string; revoked?: boolean };

export async function createShareLink(): Promise<ShareState> {
  await requireSession();

  const token = randomBytes(16).toString("hex");
  await db.shareToken.create({ data: { token } }).catch(() => null);
  revalidatePath("/", "layout");
  return { url: `/s/${token}` };
}

export async function revokeShareLink(): Promise<ShareState> {
  await requireSession();
  await db.shareToken.deleteMany({});
  revalidatePath("/", "layout");
  return { revoked: true };
}
