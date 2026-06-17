"use client";

import { WifiOff } from "lucide-react";

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({
  message = "Could not load data. Check your internet connection.",
  onRetry,
}: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <WifiOff size={26} className="text-red-400" />
      </div>
      <p className="text-gray-700 font-medium text-base leading-relaxed max-w-xs">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="min-h-[48px] px-8 bg-indigo-600 text-white font-semibold rounded-2xl shadow-sm active:scale-95 transition-transform"
        >
          Retry
        </button>
      )}
    </div>
  );
}
