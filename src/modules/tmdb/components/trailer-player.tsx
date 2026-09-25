"use client";

import Image from "next/image";
import { useState } from "react";

export function TrailerPlayer({
  youtubeKey,
  title,
}: {
  youtubeKey: string;
  title: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex w-full justify-center">
      <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-black sm:w-[86%]">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            aria-label={`Play trailer: ${title}`}
            className="group absolute inset-0 h-full w-full"
          >
            {/* hqdefault is 4:3 with letterbox bars; object-cover on a 16:9
                box crops exactly to the picture. No iframe exists until this
                is tapped, so embeds can never affect page layout on load. */}
            <Image
              src={`https://i.ytimg.com/vi/${youtubeKey}/hqdefault.jpg`}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              unoptimized
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/10">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/75 text-xl text-white transition group-hover:scale-105 group-hover:bg-accent group-hover:text-background">
                ▶
              </span>
            </span>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-xs font-medium text-white">
              Play trailer
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
