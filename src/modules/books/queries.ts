import { db } from "@/lib/db";
import type { BookDTO, BookStatusValue } from "./constants";

const BOOKS_BASE = "https://www.googleapis.com/books/v1/volumes";

export type BookSearchResult = {
  googleBooksId: string;
  title: string;
  authors: string[];
  description: string | null;
  pageCount: number | null;
  publishedDate: string | null;
  coverUrl: string | null;
};

function boundedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function searchGoogleBooks(
  query: string,
): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return [];

  const url = new URL(BOOKS_BASE);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("maxResults", "12");
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey && /^[\w-]{10,60}$/.test(apiKey)) {
    url.searchParams.set("key", apiKey);
  }

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Google Books failed (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { items?: unknown };
  if (!Array.isArray(data.items)) return [];

  const out: BookSearchResult[] = [];
  for (const raw of data.items) {
    if (raw === null || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const googleBooksId = boundedString(record.id, 40);
    const info =
      record.volumeInfo !== null && typeof record.volumeInfo === "object"
        ? (record.volumeInfo as Record<string, unknown>)
        : {};
    const title = boundedString(info.title, 200);
    if (!googleBooksId || !title) continue;

    const authors = Array.isArray(info.authors)
      ? info.authors
          .filter((a): a is string => typeof a === "string")
          .map((a) => a.slice(0, 80))
          .slice(0, 5)
      : [];

    const images =
      info.imageLinks !== null && typeof info.imageLinks === "object"
        ? (info.imageLinks as Record<string, unknown>)
        : {};
    const thumb =
      boundedString(images.thumbnail, 300) ||
      boundedString(images.smallThumbnail, 300);
    const coverUrl =
      thumb && /^https:\/\/[\w.-]+\/[\w./-]+/.test(thumb)
        ? thumb.replace("http://", "https://")
        : null;

    const pageCountRaw = info.pageCount;
    const pageCount =
      typeof pageCountRaw === "number" &&
      Number.isInteger(pageCountRaw) &&
      pageCountRaw > 0 &&
      pageCountRaw <= 20000
        ? pageCountRaw
        : null;

    out.push({
      googleBooksId,
      title,
      authors,
      description: boundedString(info.description, 2000) || null,
      pageCount,
      publishedDate: boundedString(info.publishedDate, 10) || null,
      coverUrl,
    });
  }
  return out;
}

export function listBooks(): Promise<BookDTO[]> {
  return db.book.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      authors: true,
      status: true,
      rating: true,
      coverUrl: true,
      pageCount: true,
      currentPage: true,
      publishedDate: true,
    },
  }) as Promise<BookDTO[]>;
}

export async function getBookCounts(): Promise<{
  total: number;
  byStatus: Map<BookStatusValue, number>;
}> {
  const grouped = await db.book.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const byStatus = new Map(
    grouped.map((g) => [g.status, g._count._all]),
  ) as Map<BookStatusValue, number>;
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  return { total, byStatus };
}

export type BookStats = {
  total: number;
  byStatus: Map<BookStatusValue, number>;
  ratedCount: number;
  averageRating: number | null;
  pagesRead: number;
};

export async function getBookStats(): Promise<BookStats> {
  const books = await db.book.findMany({
    select: {
      status: true,
      rating: true,
      pageCount: true,
      currentPage: true,
    },
  });

  const byStatus = new Map<BookStatusValue, number>();
  let ratedCount = 0;
  let ratingSum = 0;
  let pagesRead = 0;
  for (const book of books) {
    byStatus.set(book.status, (byStatus.get(book.status) ?? 0) + 1);
    if (book.rating !== null) {
      ratedCount += 1;
      ratingSum += book.rating;
    }
    if (book.status === "FINISHED") {
      pagesRead += book.pageCount ?? 0;
    } else if (book.status === "READING") {
      pagesRead += book.currentPage;
    }
  }

  return {
    total: books.length,
    byStatus,
    ratedCount,
    averageRating: ratedCount > 0 ? ratingSum / ratedCount : null,
    pagesRead,
  };
}
