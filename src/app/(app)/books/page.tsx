import { BooksClient } from "@/modules/books/components/books-client";
import { GoodreadsImportForm } from "@/modules/books/components/goodreads-import-form";
import { getBookCounts, listBooks } from "@/modules/books/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Books — SuperMovie" };

export default async function BooksPage() {
  const [books, counts] = await Promise.all([listBooks(), getBookCounts()]);

  return (
    <div className="page-enter flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">
        Books{" "}
        <span className="text-base font-normal text-muted">
          {counts.total} on the shelf
        </span>
      </h1>
      <BooksClient books={books} />
      <GoodreadsImportForm />
    </div>
  );
}
