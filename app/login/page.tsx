"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Eye, EyeOff, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.push("/dashboard/connect");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      setSignupDone(true);
      setLoading(false);
    }
  }

  if (signupDone) {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center px-5 login-bg pb-safe">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl px-8 py-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto shadow-lg shadow-indigo-300/40">
            <ScanLine size={30} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              Confirmation sent to <span className="font-semibold text-gray-700">{email}</span>
            </p>
          </div>
          <button
            onClick={() => { setSignupDone(false); setMode("login"); }}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            Back to Sign In
          </button>
        </div>
        <p className="mt-8 text-xs text-white/20 tracking-widest uppercase">by vitainspire</p>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-5 relative overflow-y-auto pb-safe" style={{background: "radial-gradient(ellipse at 30% 20%, #4338ca 0%, #1e1b4b 45%, #0a0918 100%)"}}>

      {/* Decorative blurs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Card top */}
          <div className="px-8 pt-9 pb-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto shadow-xl shadow-indigo-400/30">
              <ScanLine size={30} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">EduScanner</h1>
              <p className="text-xs text-gray-400 mt-1 font-medium">AI-powered answer sheet scanning</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mx-6 mb-6 flex rounded-2xl bg-gray-100 p-1">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={cn(
                  "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200",
                  mode === m
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black tracking-[0.2em] uppercase text-gray-400">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@school.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/80 text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black tracking-[0.2em] uppercase text-gray-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 bg-gray-50/80 text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span className="text-red-400 text-base leading-none mt-0.5">⚠</span>
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-4 rounded-2xl text-white font-black text-sm tracking-wide transition-all active:scale-[0.97]",
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-300/40 hover:shadow-indigo-400/50 hover:from-indigo-700 hover:to-indigo-800"
              )}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>

            {mode === "login" && (
              <p className="text-center text-xs text-gray-400 pt-1">
                No account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Register free
                </button>
              </p>
            )}
          </form>
        </div>
      </div>

      <p className="mt-8 text-[10px] text-white/20 tracking-[0.3em] uppercase">by vitainspire</p>
    </main>
  );
}
