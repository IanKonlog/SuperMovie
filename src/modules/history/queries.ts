import { db } from "@/lib/db";

export type HistoryEntry = {
  id: string;
  kind: "MOVIE" | "SERIES" | "BOOK";
  title: string;
  posterUrl: string | null;
  rating: number | null;
  day: string; // UTC date, "YYYY-MM-DD"
};

export type HistoryMonth = {
  year: number;
  month: number; // 1-12
  entries: HistoryEntry[];
  byDay: Map<string, HistoryEntry[]>;
};

export function parseHistoryMonth(
  value: string | string[] | undefined,
): { year: number; month: number } | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2019 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export async function getHistoryMonth(
  year: number,
  month: number,
): Promise<HistoryMonth> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const [media, books] = await Promise.all([
    db.mediaItem.findMany({
      where: { status: "COMPLETED", completedAt: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        type: true,
        posterUrl: true,
        rating: true,
        completedAt: true,
      },
      orderBy: { completedAt: "asc" },
    }),
    db.book.findMany({
      where: { status: "FINISHED", completedAt: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        rating: true,
        completedAt: true,
      },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  const entries: HistoryEntry[] = [
    ...media.map((item) => ({
      id: item.id,
      kind: item.type,
      title: item.title,
      posterUrl: item.posterUrl,
      rating: item.rating,
      day: (item.completedAt as Date).toISOString().slice(0, 10),
    })),
    ...books.map((book) => ({
      id: book.id,
      kind: "BOOK" as const,
      title: book.title,
      posterUrl: book.coverUrl,
      rating: book.rating,
      day: (book.completedAt as Date).toISOString().slice(0, 10),
    })),
  ].sort((a, b) => a.day.localeCompare(b.day));

  const byDay = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.day) ?? [];
    list.push(entry);
    byDay.set(entry.day, list);
  }

  return { year, month, entries, byDay };
}

export async function getHistoryAvailableMonths(): Promise<string[]> {
  const [media, books] = await Promise.all([
    db.mediaItem.findMany({
      where: { status: "COMPLETED", completedAt: { not: null } },
      select: { completedAt: true },
    }),
    db.book.findMany({
      where: { status: "FINISHED", completedAt: { not: null } },
      select: { completedAt: true },
    }),
  ]);
  const months = new Set<string>();
  for (const row of [...media, ...books]) {
    months.add((row.completedAt as Date).toISOString().slice(0, 7));
  }
  return [...months].sort((a, b) => b.localeCompare(a));
}
