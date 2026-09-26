"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) return toast.error("Enter your email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/dashboard`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent!");
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <span className="h-14 w-14 rounded-xl bg-neon-gradient flex items-center justify-center shadow-glow mb-4 mx-auto">
          <Mail size={24} className="text-white" />
        </span>
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        {sent ? (
          <p className="text-white/60">Check your email for a password reset link.</p>
        ) : (
          <>
            <p className="text-white/50 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
            <input
              type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 mb-4 focus:outline-none focus:border-accent"
            />
            <button onClick={handleReset} disabled={loading} className="w-full btn-neon text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="animate-spin" size={16} />} Send Reset Link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
