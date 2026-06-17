import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase-server";

// Allow up to 60 s on Vercel (Hobby: 60s max, Pro: 300s max)
export const maxDuration = 60;

// ── Rate limiting ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count += 1;
  return false;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentInput {
  id: string;
  name: string;
  rollNumber: number;
}

interface Question {
  text: string;
  difficulty: "easy" | "medium" | "hard";
  marks?: number;
}

interface RequestBody {
  imageBase64: string;
  mimeType?: string;
  // Pre-selected student mode: provide studentId + studentName
  studentId?: string;
  studentName?: string;
  // Student-matching mode: provide students array
  students?: StudentInput[];
  totalMarks: number;
  topic: string;
  subject: string;
  questions: Question[];
}

interface OpenRouterMessage {
  content: string;
}

interface OpenRouterChoice {
  message: OpenRouterMessage;
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

interface AiResult {
  studentName: string | null;
  score: number | null;
  confidence?: "high" | "medium" | "low";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in an hour." },
      { status: 429 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    imageBase64,
    mimeType = "image/jpeg",
    studentId,
    studentName,
    students,
    totalMarks,
    topic,
    subject,
    questions,
  } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: "Missing required field: imageBase64" }, { status: 400 });
  }
  // Either a pre-selected student or a students list must be provided
  if (!studentId && !Array.isArray(students)) {
    return NextResponse.json(
      { error: "Provide either studentId or students array" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
  }

  // ── Build question list ───────────────────────────────────────────────────────
  const questionList =
    Array.isArray(questions) && questions.length > 0
      ? questions
          .map((q: Question & { answer?: string }, i: number) =>
            `Q${i + 1} [${q.marks ?? "?"} marks]: ${q.text}\n     Correct answer: ${q.answer ?? "evaluate based on subject knowledge"}`
          )
          .join("\n\n")
      : "Questions not available";

  // ── Shared grading rules ─────────────────────────────────────────────────────
  const gradingRules =
    `Grading rules:\n` +
    `- Be lenient with equivalent correct answers — accept alternate valid wordings, spellings, and formats\n` +
    `- 'Seven thousand nine' and 'Seven thousand and nine' are both correct\n` +
    `- '10000 + 4000 + 500 + 2' and '10,000 + 4,000 + 500 + 2' are both correct\n` +
    `- For fill-in-the-blank, accept any answer that is mathematically or semantically equivalent to the correct answer\n` +
    `- For MCQ, accept the letter (B), the value (4,123), or both together\n` +
    `- Only mark wrong if the answer is clearly incorrect, not just formatted differently from the stored answer\n` +
    `- When in doubt, award the mark`;

  // ── Build prompt ─────────────────────────────────────────────────────────────
  const prompt = studentId
    ? // Pre-selected: skip name detection, focus on score
      `You are an AI grader evaluating a student's handwritten answer sheet photo from an Indian school exam.\n\n` +
      `The student is: ${studentName ?? "Unknown"}\n` +
      `Subject: ${subject ?? "Unknown"}\n` +
      `Topic: ${topic ?? "Unknown"}\n` +
      `Total marks: ${totalMarks}\n\n` +
      `Exam questions:\n${questionList}\n\n` +
      `Read the student's handwritten answers and evaluate each one against the questions above.\n\n` +
      `${gradingRules}\n\n` +
      `Return ONLY a valid JSON object with no other text. Example format:\n` +
      `{ "score": 7, "breakdown": [{ "question": 1, "awarded": 1, "max": 2 }], "confidence": "high" }\n\n` +
      `- score: total marks earned as a whole number from 0 to ${totalMarks} — NEVER null, NEVER a string\n` +
      `- confidence: exactly "high", "medium", or "low"\n` +
      `- If you cannot read an answer clearly, award 0 marks for that question — do not use null`
    : // Unknown student: detect name + grade
      `You are an AI grader evaluating a student's handwritten answer sheet photo from an Indian school exam.\n\n` +
      `Subject: ${subject ?? "Unknown"}\n` +
      `Topic: ${topic ?? "Unknown"}\n` +
      `Total marks: ${totalMarks}\n\n` +
      `Exam questions:\n${questionList}\n\n` +
      `Look at the photo and:\n` +
      `1. Find the student's name written at the top\n` +
      `2. Read each handwritten answer and evaluate it against the corresponding question above\n` +
      `3. Award marks per question based on correctness and completeness\n` +
      `4. Sum up the total score (maximum ${totalMarks})\n\n` +
      `${gradingRules}\n\n` +
      `Return ONLY a valid JSON object with no other text. Example format:\n` +
      `{ "studentName": "Rahul Sharma", "score": 7, "breakdown": [{ "question": 1, "awarded": 1, "max": 2 }] }\n\n` +
      `- studentName: name as written on the paper, or null if not visible\n` +
      `- score: total marks earned as a whole number from 0 to ${totalMarks} — NEVER null, NEVER a string\n` +
      `- If you cannot read an answer clearly, award 0 marks for that question — do not use null`;

  // ── Call OpenRouter ───────────────────────────────────────────────────────────
  let openRouterRes: Response;
  try {
    openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://eduscanner.app",
        "X-Title": "EduScanner",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[grade-scan] OpenRouter fetch error:", err);
    return NextResponse.json({ error: "Failed to reach grading service" }, { status: 502 });
  }

  if (!openRouterRes.ok) {
    const errText = await openRouterRes.text();
    console.error("[grade-scan] OpenRouter error:", openRouterRes.status, errText);
    return NextResponse.json(
      { error: `Grading service returned ${openRouterRes.status}` },
      { status: 502 }
    );
  }

  const orData = (await openRouterRes.json()) as OpenRouterResponse;
  const rawContent = orData.choices[0]?.message?.content ?? "";
  const aiResult = parseAiJson(rawContent);

  // ── Pre-selected student: return score + confidence directly ─────────────────
  if (studentId) {
    return NextResponse.json({
      studentId,
      studentName: studentName ?? null,
      score: typeof aiResult.score === "number" ? aiResult.score : null,
      confidence: aiResult.confidence ?? "low",
    });
  }

  // ── Unknown student: match name from list ────────────────────────────────────
  const matchedStudent = findClosestStudent(aiResult.studentName, students ?? []);
  return NextResponse.json({
    matchedStudent: matchedStudent ?? null,
    score: typeof aiResult.score === "number" ? aiResult.score : null,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAiJson(text: string): AiResult {
  const fallback: AiResult = { studentName: null, score: null };

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match?.[0]) return fallback;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return fallback;
    }
  }

  if (typeof parsed !== "object" || parsed === null) return fallback;

  const obj = parsed as Record<string, unknown>;
  const confidence = obj["confidence"];
  return {
    studentName: typeof obj["studentName"] === "string" ? obj["studentName"] : null,
    score: typeof obj["score"] === "number" ? obj["score"] : null,
    confidence:
      confidence === "high" || confidence === "medium" || confidence === "low"
        ? confidence
        : undefined,
  };
}

function findClosestStudent(
  aiName: string | null,
  students: StudentInput[]
): StudentInput | undefined {
  if (!aiName) return undefined;

  const needle = aiName.toLowerCase().trim();

  const exact = students.find((s) => s.name.toLowerCase() === needle);
  if (exact) return exact;

  return students.find(
    (s) =>
      s.name.toLowerCase().includes(needle) ||
      needle.includes(s.name.toLowerCase())
  );
}
