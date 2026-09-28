"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import type { AdminUser } from "@/types";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import clsx from "clsx";

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [admissionOpen, setAdmissionOpen] = useState<boolean | null>(null);
  const [admissionMsg, setAdmissionMsg] = useState<string | null>(null);
  const [admissionSaving, setAdmissionSaving] = useState(false);

  // Manage Admins (multi-admin)
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function loadAdmins() {
    setAdminsLoading(true);
    const { data } = await supabase.from("admins").select("id, email, full_name, created_at").order("created_at");
    setAdmins((data as AdminUser[]) ?? []);
    setAdminsLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentEmail(data.user?.email ?? "");
      setCurrentId(data.user?.id ?? "");
    })();
    (async () => {
      const { data } = await supabase.from("home_content").select("admission_open").eq("id", 1).maybeSingle();
      setAdmissionOpen(data?.admission_open ?? true);
    })();
    loadAdmins();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(null);
    if (addPassword.length < 6) {
      setAddMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setAddBusy(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, password: addPassword, fullName: addName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddMsg({ type: "error", text: json.error ?? "Could not add admin." });
        return;
      }
      setAddMsg({ type: "success", text: `${addEmail} is now an admin. Share this password with them: ${addPassword}` });
      setAddEmail("");
      setAddName("");
      setAddPassword("");
      loadAdmins();
    } finally {
      setAddBusy(false);
    }
  }

  async function removeAdmin(id: string) {
    if (!confirm("Remove this admin's access? Their login will still work as a normal account, only the admin role is revoked.")) return;
    setRemovingId(id);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Could not remove admin.");
        return;
      }
      loadAdmins();
    } finally {
      setRemovingId(null);
    }
  }

  async function saveAdmissionStatus(nextValue: boolean) {
    setAdmissionSaving(true);
    setAdmissionMsg(null);
    const { error } = await supabase.from("home_content").update({ admission_open: nextValue }).eq("id", 1);
    setAdmissionSaving(false);
    if (error) {
      setAdmissionMsg(error.message);
      return;
    }
    setAdmissionOpen(nextValue);
    setAdmissionMsg(
      nextValue
        ? "Admissions are now open. Students can apply on the website."
        : "Admissions are now closed. New students can still create an account, but the admission form is blocked until you reopen admissions."
    );
  }

  async function changeEmail() {
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailMsg(error ? error.message : "Confirmation link sent to your new email address.");
  }

  async function changePassword() {
    setPwMsg(null);
    if (newPassword !== confirmPassword) return setPwMsg("Passwords do not match.");
    if (newPassword.length < 6) return setPwMsg("Password must be at least 6 characters.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwMsg(error ? error.message : "Password updated successfully.");
    if (!error) { setNewPassword(""); setConfirmPassword(""); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Settings</h1>

      <div className="glass-card p-6">
        <h2 className="mb-1 font-semibold text-white">Admission Control</h2>
        <p className="mb-4 text-sm text-slate-400">
          Turn admissions off to hide the admission form from new applicants. Existing accounts and already-approved
          students are not affected.
        </p>
        {admissionMsg && <p className="mb-3 text-sm text-cyan-300">{admissionMsg}</p>}
        {admissionOpen === null ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="flex items-center gap-3">
            <button
              disabled={admissionSaving}
              onClick={() => saveAdmissionStatus(true)}
              className={clsx(
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                admissionOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-400 hover:bg-white/10"
              )}
            >
              Admissions Open
            </button>
            <button
              disabled={admissionSaving}
              onClick={() => saveAdmissionStatus(false)}
              className={clsx(
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                !admissionOpen ? "bg-red-500/20 text-red-300" : "bg-white/5 text-slate-400 hover:bg-white/10"
              )}
            >
              Admissions Closed
            </button>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-1 font-semibold text-white">Manage Admins</h2>
        <p className="mb-4 text-sm text-slate-400">
          Add more admin accounts so more than one person can manage the dashboard, or remove one that no longer needs access.
        </p>

        {adminsLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <ul className="mb-5 space-y-2">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2.5">
                <div>
                  <p className="text-sm text-slate-100">
                    {a.email}
                    {a.id === currentId && <span className="ml-2 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">YOU</span>}
                  </p>
                  {a.full_name && <p className="text-xs text-slate-500">{a.full_name}</p>}
                </div>
                {a.id !== currentId && (
                  <button
                    onClick={() => removeAdmin(a.id)}
                    disabled={removingId === a.id || admins.length <= 1}
                    className="text-slate-500 transition hover:text-red-300 disabled:opacity-40"
                    aria-label="Remove admin"
                  >
                    {removingId === a.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {addMsg && (
          <div
            className={clsx(
              "mb-3 rounded-lg border px-4 py-2.5 text-sm",
              addMsg.type === "error" ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            )}
          >
            {addMsg.text}
          </div>
        )}
        <form onSubmit={addAdmin} className="space-y-3">
          <input className="input-field" type="email" required placeholder="New admin's email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
          <input className="input-field" placeholder="Full name (optional)" value={addName} onChange={(e) => setAddName(e.target.value)} />
          <PasswordInput placeholder="Set a password for them" value={addPassword} onChange={setAddPassword} autoComplete="new-password" />
          <button disabled={addBusy} className="btn-primary w-full">
            {addBusy ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
            Add Admin
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold text-white">Change Email</h2>
        {emailMsg && <p className="mb-3 text-sm text-cyan-300">{emailMsg}</p>}
        <p className="mb-3 text-sm text-slate-400">Current: {currentEmail}</p>
        <div className="flex gap-2">
          <input className="input-field" type="email" placeholder="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <button onClick={changeEmail} className="btn-primary !py-2">Save</button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold text-white">Change Password</h2>
        {pwMsg && <p className="mb-3 text-sm text-cyan-300">{pwMsg}</p>}
        <div className="space-y-3">
          <PasswordInput placeholder="New Password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordInput placeholder="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          <button onClick={changePassword} className="btn-primary !py-2">Save</button>
        </div>
      </div>
    </div>
  );
}
