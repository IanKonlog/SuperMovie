import Link from "next/link";
import {
  getHistoryAvailableMonths,
  getHistoryMonth,
  parseHistoryMonth,
} from "@/modules/history/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "History — SuperMovie" };

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthHref(year: number, month: number): string {
  return `/history?month=${year}-${String(month).padStart(2, "0")}`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const parsed = parseHistoryMonth(params.month) ?? {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
  const [history, availableMonths] = await Promise.all([
    getHistoryMonth(parsed.year, parsed.month),
    getHistoryAvailableMonths(),
  ]);

  const firstWeekday =
    (new Date(Date.UTC(parsed.year, parsed.month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(parsed.year, parsed.month, 0),
  ).getUTCDate();

  const prev = new Date(Date.UTC(parsed.year, parsed.month - 2, 1));
  const next = new Date(Date.UTC(parsed.year, parsed.month, 1));
  const todayKey = now.toISOString().slice(0, 10);

  return (
    <div className="page-enter flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          History{" "}
          <span className="text-base font-normal text-muted">
            {MONTH_NAMES[parsed.month - 1]} {parsed.year}
          </span>
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={monthHref(prev.getUTCFullYear(), prev.getUTCMonth() + 1)}
            aria-label="Previous month"
            className="rounded-md border border-line px-2 py-1 text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            ←
          </Link>
          <Link
            href={monthHref(now.getUTCFullYear(), now.getUTCMonth() + 1)}
            className="text-xs text-muted underline-offset-2 transition hover:text-foreground hover:underline"
          >
            Today
          </Link>
          <Link
            href={monthHref(next.getUTCFullYear(), next.getUTCMonth() + 1)}
            aria-label="Next month"
            className="rounded-md border border-line px-2 py-1 text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            →
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const key = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEntries = history.byDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`min-h-16 rounded-md border p-1.5 ${
                  dayEntries.length > 0
                    ? "border-line bg-surface-2"
                    : "border-transparent"
                } ${isToday ? "ring-1 ring-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tabular-nums text-muted">
                    {day}
                  </span>
                  {dayEntries.length > 0 && (
                    <span className="font-mono text-[10px] tabular-nums text-accent">
                      {dayEntries.length}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-0.5" aria-hidden>
                  {dayEntries.slice(0, 4).map((entry) => (
                    <span
                      key={entry.id}
                      title={entry.title}
                      className={`h-1.5 w-1.5 rounded-full ${
                        entry.kind === "BOOK"
                          ? "bg-foreground"
                          : entry.kind === "SERIES"
                            ? "bg-accent"
                            : "bg-accent/50"
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section
        aria-label="Completed this month"
        className="flex flex-col gap-2"
      >
        <h2 className="text-sm font-medium">
          Watched this month{" "}
          <span className="font-mono text-xs tabular-nums text-muted">
            {history.entries.length}
          </span>
        </h2>
        {history.entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
            Nothing finished in {MONTH_NAMES[parsed.month - 1]}. The dots await.
          </p>
        ) : (
          <ol className="flex flex-col rounded-lg border border-line bg-surface">
            {history.entries.map((entry, index) => (
              <li
                key={entry.id}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    entry.kind === "BOOK" ? "bg-foreground" : "bg-accent"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                {entry.rating !== null && (
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                    ★ {entry.rating}
                  </span>
                )}
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                  {entry.day.slice(8)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {availableMonths.length > 0 && (
        <section aria-label="Jump to month" className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Past months</h2>
          <div className="flex flex-wrap gap-2">
            {availableMonths
              .filter(
                (m) =>
                  m !==
                  `${parsed.year}-${String(parsed.month).padStart(2, "0")}`,
              )
              .slice(0, 12)
              .map((monthKey) => {
                const [y, m] = monthKey.split("-").map(Number);
                return (
                  <Link
                    key={monthKey}
                    href={monthHref(y, m)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      monthKey ===
                      `${parsed.year}-${String(parsed.month).padStart(2, "0")}`
                        ? "bg-foreground font-medium text-background"
                        : "border border-line text-muted hover:bg-surface-2"
                    }`}
                  >
                    {MONTH_NAMES[m - 1]} {y}
                  </Link>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
