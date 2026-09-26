"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, XCircle, KeyRound, Loader2 } from "lucide-react";
import { DOC_TYPES } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-yellow-500/20 text-yellow-300",
  Verified: "bg-accent/20 text-accent",
  Rejected: "bg-red-500/20 text-red-300",
  Enrolled: "bg-emerald-500/20 text-emerald-300",
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [student, setStudent] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: s } = await supabase.from("students").select("*").eq("id", id).single();
    setStudent(s);
    const { data: docs } = await supabase.from("documents").select("*").eq("student_id", id);
    setDocuments(docs || []);
    const { data: enroll } = await supabase.from("enrollments").select("*, batches(*)").eq("student_id", id).maybeSingle();
    setEnrollment(enroll);
    setLoading(false);
  }

  async function handleDocAction(docId: string, status: "Verified" | "Rejected") {
    const { error } = await supabase.from("documents").update({ status, admin_comment: comments[docId] || null }).eq("id", docId);
    if (error) return toast.error(error.message);
    toast.success(`Document ${status}`);
    load();
  }

  async function handleFinal(status: "Verified" | "Rejected" | "Enrolled") {
    const { error } = await supabase.from("students").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Application ${status}`);
    load();
  }

  async function handleResetPassword() {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setResetting(true);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authUserId: student.auth_user_id, newPassword }),
    });
    const json = await res.json();
    setResetting(false);
    if (!res.ok) return toast.error(json.error || "Failed to reset password");
    toast.success("Password reset successfully");
    setNewPassword("");
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={28} /></div>;
  if (!student) return <p className="text-white/50">Student not found.</p>;

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 mb-6 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <p className="text-white/50 text-sm">{student.tracking_id}</p>
            <h1 className="text-2xl font-bold">{student.full_name}</h1>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLOR[student.status]}`}>{student.status}</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <Info label="Father Name" value={student.father_name} />
          <Info label="Email" value={student.email} />
          <Info label="Phone" value={student.phone} />
          <Info label="CNIC" value={student.cnic} />
          <Info label="Father CNIC" value={student.father_cnic} />
          <Info label="DOB" value={student.dob} />
          <Info label="Gender" value={student.gender} />
          <Info label="City" value={student.city} />
          <Info label="Address" value={student.address} />
          <Info label="Matric" value={`${student.matric_board} / ${student.matric_year} — ${student.matric_percent}%`} />
          <Info label="FSC" value={`${student.fsc_board} / ${student.fsc_group} / ${student.fsc_year} — ${student.fsc_percent}%`} />
          {enrollment && <Info label="Course / Batch" value={`${enrollment.course_name} — ${enrollment.batches?.batch_name}`} />}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => handleFinal("Verified")} className="btn-neon text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> Final Approve
          </button>
          <button onClick={() => handleFinal("Rejected")} className="glass text-red-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <XCircle size={16} /> Reject
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-8 mb-6">
        <h2 className="font-bold text-lg mb-4">Documents</h2>
        <div className="space-y-4">
          {DOC_TYPES.map((d) => {
            const doc = documents.find((x) => x.doc_type === d.key);
            if (!doc) return null;
            return (
              <div key={d.key} className="bg-white/5 rounded-lg p-4">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                  <p className="text-sm font-medium">{d.label}</p>
                  <span className={`text-xs px-3 py-1 rounded-full ${STATUS_COLOR[doc.status]}`}>{doc.status}</span>
                </div>
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-accent text-xs hover:underline">View Document</a>
                <textarea
                  placeholder="Admin comment (optional)"
                  defaultValue={doc.admin_comment || ""}
                  onChange={(e) => setComments({ ...comments, [doc.id]: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-3"
                  rows={2}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleDocAction(doc.id, "Verified")} className="text-xs glass px-3 py-1.5 rounded-lg text-accent">Verify</button>
                  <button onClick={() => handleDocAction(doc.id, "Rejected")} className="text-xs glass px-3 py-1.5 rounded-lg text-red-300">Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-8">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><KeyRound size={18} /> Reset Student Password</h2>
        <div className="flex gap-3 max-w-md">
          <input
            type="password" placeholder="New temporary password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm"
          />
          <button onClick={handleResetPassword} disabled={resetting} className="btn-neon text-white px-4 py-2 rounded-lg text-sm">
            {resetting ? <Loader2 className="animate-spin" size={16} /> : "Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/40 text-xs">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}
