export default function Loading() {
  return (
    <div className="page-enter flex flex-col gap-8">
      <div className="relative -mx-4 h-[420px] animate-pulse bg-surface-2 sm:-mx-8 lg:-mx-12 lg:h-[500px]" />
      <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-surface-2"
          />
        ))}
      </div>
      <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
      <div className="aspect-video w-full max-w-3xl animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}
