"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateAdmissionLetter, generateRollSlipPdf } from "@/lib/pdf";
import { DOC_TYPES } from "@/types";
import type { DashboardTab, DocumentRow, Enrollment, Feedback, HomeContent, Result, RollNumber, Student } from "@/types";
import RollSlipCard from "@/components/RollSlipCard";
import PasswordInput from "@/components/PasswordInput";
import {
  CheckCircle2, Clock, Download, KeyRound, LifeBuoy, LogOut, Mail, MessageSquareText, Star, Ticket, User, X, XCircle, Zap,
  GraduationCap, FileDown,
} from "lucide-react";
import clsx from "clsx";

// Fields that make up a "complete" profile. Kept in the same order the
// biodata modal displays them, so 100% always lines up with every field shown there.
const PROFILE_FIELDS: { key: keyof Student; label: string }[] = [
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "father_name", label: "Father Name" },
  { key: "dob", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "student_cnic", label: "Student CNIC" },
  { key: "father_cnic", label: "Father CNIC" },
  { key: "matric_board", label: "Matric Board" },
  { key: "matric_year", label: "Matric Year" },
  { key: "matric_total", label: "Matric Total Marks" },
  { key: "matric_obtained", label: "Matric Obtained Marks" },
  { key: "fsc_board", label: "FSC Board" },
  { key: "fsc_year", label: "FSC Year" },
  { key: "fsc_group", label: "FSC Group" },
  { key: "fsc_total", label: "FSC Total Marks" },
  { key: "fsc_obtained", label: "FSC Obtained Marks" },
  { key: "photo_url", label: "Photo" },
];

function isFieldFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return value > 0;
  return String(value).trim().length > 0;
}

function getProfileCompletion(student: Student) {
  const missing: string[] = [];
  let filled = 0;
  for (const f of PROFILE_FIELDS) {
    if (isFieldFilled(student[f.key])) filled += 1;
    else missing.push(f.label);
  }
  const percent = Math.round((filled / PROFILE_FIELDS.length) * 100);
  return { percent, missing };
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  verified: "bg-cyan-500/15 text-cyan-300",
  rejected: "bg-red-500/15 text-red-300",
  enrolled: "bg-emerald-500/15 text-emerald-300",
};

const DEFAULT_INSTITUTE_NAME = "IT HUB Kohlu";
const DEFAULT_HELP_TEXT =
  "Need assistance? Contact the IT HUB KOHLU office during working hours, or reach out via the phone/email listed on the homepage.";

