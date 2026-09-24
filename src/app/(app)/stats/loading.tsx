export default function Loading() {
  return (
    <div className="page-enter flex flex-col gap-8">
      <div className="h-9 w-44 animate-pulse rounded bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="h-6 w-52 animate-pulse rounded bg-surface-2" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
