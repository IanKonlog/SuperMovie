"use client";

import { useState, useTransition } from "react";
import { createShareLink, revokeShareLink } from "../share";

export function ShareButton({ activeToken }: { activeToken: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const state = await createShareLink();
      if (state.url) setUrl(state.url);
    });
  }

  function revoke() {
    startTransition(async () => {
      await revokeShareLink();
      setUrl(null);
    });
  }

  function copy() {
    if (!url) return;
    navigator.clipboard?.writeText(`${window.location.origin}${url}`).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => undefined,
    );
  }

  const active = url ?? activeToken;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active ? (
        <>
          <button
            type="button"
            onClick={copy}
            className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-background transition hover:bg-foreground/80"
          >
            {copied ? "Copied ✓" : "Copy share link"}
          </button>
          <button
            type="button"
            onClick={revoke}
            disabled={pending}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-surface-2"
          >
            Revoke
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-surface-2"
        >
          {pending ? "Creating…" : "Create share link"}
        </button>
      )}
    </div>
  );
}
