"use client";

import Image from "next/image";
import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { addMediaItem, type ActionState } from "../actions";
import { titleHref } from "@/modules/tmdb/links";
import {
  WATCH_STATUSES,
  WATCH_STATUS_LABELS,
  type MediaTypeValue,
  type WatchStatusValue,
} from "../constants";
import { fetchSeasonListAction } from "@/modules/tmdb/actions";

const initialState: ActionState = {};

export type QuickAddAnchor = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type QuickAddItem = {
  title: string;
  type: MediaTypeValue;
  tmdbId: number | null;
  posterUrl: string | null;
  backdropUrl?: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  genres: string[];
};

export function QuickAdd({
  item,
  onClose,
  anchor,
  onPanelMouseEnter,
  onPanelMouseLeave,
}: {
  item: QuickAddItem;
  onClose: () => void;
  anchor?: QuickAddAnchor;
  onPanelMouseEnter?: () => void;
  onPanelMouseLeave?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    addMediaItem,
    initialState,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<WatchStatusValue>("WATCHING");
  const [currentSeason, setCurrentSeason] = useState("");
  const [seasonOptions, setSeasonOptions] = useState<number[] | null>(null);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  useEffect(() => {
    if (item.type !== "SERIES" || item.tmdbId === null) return;
    let cancelled = false;
    fetchSeasonListAction(item.tmdbId).then((result) => {
      if (cancelled) return;
      setSeasonOptions(result.seasons.map((s) => s.seasonNumber));
    });
    return () => {
      cancelled = true;
    };
  }, [item.type, item.tmdbId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const anchored = anchor !== undefined;

  useEffect(() => {
    if (!anchored) return;
    function onDown(event: MouseEvent) {
      const panel = panelRef.current;
      if (panel && !panel.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [anchored, onClose]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || anchor === undefined) return;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = Math.max(
      16,
      Math.min(
        anchor.left + anchor.width / 2 - width / 2,
        window.innerWidth - width - 16,
      ),
    );
    const top = Math.max(
      16,
      Math.min(
        anchor.top + anchor.height / 2 - height / 2,
        window.innerHeight - height - 16,
      ),
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.visibility = "visible";
  }, [anchor]);

  const imageSrc = item.backdropUrl ?? item.posterUrl;
  const selectClasses =
    "rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-muted";

  function panelContent() {
    return (
      <div
        ref={panelRef}
        onMouseEnter={onPanelMouseEnter}
        onMouseLeave={onPanelMouseLeave}
        style={
          anchored ? { visibility: "hidden", position: "fixed" } : undefined
        }
        className={`pop-enter overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-overlay)] ${
          anchored ? "z-50 w-[19rem]" : "relative mx-auto my-8 max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={anchored ? "relative h-32" : "relative h-44 sm:h-60"}>
          {imageSrc && (
            <Image
              src={imageSrc}
              alt=""
              fill
              priority
              sizes={anchored ? "304px" : "(max-width: 640px) 100vw, 672px"}
              className="object-cover object-top"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-base transition hover:bg-black"
          >
            ✕
          </button>
          <h2
            className={`absolute bottom-2 left-4 right-4 font-extrabold ${
              anchored ? "text-lg" : "bottom-3 text-2xl sm:left-6 sm:text-3xl"
            }`}
          >
            {item.title}
          </h2>
        </div>

        <div className={anchored ? "p-3" : "p-4 sm:p-6"}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {item.voteAverage !== null && item.voteAverage > 0 && (
              <span className="font-medium text-green-600 dark:text-green-500">
                {Math.round(item.voteAverage * 10)}% match
              </span>
            )}
            {item.releaseDate && (
              <span className="text-muted">{item.releaseDate.slice(0, 4)}</span>
            )}
            <span className="text-muted">
              {item.type === "MOVIE" ? "Movie" : "Series"}
            </span>
          </div>
          {item.genres.length > 0 && (
            <p className="mt-1 text-xs text-muted">{item.genres.join(" · ")}</p>
          )}
          {item.overview && (
            <p
              className={`mt-2 text-sm text-foreground/80 ${
                anchored ? "line-clamp-3" : "line-clamp-4"
              }`}
            >
              {item.overview}
            </p>
          )}

          <form action={formAction} className="mt-4">
            <input type="hidden" name="title" value={item.title} />
            <input type="hidden" name="type" value={item.type} />
            {item.tmdbId !== null && (
              <input type="hidden" name="tmdbId" value={item.tmdbId} />
            )}
            {item.posterUrl && (
              <input type="hidden" name="posterUrl" value={item.posterUrl} />
            )}
            {item.overview && (
              <input type="hidden" name="overview" value={item.overview} />
            )}
            {item.releaseDate && (
              <input
                type="hidden"
                name="releaseDate"
                value={item.releaseDate}
              />
            )}
            {item.voteAverage !== null && item.voteAverage > 0 && (
              <input
                type="hidden"
                name="voteAverage"
                value={item.voteAverage.toFixed(1)}
              />
            )}
            {item.genres.length > 0 && (
              <input
                type="hidden"
                name="genres"
                value={item.genres.join(",")}
              />
            )}

            {item.type === "SERIES" &&
              status !== "COMPLETED" &&
              seasonOptions !== null &&
              seasonOptions.length > 0 && (
                <div className="rounded-lg bg-background/60 p-2.5">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-muted">
                      Currently on season
                    </span>
                    <select
                      name="currentSeason"
                      value={currentSeason}
                      onChange={(e) => setCurrentSeason(e.target.value)}
                      className={selectClasses}
                    >
                      <option value="">Not tracking</option>
                      {seasonOptions.map((n) => (
                        <option key={n} value={n}>
                          Season {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {currentSeason !== "" && (
                    <label className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        name="markPrevious"
                        value="true"
                        defaultChecked
                        className="accent-red-600"
                      />
                      Previous seasons watched
                    </label>
                  )}
                </div>
              )}

            <div
              className={
                anchored
                  ? "flex items-end gap-2"
                  : "flex flex-wrap items-center gap-3"
              }
            >
              <label
                className={`flex flex-col gap-1 text-xs ${anchored ? "w-20" : ""}`}
              >
                <span className="font-medium text-muted">Your rating</span>
                <select name="rating" defaultValue="" className={selectClasses}>
                  <option value="">—</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}/10
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={`flex flex-col gap-1 text-xs ${anchored ? "flex-1" : ""}`}
              >
                <span className="font-medium text-muted">Status</span>
                <select
                  name="status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as WatchStatusValue)
                  }
                  className={selectClasses}
                >
                  {WATCH_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {WATCH_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={pending}
                className="mt-1 self-end rounded-md bg-foreground px-3 py-2 text-sm font-bold text-background transition hover:bg-foreground/80 disabled:opacity-50"
              >
                {pending ? "Adding…" : "＋ Add"}
              </button>
              {item.tmdbId !== null && (
                <Link
                  href={titleHref(item.type, item.tmdbId)}
                  onClick={onClose}
                  className="mt-1 self-center px-2 py-2 text-xs text-muted underline transition hover:text-foreground"
                >
                  Full page ↗
                </Link>
              )}
              {state.error && (
                <span className="mt-1 text-sm text-red-600 dark:text-red-500">
                  {state.error}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return createPortal(
    anchored ? (
      <div className="fixed inset-0 z-50">{panelContent()}</div>
    ) : (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Add ${item.title}`}
        className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 sm:p-10"
        onClick={onClose}
      >
        {panelContent()}
      </div>
    ),
    document.body,
  );
}
