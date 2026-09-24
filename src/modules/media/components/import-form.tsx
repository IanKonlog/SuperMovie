"use client";

import { useActionState } from "react";
import { importLibrary, type ImportState } from "../actions";

const initial: ImportState = {};

export function ImportForm() {
  const [state, action, pending] = useActionState(importLibrary, initial);

  return (
    <details className="rounded-xl border border-line bg-surface p-3">
      <summary className="cursor-pointer text-sm text-muted transition hover:text-foreground">
        Import data
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <textarea
          name="json"
          rows={5}
          placeholder="Paste the contents of a supermovie-export.json file…"
          className="rounded-lg border border-line bg-background px-3 py-2 font-mono text-xs outline-none focus:border-muted"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/80 disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import"}
        </button>
        {state.error && <p className="text-sm text-red-500">{state.error}</p>}
        {state.imported !== undefined && (
          <p className="text-sm text-green-500">
            Imported {state.imported} title{state.imported === 1 ? "" : "s"}.
          </p>
        )}
      </form>
    </details>
  );
}
