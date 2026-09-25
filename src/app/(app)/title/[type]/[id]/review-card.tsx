"use client";

import { useState } from "react";

export function ReviewCard({
  author,
  createdAt,
  rating,
  content,
}: {
  author: string;
  createdAt: string | null;
  rating: number | null;
  content: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 320;

  return (
    <article className="break-inside-avoid rounded-xl border border-line bg-surface p-4 transition hover:border-muted/50">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-background">
          {author.charAt(0).toUpperCase()}
        </span>
        <span className="font-medium">{author}</span>
        {rating !== null && (
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            {rating}/10
          </span>
        )}
        {createdAt && (
          <span className="ml-auto text-xs text-muted">{createdAt}</span>
        )}
      </div>
      <p
        className={`mt-2 text-sm leading-relaxed text-foreground/80 ${
          expanded ? "" : "line-clamp-6"
        }`}
      >
        {content}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-muted underline transition hover:text-foreground"
        >
          {expanded ? "Show less" : "Read full review"}
        </button>
      )}
    </article>
  );
}
