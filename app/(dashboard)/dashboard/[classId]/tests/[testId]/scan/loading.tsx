export default function Loading() {
  return (
    <div className="space-y-5 pb-32">
      {/* Header skeleton */}
      <div className="flex items-start gap-2 -ml-1">
        <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Progress card skeleton */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-3 bg-gray-100 rounded-full animate-pulse" />
      </div>

      {/* Student rows skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mx-1" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-amber-50 border border-amber-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
