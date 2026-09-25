import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getWrappedData, parseWrappedYear } from "@/modules/wrapped/queries";
import { WrappedStory } from "@/modules/wrapped/components/wrapped-story";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wrapped — shared from SuperMovie",
  robots: { index: false },
};

export default async function SharedWrappedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  const valid = await db.shareToken.findUnique({ where: { token } });
  if (!valid) notFound();

  const query = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseWrappedYear(query.year) ?? currentYear;
  const data = await getWrappedData(year);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-black tracking-tighter text-accent uppercase">
          SuperMovie
        </span>
        <Link
          href={`/s/${token}`}
          className="text-sm text-muted underline transition hover:text-foreground"
        >
          View full stats
        </Link>
      </header>

      {data ? (
        <WrappedStory data={data} />
      ) : (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-lg font-semibold">
            Nothing finished in {year} yet.
          </p>
          <p className="mt-2 text-sm text-muted">
            This story writes itself as movies, series, and books are completed.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        A read-only year in review, shared via link.
      </p>
    </main>
  );
}
