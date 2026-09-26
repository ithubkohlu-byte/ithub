"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, Mail, KeyRound } from "lucide-react";

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  async function handleEmailChange() {
    if (!email) return toast.error("Enter a new email");
    setLoadingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoadingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("Confirmation link sent to new email");
    setEmail("");
  }

  async function handlePasswordChange() {
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoadingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoadingPassword(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPassword("");
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><Mail size={18} /> Change Email</h2>
        <div className="flex gap-3">
          <input type="email" placeholder="New email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm" />
          <button onClick={handleEmailChange} disabled={loadingEmail} className="btn-neon text-white px-5 py-2.5 rounded-lg text-sm">
            {loadingEmail ? <Loader2 className="animate-spin" size={16} /> : "Update"}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><KeyRound size={18} /> Change Password</h2>
        <div className="flex gap-3">
          <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm" />
          <button onClick={handlePasswordChange} disabled={loadingPassword} className="btn-neon text-white px-5 py-2.5 rounded-lg text-sm">
            {loadingPassword ? <Loader2 className="animate-spin" size={16} /> : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
