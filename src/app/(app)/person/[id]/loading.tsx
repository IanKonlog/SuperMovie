export default function Loading() {
  return (
    <div className="page-enter flex flex-col gap-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-72 w-48 shrink-0 animate-pulse rounded-2xl bg-surface-2" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-10 w-64 animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-96 animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-80 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
      <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="aspect-[2/3] w-full animate-pulse rounded-lg bg-surface-2"
          />
        ))}
      </div>
    </div>
  );
}
