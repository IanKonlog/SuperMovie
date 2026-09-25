"use client";

import Link from "next/link";
import { useRef } from "react";
import { Poster } from "@/modules/media/components/poster";

export type PosterRowItem = {
  key: string;
  posterUrl: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  rating?: number;
  year?: string;
  href?: string;
  onSelect?: (anchor: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) => void;
  onDismiss?: () => void;
  onHoverStart?: (anchor: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) => void;
  onHoverEnd?: () => void;
};

export function PosterRow({ items }: { items: PosterRowItem[] }) {
  const scroller = useRef<HTMLUListElement>(null);

  function scroll(direction: 1 | -1) {
    scroller.current?.scrollBy({ left: direction * 560, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <div className="group relative">
      <ul
        ref={scroller}
        className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1"
      >
        {items.map((item) => {
          const content = (
            <>
              <div className="relative w-full transition duration-200 ease-out hover:z-10 hover:scale-105 hover:shadow-[var(--shadow-hover)]">
                <Poster
                  posterUrl={item.posterUrl}
                  title={item.title}
                  size={160}
                />
                {item.badge && (
                  <span className="absolute bottom-1 left-1 rounded-sm bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="line-clamp-1 text-xs text-muted">
                  {item.subtitle}
                </p>
              )}
            </>
          );
          return (
            <li key={item.key} className="w-36 shrink-0 sm:w-40">
              {item.href ? (
                <div className="relative">
                  <Link
                    href={item.href}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      item.onHoverStart?.({
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      });
                    }}
                    onMouseLeave={item.onHoverEnd}
                    onFocus={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      item.onHoverStart?.({
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      });
                    }}
                    onBlur={item.onHoverEnd}
                    className="block w-full"
                  >
                    {content}
                  </Link>
                  {item.onDismiss && (
                    <button
                      type="button"
                      aria-label={`Dismiss ${item.title}`}
                      onClick={item.onDismiss}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white opacity-0 transition group-hover:opacity-100 hover:bg-black"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : item.onSelect ? (
                <button
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    item.onSelect?.({
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    item.onHoverStart?.({
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                  }}
                  onMouseLeave={item.onHoverEnd}
                  onFocus={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    item.onHoverStart?.({
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                  }}
                  onBlur={item.onHoverEnd}
                  className="w-full text-left"
                >
                  {content}
                </button>
              ) : (
                <div className="w-full">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className="absolute top-1/4 -left-3 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-black/70 text-lg opacity-0 transition group-hover:opacity-100 md:flex"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className="absolute top-1/4 -right-3 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-black/70 text-lg opacity-0 transition group-hover:opacity-100 md:flex"
      >
        ›
      </button>
    </div>
  );
}
