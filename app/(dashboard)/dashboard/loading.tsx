export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-4 w-36 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="h-24 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse"
          />
        ))}
      </ul>
    </div>
  );
}
