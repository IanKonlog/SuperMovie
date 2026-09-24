import Link from "next/link";

const linkClasses =
  "rounded-lg border border-line px-3 py-1.5 transition hover:bg-surface-2";
const disabledClasses = "rounded-lg px-3 py-1.5 text-muted opacity-50";

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-4 text-sm"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClasses}>
          ← Prev
        </Link>
      ) : (
        <span className={disabledClasses}>← Prev</span>
      )}
      <span className="text-muted">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClasses}>
          Next →
        </Link>
      ) : (
        <span className={disabledClasses}>Next →</span>
      )}
    </nav>
  );
}
