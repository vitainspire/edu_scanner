"use client";

import { ErrorDisplay } from "@/components/error-display";

export default function ScanError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorDisplay onRetry={reset} />;
}
