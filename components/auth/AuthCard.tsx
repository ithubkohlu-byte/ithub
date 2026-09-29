"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, User, AtSign, Phone, Eye, EyeOff, ArrowRight, Check, X } from "lucide-react";
import OAuthButtons from "@/components/OAuthButtons";
import { loginSchema, signupSchema, firstError } from "@/lib/validations";

type Mode = "login" | "signup";
type UStatus = "idle" | "checking" | "ok" | "taken" | "invalid";

function Field({ i, label, icon, children }: { i: number; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="au-row" style={{ "--i": i } as React.CSSProperties}>
      <label className="au-lbl">{label}</label>
      <div className="au-field">
        {icon}
        {children}
      </div>
    </div>
  );
}

export default function AuthCard({ initialMode = "login" }: { initialMode?: Mode }) {
  const supabase = createClient();
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [f, setF] = useState({ identifier: "", password: "", full_name: "", username: "", email: "", phone: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [uStatus, setUStatus] = useState<UStatus>("idle");
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  // ---------- interactivity: cursor glow + 3D tilt ----------
  function onMove(e: React.PointerEvent) {
    root.current?.style.setProperty("--mx", `${e.clientX}px`);
    root.current?.style.setProperty("--my", `${e.clientY}px`);
    const c = card.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    c.style.setProperty("--cx", `${x * 100}%`);
    c.style.setProperty("--cy", `${y * 100}%`);
    c.style.transform = `rotateY(${(x - 0.5) * 8}deg) rotateX(${(0.5 - y) * 8}deg)`;
  }
  function onLeave() {
    if (card.current) card.current.style.transform = "";
  }

  function switchMode() {
    if (phase === "out" || loading) return;
    const next: Mode = mode === "login" ? "signup" : "login";
    setPhase("out");
    setTimeout(() => {
      setMode(next);
      setError(null);
      setShowPw(false);
      setPhase("in");
      window.history.replaceState(null, "", next === "login" ? "/login" : "/signup");
    }, 280);
  }

  async function checkUsername(v: string) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(v)) return setUStatus(v ? "invalid" : "idle");
    setUStatus("checking");
    const { data, error: e } = await supabase.rpc("is_username_available", { p_username: v });
    setUStatus(e ? "idle" : data ? "ok" : "taken");
  }

  function finish(path: string) {
    setDone(true);
    setTimeout(() => router.push(path), 900);
  }

  function friendly(e: any): string {
    const msg = String(e?.message ?? "");
    if (msg.includes("students_username_lower_idx") || msg.toLowerCase().includes("username")) return "That username is already taken. Please choose another.";
    if (msg.includes("students_email_key")) return "An account with that email already exists.";
    return msg || "Something went wrong.";
  }

  async function login() {
    const err0 = firstError(loginSchema.safeParse({ identifier: f.identifier, password: f.password }));
    if (err0) throw new Error(err0);
    let email = f.identifier.trim();
    if (email && !email.includes("@")) {
      const { data, error: e } = await supabase.rpc("get_email_by_username", { p_username: email });
      if (e || !data) throw new Error("No account found with that username.");
      email = data;
    }
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: f.password });
    if (err) throw err;
    const { data: adminRow } = await supabase.from("admins").select("id").eq("id", data.user.id).maybeSingle();
    finish(adminRow ? "/admin" : "/dashboard");
  }

  async function signup() {
    const err0 = firstError(
      signupSchema.safeParse({ full_name: f.full_name, username: f.username, email: f.email, phone: f.phone, confirm: f.password })
    );
    if (err0) throw new Error(err0);
    if (uStatus === "taken") throw new Error("That username is already taken.");
    if (f.password !== f.confirm) throw new Error("Passwords do not match.");
    const { data, error: signErr } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: { data: { full_name: f.full_name } },
    });
    if (signErr) throw signErr;
    const uid = data.user?.id;
    if (!uid) throw new Error("Signup did not return a user. Check your email to confirm, then log in.");
    const { error: insErr } = await supabase.from("students").insert({
      id: uid,
      full_name: f.full_name,
      email: f.email,
      phone: f.phone,
      username: f.username,
      auth_provider: "password",
      onboarding_step: 2,
    });
    if (insErr) throw insErr;
    finish("/apply?step=continue");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await (mode === "login" ? login() : signup());
    } catch (err: any) {
      setError(friendly(err));
      setLoading(false);
    }
  }

  const p = f.password;
  const score = [p.length >= 8, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  const bar = ["#ef4444", "#f97316", "#facc15", "#22c55e"][Math.max(score - 1, 0)];
  const eye = (
    <button type="button" tabIndex={-1} aria-label="Show or hide password" onClick={() => setShowPw((v) => !v)}>
      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
  const pwType = showPw ? "text" : "password";
  const isLogin = mode === "login";

  return (
    <main ref={root} className="au-root" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="au-streak s1" />
      <div className="au-streak s2" />

      <div ref={card} className="au-card">
        {done && (
          <div className="au-ok">
            <div className="au-ring"><Check size={34} strokeWidth={3} /></div>
          </div>
        )}

        <div key={mode} className="au-body" data-phase={phase}>
          <Link href="/" className="au-row" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="au-brand">IT HUB KOHLU</span>
          </Link>

          <h1 className="au-title au-row" style={{ "--i": 1 } as React.CSSProperties}>
            {isLogin ? <>Welcome <b>Back</b></> : <>Create <b>Account</b></>}
          </h1>
          <p className="au-sub au-row" style={{ "--i": 2 } as React.CSSProperties}>
            {isLogin ? "Enter your credentials to access your student portal" : "Join us today to start your admission"}
          </p>

          <form onSubmit={submit} className="au-form">
            {error && <div key={error} className="au-err">{error}</div>}

            {isLogin ? (
              <>
                <Field i={3} label="Username or Email" icon={<Mail size={16} />}>
                  <input required autoComplete="username" placeholder="salam776 or name@domain.com" value={f.identifier} onChange={(e) => set("identifier", e.target.value)} />
                </Field>
                <Field i={4} label="Password" icon={<Lock size={16} />}>
                  <input required autoComplete="current-password" type={pwType} placeholder="••••••••" value={f.password} onChange={(e) => set("password", e.target.value)} />
                  {eye}
                </Field>
                <div className="au-row au-forgot" style={{ "--i": 5 } as React.CSSProperties}>
                  <Link href="/forgot-password">Forgot password?</Link>
                </div>
              </>
            ) : (
              <>
                <Field i={3} label="Full Name" icon={<User size={16} />}>
                  <input required autoComplete="name" placeholder="Your full name" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </Field>
                <Field i={4} label="Username (also your login ID)" icon={<AtSign size={16} />}>
                  <input required autoComplete="off" placeholder="e.g. salam776" value={f.username} onChange={(e) => { const v = e.target.value.replace(/\s/g, ""); set("username", v); checkUsername(v); }} />
                  {uStatus === "checking" && <Loader2 size={15} className="animate-spin" />}
                  {uStatus === "ok" && <Check size={15} style={{ color: "#22c55e" }} />}
                  {(uStatus === "taken" || uStatus === "invalid") && <X size={15} style={{ color: "#ef4444" }} />}
                </Field>
                <Field i={5} label="Email Address" icon={<Mail size={16} />}>
                  <input required type="email" autoComplete="email" placeholder="name@domain.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field i={6} label="Phone" icon={<Phone size={16} />}>
                  <input required type="tel" autoComplete="tel" placeholder="03XX XXXXXXX" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field i={7} label="Password" icon={<Lock size={16} />}>
                  <input required autoComplete="new-password" type={pwType} placeholder="Min 6 characters" value={f.password} onChange={(e) => set("password", e.target.value)} />
                  {eye}
                </Field>
                {p && (
                  <div className="au-strength">
                    {[0, 1, 2, 3].map((n) => <i key={n} style={n < score ? { background: bar } : undefined} />)}
                  </div>
                )}
                <Field i={8} label="Confirm Password" icon={<Lock size={16} />}>
                  <input required autoComplete="new-password" type={pwType} placeholder="Repeat password" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} />
                  {f.confirm && (f.confirm === p ? <Check size={15} style={{ color: "#22c55e" }} /> : <X size={15} style={{ color: "#ef4444" }} />)}
                </Field>
              </>
            )}

            <div className="au-row" style={{ "--i": 9 } as React.CSSProperties}>
              <button className="au-btn" disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>{isLogin ? "Sign In" : "Create Account"} <ArrowRight size={17} /></>}
              </button>
            </div>
          </form>

          <div className="au-row au-or" style={{ "--i": 10 } as React.CSSProperties}>
            <span /> or continue with <span />
          </div>
          <div className="au-row" style={{ "--i": 11 } as React.CSSProperties}>
            <OAuthButtons redirectAfter={isLogin ? "/dashboard" : "/apply"} />
          </div>

          <p className="au-row au-switch" style={{ "--i": 12 } as React.CSSProperties}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={switchMode}>{isLogin ? "Sign Up" : "Sign In"}</button>
          </p>
        </div>
      </div>
    </main>
  );
}
