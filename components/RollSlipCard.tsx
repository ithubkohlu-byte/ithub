"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2, Printer } from "lucide-react";
import type { RollNumber, Student } from "@/types";

// On-screen / print version of the Roll Number Slip. It uses the exact same
// A4 template as the Admission Letter (and as the downloadable PDF from
// lib/pdf.ts): dark header band with logo + institute name, photo top-right,
// label/value rows, note box, QR + signature line, footer and double border.

const INK = "#0A0E1A";
const ACCENT = "#22D3EE";

const INSTRUCTIONS = [
  "Please bring a printout of this Roll No. Slip on the test day along with your original CNIC/B-Form (MANDATORY).",
  "Bring your own Clipboard and Ball Pen (black/blue). Electronic devices including mobile phones and calculators are not allowed in the test hall.",
  "Reach the test center well before the reporting time — no candidate will be entertained after the test begins.",
  "This Roll No. Slip is issued provisionally, subject to verification of your original documents. No entry into the test center without it.",
];

export default function RollSlipCard({
  student,
  rollNumber,
  courseName,
  batchName,
  instituteName = "IT HUB Kohlu",
  logoUrl,
  onDownload,
  downloading,
}: {
  student: Student;
  rollNumber: RollNumber;
  courseName: string;
  batchName: string;
  instituteName?: string;
  logoUrl?: string | null;
  onDownload?: () => void;
  downloading?: boolean;
}) {
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify?tid=${encodeURIComponent(student.tracking_id)}&roll=${encodeURIComponent(rollNumber.roll_no)}`
      : `/verify?tid=${encodeURIComponent(student.tracking_id)}&roll=${encodeURIComponent(rollNumber.roll_no)}`;

  const formattedDate = rollNumber.exam_date
    ? new Date(rollNumber.exam_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "-";

  return (
    <div className="mx-auto w-full max-w-[794px]">
      <div
        id="roll-slip-print"
        className="relative overflow-hidden bg-white text-[#141414]"
        style={{ border: `3px solid ${INK}`, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        {/* Header band */}
        <div
          className="flex items-center gap-4 px-6 py-5 text-white sm:px-10"
          style={{ background: INK, borderBottom: `3px solid ${ACCENT}` }}
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={instituteName} className="h-14 w-14 shrink-0 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4 sm:text-[25px]">{instituteName}</h1>
            <p className="mt-1.5 text-sm">Roll Number Slip</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-16 pt-8 sm:px-10">
          {student.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photo_url}
              alt="Candidate"
              className="float-right ml-4 h-[100px] w-[90px] object-cover"
            />
          )}

          <p className="text-[13px] font-bold sm:text-base">Tracking ID: {student.tracking_id}</p>

          <Section title="Candidate Information">
            <Row label="Full Name:" value={student.full_name} />
            <Row label="Father's Name:" value={student.father_name} />
            <Row label="CNIC:" value={student.student_cnic} />
            <Row label="Course:" value={courseName} />
            <Row label="Batch:" value={batchName} />
          </Section>

          <Section title="Test Details">
            <Row label="Roll Number:" value={rollNumber.roll_no} />
            <Row label="Test Type:" value={rollNumber.test_type || "Entry Test"} />
            <Row label="Test Day & Date:" value={formattedDate} />
            <Row label="Reporting Time:" value={rollNumber.reporting_time || rollNumber.exam_time || "-"} />
            {rollNumber.reporting_time && rollNumber.exam_time && <Row label="Test Time:" value={rollNumber.exam_time} />}
            <Row label="Test Center:" value={rollNumber.exam_center} />
          </Section>

          {rollNumber.note && rollNumber.note.trim() && (
            <div className="mt-6 rounded px-3.5 py-3" style={{ background: "#FFF8E1", border: "1px solid #F5BE3C" }}>
              <p className="text-xs font-bold" style={{ color: "#966400" }}>NOTE</p>
              <p className="mt-1 whitespace-pre-line text-xs" style={{ color: "#966400" }}>{rollNumber.note}</p>
            </div>
          )}

          <Section title="Important Instructions">
            <ol className="list-none space-y-1 text-xs leading-relaxed">
              {INSTRUCTIONS.map((line, i) => (
                <li key={i}>{i + 1}. {line}</li>
              ))}
            </ol>
          </Section>

          {/* Signature + QR */}
          <div className="mt-10 flex items-end justify-between gap-4">
            <div className="w-44 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/signature.png" alt="Lab Incharge signature" className="mb-0.5 ml-2 h-10 w-auto object-contain" />
              <div className="border-t border-black pt-1">
                <p className="font-bold">Abdul Salam</p>
                <p>Lab Incharge</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <QRCodeSVG value={verifyUrl} size={90} />
              <p className="text-[11px]">Scan to verify</p>
            </div>
          </div>

          <p className="mt-8 text-[11px] leading-snug" style={{ color: "#787878" }}>
            This is a system-generated roll number slip from {instituteName}. Scan the QR code or visit the verify page with the Tracking ID to confirm it is genuine.
          </p>
        </div>

        {/* Accent line of the double border (sits on top of everything) */}
        <div className="pointer-events-none absolute inset-[6px]" style={{ border: `1px solid ${ACCENT}` }} />
      </div>

      <div className="mx-auto mt-5 flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="btn-outline flex items-center gap-2">
          <Printer size={16} /> Print Slip
        </button>
        {onDownload && (
          <button onClick={onDownload} disabled={downloading} className="btn-primary flex items-center gap-2">
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? "Preparing..." : "Download PDF"}
          </button>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          #roll-slip-print, #roll-slip-print * { visibility: visible; }
          #roll-slip-print { position: absolute; top: 0; left: 0; width: 210mm; min-height: 297mm; max-width: none; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 font-bold sm:w-40">{label}</span>
      <span className="min-w-0 break-words">{value || "-"}</span>
    </div>
  );
}
