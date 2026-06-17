"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { BookOpen, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/spinner";

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  section: string;
  teacher_id: string;
  teachers: { name: string; school_name: string } | null;
}

export default function ConnectPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<ClassInfo | null>(null);

  useEffect(() => {
    const classId = localStorage.getItem("scanner_class_id");
    if (classId) router.replace(`/dashboard/${classId}/tests`);
  }, [router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("classes")
      .select("id, name, grade, section, teacher_id, teachers(name, school_name)")
      .eq("class_code", trimmed.toUpperCase())
      .single();

    if (dbError || !data) {
      setError("Class code not found. Please check with your teacher.");
      setLoading(false);
      return;
    }
    const result = data as unknown as ClassInfo;
    localStorage.setItem("scanner_class_id", result.id);
    localStorage.setItem("scanner_class_name", result.name);
    localStorage.setItem("scanner_class_grade", result.grade);
    localStorage.setItem("scanner_class_section", result.section ?? "");
    localStorage.setItem("scanner_teacher_id", result.teacher_id);
    localStorage.setItem("scanner_school_name", result.teachers?.school_name ?? "");
    localStorage.setItem("scanner_teacher_name", result.teachers?.name ?? "");
    setConnected(result);
    setLoading(false);
  }

  if (connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-3.5rem)] pb-safe">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-200">
              <CheckCircle2 size={44} className="text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-gray-900">Connected!</h1>
            <p className="text-base font-bold text-gray-700">
              Grade {connected.grade} — {connected.name}
              {connected.section ? <span className="ml-1.5 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-md px-2 py-0.5">{connected.section}</span> : null}
            </p>
            <p className="text-sm text-gray-400">{connected.teachers?.school_name || "—"}</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/${connected.id}/tests`)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-base active:scale-95 transition-transform shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
          >
            View Tests <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-3.5rem)] pb-safe">
      <div className="w-full max-w-sm space-y-8">

        {/* Icon + title */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-300/40">
            <BookOpen size={36} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Enter Class Code</h1>
            <p className="text-sm text-gray-400 mt-1.5">Ask your teacher for the class code</p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="space-y-3">
          <input
            type="text"
            placeholder="E.G. K7M2P9"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full px-5 py-5 rounded-2xl border-2 border-gray-100 bg-white text-2xl font-black text-center text-gray-900 placeholder:text-gray-200 placeholder:font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tracking-[0.4em] uppercase shadow-sm transition-all"
            onFocus={(e) => {
              setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
            }}
          />

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span className="text-red-400">⚠</span>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-4 rounded-2xl text-white font-black text-base active:scale-[0.97] transition-all flex items-center justify-center gap-2",
              loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-xl shadow-indigo-200 hover:shadow-indigo-300"
            )}
          >
            {loading ? <><Spinner size="sm" /> Connecting…</> : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}
