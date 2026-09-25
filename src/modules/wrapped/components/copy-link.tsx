"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const absolute = `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", absolute);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-line px-4 py-2 text-sm transition hover:bg-surface-2"
    >
      {copied ? "Link copied ✓" : "Copy share link"}
    </button>
  );
}
