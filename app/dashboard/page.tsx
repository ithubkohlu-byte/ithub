"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateAdmissionPdf } from "@/lib/generatePdf";
import { QRCodeCanvas } from "qrcode.react";
import toast from "react-hot-toast";
import { LogOut, Download, FileText, Printer, Loader2 } from "lucide-react";
import { DOC_TYPES, formatDate } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-yellow-500/20 text-yellow-300",
  Verified: "bg-accent/20 text-accent",
  Rejected: "bg-red-500/20 text-red-300",
  Enrolled: "bg-emerald-500/20 text-emerald-300",
};

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [rollNumber, setRollNumber] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: studentRow } = await supabase.from("students").select("*").eq("auth_user_id", user.id).maybeSingle();
    if (!studentRow) { setLoading(false); return; }
    setStudent(studentRow);

    const { data: docs } = await supabase.from("documents").select("*").eq("student_id", studentRow.id);
    setDocuments(docs || []);

    const { data: enroll } = await supabase
      .from("enrollments").select("*, batches(*)").eq("student_id", studentRow.id).maybeSingle();
    setEnrollment(enroll);

    if (enroll) {
      const { data: roll } = await supabase.from("roll_numbers").select("*").eq("student_id", studentRow.id).maybeSingle();
      setRollNumber(roll);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDownloadPdf() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const qrUrl = `${siteUrl}/roll-slip?id=${student.tracking_id}`;
    const canvas = document.getElementById("dash-qr") as HTMLCanvasElement;
    const qrDataUrl = canvas.toDataURL("image/png");
    const photoDoc = documents.find((d) => d.doc_type === "photo");
    await generateAdmissionPdf({
      trackingId: student.tracking_id,
      fullName: student.full_name,
      fatherName: student.father_name,
      cnic: student.cnic,
      course: enrollment?.course_name || "-",
      batch: enrollment?.batches?.batch_name || "-",
      phone: student.phone,
      email: student.email,
      photoDataUrl: photoDoc?.file_url || null,
      qrDataUrl,
    });
  }

  if (loading) {
    return <div className="min-h-screen bg-base flex items-center justify-center"><Loader2 className="animate-spin text-accent" size={32} /></div>;
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-white/60 mb-4">No application found for this account.</p>
          <button onClick={handleLogout} className="glass px-6 py-2 rounded-lg">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base px-4 py-10">
      <div className="hidden"><QRCodeCanvas id="dash-qr" value={student.tracking_id} size={128} /></div>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Student Dashboard</h1>
          <button onClick={handleLogout} className="glass px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div className="glass rounded-2xl p-8 mb-6">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
            <div>
              <p className="text-white/50 text-sm">Tracking ID</p>
              <p className="text-3xl font-extrabold text-gradient">{student.tracking_id}</p>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLOR[student.status]}`}>
              {student.status}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Full Name" value={student.full_name} />
            <Info label="Father Name" value={student.father_name} />
            <Info label="Email" value={student.email} />
            <Info label="Phone" value={student.phone} />
            <Info label="CNIC" value={student.cnic} />
            <Info label="City" value={student.city} />
            <Info label="Matric %" value={`${student.matric_percent}%`} />
            <Info label="FSC %" value={`${student.fsc_percent}%`} />
            {enrollment && <Info label="Course" value={enrollment.course_name} />}
            {enrollment?.batches && <Info label="Batch" value={enrollment.batches.batch_name} />}
          </div>
          <button onClick={handleDownloadPdf} className="btn-neon text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 mt-6">
            <Download size={16} /> Download Admission Letter
          </button>
        </div>

        <div className="glass rounded-2xl p-8 mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText size={18} /> Document Status</h2>
          <div className="space-y-3">
            {DOC_TYPES.map((d) => {
              const doc = documents.find((x) => x.doc_type === d.key);
              return (
                <div key={d.key} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-sm">{d.label}</p>
                    {doc?.admin_comment && <p className="text-xs text-white/40 mt-1">{doc.admin_comment}</p>}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${STATUS_COLOR[doc?.status || "Pending"]}`}>
                    {doc?.status || "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {rollNumber && (
          <div className="glass rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">Roll Number Slip</h2>
              <button onClick={() => window.print()} className="glass px-4 py-2 rounded-lg text-sm flex items-center gap-2 no-print">
                <Printer size={16} /> Print
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info label="Roll No" value={rollNumber.roll_no} big />
              <Info label="Exam Center" value={rollNumber.exam_center} />
              <Info label="Exam Date" value={formatDate(rollNumber.exam_date)} />
              <Info label="Exam Time" value={rollNumber.exam_time} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="text-white/40 text-xs">{label}</p>
      <p className={big ? "text-2xl font-bold text-accent" : "font-medium"}>{value}</p>
    </div>
  );
}
