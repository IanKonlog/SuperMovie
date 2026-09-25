import Link from "next/link";
import { getShareToken } from "@/modules/media/queries";
import { getWrappedData, parseWrappedYear } from "@/modules/wrapped/queries";
import { WrappedStory } from "@/modules/wrapped/components/wrapped-story";
import { CopyLink } from "@/modules/wrapped/components/copy-link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Wrapped — SuperMovie" };

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseWrappedYear(params.year) ?? currentYear;
  const data = await getWrappedData(year);
  const shareToken = await getShareToken();

  return (
    <div className="page-enter flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Wrapped{" "}
          <span className="font-mono text-muted tabular-nums">{year}</span>
        </h1>
        {year !== currentYear && (
          <Link
            href="/wrapped"
            className="text-sm text-muted underline transition hover:text-foreground"
          >
            Back to {currentYear}
          </Link>
        )}
      </div>

      {data ? (
        <>
          <WrappedStory data={data} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Friends with your share link can watch this story too.
            </p>
            {shareToken ? (
              <CopyLink url={`/s/${shareToken}/wrapped?year=${year}`} />
            ) : (
              <Link
                href="/stats"
                className="text-sm text-muted underline transition hover:text-foreground"
              >
                Create a share link on the stats page
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-lg font-semibold">
            Nothing finished in {year} yet.
          </p>
          <p className="mt-2 text-sm text-muted">
            Complete a movie, series, or book and your Wrapped writes itself.
          </p>
          <Link
            href="/library"
            className="mt-5 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition hover:bg-accent/80"
          >
            Go to library
          </Link>
        </div>
      )}
    </div>
  );
}
