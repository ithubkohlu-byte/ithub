"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Wifi, ArrowLeft, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instituteName] = useState("IT HUB KOHLU");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/verify?type=recovery`,
    });
    setLoading(false);
    if (err) return setError(err.message);
    setSent(true);
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "#05070d" }}
    >
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(34,211,238,0.03) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(34,211,238,0.03) 40px)",
          zIndex: 0,
        }}
      />

      <div
        className="relative w-full max-w-sm"
        style={{
          zIndex: 10,
          background: "rgba(5,7,13,0.88)",
          border: "1px solid rgba(34,211,238,0.2)",
          borderRadius: 16,
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 60px -10px rgba(34,211,238,0.15)",
        }}
      >
        <div className="absolute left-0 right-0 top-0 h-0.5 rounded-t-2xl" style={{ background: "linear-gradient(90deg,transparent,#22d3ee 40%,#3b82f6 60%,transparent)" }} />

        <div className="p-8">
          <Link href="/" className="mb-6 flex flex-col items-center gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}>
              <Wifi size={18} className="text-cyan-400" />
            </div>
            <span className="font-display text-xs font-bold neon-text" style={{ letterSpacing: "0.15em" }}>
              {instituteName}
            </span>
          </Link>

          {!sent ? (
            <>
              <h1 className="mb-1 text-center font-display text-lg font-bold text-white" style={{ letterSpacing: "0.05em" }}>
                Reset Access Key
              </h1>
              <p className="mb-6 text-center text-xs text-slate-500" style={{ fontFamily: "var(--font-mono)" }}>
                Enter your email to receive a reset link
              </p>

              {error && (
                <div className="mb-4 rounded-lg px-4 py-2.5 text-xs text-red-300" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontFamily: "var(--font-mono)" }}>
                  <span className="text-red-400/60">ERR: </span>{error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    className="input-field"
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button disabled={loading} className="btn-primary w-full !rounded-lg text-xs" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em" }}>
                  {loading ? <><Loader2 className="animate-spin" size={14} /> SENDING...</> : "SEND RESET LINK →"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)" }}>
                <ShieldCheck size={24} className="text-cyan-400" />
              </div>
              <h2 className="font-display text-base font-bold text-white">Reset Link Sent</h2>
              <p className="mt-2 text-xs text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>
                Check your inbox at <span className="text-cyan-300">{email}</span>
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Link href="/login" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-300 transition-colors" style={{ fontFamily: "var(--font-mono)" }}>
              <ArrowLeft size={13} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
