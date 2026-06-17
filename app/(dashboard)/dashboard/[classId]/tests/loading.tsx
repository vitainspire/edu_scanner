import { ArrowLeft } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 -ml-1">
        <div className="p-2 text-gray-300">
          <ArrowLeft size={24} />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" />
        </div>
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
