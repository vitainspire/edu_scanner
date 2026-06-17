"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StudentRow {
  id: string;
  name: string;
  roll_number: number;
  score: number | null;
}

interface Props {
  classId: string;
  testId: string;
  classInfo: { grade: string; section: string; name: string };
  testInfo: { topic: string; total_marks: number };
  pendingStudents: StudentRow[];
  doneStudents: StudentRow[];
}

export function ScanProgressView({ classId, testId, classInfo, testInfo, pendingStudents, doneStudents }: Props) {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem("scanContext", JSON.stringify({
      classLabel: `Grade ${classInfo.grade} · ${classInfo.section} · ${classInfo.name}`,
      testLabel: testInfo.topic,
    }));
  }, [classInfo, testInfo]);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [router]);

  function goToCamera(studentId: string, studentName: string) {
    router.push(
      `/dashboard/${classId}/tests/${testId}/scan/camera` +
      `?studentId=${studentId}&studentName=${encodeURIComponent(studentName)}`
    );
  }

  const total = pendingStudents.length + doneStudents.length;
  const done = doneStudents.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const allDone = total > 0 && pendingStudents.length === 0;

  return (
    <div className="pb-safe">

      {/* ── Full-bleed dark header ─────────────────────────────── */}
      <div
        className="-mx-4 -mt-5 px-5 pt-5 pb-6"
        style={{ background: allDone
          ? "linear-gradient(145deg, #064e3b 0%, #065f46 50%, #047857 100%)"
          : "linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)"
        }}
      >
        <Link
          href={`/dashboard/${classId}/tests`}
          className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>

        <p className="text-[10px] font-black tracking-[0.25em] uppercase text-indigo-300/70 mb-1">
          Grade {classInfo.grade} &middot; {classInfo.section} &middot; {classInfo.name}
        </p>
        <h1 className="text-xl font-black text-white leading-tight truncate">{testInfo.topic}</h1>
        <p className="text-xs text-white/40 mt-0.5 font-medium">{testInfo.total_marks} marks</p>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-white">
                {done} of {total} scanned
              </p>
              {allDone && (
                <p className="flex items-center gap-1 text-xs font-bold text-emerald-300 mt-0.5">
                  <Sparkles size={11} />
                  All papers scanned!
                </p>
              )}
              {!allDone && total > 0 && (
                <p className="text-xs text-white/40 mt-0.5">{pendingStudents.length} remaining</p>
              )}
            </div>
            <span className={cn(
              "text-4xl font-black tabular-nums",
              allDone ? "text-emerald-300" : "text-white"
            )}>
              {pct}%
            </span>
          </div>

          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                allDone ? "bg-emerald-400" : "bg-indigo-400"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Student sections ───────────────────────────────────── */}
      <div className="pt-5 space-y-6">

        {/* Pending */}
        {pendingStudents.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <p className="text-[11px] font-black tracking-[0.2em] uppercase text-gray-400">
                Pending — {pendingStudents.length}
              </p>
            </div>
            <ul className="space-y-2">
              {pendingStudents.map((s) => (
                <li key={s.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 min-h-[64px]">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-xs font-black text-gray-500 tabular-nums">
                    {String(s.roll_number).padStart(2, "0")}
                  </div>
                  <span className="text-sm font-bold text-gray-800 flex-1 min-w-0 truncate">
                    {s.name}
                  </span>
                  <button
                    onClick={() => goToCamera(s.id, s.name)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold px-4 rounded-xl active:scale-95 transition-transform shadow-md shadow-indigo-200 min-h-[44px] shrink-0"
                    aria-label={`Scan ${s.name}`}
                  >
                    <Camera size={15} />
                    Scan
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Done */}
        {doneStudents.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-[11px] font-black tracking-[0.2em] uppercase text-emerald-600">
                Done — {doneStudents.length}
              </p>
            </div>
            <ul className="space-y-2">
              {doneStudents.map((s) => {
                const pctScore = testInfo.total_marks > 0 ? (s.score ?? 0) / testInfo.total_marks : 0;
                const scoreColor = pctScore >= 0.7 ? "text-emerald-600" : pctScore >= 0.4 ? "text-amber-600" : "text-red-500";
                return (
                  <li key={s.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-gray-100 min-h-[64px]">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-xs font-black text-emerald-600 tabular-nums">
                      {String(s.roll_number).padStart(2, "0")}
                    </div>
                    <span className="text-sm font-semibold text-gray-500 flex-1 min-w-0 truncate">
                      {s.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-sm font-black tabular-nums", scoreColor)}>
                        {s.score ?? "—"}
                        <span className="text-gray-300 font-normal"> / {testInfo.total_marks}</span>
                      </span>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
