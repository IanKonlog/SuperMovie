"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCsv, readCsvUpload } from "@/lib/csv";
import { isBookStatus, type BookStatusValue } from "./constants";
import { searchGoogleBooks, type BookSearchResult } from "./queries";

export type BookActionState = { error?: string; success?: boolean };
export type BookSearchState = { results: BookSearchResult[]; error?: string };

function revalidateBooks() {
  revalidatePath("/", "layout");
}

export async function searchBooksAction(
  query: unknown,
): Promise<BookSearchState> {
  await requireSession();
  if (typeof query !== "string") {
    return { results: [], error: "Invalid search." };
  }
  try {
    return { results: await searchGoogleBooks(query) };
  } catch {
    return { results: [], error: "Book search is unavailable right now." };
  }
}

const COVER_PATTERN = /^https:\/\/[\w.-]+\/[\w./-]+$/;

export async function addBook(
  _prev: BookActionState,
  formData: FormData,
): Promise<BookActionState> {
  await requireSession();

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1 || title.length > 200) {
    return { error: "Title is required (max 200 characters)." };
  }
  const statusRaw = formData.get("status") ?? "WANT_TO_READ";
  if (!isBookStatus(statusRaw)) return { error: "Invalid status." };

  const authorsRaw = String(formData.get("authors") ?? "");
  const authors = authorsRaw
    .split(",")
    .map((a) => a.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 5);

  const googleBooksIdRaw = String(formData.get("googleBooksId") ?? "");
  const googleBooksId = /^[\w-]{4,40}$/.test(googleBooksIdRaw)
    ? googleBooksIdRaw
    : null;

  const coverRaw = String(formData.get("coverUrl") ?? "");
  const coverUrl = COVER_PATTERN.test(coverRaw) ? coverRaw.slice(0, 300) : null;

  const pageCountRaw = formData.get("pageCount");
  const pageCount =
    pageCountRaw !== null && pageCountRaw !== "" ? Number(pageCountRaw) : null;
  if (
    pageCount !== null &&
    (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 20000)
  ) {
    return { error: "Invalid page count." };
  }

  const publishedDate = String(formData.get("publishedDate") ?? "");
  const validDate = /^\d{4}(-\d{2}(-\d{2})?)?$/.test(publishedDate)
    ? publishedDate
    : null;

  const description = String(formData.get("description") ?? "").slice(0, 2000);

  try {
    await db.book.create({
      data: {
        title,
        authors,
        status: statusRaw,
        googleBooksId,
        coverUrl,
        description: description || null,
        pageCount,
        publishedDate: validDate,
      },
    });
  } catch {
    return { error: "Could not save. Please try again." };
  }

  revalidateBooks();
  return { success: true };
}

export async function updateBook(
  _prev: BookActionState,
  formData: FormData,
): Promise<BookActionState> {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing book id." };

  const data: {
    status?: BookStatusValue;
    rating?: number | null;
    currentPage?: number;
  } = {};

  const status = formData.get("status");
  if (status !== null) {
    if (!isBookStatus(status)) return { error: "Invalid status." };
    data.status = status as BookStatusValue;
  }

  const ratingRaw = formData.get("rating");
  if (ratingRaw !== null) {
    if (ratingRaw === "") {
      data.rating = null;
    } else {
      const rating = Number(ratingRaw);
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        return { error: "Rating must be 1-10." };
      }
      data.rating = rating;
    }
  }

  const pageRaw = formData.get("currentPage");
  if (pageRaw !== null && pageRaw !== "") {
    const page = Number(pageRaw);
    if (!Number.isInteger(page) || page < 0 || page > 20000) {
      return { error: "Invalid page." };
    }
    data.currentPage = page;
  }

  if (Object.keys(data).length === 0) return { success: true };

  const result = await db.book
    .updateMany({ where: { id }, data })
    .catch(() => null);
  if (!result || result.count === 0) return { error: "Book not found." };

  revalidateBooks();
  return { success: true };
}

export async function deleteBook(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.book.deleteMany({ where: { id } });
  revalidateBooks();
}

export type CsvImportState = {
  error?: string;
  added?: number;
  skipped?: number;
};

const GOODREADS_MAX_ROWS = 5000;

function shelfToStatus(shelf: string, hasDateRead: boolean): BookStatusValue {
  switch (shelf) {
    case "read":
      return "FINISHED";
    case "currently-reading":
      return "READING";
    case "to-read":
      return "WANT_TO_READ";
    default:
      return hasDateRead ? "FINISHED" : "WANT_TO_READ";
  }
}

export async function importGoodreads(
  _prev: CsvImportState,
  formData: FormData,
): Promise<CsvImportState> {
  await requireSession();

  const text = await readCsvUpload(formData.get("csv"));
  if (text === null) {
    return { error: "Attach a Goodreads CSV export (max 2 MB)." };
  }

  const rows = parseCsv(text, GOODREADS_MAX_ROWS + 1);
  if (rows.length < 2) return { error: "No data rows found in this CSV." };
  if (rows.length > GOODREADS_MAX_ROWS) {
    return { error: `Too many rows (max ${GOODREADS_MAX_ROWS}).` };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const titleIndex = header.indexOf("title");
  if (titleIndex === -1) {
    return {
      error:
        'This doesn\'t look like a Goodreads export ("Title" column missing).',
    };
  }
  const authorIndex = header.indexOf("author");
  const additionalIndex = header.indexOf("additional authors");
  const ratingIndex = header.indexOf("my rating");
  const shelfIndex = header.indexOf("bookshelves");
  const dateReadIndex = header.indexOf("date read");

  type Entry = {
    title: string;
    authors: string[];
    status: BookStatusValue;
    rating: number | null;
  };
  const entries: Entry[] = [];
  const seen = new Set<string>();
  for (const row of rows.slice(1)) {
    const title = (row[titleIndex] ?? "").trim().slice(0, 200);
    if (!title) continue;

    const authors = `${authorIndex === -1 ? "" : (row[authorIndex] ?? "")},${
      additionalIndex === -1 ? "" : (row[additionalIndex] ?? "")
    }`
      .split(",")
      .map((a) => a.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 5);

    const ratingRaw = Number(ratingIndex === -1 ? 0 : row[ratingIndex]);
    const rating =
      Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
        ? ratingRaw * 2
        : null;

    const shelf = (shelfIndex === -1 ? "" : (row[shelfIndex] ?? ""))
      .trim()
      .toLowerCase();
    const hasDateRead =
      dateReadIndex !== -1 && (row[dateReadIndex] ?? "").trim() !== "";

    const key = `${title.toLowerCase()}:${(authors[0] ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      title,
      authors,
      status: shelfToStatus(shelf, hasDateRead),
      rating,
    });
  }
  if (entries.length === 0)
    return { error: "No usable rows found in this CSV." };

  const existing = await db.book.findMany({
    select: { title: true, authors: true },
  });
  const existingKeys = new Set(
    existing.map(
      (b) => `${b.title.toLowerCase()}:${(b.authors[0] ?? "").toLowerCase()}`,
    ),
  );

  let added = 0;
  let skipped = 0;
  for (const entry of entries) {
    const key = `${entry.title.toLowerCase()}:${(entry.authors[0] ?? "").toLowerCase()}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    const created = await db.book
      .create({
        data: {
          title: entry.title,
          authors: entry.authors,
          status: entry.status,
          rating: entry.rating,
        },
        select: { id: true },
      })
      .catch(() => null);
    if (!created) {
      skipped += 1;
      continue;
    }
    existingKeys.add(key);
    added += 1;
  }

  if (added > 0) revalidateBooks();
  return { added, skipped };
}
