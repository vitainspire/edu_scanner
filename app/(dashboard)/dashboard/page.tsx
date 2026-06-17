"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const classId = localStorage.getItem("scanner_class_id");
    if (classId) {
      router.replace(`/dashboard/${classId}/tests`);
    } else {
      router.replace("/dashboard/connect");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}
