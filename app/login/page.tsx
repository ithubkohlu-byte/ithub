"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return toast.error("Enter email and password");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <span className="h-14 w-14 rounded-xl bg-neon-gradient flex items-center justify-center shadow-glow mb-4">
            <GraduationCap size={26} className="text-white" />
          </span>
          <h1 className="text-2xl font-bold">Student Login</h1>
          <p className="text-white/50 text-sm mt-1">Access your admission dashboard</p>
        </div>
        <div className="space-y-4">
          <input
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-accent"
          />
          <input
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-accent"
          />
          <button onClick={handleLogin} disabled={loading} className="w-full btn-neon text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Loader2 className="animate-spin" size={16} />} Login
          </button>
        </div>
        <div className="flex justify-between mt-6 text-sm">
          <Link href="/forgot-password" className="text-accent hover:underline">Forgot Password?</Link>
          <Link href="/apply" className="text-white/50 hover:underline">Apply for Admission</Link>
        </div>
      </div>
    </div>
  );
}
