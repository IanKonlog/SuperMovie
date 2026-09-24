import Image from "next/image";

export function Poster({
  posterUrl,
  title,
  size,
}: {
  posterUrl: string | null;
  title: string;
  size: number;
}) {
  return posterUrl ? (
    <Image
      src={posterUrl}
      alt={`Poster for ${title}`}
      width={size}
      height={Math.round(size * 1.5)}
      className="h-auto w-full rounded-md"
      unoptimized
    />
  ) : (
    <div
      style={{ aspectRatio: "2 / 3" }}
      className="flex w-full items-center justify-center rounded-md bg-surface-2 text-xs text-muted"
    >
      No poster
    </div>
  );
}
