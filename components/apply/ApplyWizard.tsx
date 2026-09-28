"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepProgress from "./StepProgress";
import { DOC_TYPES, type DocKey } from "@/types";
import type { Batch, Course } from "@/types";
import { generateAdmissionLetter } from "@/lib/pdf";
import { Loader2, UploadCloud, CheckCircle2, Download, LayoutDashboard, MegaphoneOff, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import OAuthButtons from "@/components/OAuthButtons";

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  confirm_password: string;
  father_name: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  student_cnic: string;
  father_cnic: string;
  matric_board: string;
  matric_year: string;
  matric_total: string;
  matric_obtained: string;
  fsc_board: string;
  fsc_year: string;
  fsc_group: string;
  fsc_total: string;
  fsc_obtained: string;
  course_name: string;
  batch_id: string;
};

const EMPTY: FormState = {
  full_name: "", email: "", phone: "", username: "", password: "", confirm_password: "",
  father_name: "", dob: "", gender: "", address: "", city: "", student_cnic: "", father_cnic: "",
  matric_board: "", matric_year: "", matric_total: "", matric_obtained: "",
  fsc_board: "", fsc_year: "", fsc_group: "", fsc_total: "", fsc_obtained: "",
  course_name: "", batch_id: "",
};

export default function ApplyWizard() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Set<DocKey>>(new Set());
  const [batches, setBatches] = useState<(Batch & { course_names: string[] })[]>([]);
  const [openCourses, setOpenCourses] = useState<Course[]>([]);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [admissionNote, setAdmissionNote] = useState<string>("");
  // Qualifications beyond FSc (e.g. BA, BSc) — optional, added on step 3,
  // each one gets its own proof-document upload box on step 4.
  const [additionalQuals, setAdditionalQuals] = useState<
    { id: string; qualification_name: string; institute_name: string; year: string }[]
  >([]);
  const [qualFiles, setQualFiles] = useState<Record<string, File>>({});
  const [qualUploaded, setQualUploaded] = useState<Set<string>>(new Set());
  // Global admission on/off switch, controlled by admin (home_content.admission_open).
  // Account creation (step 1) is always allowed; everything after it requires admission to be open.
  const [blocked, setBlocked] = useState(false);

  // Username availability check (live, while typing on step 1)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  // Someone who just signed in with Google/Facebook/GitHub for the first time:
  // they already have an authenticated session but no `students` row yet, so
  // step 1 just asks them to pick a username instead of email + password.
  const [oauthMode, setOauthMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get("step");
    if (stepParam === "continue") {
      // Coming from the new /signup card: account + profile row already exist.
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: row } = await supabase.from("students").select("id,full_name,email,phone,username").eq("id", user.id).maybeSingle();
        if (!row) return;
        setStudentId(row.id);
        setForm((f) => ({ ...f, full_name: row.full_name ?? "", email: row.email ?? "", phone: row.phone ?? "", username: row.username ?? "" }));
        const open = await isAdmissionOpen();
        if (!open) setBlocked(true); else setStep(2);
      })();
      return;
    }
    if (stepParam !== "username") return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase.from("students").select("id").eq("id", user.id).maybeSingle();
      if (existing) {
        // Already has a profile — nothing left to do here.
        router.push("/dashboard");
        return;
      }
      setOauthMode(true);
      setStudentId(user.id);
      setForm((f) => ({
        ...f,
        full_name: (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? "",
        email: user.email ?? "",
      }));
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkUsername(value: string) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) {
      setUsernameStatus(value ? "invalid" : "idle");
      return;
    }
    setUsernameStatus("checking");
    const { data, error: rpcErr } = await supabase.rpc("is_username_available", { p_username: value });
    if (rpcErr) { setUsernameStatus("idle"); return; }
    setUsernameStatus(data ? "available" : "taken");
  }

  async function isAdmissionOpen() {
    const { data } = await supabase.from("home_content").select("admission_open").eq("id", 1).maybeSingle();
    return data?.admission_open !== false; // default to open if the row/column isn't found
  }

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const matricPct =
    form.matric_total && Number(form.matric_total) > 0
      ? ((Number(form.matric_obtained) / Number(form.matric_total)) * 100).toFixed(2)
      : "0.00";
  const fscPct =
    form.fsc_total && Number(form.fsc_total) > 0
      ? ((Number(form.fsc_obtained) / Number(form.fsc_total)) * 100).toFixed(2)
      : "0.00";

  // Load open batches + open courses once we reach step 5
  useEffect(() => {
    if (step !== 5) return;
    (async () => {
      const [{ data: batchData }, { data: courseData }, { data: homeData }] = await Promise.all([
        supabase.from("batches").select("*, batch_courses(course_name)").eq("is_announced", true).eq("status", "open"),
        supabase.from("courses").select("*").eq("is_open", true).order("display_order", { ascending: true }),
        supabase.from("home_content").select("admission_note").eq("id", 1).maybeSingle(),
      ]);
      const rows = ((batchData as any[]) ?? []).map((b) => ({
        ...b,
        course_names: Array.from(new Set([b.course_name, ...(b.batch_courses ?? []).map((c: any) => c.course_name)])),
      })) as (Batch & { course_names: string[] })[];
      // Every announced, open batch is shown — even once seats are full. Applications
      // are never blocked by seat count; admin shortlists who's actually in later.
      setBatches(rows);
      setOpenCourses((courseData as Course[]) ?? []);
      setAdmissionNote(homeData?.admission_note ?? "");
    })();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- STEP 1: ACCOUNT ----------------
  function friendlyInsertError(e: any): string {
    const msg = String(e?.message ?? "");
    if (msg.includes("students_username_lower_idx") || msg.toLowerCase().includes("username")) {
      return "That username is already taken. Please choose another.";
    }
    if (msg.includes("students_email_key")) {
      return "An account with that email already exists.";
    }
    return msg || "Something went wrong.";
  }

  async function submitStep1() {
    setError(null);
    if (!/^[A-Za-z0-9_]{3,20}$/.test(form.username)) {
      return setError("Username must be 3-20 characters: letters, numbers, or underscore only.");
    }
    if (usernameStatus === "taken") return setError("That username is already taken.");

    // ----- Path A: continuing an OAuth sign-in that has no profile yet -----
    if (oauthMode) {
      if (!studentId) return setError("Your session expired — please sign in again.");
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const provider = (user?.app_metadata?.provider as string) ?? "google";
        const { error: insertErr } = await supabase.from("students").insert({
          id: studentId,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          username: form.username,
          auth_provider: provider,
          onboarding_step: 2,
        });
        if (insertErr) throw insertErr;

        const open = await isAdmissionOpen();
        if (!open) setBlocked(true); else setStep(2);
      } catch (e: any) {
        setError(friendlyInsertError(e));
      } finally {
        setLoading(false);
      }
      return;
    }

    // ----- Path B: normal email + password signup -----
    if (form.password !== form.confirm_password) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      });
      if (signErr) throw signErr;
      const uid = data.user?.id;
      if (!uid) throw new Error("Signup did not return a user. Check your email to confirm, then log in and resume.");

      const { error: insertErr } = await supabase.from("students").insert({
        id: uid,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        username: form.username,
        auth_provider: "password",
        onboarding_step: 2,
      });
      if (insertErr) throw insertErr;

      setStudentId(uid);

      // Account is created either way. Only continue into the admission
      // process itself (personal info, docs, enrollment) if admission is open.
      const open = await isAdmissionOpen();
      if (!open) {
        setBlocked(true);
      } else {
        setStep(2);
      }
    } catch (e: any) {
      setError(friendlyInsertError(e));
    } finally {
      setLoading(false);
    }
  }

  // ---------------- STEP 2: PERSONAL ----------------
  async function submitStep2() {
    if (!studentId) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase
        .from("students")
        .update({
          father_name: form.father_name,
          dob: form.dob,
          gender: form.gender,
          address: form.address,
          city: form.city,
          student_cnic: form.student_cnic,
          father_cnic: form.father_cnic,
          onboarding_step: 3,
        })
        .eq("id", studentId);
      if (err) throw err;
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- ADDITIONAL QUALIFICATIONS (optional, beyond FSc) ----------------
  function addQualificationRow() {
    setAdditionalQuals((qs) => [
      ...qs,
      { id: crypto.randomUUID(), qualification_name: "", institute_name: "", year: "" },
    ]);
  }
  function updateQualificationRow(id: string, field: "qualification_name" | "institute_name" | "year", value: string) {
    setAdditionalQuals((qs) => qs.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  }
  function removeQualificationRow(id: string) {
    setAdditionalQuals((qs) => qs.filter((q) => q.id !== id));
    setQualFiles((f) => {
      const rest = { ...f };
      delete rest[id];
      return rest;
    });
  }

  // ---------------- STEP 3: ACADEMIC ----------------
  async function submitStep3() {
    if (!studentId) return;
    setError(null);

    // FSc (or equivalent) is the minimum qualification for admission — the
    // application cannot move forward without it.
    const fscComplete =
      form.fsc_board.trim() && form.fsc_year.trim() && Number(form.fsc_total) > 0 && form.fsc_obtained.trim();
    if (!fscComplete) {
      return setError("FSc details (board, year, total marks and obtained marks) are required before you can continue.");
    }

    for (const q of additionalQuals) {
      if (!q.qualification_name.trim() || !q.institute_name.trim()) {
        return setError("Please fill in the qualification name and institute for every qualification you've added, or remove it.");
      }
    }

    setLoading(true);
    try {
      const { error: err } = await supabase
        .from("students")
        .update({
          matric_board: form.matric_board,
          matric_year: form.matric_year,
          matric_total: Number(form.matric_total) || 0,
          matric_obtained: Number(form.matric_obtained) || 0,
          fsc_board: form.fsc_board,
          fsc_year: form.fsc_year,
          fsc_group: form.fsc_group,
          fsc_total: Number(form.fsc_total) || 0,
          fsc_obtained: Number(form.fsc_obtained) || 0,
          onboarding_step: 4,
        })
        .eq("id", studentId);
      if (err) throw err;

      // Save any additional qualifications now, so step 4 can render one
      // upload box per qualification using its real database id.
      if (additionalQuals.length > 0) {
        const rows = additionalQuals.map((q) => ({
          student_id: studentId,
          qualification_name: q.qualification_name.trim(),
          institute_name: q.institute_name.trim(),
          year: q.year.trim() || null,
        }));
        const { data: inserted, error: qErr } = await supabase.from("additional_qualifications").insert(rows).select();
        if (qErr) throw qErr;
        setAdditionalQuals(
          ((inserted as any[]) ?? []).map((r) => ({
            id: r.id,
            qualification_name: r.qualification_name,
            institute_name: r.institute_name,
            year: r.year ?? "",
          }))
        );
      }

      setStep(4);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- STEP 4: DOCUMENTS ----------------
  function handleFile(key: DocKey, file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError(`${key}: file must be under 2MB.`);
    const okType = ["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(file.type);
    if (!okType) return setError(`${key}: only JPG/PNG/PDF allowed.`);
    setError(null);
    setFiles((f) => ({ ...f, [key]: file }));
  }

  function handleQualFile(qualId: string, file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError("Qualification certificate: file must be under 2MB.");
    const okType = ["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(file.type);
    if (!okType) return setError("Qualification certificate: only JPG/PNG/PDF allowed.");
    setError(null);
    setQualFiles((f) => ({ ...f, [qualId]: file }));
  }

  async function submitStep4() {
    if (!studentId) return;
    const missing = DOC_TYPES.filter((d) => !files[d.key] && !uploadedDocs.has(d.key));
    const missingQuals = additionalQuals.filter((q) => !qualFiles[q.id] && !qualUploaded.has(q.id));
    if (missing.length > 0 || missingQuals.length > 0) {
      const parts = [...missing.map((m) => m.label), ...missingQuals.map((q) => `${q.qualification_name} certificate`)];
      return setError(`Please upload: ${parts.join(", ")}`);
    }

    setError(null);
    setLoading(true);
    try {
      for (const [key, file] of Object.entries(files) as [DocKey, File][]) {
        const ext = file.name.split(".").pop();
        const path = `${studentId}/${key}.${ext}`;
        const { error: upErr } = await supabase.storage.from("student_docs").upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { error: docErr } = await supabase
          .from("documents")
          .upsert({ student_id: studentId, doc_type: key, file_path: path, status: "pending" }, { onConflict: "student_id,doc_type" });
        if (docErr) throw docErr;

        // photo also stored on the student row for PDF/dashboard use
        if (key === "photo") {
          const { data: signed } = await supabase.storage.from("student_docs").createSignedUrl(path, 60 * 60 * 24 * 365);
          if (signed?.signedUrl) {
            await supabase.from("students").update({ photo_url: signed.signedUrl }).eq("id", studentId);
          }
        }
        setUploadedDocs((s) => new Set(s).add(key));
      }

      for (const [qualId, file] of Object.entries(qualFiles)) {
        const ext = file.name.split(".").pop();
        const path = `${studentId}/qualifications/${qualId}.${ext}`;
        const { error: upErr } = await supabase.storage.from("student_docs").upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { error: qDocErr } = await supabase
          .from("additional_qualifications")
          .update({ document_path: path })
          .eq("id", qualId);
        if (qDocErr) throw qDocErr;
        setQualUploaded((s) => new Set(s).add(qualId));
      }

      await supabase.from("students").update({ onboarding_step: 5 }).eq("id", studentId);
      setStep(5);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- STEP 5: ENROLLMENT + FINAL SUBMIT ----------------
  async function submitFinal() {
    if (!studentId || !form.batch_id || !form.course_name) return setError("Select a course and batch.");
    setError(null);
    setLoading(true);
    try {
      // Re-check right before enrolling: an admin may have closed admissions
      // while this student was filling out the form.
      const open = await isAdmissionOpen();
      if (!open) {
        setBlocked(true);
        return;
      }

      const { error: enrollErr } = await supabase.from("enrollments").insert({
        student_id: studentId,
        batch_id: form.batch_id,
        course_name: form.course_name,
      });
      if (enrollErr) throw enrollErr;

      const { data: studentRow } = await supabase.from("students").select("*").eq("id", studentId).single();
      const batch = batches.find((b) => b.id === form.batch_id);

      let photoDataUrl: string | null = null;
      if (studentRow?.photo_url) {
        try {
          const res = await fetch(studentRow.photo_url);
          const blob = await res.blob();
          photoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          photoDataUrl = null;
        }
      }

      const doc = await generateAdmissionLetter({
        student: studentRow,
        courseName: form.course_name,
        batchName: batch?.batch_name ?? "",
        photoDataUrl,
        note: admissionNote,
      });
      const blobUrl = doc.output("bloburl") as unknown as string;
      setPdfUrl(blobUrl);
      setTrackingId(studentRow.tracking_id);
      setStep(6); // success screen
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {!blocked && step <= 5 && <StepProgress current={step} />}
      {error && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="glass-card p-6 md:p-8">
        {blocked && (
          <div className="space-y-5 text-center">
            <MegaphoneOff className="mx-auto text-amber-400" size={48} />
            <h2 className="font-display text-xl font-semibold text-white">No admission is open</h2>
            <p className="text-slate-400">
              {studentId
                ? "Your account has been created successfully, but admissions are currently closed. You can log in later and continue once admissions reopen."
                : "Admissions are currently closed. Please check back later."}
            </p>
            <button onClick={() => router.push(studentId ? "/dashboard" : "/")} className="btn-primary mx-auto">
              {studentId ? <LayoutDashboard size={18} /> : null} {studentId ? "Go to Dashboard" : "Back to Home"}
            </button>
          </div>
        )}

        {!blocked && step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              {oauthMode ? "Choose your username" : "Create your account"}
            </h2>
            {oauthMode && (
              <p className="-mt-2 text-sm text-slate-400">
                Signed in as <span className="text-cyan-300">{form.email}</span>. Pick a username to finish setting up your profile.
              </p>
            )}

            {!oauthMode && (
              <>
                <Field label="Full Name" value={form.full_name} onChange={(v) => set("full_name", v)} />
                <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
                <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
              </>
            )}

            {/* Username */}
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <input
                  className="input-field pr-9"
                  value={form.username}
                  placeholder="e.g. salam776"
                  onChange={(e) => {
                    const v = e.target.value.replace(/\s/g, "");
                    set("username", v);
                    checkUsername(v);
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && <Loader2 className="animate-spin text-slate-500" size={15} />}
                  {usernameStatus === "available" && <CheckCircle className="text-green-400" size={15} />}
                  {(usernameStatus === "taken" || usernameStatus === "invalid") && <XCircle className="text-red-400" size={15} />}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {usernameStatus === "taken" && "That username is already taken."}
                {usernameStatus === "invalid" && "3-20 characters: letters, numbers, or underscore."}
                {usernameStatus === "available" && "Available — this is also your login ID."}
                {usernameStatus === "idle" && "You'll be able to log in with this instead of your email."}
              </p>
            </div>

            {!oauthMode && (
              <>
                <div>
                  <label className="label">Password</label>
                  <PasswordInput value={form.password} onChange={(v) => set("password", v)} autoComplete="new-password" />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <PasswordInput value={form.confirm_password} onChange={(v) => set("confirm_password", v)} autoComplete="new-password" />
                </div>
              </>
            )}

            <NextButton loading={loading} onClick={submitStep1} label={oauthMode ? "Save & Continue" : "Create Account & Continue"} />

            {!oauthMode && (
              <>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-600" style={{ fontFamily: "var(--font-mono)" }}>
                  <span className="h-px flex-1 bg-white/10" /> or continue with <span className="h-px flex-1 bg-white/10" />
                </div>
                <OAuthButtons redirectAfter="/apply" />
              </>
            )}
          </div>
        )}

        {!blocked && step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">Personal information</h2>
            <Field label="Father Name" value={form.father_name} onChange={(v) => set("father_name", v)} />
            <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} />
            <div>
              <label className="label">Gender</label>
              <select className="input-field" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <Field label="Full Address" value={form.address} onChange={(v) => set("address", v)} />
            <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
            <Field label="Student CNIC" value={form.student_cnic} onChange={(v) => set("student_cnic", v)} placeholder="XXXXX-XXXXXXX-X" />
            <Field label="Father CNIC" value={form.father_cnic} onChange={(v) => set("father_cnic", v)} placeholder="XXXXX-XXXXXXX-X" />
            <NextButton loading={loading} onClick={submitStep2} label="Continue" />
          </div>
        )}

        {!blocked && step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-white">Academic information</h2>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-cyan-300">Matric</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Board" value={form.matric_board} onChange={(v) => set("matric_board", v)} />
                <Field label="Year" value={form.matric_year} onChange={(v) => set("matric_year", v)} />
                <Field label="Total Marks" type="number" value={form.matric_total} onChange={(v) => set("matric_total", v)} />
                <Field label="Obtained Marks" type="number" value={form.matric_obtained} onChange={(v) => set("matric_obtained", v)} />
              </div>
              <p className="mt-2 text-xs text-slate-400">Percentage: <span className="text-cyan-300 font-semibold">{matricPct}%</span></p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-cyan-300">FSC / Intermediate <span className="text-red-400">*</span></h3>
              <p className="-mt-1 mb-3 text-xs text-slate-500">FSc (or an equivalent intermediate qualification) is the minimum requirement — this section is required.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Board" value={form.fsc_board} onChange={(v) => set("fsc_board", v)} />
                <Field label="Year" value={form.fsc_year} onChange={(v) => set("fsc_year", v)} />
                <Field label="Group" value={form.fsc_group} onChange={(v) => set("fsc_group", v)} />
                <Field label="Total Marks" type="number" value={form.fsc_total} onChange={(v) => set("fsc_total", v)} />
                <Field label="Obtained Marks" type="number" value={form.fsc_obtained} onChange={(v) => set("fsc_obtained", v)} />
              </div>
              <p className="mt-2 text-xs text-slate-400">Percentage: <span className="text-cyan-300 font-semibold">{fscPct}%</span></p>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-cyan-300">Additional Qualifications</h3>
                  <p className="text-xs text-slate-500">Have something beyond FSc — BA, BSc, a diploma? Add it here (optional).</p>
                </div>
              </div>

              <div className="space-y-3">
                {additionalQuals.map((q, i) => (
                  <div key={q.id} className="rounded-lg border border-white/10 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">Qualification {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeQualificationRow(q.id)}
                        className="text-slate-500 hover:text-red-400"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Qualification"
                        placeholder="e.g. BA"
                        value={q.qualification_name}
                        onChange={(v) => updateQualificationRow(q.id, "qualification_name", v)}
                      />
                      <Field
                        label="Year"
                        placeholder="e.g. 2024"
                        value={q.year}
                        onChange={(v) => updateQualificationRow(q.id, "year", v)}
                      />
                      <div className="col-span-2">
                        <Field
                          label="Institute"
                          placeholder="e.g. University of Balochistan, Quetta"
                          value={q.institute_name}
                          onChange={(v) => updateQualificationRow(q.id, "institute_name", v)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addQualificationRow} className="btn-outline mt-3 w-full !py-2 text-sm">
                <Plus size={16} /> Add Qualification
              </button>
            </div>

            <NextButton loading={loading} onClick={submitStep3} label="Continue" />
          </div>
        )}

        {!blocked && step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">Upload documents</h2>
            <p className="text-xs text-slate-400">JPG, PNG or PDF — max 2MB each.</p>
            {DOC_TYPES.map((d) => (
              <div key={d.key} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full ${
                      uploadedDocs.has(d.key) || files[d.key] ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {uploadedDocs.has(d.key) || files[d.key] ? <CheckCircle2 size={16} /> : <UploadCloud size={16} />}
                  </div>
                  <span className="text-sm text-slate-200">{d.label}</span>
                </div>
                <label className="cursor-pointer text-xs font-medium text-cyan-300 hover:text-cyan-200">
                  {files[d.key]?.name ? "Change" : "Choose File"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFile(d.key, e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            ))}

            {additionalQuals.length > 0 && (
              <>
                <p className="pt-2 text-xs uppercase tracking-widest text-slate-500">Additional qualification proof</p>
                {additionalQuals.map((q) => (
                  <div key={q.id} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-full ${
                          qualUploaded.has(q.id) || qualFiles[q.id] ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500"
                        }`}
                      >
                        {qualUploaded.has(q.id) || qualFiles[q.id] ? <CheckCircle2 size={16} /> : <UploadCloud size={16} />}
                      </div>
                      <div>
                        <p className="text-sm text-slate-200">{q.qualification_name || "Qualification"} certificate</p>
                        <p className="text-xs text-slate-500">{q.institute_name}</p>
                      </div>
                    </div>
                    <label className="cursor-pointer text-xs font-medium text-cyan-300 hover:text-cyan-200">
                      {qualFiles[q.id]?.name ? "Change" : "Choose File"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        onChange={(e) => handleQualFile(q.id, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                ))}
              </>
            )}

            <NextButton loading={loading} onClick={submitStep4} label="Upload & Continue" />
          </div>
        )}

        {!blocked && step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">Course & batch selection</h2>
            <div>
              <label className="label">Select Course</label>
              <select className="input-field" value={form.course_name} onChange={(e) => set("course_name", e.target.value)}>
                <option value="">Select a course</option>
                {openCourses.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              {form.course_name && openCourses.find((c) => c.name === form.course_name)?.full_info?.trim() && (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                    {openCourses.find((c) => c.name === form.course_name)?.full_info}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="label">Select Batch</label>
              <select className="input-field" value={form.batch_id} onChange={(e) => set("batch_id", e.target.value)}>
                <option value="">Select a batch</option>
                {batches
                  .filter((b) => !form.course_name || b.course_names.includes(form.course_name))
                  .map((b) => {
                    const left = b.seats_total - b.seats_filled;
                    return (
                      <option key={b.id} value={b.id}>
                        {b.batch_name} — {left > 0 ? `${left} seats left` : "Seats full — applying to waitlist"}
                      </option>
                    );
                  })}
              </select>
              {batches.length === 0 && <p className="mt-2 text-xs text-amber-400">No open batches available right now.</p>}
              {form.batch_id && (() => {
                const b = batches.find((x) => x.id === form.batch_id);
                return b && b.seats_filled >= b.seats_total ? (
                  <p className="mt-2 text-xs text-amber-400">
                    This batch&apos;s announced seats are full, but your application will still be accepted. The admin will
                    review all applications and share the final shortlist.
                  </p>
                ) : null;
              })()}
            </div>
            <NextButton loading={loading} onClick={submitFinal} label="Submit Application" />
          </div>
        )}

        {!blocked && step === 6 && (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto text-emerald-400" size={56} />
            <h2 className="font-display text-2xl font-semibold text-white">Application submitted!</h2>
            <p className="text-slate-400">Your Tracking ID</p>
            <p className="font-display text-3xl font-bold text-cyan-300">{trackingId}</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {pdfUrl && (
                <a href={pdfUrl} download={`${trackingId}-admission-letter.pdf`} className="btn-primary">
                  <Download size={18} /> Download Admission Letter
                </a>
              )}
              <button onClick={() => router.push("/dashboard")} className="btn-outline">
                <LayoutDashboard size={18} /> Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input-field" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NextButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={loading} className="btn-primary w-full">
      {loading ? <Loader2 className="animate-spin" size={18} /> : null}
      {loading ? "Saving..." : label}
    </button>
  );
}
