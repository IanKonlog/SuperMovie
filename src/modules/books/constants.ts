export const BOOK_STATUSES = [
  "READING",
  "WANT_TO_READ",
  "FINISHED",
  "ABANDONED",
] as const;

export type BookStatusValue = (typeof BOOK_STATUSES)[number];

export const BOOK_STATUS_LABELS: Record<BookStatusValue, string> = {
  READING: "Reading",
  WANT_TO_READ: "Want to read",
  FINISHED: "Finished",
  ABANDONED: "Abandoned",
};

export function isBookStatus(value: unknown): value is BookStatusValue {
  return (
    typeof value === "string" &&
    (BOOK_STATUSES as readonly string[]).includes(value)
  );
}

export type BookDTO = {
  id: string;
  title: string;
  authors: string[];
  status: BookStatusValue;
  rating: number | null;
  coverUrl: string | null;
  pageCount: number | null;
  currentPage: number;
  publishedDate: string | null;
};