export default function DashboardClient({
  student,
  enrollment,
  documents,
  rollNumber,
  homeContent,
  dashboardTabs,
  feedback,
  results,
}: {
  student: Student;
  enrollment: (Enrollment & { batches: any }) | null;
  documents: DocumentRow[];
  rollNumber: RollNumber | null;
  homeContent: HomeContent | null;
  dashboardTabs: DashboardTab[];
  feedback: Feedback[];
  results: Result[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [downloadingRoll, setDownloadingRoll] = useState(false);
  const [showBiodata, setShowBiodata] = useState(false);
  const { percent: profilePercent, missing: missingFields } = getProfileCompletion(student);

  const instituteName = homeContent?.institute_name || DEFAULT_INSTITUTE_NAME;
  const logoUrl = homeContent?.logo_url ?? null;
  const helpContent = homeContent?.help_content || DEFAULT_HELP_TEXT;

  const tabs = [
    { key: "application", label: "My Application", icon: User },
    { key: "roll", label: "Roll Number", icon: Ticket },
    { key: "results", label: "Results", icon: GraduationCap },
    { key: "account", label: "Account", icon: KeyRound },
    { key: "help", label: "Help", icon: LifeBuoy },
    { key: "feedback", label: "Feedback", icon: MessageSquareText },
    ...dashboardTabs.map((t) => ({ key: `custom-${t.id}`, label: t.title, icon: MessageSquareText })),
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].key);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function toDataUrl(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function handleRollDownload() {
    if (!rollNumber) return;
    setDownloadingRoll(true);
    try {
      const [photoDataUrl, logoDataUrl] = await Promise.all([
        student.photo_url ? toDataUrl(student.photo_url) : Promise.resolve(null),
        logoUrl ? toDataUrl(logoUrl) : Promise.resolve(null),
      ]);
      const doc = await generateRollSlipPdf({
        student,
        rollNumber,
        courseName: enrollment?.course_name ?? "-",
        batchName: enrollment?.batches?.batch_name ?? "-",
        photoDataUrl,
        logoDataUrl,
        instituteName,
        verifyBaseUrl: typeof window !== "undefined" ? window.location.origin : "",
      });
      doc.save(`${student.tracking_id}-roll-number-slip.pdf`);
    } finally {
      setDownloadingRoll(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      let photoDataUrl: string | null = null;
      if (student.photo_url) {
        const res = await fetch(student.photo_url);
        const blob = await res.blob();
        photoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      let logoDataUrl: string | null = null;
      if (logoUrl) {
        try {
          const res = await fetch(logoUrl);
          const blob = await res.blob();
          logoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          logoDataUrl = null;
        }
      }
      const doc = await generateAdmissionLetter({
        student,
        courseName: enrollment?.course_name ?? "-",
        batchName: enrollment?.batches?.batch_name ?? "-",
        photoDataUrl,
        logoDataUrl,
        instituteName,
        verifyBaseUrl: typeof window !== "undefined" ? window.location.origin : "",
        note: homeContent?.admission_note,
      });
      doc.save(`${student.tracking_id}-admission-letter.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={instituteName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-line text-base-950">
                <Zap size={18} strokeWidth={2.5} />
              </span>
            )}
            {instituteName}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-300">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Profile */}
        <div className="glass-card mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowBiodata(true)}
              className="group relative h-16 w-16 shrink-0 rounded-full"
              title="View full profile"
            >
              {student.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photo_url}
                  alt=""
                  className="h-16 w-16 rounded-full border border-white/10 object-cover transition group-hover:brightness-75"
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition group-hover:brightness-75">
                  <User size={24} />
                </span>
              )}
            </button>
            <div>
              <h1 className="font-display text-xl font-semibold text-white">{student.full_name}</h1>
              <p className="text-sm text-slate-400">{student.tracking_id}</p>
              <button
                onClick={() => setShowBiodata(true)}
                className={clsx(
                  "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  profilePercent === 100 ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                )}
              >
                Profile {profilePercent}% {profilePercent === 100 ? "Complete" : "Incomplete"}
              </button>
            </div>
          </div>
          <span className={clsx("rounded-full px-4 py-1.5 text-sm font-semibold capitalize", STATUS_STYLES[student.application_status])}>
            {student.application_status}
          </span>
        </div>

        {showBiodata && (
          <BiodataModal
            student={student}
            enrollment={enrollment}
            profilePercent={profilePercent}
            missingFields={missingFields}
            onClose={() => setShowBiodata(false)}
          />
        )}

        {/* Tab bar */}
        <div className="glass-card mb-6 flex flex-wrap gap-1 p-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition",
                  activeTab === t.key ? "bg-neon-cyan/10 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* My Application */}
        {activeTab === "application" && (
          <>
            {enrollment && (
              <div className="glass-card mb-6 grid grid-cols-2 gap-4 p-6 text-sm">
                <div>
                  <p className="text-xs uppercase text-slate-500">Course</p>
                  <p className="mt-1 text-slate-100">{enrollment.course_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Batch</p>
                  <p className="mt-1 text-slate-100">{enrollment.batches?.batch_name ?? "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase text-slate-500">Shortlist Status</p>
                  <p className="mt-1">
                    {enrollment.is_shortlisted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                        <CheckCircle2 size={13} /> Shortlisted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                        <Clock size={13} /> Under Review
                      </span>
                    )}
                  </p>
                  {enrollment.shortlist_remarks && (
                    <p className="mt-2 text-xs text-slate-400">{enrollment.shortlist_remarks}</p>
                  )}
                </div>
              </div>
            )}

            <div className="glass-card mb-6 p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">Document Status</h2>
              <div className="space-y-3">
                {DOC_TYPES.map((d) => {
                  const doc = documents.find((x) => x.doc_type === d.key);
                  const status = doc?.status ?? "pending";
                  return (
                    <div key={d.key} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-200">{d.label}</p>
                        {doc?.admin_comment && <p className="mt-0.5 text-xs text-amber-400">{doc.admin_comment}</p>}
                      </div>
                      <span className={clsx("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", STATUS_STYLES[status])}>
                        {status === "verified" && <CheckCircle2 size={13} />}
                        {status === "rejected" && <XCircle size={13} />}
                        {status === "pending" && <Clock size={13} />}
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={handleDownload} disabled={downloading} className="btn-primary mb-6 w-full">
              <Download size={18} /> {downloading ? "Preparing..." : "Download Admission Letter"}
            </button>
          </>
        )}

        {/* Roll Number */}
        {activeTab === "roll" && (
          <div>
            {rollNumber ? (
              <RollSlipCard
                student={student}
                rollNumber={rollNumber}
                courseName={enrollment?.course_name ?? "-"}
                batchName={enrollment?.batches?.batch_name ?? "-"}
                instituteName={instituteName}
                logoUrl={logoUrl}
                onDownload={handleRollDownload}
                downloading={downloadingRoll}
              />
            ) : (
              <div className="glass-card p-8 text-center text-sm text-slate-400">
                Your roll number slip is not issued yet. Check back once your batch's exam schedule is announced.
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {activeTab === "results" && (
          <div className="space-y-4">
            {results.length === 0 && (
              <div className="glass-card p-8 text-center text-sm text-slate-400">
                No results have been published yet.
              </div>
            )}
            {results.map((r) => (
              <div key={r.id} className="glass-card flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium text-slate-100">{r.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.marks_obtained != null && r.marks_total != null && `${r.marks_obtained}/${r.marks_total} · `}
                    <span className="capitalize">{r.result_status}</span>
                  </p>
                  {r.remarks && <p className="mt-1 text-xs text-slate-400">{r.remarks}</p>}
                </div>
                {r.file_path && (
                  <button
                    onClick={async () => {
                      const { data } = await supabase.storage.from("result_files").createSignedUrl(r.file_path as string, 60 * 10);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    }}
                    className="btn-outline !w-auto !py-2 text-xs"
                  >
                    <FileDown size={14} /> Download
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Account (view/change password) */}
        {activeTab === "account" && <AccountTab email={student.email} />}

        {/* Help */}
        {activeTab === "help" && (
          <div className="glass-card p-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Help</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{helpContent}</p>
            {homeContent?.contact_email && (
              <a
                href={`mailto:${homeContent.contact_email}?subject=${encodeURIComponent(
                  `Query — ${student.tracking_id}`
                )}&body=${encodeURIComponent(`Hi,\n\nMy tracking ID is ${student.tracking_id} (${student.full_name}).\n\n`)}`}
                className="btn-primary mt-5 inline-flex !w-auto !py-2"
              >
                <Mail size={16} /> Email Us Directly
              </a>
            )}
          </div>
        )}

        {/* Feedback */}
        {activeTab === "feedback" && <FeedbackTab studentId={student.id} initialFeedback={feedback} />}

        {/* Admin-added custom tabs */}
        {dashboardTabs.map(
          (t) =>
            activeTab === `custom-${t.id}` && (
              <div key={t.id} className="glass-card p-6">
                <h2 className="mb-3 font-display text-lg font-semibold text-white">{t.title}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{t.content}</p>
              </div>
            )
        )}
      </div>
    </main>
  );
}

function BiodataModal({
  student,
  enrollment,
  profilePercent,
  missingFields,
  onClose,
}: {
  student: Student;
  enrollment: (Enrollment & { batches: any }) | null;
  profilePercent: number;
  missingFields: string[];
  onClose: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Full Name", value: student.full_name },
    { label: "Tracking ID", value: student.tracking_id },
    { label: "Email", value: student.email },
    { label: "Phone", value: student.phone },
    { label: "Father Name", value: student.father_name },
    { label: "Date of Birth", value: student.dob },
    { label: "Gender", value: student.gender },
    { label: "City", value: student.city },
    { label: "Address", value: student.address },
    { label: "Student CNIC", value: student.student_cnic },
    { label: "Father CNIC", value: student.father_cnic },
    { label: "Matric Board", value: student.matric_board },
    { label: "Matric Year", value: student.matric_year },
    { label: "Matric Marks", value: student.matric_total ? `${student.matric_obtained}/${student.matric_total} (${student.matric_percentage}%)` : "" },
    { label: "FSC Board", value: student.fsc_board },
    { label: "FSC Year", value: student.fsc_year },
    { label: "FSC Group", value: student.fsc_group },
    { label: "FSC Marks", value: student.fsc_total ? `${student.fsc_obtained}/${student.fsc_total} (${student.fsc_percentage}%)` : "" },
    { label: "Course", value: enrollment?.course_name ?? "" },
    { label: "Batch", value: enrollment?.batches?.batch_name ?? "" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="glass-card max-h-[85vh] w-full max-w-lg overflow-y-auto scroll-thin p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {student.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photo_url} alt="" className="h-14 w-14 rounded-full border border-white/10 object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400">
                <User size={22} />
              </span>
            )}
            <div>
              <h2 className="font-display text-lg font-semibold text-white">{student.full_name}</h2>
              <span
                className={clsx(
                  "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  profilePercent === 100 ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                )}
              >
                Profile {profilePercent}% {profilePercent === 100 ? "Complete" : "Incomplete"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {profilePercent < 100 && missingFields.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
            Missing: {missingFields.join(", ")}
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 border-b border-white/5 py-1.5 text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className="text-right text-slate-200">{r.value || "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountTab({ email }: { email: string }) {
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 6) {
      setMsgIsError(true);
      return setMsg("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      setMsgIsError(true);
      return setMsg("Passwords do not match.");
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    setMsgIsError(!!error);
    if (error) return setMsg(error.message);
    setMsg("Your password has been updated.");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="glass-card p-6">
      <h2 className="mb-1 font-display text-lg font-semibold text-white">Account</h2>
      <p className="mb-4 text-sm text-slate-400">Logged in as {email}</p>

      <h3 className="mb-1 text-sm font-semibold text-slate-200">Change Password</h3>
      <p className="mb-4 text-xs text-slate-500">
        For security, your current password can't be displayed — set a new one below. Use the eye icon to view what
        you're typing.
      </p>
      {msg && <p className={clsx("mb-3 text-sm", msgIsError ? "text-red-300" : "text-cyan-300")}>{msg}</p>}
      <form onSubmit={changePassword} className="space-y-3">
        <div>
          <label className="label">New Password</label>
          <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        </div>
        <button className="btn-primary !py-2" disabled={saving}>
          {saving ? "Saving..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

function FeedbackTab({ studentId, initialFeedback }: { studentId: string; initialFeedback: Feedback[] }) {
  const supabase = createClient();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [list, setList] = useState(initialFeedback);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("feedback")
      .insert({ student_id: studentId, message: message.trim(), rating })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setList([data as Feedback, ...list]);
    setMessage("");
    setMsg("Thanks — your feedback has been sent to the admin.");
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Send Feedback</h2>
        <p className="mb-4 text-xs text-slate-500">
          Your review may be shown publicly on the website's Reviews section once approved by the admin.
        </p>
        {msg && <p className="mb-3 text-sm text-cyan-300">{msg}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
                <Star size={20} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"} />
              </button>
            ))}
          </div>
          <textarea
            className="input-field h-28"
            placeholder="Tell us about your experience, or report an issue..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <button className="btn-primary !py-2" disabled={submitting}>
            {submitting ? "Sending..." : "Submit Feedback"}
          </button>
        </form>
      </div>

      {list.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Your Previous Feedback</h2>
          <div className="space-y-3">
            {list.map((f) => (
              <div key={f.id} className="rounded-lg border border-white/10 px-4 py-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: f.rating ?? 0 }).map((_, i) => (
                      <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-300">{f.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
