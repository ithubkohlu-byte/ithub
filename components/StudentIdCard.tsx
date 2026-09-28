"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2, Printer, Zap } from "lucide-react";
import type { Student } from "@/types";

export default function StudentIdCard({
  student,
  issueDate,
  validUntil,
  instituteName = "IT HUB Kohlu",
  logoUrl,
  termsText,
  onDownload,
  downloading,
}: {
  // Only what the card is allowed to show — all of it captured from the
  // student's own admission application, never re-typed by the admin.
  student: Pick<Student, "full_name" | "father_name" | "tracking_id" | "student_cnic" | "phone" | "photo_url">;
  /** Card's issue date (ISO date string). */
  issueDate?: string | null;
  /** Card's expiry date (ISO date string) — auto-calculated as the student's batch end date. */
  validUntil?: string | null;
  instituteName?: string;
  logoUrl?: string | null;
  termsText?: string | null;
  onDownload?: () => void;
  downloading?: boolean;
}) {
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/id-card?cnic=${encodeURIComponent(student.student_cnic ?? "")}`
      : `/id-card?cnic=${encodeURIComponent(student.student_cnic ?? "")}`;

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-6">
      <div id="id-card-print" className="flex flex-col gap-5">
        {/* ---------------- FRONT ---------------- */}
        <div className="w-80 overflow-hidden rounded-2xl border border-slate-300 bg-white text-slate-900 shadow-xl">
          {/* Header band — fixed height, self-contained. Nothing below it is
              ever pulled up into it, so nothing can overlap the line. */}
          <div className="flex items-center gap-2.5 bg-[#0d2e60] px-4 py-3 text-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={instituteName}
                className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
              />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sky-400 text-[#0d2e60]">
                <Zap size={18} strokeWidth={2.5} />
              </span>
            )}
            <div className="min-w-0 text-left">
              <p className="font-display truncate text-sm font-bold uppercase leading-tight tracking-wide">
                {instituteName}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-sky-300">Student Identity Card</p>
            </div>
          </div>
          <div className="h-1 bg-sky-400" />

          {/* Body — photo sits in its own corner, fields beside it. Both
              start from a normal top margin below the header (no negative
              offsets), so nothing here can ever ride up onto the blue line. */}
          <div className="flex items-start gap-3 px-4 pb-4 pt-4">
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-100 shadow-sm">
              {student.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-center text-[9px] text-slate-400">
                  No Photo
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              <Field label="Name" value={student.full_name} big />
              <Field label="Father Name" value={student.father_name} />
              <Field label="CNIC" value={student.student_cnic} />
              <Field label="Mobile Number" value={student.phone} />
            </div>
          </div>

          <div className="flex justify-end px-4 pb-2.5 pt-0.5">
            <div className="w-32 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/signature.png" alt="Lab Incharge signature" className="mx-auto mb-0.5 h-5 w-auto object-contain" />
              <div className="border-t border-slate-400 pt-1 text-[9px] leading-tight text-slate-500">
                <p className="font-bold">Abdul Salam</p>
                <p>Lab Incharge</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0d2e60] px-4 py-2 text-center text-[11px] font-semibold tracking-wider text-white">
            Student ID: {student.tracking_id}
          </div>
        </div>

        {/* ---------------- BACK ---------------- */}
        <div className="flex min-h-[201px] w-80 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white text-slate-900 shadow-xl">
          <div className="h-2.5 bg-[#0d2e60]" />

          {/* Terms & Conditions — a little left of center, left-aligned */}
          <div className="flex flex-1 flex-col items-start justify-center py-3 pl-5 pr-8 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-[#0d2e60]">Terms &amp; Conditions</p>
            <div className="my-1.5 h-[2px] w-12 rounded bg-sky-400" />
            <p className="whitespace-pre-line text-[9.5px] leading-relaxed text-slate-600">
              {termsText && termsText.trim()
                ? termsText.trim()
                : "1. This card is the property of the institute.\n2. If found, please return to the institute office.\n3. Non-transferable — must be carried at all times."}
            </p>
          </div>

          {/* QR (bottom-left) and Student signature (bottom-right), above the footer */}
          <div className="flex items-end justify-between px-3 pb-2">
            <div className="flex flex-col items-center gap-0.5">
              <QRCodeSVG value={verifyUrl} size={40} />
              <p className="text-[6.5px] uppercase tracking-wide text-slate-400">Scan to verify</p>
            </div>
            <div className="mb-3 w-32 border-t border-slate-400 pt-1 text-center text-[9px] text-slate-700">
              Student Signature
            </div>
          </div>

          {/* Footer — Issue / Expiry dates */}
          <div className="flex items-center justify-between bg-[#0d2e60] px-4 py-2 text-[10px] font-semibold tracking-wide text-white">
            <span>Issue Date: {fmt(issueDate)}</span>
            <span>Expiry Date: {fmt(validUntil)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="btn-outline flex items-center gap-2">
          <Printer size={16} /> Print
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
          body * {
            visibility: hidden;
          }
          #id-card-print,
          #id-card-print * {
            visibility: visible;
          }
          #id-card-print {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] uppercase leading-none tracking-wide text-slate-500">{label}</p>
      <p
        className={
          big
            ? "font-display truncate text-sm font-bold leading-tight text-slate-900"
            : "truncate text-[11px] font-semibold leading-tight text-slate-800"
        }
      >
        {value || "-"}
      </p>
    </div>
  );
}
