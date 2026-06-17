"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, RefreshCw, Save, Zap, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { Spinner } from "@/components/spinner";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";

interface Student {
  id: string;
  name: string;
  roll_number: number;
}

type Stage = "capture" | "preview" | "grading" | "manual";

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────

function CameraPageInner() {
  const params = useParams<{ classId: string; testId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preSelectedStudentId = searchParams.get("studentId");
  const preSelectedStudentName = searchParams.get("studentName") ?? "";

  const [stage, setStage] = useState<Stage>("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [gradingLabel, setGradingLabel] = useState<string>("Grading with AI…");
  const [manualScore, setManualScore] = useState<string>("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalMarks, setTotalMarks] = useState<number>(0);
  const [testTopic, setTestTopic] = useState<string>("");
  const [testSubject, setTestSubject] = useState<string>("");
  const [questions, setQuestions] = useState<unknown[]>([]);

  const { classId, testId } = params;

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const testPromise = supabase
        .from("tests")
        .select("total_marks, topic, subject, questions")
        .eq("id", testId)
        .single();

      if (!preSelectedStudentId) {
        const [testRes, studentsRes] = await Promise.all([
          testPromise,
          supabase
            .from("students")
            .select("id, name, roll_number")
            .eq("class_id", classId)
            .eq("is_active", true)
            .order("roll_number"),
        ]);
        if (studentsRes.data) setStudents(studentsRes.data as unknown as Student[]);
        applyTestData(testRes.data);
      } else {
        const testRes = await testPromise;
        applyTestData(testRes.data);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, testId, preSelectedStudentId]);

  function applyTestData(data: unknown) {
    if (!data) return;
    interface TestData { total_marks: number; topic: string; subject: string; questions: unknown }
    const test = data as unknown as TestData;
    setTotalMarks(test.total_marks);
    setTestTopic(test.topic ?? "");
    setTestSubject(test.subject ?? "");
    const raw = test.questions;
    const parsed: unknown = raw
      ? (typeof raw === "string" ? JSON.parse(raw) : raw)
      : [];
    setQuestions(Array.isArray(parsed) ? parsed : []);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStage("preview");
    setGradingError(null);
  }

  function handleRetake() {
    setStage("capture");
    setPreviewUrl(null);
    setImageFile(null);
    setGradingError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleManualSave() {
    const score = Number(manualScore);
    if (!preSelectedStudentId || isNaN(score) || score < 0 || score > totalMarks) return;
    setIsSavingManual(true);
    try {
      const saveRes = await fetch("/api/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: preSelectedStudentId, testId, score, totalMarks, source: "manual" }),
      });
      if (!saveRes.ok) {
        const body = (await saveRes.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save score");
      }
      router.push(`/dashboard/${classId}/tests/${testId}/scan`);
      router.refresh();
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : "Failed to save. Try again.");
      setIsSavingManual(false);
    }
  }

  async function handlePreSelectedGrade() {
    if (!imageFile) return;
    setStage("grading");
    setGradingError(null);
    setGradingLabel("Grading with AI…");

    try {
      const { base64, mimeType } = await readFileAsBase64(imageFile);

      const gradeRes = await fetch("/api/grade-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          studentId: preSelectedStudentId,
          studentName: preSelectedStudentName,
          totalMarks,
          topic: testTopic,
          subject: testSubject,
          questions,
        }),
      });

      if (!gradeRes.ok) {
        const body = (await gradeRes.json()) as { error?: string };
        throw new Error(body.error ?? `Grading failed (${gradeRes.status})`);
      }

      const { score } = (await gradeRes.json()) as { score: number | null };

      if (score === null) {
        setManualScore("");
        setStage("manual");
        return;
      }

      setGradingLabel("Saving score…");

      const saveRes = await fetch("/api/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: preSelectedStudentId, testId, score, totalMarks }),
      });

      if (!saveRes.ok) {
        const body = (await saveRes.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save score");
      }

      router.push(`/dashboard/${classId}/tests/${testId}/scan`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please retake.";
      setGradingError(msg);
      setStage("preview");
    }
  }

  async function handleMatchedGrade() {
    if (!imageFile) return;
    setStage("grading");
    setGradingError(null);
    setGradingLabel("Grading with AI…");

    try {
      const { base64, mimeType } = await readFileAsBase64(imageFile);

      const res = await fetch("/api/grade-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          students: students.map((s) => ({ id: s.id, name: s.name, rollNumber: s.roll_number })),
          totalMarks,
          topic: testTopic,
          subject: testSubject,
          questions,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const result = (await res.json()) as { matchedStudent: Student | null; score: number | null };

      sessionStorage.setItem("scanResult", JSON.stringify({ ...result, students, totalMarks }));
      router.push(`/dashboard/${classId}/tests/${testId}/scan/confirm`);
    } catch {
      sessionStorage.setItem(
        "scanResult",
        JSON.stringify({ matchedStudent: null, score: null, students, totalMarks })
      );
      router.push(`/dashboard/${classId}/tests/${testId}/scan/confirm`);
    }
  }

  function handleConfirmAndGrade() {
    if (preSelectedStudentId) {
      void handlePreSelectedGrade();
    } else {
      void handleMatchedGrade();
    }
  }

  const backHref = `/dashboard/${classId}/tests/${testId}/scan`;

  const stageTitle =
    stage === "capture" ? "Take Photo"
    : stage === "preview" ? "Preview"
    : stage === "grading" ? "Grading…"
    : "Enter Score";

  const isManualSaveDisabled =
    isSavingManual ||
    manualScore === "" ||
    isNaN(Number(manualScore)) ||
    Number(manualScore) < 0 ||
    Number(manualScore) > totalMarks;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 3.5rem - env(safe-area-inset-top, 0px))" }}>

      {/* ── Full-bleed header ─────────────────────────────────── */}
      <div
        className="-mx-4 -mt-5 px-5 pt-4 pb-5 mb-4"
        style={{ background: stage === "manual"
          ? "linear-gradient(145deg, #78350f 0%, #92400e 100%)"
          : "linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)"
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white active:scale-95 transition-transform shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black text-white leading-tight">{stageTitle}</h1>
            {preSelectedStudentId ? (
              <p className="text-xs font-bold text-indigo-300/80 truncate mt-0.5">
                {preSelectedStudentName}
              </p>
            ) : (
              <div className="mt-0.5 [&_*]:text-white/50 [&_*]:text-xs">
                <BreadcrumbBar />
              </div>
            )}
          </div>
          {totalMarks > 0 && (
            <span className="shrink-0 text-xs font-black text-white/50 bg-white/10 rounded-lg px-2 py-1">
              /{totalMarks}
            </span>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden
      />

      {/* ── Capture stage ──────────────────────────────────────── */}
      {stage === "capture" && (
        <div className="flex-1 flex flex-col items-center justify-between gap-5 pb-safe">
          {/* Viewfinder area */}
          <div
            className="w-full flex-1 rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-4"
            style={{
              background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
              minHeight: "min(55vw, 40vh)",
            }}
          >
            {/* Scanning frame corners */}
            <div className="relative w-40 h-52">
              <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-indigo-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-indigo-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-indigo-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-indigo-400 rounded-br-lg" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <ScanLine size={28} className="text-indigo-400/60" />
                <p className="text-xs text-indigo-300/50 font-medium text-center px-2">
                  Align answer sheet here
                </p>
              </div>
            </div>
          </div>

          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[60px] bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-300/30 active:scale-[0.97] transition-transform flex items-center justify-center gap-3"
          >
            <Camera size={24} />
            Take Photo
          </button>
        </div>
      )}

      {/* ── Preview / Grading / Manual stages ─────────────────── */}
      {stage !== "capture" && previewUrl && (
        <div className="flex-1 flex flex-col gap-4 pb-safe">

          {/* Image */}
          <div
            className="relative flex-1 rounded-3xl overflow-hidden bg-gray-900 flex items-center justify-center"
            style={{ minHeight: "min(55vw, 40vh)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Captured answer sheet"
              className="w-full h-full object-contain"
            />

            {/* Grading overlay */}
            {stage === "grading" && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                <div className="bg-white rounded-3xl px-8 py-7 flex flex-col items-center gap-4 mx-8 shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-gray-900 text-lg">{gradingLabel}</p>
                    {preSelectedStudentId && (
                      <p className="text-sm font-bold text-indigo-600 mt-0.5">{preSelectedStudentName}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">Please keep the screen on…</p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual stage label */}
            {stage === "manual" && (
              <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-black tracking-widest uppercase rounded-lg px-2.5 py-1.5">
                Manual Entry
              </div>
            )}
          </div>

          {/* Preview action buttons */}
          {stage === "preview" && (
            <>
              {gradingError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <p className="text-sm text-amber-800 font-medium">{gradingError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 min-h-[56px] border-2 border-gray-200 text-gray-700 font-bold text-base rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 bg-white"
                >
                  <RefreshCw size={18} />
                  Retake
                </button>
                <button
                  onClick={handleConfirmAndGrade}
                  className="flex-[2] min-h-[56px] bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-base rounded-2xl shadow-xl shadow-indigo-200 active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                >
                  <Zap size={18} />
                  Grade with AI
                </button>
              </div>
            </>
          )}

          {/* Manual score entry */}
          {stage === "manual" && (
            <div className="flex flex-col gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
                <p className="text-sm font-bold text-amber-800">AI couldn&apos;t read the score</p>
                <p className="text-xs text-amber-600 mt-0.5">Enter the marks manually by checking the answer sheet.</p>
              </div>

              <div className="bg-white rounded-2xl border-2 border-gray-100 px-5 py-4">
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400 mb-2">
                  Score out of {totalMarks}
                </p>
                <input
                  id="manual-score"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={totalMarks}
                  step="0.5"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder="0"
                  className="w-full text-5xl font-black text-center text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-200 py-2"
                  onFocus={() => {
                    setTimeout(() => {
                      document.getElementById("manual-score")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 350);
                  }}
                />
                {manualScore !== "" && !isNaN(Number(manualScore)) && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (Number(manualScore) / totalMarks) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-right mt-1 font-medium">
                      {totalMarks > 0 ? Math.round((Number(manualScore) / totalMarks) * 100) : 0}%
                    </p>
                  </div>
                )}
              </div>

              {gradingError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-red-600 font-medium">{gradingError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 min-h-[56px] border-2 border-gray-200 text-gray-700 font-bold text-base rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 bg-white"
                >
                  <RefreshCw size={18} />
                  Retake
                </button>
                <button
                  onClick={() => void handleManualSave()}
                  disabled={isManualSaveDisabled}
                  className={cn(
                    "flex-[2] min-h-[56px] font-black text-base rounded-2xl transition-transform flex items-center justify-center gap-2",
                    isManualSaveDisabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-200 active:scale-[0.97]"
                  )}
                >
                  {isSavingManual ? <Spinner size="sm" /> : <Save size={18} />}
                  Save Score
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function CameraPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      }
    >
      <CameraPageInner />
    </Suspense>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("Unexpected FileReader result type"));
        return;
      }
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx === -1) {
        reject(new Error("Malformed data URL"));
        return;
      }
      const header = dataUrl.slice(0, commaIdx);
      const base64 = dataUrl.slice(commaIdx + 1);
      const mimeType = header.replace("data:", "").replace(";base64", "") || "image/jpeg";
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
