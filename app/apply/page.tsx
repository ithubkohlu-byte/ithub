"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { CNIC_REGEX, PHONE_REGEX, calcPercent, COURSES, DOC_TYPES } from "@/lib/utils";
import { generateAdmissionPdf } from "@/lib/generatePdf";
import { CheckCircle2, Circle, Upload, Loader2, Download, PartyPopper } from "lucide-react";
import Link from "next/link";

type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  seats_total: number;
  seats_filled: number;
};

const STEPS = ["Account", "Personal", "Academic", "Documents", "Enrollment"];

export default function ApplyPage() {
  const supabase = createClient();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<null | { trackingId: string; qr: string }>(null);

  // Step 1
  const [account, setAccount] = useState({ full_name: "", email: "", phone: "", password: "", confirmPassword: "" });
  // Step 2
  const [personal, setPersonal] = useState({
    father_name: "", dob: "", gender: "", address: "", city: "", cnic: "", father_cnic: "",
  });
  // Step 3
  const [academic, setAcademic] = useState({
    matric_board: "", matric_year: "", matric_total: "", matric_obtained: "",
    fsc_board: "", fsc_year: "", fsc_group: "", fsc_total: "", fsc_obtained: "",
  });
  // Step 4
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  // Step 5
  const [course, setCourse] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState("");

  useEffect(() => {
    if (step === 4 && course) {
      supabase
        .from("batches")
        .select("*")
        .eq("course_name", course)
        .eq("is_announced", true)
        .eq("status", "Open")
        .then(({ data }) => {
          setBatches((data || []).filter((b: any) => b.seats_filled < b.seats_total));
        });
    }
  }, [step, course]);

  const matricPercent = calcPercent(Number(academic.matric_obtained), Number(academic.matric_total));
  const fscPercent = calcPercent(Number(academic.fsc_obtained), Number(academic.fsc_total));

  // -------- STEP 1: signup --------
  async function handleSignup() {
    if (!account.full_name || !account.email || !PHONE_REGEX.test(account.phone)) {
      toast.error("Please fill all fields with a valid phone (03XXXXXXXXX)");
      return;
    }
    if (account.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (account.password !== account.confirmPassword) return toast.error("Passwords do not match");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: { data: { full_name: account.full_name, phone: account.phone } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.user) {
      setUserId(data.user.id);
      toast.success("Account created! Please check your email to confirm, then continue.");
      setStep(1);
    }
  }

  // -------- STEP 2 --------
  function validatePersonal() {
    if (!personal.father_name || !personal.dob || !personal.gender || !personal.address || !personal.city)
      return toast.error("Please fill all personal fields"), false;
    if (!CNIC_REGEX.test(personal.cnic)) return toast.error("CNIC must be 13 digits, no dashes"), false;
    if (!CNIC_REGEX.test(personal.father_cnic)) return toast.error("Father CNIC must be 13 digits"), false;
    return true;
  }

  // -------- STEP 3 --------
  function validateAcademic() {
    const req = ["matric_board", "matric_year", "matric_total", "matric_obtained", "fsc_board", "fsc_year", "fsc_group", "fsc_total", "fsc_obtained"];
    for (const k of req) if (!(academic as any)[k]) return toast.error("Please fill all academic fields"), false;
    return true;
  }

  // -------- STEP 4 --------
  function handleFileChange(key: string, f: File | null) {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast.error("File must be under 2MB");
    if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(f.type))
      return toast.error("Only JPG/PNG/PDF allowed");
    setFiles((p) => ({ ...p, [key]: f }));
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreviews((p) => ({ ...p, [key]: reader.result as string }));
      reader.readAsDataURL(f);
    }
  }

  function validateDocs() {
    for (const d of DOC_TYPES) {
      if (!files[d.key]) return toast.error(`Please upload: ${d.label}`), false;
    }
    return true;
  }

  // -------- FINAL SUBMIT --------
  async function handleFinalSubmit() {
    if (!batchId || !course) return toast.error("Please select course and batch");
    if (!userId) return toast.error("Missing account session. Please restart.");
    setLoading(true);
    try {
      // 1. tracking id
      const { data: trackingIdData, error: trackErr } = await supabase.rpc("next_tracking_id");
      if (trackErr) throw trackErr;
      const trackingId = trackingIdData as string;

      // 2. insert student
      const { data: studentRow, error: studentErr } = await supabase
        .from("students")
        .insert({
          auth_user_id: userId,
          tracking_id: trackingId,
          full_name: account.full_name,
          email: account.email,
          phone: account.phone,
          father_name: personal.father_name,
          dob: personal.dob,
          gender: personal.gender,
          address: personal.address,
          city: personal.city,
          cnic: personal.cnic,
          father_cnic: personal.father_cnic,
          matric_board: academic.matric_board,
          matric_year: academic.matric_year,
          matric_total: Number(academic.matric_total),
          matric_obtained: Number(academic.matric_obtained),
          matric_percent: matricPercent,
          fsc_board: academic.fsc_board,
          fsc_year: academic.fsc_year,
          fsc_group: academic.fsc_group,
          fsc_total: Number(academic.fsc_total),
          fsc_obtained: Number(academic.fsc_obtained),
          fsc_percent: fscPercent,
          status: "Pending",
        })
        .select()
        .single();
      if (studentErr) throw studentErr;

      // 3. upload documents
      for (const d of DOC_TYPES) {
        const file = files[d.key];
        if (!file) continue;
        const ext = file.name.split(".").pop();
        const path = `${userId}/${d.key}.${ext}`;
        const { error: upErr } = await supabase.storage.from("student_docs").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("student_docs").getPublicUrl(path);
        await supabase.from("documents").insert({
          student_id: studentRow.id,
          doc_type: d.key,
          file_url: urlData.publicUrl,
          status: "Pending",
        });
      }

      // 4. enrollment
      const { error: enrollErr } = await supabase.from("enrollments").insert({
        student_id: studentRow.id,
        course_name: course,
        batch_id: batchId,
        status: "Pending",
      });
      if (enrollErr) throw enrollErr;

      // 5. atomic seat increment
      await supabase.rpc("increment_batch_seat", { p_batch_id: batchId });

      // 6. generate PDF
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const qrUrl = `${siteUrl}/roll-slip?id=${trackingId}`;
      const qrCanvas = document.getElementById("apply-qr-canvas") as HTMLCanvasElement | null;
      const qrDataUrl = qrCanvas ? qrCanvas.toDataURL("image/png") : "";

      setSuccessData({ trackingId, qr: qrDataUrl });

      const selectedBatch = batches.find((b) => b.id === batchId);
      await generateAdmissionPdf({
        trackingId,
        fullName: account.full_name,
        fatherName: personal.father_name,
        cnic: personal.cnic,
        course,
        batch: selectedBatch?.batch_name || "",
        phone: account.phone,
        email: account.email,
        photoDataUrl: previews["photo"] || null,
        qrDataUrl,
      });

      toast.success("Application submitted successfully!");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (successData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-base">
        <div className="glass rounded-2xl p-10 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full bg-neon-gradient flex items-center justify-center mx-auto mb-6 shadow-glow">
            <PartyPopper className="text-white" size={28} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className="text-white/60 mb-6">Your tracking ID is</p>
          <p className="text-3xl font-extrabold text-gradient mb-6">{successData.trackingId}</p>
          <div className="hidden">
            <QRCodeCanvas id="apply-qr-canvas" value={successData.trackingId} size={128} />
          </div>
          <img src={successData.qr} alt="QR" className="mx-auto mb-6 rounded-lg bg-white p-2" width={120} height={120} />
          <div className="flex flex-col gap-3">
            <Link href="/login" className="btn-neon text-white px-6 py-3 rounded-xl font-semibold">
              Go to Student Login
            </Link>
            <Link href="/" className="glass px-6 py-3 rounded-xl font-semibold">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="hidden">
          <QRCodeCanvas id="apply-qr-canvas-preload" value="preload" size={64} />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">
          Admission <span className="text-gradient">Application</span>
        </h1>
        <p className="text-white/50 text-center mb-10">Complete all 5 steps to submit your application</p>

        {/* progress */}
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-2 flex-1">
                {i < step ? (
                  <CheckCircle2 className="text-accent" size={26} />
                ) : i === step ? (
                  <div className="h-6 w-6 rounded-full bg-neon-gradient shadow-glow" />
                ) : (
                  <Circle className="text-white/20" size={26} />
                )}
                <span className={`text-xs ${i === step ? "text-accent" : "text-white/40"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? "bg-accent" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          {step === 0 && (
            <StepAccount account={account} setAccount={setAccount} loading={loading} onNext={handleSignup} />
          )}
          {step === 1 && (
            <StepPersonal
              personal={personal}
              setPersonal={setPersonal}
              onBack={() => setStep(0)}
              onNext={() => validatePersonal() && setStep(2)}
            />
          )}
          {step === 2 && (
            <StepAcademic
              academic={academic}
              setAcademic={setAcademic}
              matricPercent={matricPercent}
              fscPercent={fscPercent}
              onBack={() => setStep(1)}
              onNext={() => validateAcademic() && setStep(3)}
            />
          )}
          {step === 3 && (
            <StepDocuments
              files={files}
              previews={previews}
              onChange={handleFileChange}
              onBack={() => setStep(2)}
              onNext={() => validateDocs() && setStep(4)}
            />
          )}
          {step === 4 && (
            <StepEnrollment
              course={course}
              setCourse={setCourse}
              batches={batches}
              batchId={batchId}
              setBatchId={setBatchId}
              loading={loading}
              onBack={() => setStep(3)}
              onSubmit={handleFinalSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-sm text-white/70 mb-1.5 block">{label}</span>
      <input
        {...props}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-accent focus:shadow-glow transition-all"
      />
    </label>
  );
}

function NavButtons({ onBack, onNext, loading, nextLabel = "Continue" }: any) {
  return (
    <div className="flex justify-between mt-8">
      {onBack ? (
        <button onClick={onBack} className="px-6 py-2.5 rounded-lg glass text-white/80 font-medium">
          Back
        </button>
      ) : <span />}
      <button
        onClick={onNext}
        disabled={loading}
        className="btn-neon text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-60"
      >
        {loading && <Loader2 className="animate-spin" size={16} />}
        {nextLabel}
      </button>
    </div>
  );
}

function StepAccount({ account, setAccount, loading, onNext }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Create Your Account</h2>
      <Field label="Full Name" value={account.full_name} onChange={(e: any) => setAccount({ ...account, full_name: e.target.value })} />
      <Field label="Email" type="email" value={account.email} onChange={(e: any) => setAccount({ ...account, email: e.target.value })} />
      <Field label="Phone (03XXXXXXXXX)" value={account.phone} onChange={(e: any) => setAccount({ ...account, phone: e.target.value })} />
      <Field label="Password" type="password" value={account.password} onChange={(e: any) => setAccount({ ...account, password: e.target.value })} />
      <Field label="Confirm Password" type="password" value={account.confirmPassword} onChange={(e: any) => setAccount({ ...account, confirmPassword: e.target.value })} />
      <NavButtons onNext={onNext} loading={loading} nextLabel="Create Account & Continue" />
    </div>
  );
}

function StepPersonal({ personal, setPersonal, onBack, onNext }: any) {
  const set = (k: string) => (e: any) => setPersonal({ ...personal, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Personal Information</h2>
      <Field label="Father Name" value={personal.father_name} onChange={set("father_name")} />
      <Field label="Date of Birth" type="date" value={personal.dob} onChange={set("dob")} />
      <label className="block">
        <span className="text-sm text-white/70 mb-1.5 block">Gender</span>
        <select value={personal.gender} onChange={set("gender")} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white">
          <option value="" className="bg-base">Select</option>
          <option value="Male" className="bg-base">Male</option>
          <option value="Female" className="bg-base">Female</option>
          <option value="Other" className="bg-base">Other</option>
        </select>
      </label>
      <Field label="Address" value={personal.address} onChange={set("address")} />
      <Field label="City" value={personal.city} onChange={set("city")} />
      <Field label="CNIC (13 digits, no dashes)" value={personal.cnic} onChange={set("cnic")} maxLength={13} />
      <Field label="Father CNIC (13 digits)" value={personal.father_cnic} onChange={set("father_cnic")} maxLength={13} />
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepAcademic({ academic, setAcademic, matricPercent, fscPercent, onBack, onNext }: any) {
  const set = (k: string) => (e: any) => setAcademic({ ...academic, [k]: e.target.value });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Matriculation</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Board" value={academic.matric_board} onChange={set("matric_board")} />
          <Field label="Year" value={academic.matric_year} onChange={set("matric_year")} />
          <Field label="Total Marks" type="number" value={academic.matric_total} onChange={set("matric_total")} />
          <Field label="Obtained Marks" type="number" value={academic.matric_obtained} onChange={set("matric_obtained")} />
        </div>
        {matricPercent > 0 && <p className="text-accent text-sm mt-2">Percentage: {matricPercent}%</p>}
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">FSC / Intermediate</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Board" value={academic.fsc_board} onChange={set("fsc_board")} />
          <Field label="Year" value={academic.fsc_year} onChange={set("fsc_year")} />
          <Field label="Group" value={academic.fsc_group} onChange={set("fsc_group")} />
          <Field label="Total Marks" type="number" value={academic.fsc_total} onChange={set("fsc_total")} />
          <Field label="Obtained Marks" type="number" value={academic.fsc_obtained} onChange={set("fsc_obtained")} />
        </div>
        {fscPercent > 0 && <p className="text-accent text-sm mt-2">Percentage: {fscPercent}%</p>}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepDocuments({ files, previews, onChange, onBack, onNext }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Upload Documents</h2>
      <p className="text-white/50 text-sm mb-4">JPG, PNG or PDF. Max 2MB each.</p>
      {DOC_TYPES.map((d: any) => (
        <div key={d.key} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
          {previews[d.key] ? (
            <img src={previews[d.key]} alt={d.label} className="h-14 w-14 object-cover rounded-lg" />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-white/10 flex items-center justify-center">
              <Upload size={20} className="text-white/40" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{d.label}</p>
            {files[d.key] && <p className="text-xs text-accent">{files[d.key].name}</p>}
          </div>
          <label className="glass px-4 py-2 rounded-lg text-sm cursor-pointer">
            Choose File
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => onChange(d.key, e.target.files?.[0] || null)} />
          </label>
        </div>
      ))}
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepEnrollment({ course, setCourse, batches, batchId, setBatchId, loading, onBack, onSubmit }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Course & Batch Selection</h2>
      <label className="block">
        <span className="text-sm text-white/70 mb-1.5 block">Select Course</span>
        <select
          value={course}
          onChange={(e) => { setCourse(e.target.value); setBatchId(""); }}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white"
        >
          <option value="" className="bg-base">Select a course</option>
          {COURSES.map((c) => (
            <option key={c} value={c} className="bg-base">{c}</option>
          ))}
        </select>
      </label>

      {course && (
        <div>
          <span className="text-sm text-white/70 mb-2 block">Select Batch</span>
          {batches.length === 0 ? (
            <p className="text-white/40 text-sm">No open batches available for this course right now.</p>
          ) : (
            <div className="space-y-3">
              {batches.map((b: Batch) => (
                <button
                  key={b.id}
                  onClick={() => setBatchId(b.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    batchId === b.id ? "border-accent shadow-glow bg-accent/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="font-medium">{b.batch_name}</p>
                  <p className="text-xs text-white/50 mt-1">{b.seats_total - b.seats_filled} seats left</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <NavButtons onBack={onBack} onNext={onSubmit} loading={loading} nextLabel="Submit Application" />
    </div>
  );
}
