"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DOC_TYPES } from "@/types";
import type { ApplicationStatus, Batch, Course, DocKey, DocStatus, DocumentRow, Student, AdditionalQualification } from "@/types";
import { ArrowLeft, CheckCircle2, Key, Pencil, XCircle } from "lucide-react";
import clsx from "clsx";

type BatchRow = Batch & { course_names: string[] };

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [student, setStudent] = useState<Student | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [qualifications, setQualifications] = useState<AdditionalQualification[]>([]);
  const [qualUrls, setQualUrls] = useState<Record<string, string>>({});
  const [enrollment, setEnrollment] = useState<any>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ---- Trade (course) change ----
  const [editingTrade, setEditingTrade] = useState(false);
  const [allBatches, setAllBatches] = useState<BatchRow[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [tradeCourse, setTradeCourse] = useState("");
  const [tradeBatch, setTradeBatch] = useState("");
  const [tradeSaving, setTradeSaving] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);

  async function load() {
    const { data: s } = await supabase.from("students").select("*").eq("id", id).single();
    const { data: docs } = await supabase.from("documents").select("*").eq("student_id", id);
    const { data: quals } = await supabase.from("additional_qualifications").select("*").eq("student_id", id).order("created_at");
    const { data: enr } = await supabase.from("enrollments").select("*, batches(*)").eq("student_id", id).maybeSingle();
    setStudent(s as Student);
    setDocuments((docs as DocumentRow[]) ?? []);
    setQualifications((quals as AdditionalQualification[]) ?? []);
    setEnrollment(enr);
    setTradeCourse(enr?.course_name ?? "");
    setTradeBatch(enr?.batch_id ?? "");

    const urls: Record<string, string> = {};
    for (const d of (docs as DocumentRow[]) ?? []) {
      const { data: signed } = await supabase.storage.from("student_docs").createSignedUrl(d.file_path, 3600);
      if (signed?.signedUrl) urls[d.doc_type] = signed.signedUrl;
    }
    setDocUrls(urls);

    const qUrls: Record<string, string> = {};
    for (const q of (quals as AdditionalQualification[]) ?? []) {
      if (!q.document_path) continue;
      const { data: signed } = await supabase.storage.from("student_docs").createSignedUrl(q.document_path, 3600);
      if (signed?.signedUrl) qUrls[q.id] = signed.signedUrl;
    }
    setQualUrls(qUrls);
  }

  // Every course + batch (not just "open" ones) — admin needs full control to
  // move a student to any trade/batch, including ones closed to new public applicants.
  async function loadTradeOptions() {
    const [{ data: batchData }, { data: courseData }] = await Promise.all([
      supabase.from("batches").select("*, batch_courses(course_name)"),
      supabase.from("courses").select("*").order("display_order", { ascending: true }),
    ]);
    const rows = ((batchData as any[]) ?? []).map((b) => ({
      ...b,
      course_names: Array.from(new Set([b.course_name, ...(b.batch_courses ?? []).map((c: any) => c.course_name)])),
    })) as BatchRow[];
    setAllBatches(rows);
    setAllCourses((courseData as Course[]) ?? []);
  }

  function startEditTrade() {
    setTradeError(null);
    setTradeCourse(enrollment?.course_name ?? "");
    setTradeBatch(enrollment?.batch_id ?? "");
    loadTradeOptions();
    setEditingTrade(true);
  }

  async function saveTrade() {
    if (!tradeCourse || !tradeBatch) return setTradeError("Select a course and a batch.");
    setTradeSaving(true);
    setTradeError(null);
    try {
      // A student can only ever have ONE enrollment row — upsert on student_id
      // updates it in place (or creates it, if this student had none yet).
      const { error } = await supabase
        .from("enrollments")
        .upsert(
          { student_id: id, batch_id: tradeBatch, course_name: tradeCourse },
          { onConflict: "student_id" }
        );
      if (error) throw error;
      setEditingTrade(false);
      load();
    } catch (e: any) {
      setTradeError(e.message ?? "Could not update the trade.");
    } finally {
      setTradeSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setDocStatus(docId: string, status: DocStatus, key: string) {
    await supabase.from("documents").update({ status, admin_comment: comment[key] ?? null }).eq("id", docId);
    load();
  }

  async function setAppStatus(status: ApplicationStatus) {
    if (status === "rejected") {
      setShowRejectBox(true);
      return;
    }
    await supabase.from("students").update({ application_status: status }).eq("id", id);
    load();
  }

  async function confirmRejectWithReason() {
    if (!rejectReason.trim()) return;
    await supabase
      .from("students")
      .update({ application_status: "rejected", rejection_reason: rejectReason.trim() })
      .eq("id", id);
    setShowRejectBox(false);
    setRejectReason("");
    load();
  }

  async function resetPassword() {
    setResetMsg(null);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: id, newPassword }),
    });
    const json = await res.json();
    setResetMsg(json.error ?? "Password updated successfully.");
    if (!json.error) { setShowReset(false); setNewPassword(""); }
  }

  if (!student) return <p className="text-slate-500">Loading...</p>;

  return (
    <div>
      <button onClick={() => router.back()} className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass-card mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          {student.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.photo_url} className="h-16 w-16 rounded-full object-cover" alt="" />
          )}
          <div>
            <h1 className="font-display text-xl font-semibold text-white">{student.full_name}</h1>
            <p className="text-sm text-cyan-300">{student.tracking_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAppStatus("verified")} className="btn-outline !py-2 text-xs">Approve</button>
          <button onClick={() => setAppStatus("enrolled")} className="btn-outline !py-2 text-xs !border-emerald-500/40 !text-emerald-300">Enroll</button>
          <button onClick={() => setAppStatus("rejected")} className="btn-outline !py-2 text-xs !border-red-500/40 !text-red-300">Reject</button>
          <button onClick={() => setAppStatus("struck_off")} className="btn-outline !py-2 text-xs !border-orange-500/40 !text-orange-300">Struck Off</button>
          <button onClick={() => setShowReset(true)} className="btn-outline !py-2 text-xs"><Key size={14} /> Reset Password</button>
        </div>
      </div>

      {showRejectBox && (
        <div className="glass-card mb-6 p-6">
          <h3 className="mb-1 font-semibold text-white">Reason for rejecting {student.full_name}</h3>
          <p className="mb-3 text-xs text-slate-500">This will be shown to the student on their dashboard.</p>
          <textarea
            className="input-field h-24"
            placeholder="e.g. Matric marks below the minimum eligibility requirement for this course."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmRejectWithReason}
              disabled={!rejectReason.trim()}
              className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm Reject
            </button>
            <button onClick={() => { setShowRejectBox(false); setRejectReason(""); }} className="btn-outline !py-2 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {student.application_status === "rejected" && student.rejection_reason && (
        <div className="glass-card mb-6 border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-300">Rejection reason</p>
          <p className="mt-1 text-sm text-slate-300">{student.rejection_reason}</p>
        </div>
      )}

      {showReset && (
        <div className="glass-card mb-6 p-6">
          <h3 className="mb-3 font-semibold text-white">Set Temporary Password</h3>
          {resetMsg && <p className="mb-3 text-sm text-cyan-300">{resetMsg}</p>}
          <div className="flex gap-2">
            <input className="input-field" type="text" placeholder="New password (6+ chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button onClick={resetPassword} className="btn-primary !py-2">Save</button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card p-6">
          <h2 className="mb-3 font-semibold text-white">Personal</h2>
          <Info label="Father" value={student.father_name} />
          <Info label="DOB" value={student.dob} />
          <Info label="Gender" value={student.gender} />
          <Info label="City" value={student.city} />
          <Info label="Address" value={student.address} />
          <Info label="Student CNIC" value={student.student_cnic} />
          <Info label="Father CNIC" value={student.father_cnic} />
          <Info label="Phone" value={student.phone} />
          <Info label="Email" value={student.email} />
        </div>
        <div className="glass-card p-6">
          <h2 className="mb-3 font-semibold text-white">Academic</h2>
          <Info label="Matric" value={`${student.matric_board} • ${student.matric_year} • ${student.matric_percentage}%`} />
          <Info label="FSC" value={`${student.fsc_board} • ${student.fsc_group} • ${student.fsc_percentage}%`} />
          <div className="mb-3 mt-5 flex items-center justify-between">
            <h2 className="font-semibold text-white">Enrollment</h2>
            {!editingTrade && (
              <button onClick={startEditTrade} className="flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">
                <Pencil size={12} /> Change Trade
              </button>
            )}
          </div>

          {!editingTrade ? (
            <>
              <Info label="Course" value={enrollment?.course_name ?? "-"} />
              <Info label="Batch" value={enrollment?.batches?.batch_name ?? "-"} />
              {enrollment && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <span className="text-xs text-slate-400">Shortlisted</span>
                  <button
                    onClick={async () => {
                      await supabase.from("enrollments").update({ is_shortlisted: !enrollment.is_shortlisted }).eq("id", enrollment.id);
                      load();
                    }}
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      enrollment.is_shortlisted ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-400"
                    )}
                  >
                    {enrollment.is_shortlisted ? "Yes" : "No"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 rounded-lg border border-white/10 p-4">
              {tradeError && <p className="text-xs text-red-300">{tradeError}</p>}
              <div>
                <label className="label">New Course</label>
                <select
                  className="input-field"
                  value={tradeCourse}
                  onChange={(e) => { setTradeCourse(e.target.value); setTradeBatch(""); }}
                >
                  <option value="">Select a course</option>
                  {allCourses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">New Batch</label>
                <select className="input-field" value={tradeBatch} onChange={(e) => setTradeBatch(e.target.value)}>
                  <option value="">Select a batch</option>
                  {allBatches
                    .filter((b) => !tradeCourse || b.course_names.includes(tradeCourse))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_name} — {Math.max(b.seats_total - b.seats_filled, 0)} seats left
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={saveTrade} disabled={tradeSaving} className="btn-primary !py-1.5 text-xs">
                  {tradeSaving ? "Saving..." : "Save Trade"}
                </button>
                <button onClick={() => setEditingTrade(false)} className="btn-outline !py-1.5 text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card mt-6 p-6">
        <h2 className="mb-4 font-semibold text-white">Documents</h2>
        <div className="space-y-4">
          {DOC_TYPES.map((d) => {
            const doc = documents.find((x) => x.doc_type === d.key);
            return (
              <div key={d.key} className="rounded-lg border border-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-200">{d.label}</p>
                  {docUrls[d.key] && (
                    <a href={docUrls[d.key]} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200">
                      View File
                    </a>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    className="input-field flex-1 !py-1.5 text-xs"
                    placeholder="Comment (optional)"
                    value={comment[d.key] ?? doc?.admin_comment ?? ""}
                    onChange={(e) => setComment((c) => ({ ...c, [d.key]: e.target.value }))}
                  />
                  <button
                    disabled={!doc}
                    onClick={() => doc && setDocStatus(doc.id, "verified", d.key)}
                    className={clsx("flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
                      doc?.status === "verified" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-400 hover:bg-white/10")}
                  >
                    <CheckCircle2 size={13} /> Verify
                  </button>
                  <button
                    disabled={!doc}
                    onClick={() => doc && setDocStatus(doc.id, "rejected", d.key)}
                    className={clsx("flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
                      doc?.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-white/5 text-slate-400 hover:bg-white/10")}
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {qualifications.length > 0 && (
        <div className="glass-card mt-6 p-6">
          <h2 className="mb-4 font-semibold text-white">Additional Qualifications (beyond FSc)</h2>
          <div className="space-y-3">
            {qualifications.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">{q.qualification_name}</p>
                  <p className="text-xs text-slate-500">{q.institute_name}{q.year ? ` — ${q.year}` : ""}</p>
                </div>
                {qualUrls[q.id] ? (
                  <a href={qualUrls[q.id]} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200">
                    View File
                  </a>
                ) : (
                  <span className="text-xs text-amber-400">No document uploaded yet</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value || "-"}</span>
    </div>
  );
}
