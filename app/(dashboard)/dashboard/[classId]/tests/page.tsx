import { createServerComponentClient } from "@/lib/supabase-server";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ClipboardList, FileText } from "lucide-react";

interface Props {
  params: { classId: string };
}

interface ClassInfo { grade: string; section: string; name: string; }
interface TestRow { id: string; topic: string; total_marks: number; conducted_on: string; subject: string; term: string | null; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TestsPage({ params }: Props) {
  const supabase = await createServerComponentClient();
  const [classResult, testsResult] = await Promise.all([
    supabase.from("classes").select("grade, section, name").eq("id", params.classId).single(),
    supabase.from("tests").select("id, topic, total_marks, conducted_on, subject, term").eq("class_id", params.classId).order("conducted_on", { ascending: false }),
  ]);

  if (classResult.error) throw new Error(classResult.error.message);
  if (testsResult.error) throw new Error(testsResult.error.message);

  const cls = classResult.data as ClassInfo;
  const tests = (testsResult.data ?? []) as TestRow[];

  return (
    <div>
      {/* ── Full-bleed dark header ─────────────────────────────── */}
      <div
        className="-mx-4 -mt-5 px-5 pt-5 pb-7"
        style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)" }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium mb-5 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>

        <p className="text-[10px] font-black tracking-[0.25em] uppercase text-indigo-300/70 mb-1">
          Grade {cls.grade} &middot; {cls.section} &middot; {cls.name}
        </p>
        <h1 className="text-2xl font-black text-white leading-tight">Select a Test</h1>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-bold text-white/50 bg-white/10 rounded-full px-3 py-1">
            {tests.length} {tests.length === 1 ? "test" : "tests"}
          </span>
        </div>
      </div>

      {/* ── Test list ──────────────────────────────────────────── */}
      <div className="pt-4">
        {tests.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ClipboardList size={28} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-500">No tests yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Tests created by your teacher will appear here</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {tests.map((test, i) => (
              <li key={test.id}>
                <Link
                  href={`/dashboard/${params.classId}/tests/${test.id}/scan`}
                  className="group flex items-center bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all hover:shadow-md hover:border-indigo-100 min-h-[76px]"
                >
                  {/* Index badge */}
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mr-4 group-hover:bg-indigo-100 transition-colors">
                    <FileText size={16} className="text-indigo-400" />
                  </div>

                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-base font-bold text-gray-900 leading-snug truncate">
                      {test.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{formatDate(test.conducted_on)}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-50 rounded-md px-1.5 py-0.5">
                        {test.total_marks} marks
                      </span>
                      {test.subject && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400 truncate">{test.subject}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-400 shrink-0 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
