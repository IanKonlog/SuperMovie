"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
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
