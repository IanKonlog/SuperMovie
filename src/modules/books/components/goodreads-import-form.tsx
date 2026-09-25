"use client";

import { useActionState } from "react";
import { importGoodreads, type CsvImportState } from "../actions";

const initial: CsvImportState = {};

export function GoodreadsImportForm() {
  const [state, action, pending] = useActionState(importGoodreads, initial);

  return (
    <details className="rounded-xl border border-line bg-surface p-3">
      <summary className="cursor-pointer text-sm text-muted transition hover:text-foreground">
        Import from Goodreads
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-muted">
          Upload the CSV from your Goodreads export. Shelves map to statuses
          (read &rarr; finished, currently-reading &rarr; reading, to-read
          &rarr; want to read) and 1–5 ratings are scaled to /10.
        </p>
        <input
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-background file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:bg-accent/80 disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import CSV"}
        </button>
        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-500">
            {state.error}
          </p>
        )}
        {state.added !== undefined && (
          <p className="text-sm text-green-600 dark:text-green-500">
            Added {state.added} book{state.added === 1 ? "" : "s"}. Skipped{" "}
            {state.skipped ?? 0} duplicate{state.skipped === 1 ? "" : "s"}.
          </p>
        )}
      </form>
    </details>
  );
}
