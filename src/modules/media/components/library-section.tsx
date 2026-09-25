"use client";

import Link from "next/link";
import { Fragment, useRef, useState, useTransition } from "react";
import { Poster } from "./poster";
import { titleHref } from "@/modules/tmdb/links";
import { MediaDetailPanel } from "./media-detail-panel";
import { bulkUpdateStatus } from "../actions";
import {
  WATCH_STATUSES,
  WATCH_STATUS_LABELS,
  type MediaItemDTO,
  type SeasonDTO,
} from "../constants";

const STATUS_DOT: Record<string, string> = {
  WATCHING: "bg-blue-500",
  WANT_TO_WATCH: "bg-amber-500",
  COMPLETED: "bg-green-600",
  ON_HOLD: "bg-neutral-500",
  DROPPED: "bg-red-600",
};

export function LibrarySection({
  page,
  items,
  seasonsByItem,
  watchedByItem,
  emptyMessage,
  pagination,
}: {
  page: number;
  items: MediaItemDTO[];
  seasonsByItem: Record<string, SeasonDTO[]>;
  watchedByItem: Record<string, string[]>;
  emptyMessage: string;
  pagination: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("COMPLETED");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLLIElement>(null);

  function selectAndReveal(id: string) {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    if (next !== null) {
      requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }
  }

  function toggleChecked(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setChecked(new Set());
    setBulkError(null);
  }

  function applyBulk() {
    if (checked.size === 0) return;
    const formData = new FormData();
    formData.set("status", bulkStatus);
    for (const id of checked) {
      formData.append("ids", id);
    }
    startTransition(async () => {
      const result = await bulkUpdateStatus({ success: true }, formData);
      if (result.error) {
        setBulkError(result.error);
        return;
      }
      exitSelectMode();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          {selectMode ? (
            <>
              <select
                aria-label="Set status for selected"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none focus:border-muted"
              >
                {WATCH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WATCH_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulk}
                disabled={pending || checked.size === 0}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-background transition hover:bg-accent/80 disabled:opacity-40"
              >
                {pending ? "Applying…" : `Apply to ${checked.size} selected`}
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="text-sm text-muted transition hover:text-foreground"
              >
                Cancel
              </button>
              {bulkError && (
                <p className="text-sm text-red-600 dark:text-red-500">
                  {bulkError}
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="text-xs text-muted underline-offset-2 transition hover:text-foreground hover:underline"
            >
              Select for bulk status…
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <ul
          key={page}
          className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6"
        >
          {items.map((item, index) => (
            <Fragment key={item.id}>
              <li
                className="card-enter"
                style={{ "--i": index } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() =>
                    selectMode
                      ? toggleChecked(item.id)
                      : selectAndReveal(item.id)
                  }
                  aria-pressed={selectMode ? checked.has(item.id) : undefined}
                  aria-expanded={
                    selectMode ? undefined : item.id === selectedId
                  }
                  aria-label={
                    selectMode ? `Select ${item.title}` : `Manage ${item.title}`
                  }
                  className={`relative w-full text-left transition duration-200 ease-out hover:scale-[1.04] hover:drop-shadow-[var(--shadow-hover)] ${
                    selectMode && checked.has(item.id)
                      ? "opacity-70 ring-2 ring-accent rounded-md"
                      : ""
                  }`}
                >
                  <Poster
                    posterUrl={item.posterUrl}
                    title={item.title}
                    size={160}
                  />
                  {selectMode && (
                    <span
                      aria-hidden
                      className={`absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-sm border text-[10px] ${
                        checked.has(item.id)
                          ? "border-accent bg-accent text-background"
                          : "border-line bg-background/80"
                      }`}
                    >
                      {checked.has(item.id) ? "✓" : ""}
                    </span>
                  )}
                  {item.isFavorite && (
                    <span
                      aria-label="Favorite"
                      className="absolute top-1 right-1 text-sm text-amber-400"
                    >
                      ★
                    </span>
                  )}
                  {item.watchCount > 1 && (
                    <span className="absolute bottom-1 right-1 rounded-sm bg-black/85 px-1.5 py-0.5 font-mono text-[10px] text-white">
                      ×{item.watchCount}
                    </span>
                  )}
                </button>
                {item.tmdbId !== null ? (
                  <Link
                    href={titleHref(item.type, item.tmdbId)}
                    aria-label={`Open ${item.title} page`}
                    className="mt-1.5 block line-clamp-1 text-xs font-medium underline-offset-2 transition hover:text-accent hover:underline"
                  >
                    {item.title} ↗
                  </Link>
                ) : (
                  <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                    {item.title}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  {item.voteAverage !== null && item.voteAverage > 0 && (
                    <>
                      <span className="text-amber-400">★</span>
                      <span>{item.voteAverage.toFixed(1)}</span>
                      <span>·</span>
                    </>
                  )}
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`}
                  />
                  {WATCH_STATUS_LABELS[item.status]}
                </p>
              </li>
              {item.id === selectedId && (
                <li ref={panelRef} className="pop-enter col-span-full pb-2">
                  <MediaDetailPanel
                    item={item}
                    seasons={seasonsByItem[item.id] ?? []}
                    watchedKeys={watchedByItem[item.id] ?? []}
                    onClose={() => setSelectedId(null)}
                  />
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}

      {pagination}
    </div>
  );
}
