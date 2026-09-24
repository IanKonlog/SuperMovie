"use client";

import { useState } from "react";
import { PosterRow } from "@/modules/media/components/poster-row";
import { QuickAdd } from "@/modules/media/components/quick-add";
import { useHoverPanel } from "@/modules/media/components/use-hover-panel";
import { titleHref } from "../links";
import type { Recommendation } from "../types";

const VISIBLE_STEP = 6;

type Selection = Recommendation & {
  key: string;
  anchor: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

export function RecommendationsSection({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const panel = useHoverPanel<Selection>();
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);

  if (recommendations.length === 0) return null;
  const visible = recommendations.slice(0, visibleCount);

  return (
    <section aria-label="Recommendations" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">We think you&rsquo;ll love these</h2>
      <PosterRow
        items={visible.map((rec) => ({
          key: `${rec.type}:${rec.tmdbId}`,
          posterUrl: rec.posterUrl,
          title: rec.title,
          rating: rec.voteAverage > 0 ? rec.voteAverage : undefined,
          badge:
            rec.because.length > 0
              ? `Because of ${rec.because[0]}`
              : rec.releaseDate?.slice(0, 4),
          href: titleHref(rec.type, rec.tmdbId),
          onHoverStart: (anchor) =>
            panel.hoverOpen({
              ...rec,
              key: `${rec.type}:${rec.tmdbId}`,
              anchor,
            }),
          onHoverEnd: panel.hoverClose,
        }))}
      />
      {visibleCount < recommendations.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + VISIBLE_STEP)}
          className="self-start rounded-full border border-line px-4 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          Show more ({recommendations.length - visibleCount})
        </button>
      )}
      {panel.active && (
        <QuickAdd
          item={panel.active}
          anchor={panel.active.anchor}
          onClose={panel.close}
          onPanelMouseEnter={panel.keepAlive}
          onPanelMouseLeave={panel.hoverClose}
        />
      )}
    </section>
  );
}
