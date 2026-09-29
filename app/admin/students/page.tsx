"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Student, Course } from "@/types";
import { Ban, Download, Eye, Search, UserCheck, UserX, Users } from "lucide-react";
import EnrollModal from "@/components/admin/EnrollModal";
import * as XLSX from "xlsx";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import PaginationBar, { usePagination } from "@/components/ui/Pagination";

type Row = Student & { enrollments: { course_name: string; batches: { batch_name: string } }[] };

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  verified: "bg-cyan-500/15 text-cyan-300",
  rejected: "bg-red-500/15 text-red-300",
  enrolled: "bg-emerald-500/15 text-emerald-300",
  struck_off: "bg-orange-500/15 text-orange-300",
};

export default function AdminStudentsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [enrollFor, setEnrollFor] = useState<Row | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data }, { data: courseData }] = await Promise.all([
      supabase.from("students").select("*, enrollments(course_name, batches(batch_name))").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("display_order", { ascending: true }),
    ]);
    setRows((data as Row[]) ?? []);
    setCourses((courseData as Course[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(r: Row, status: "rejected" | "struck_off") {
    const label = status === "rejected" ? "Reject" : "Strike off";
    if (!confirm(`${label} ${r.full_name}?`)) return;
    setBusyId(r.id);
    await supabase.from("students").update({ application_status: status }).eq("id", r.id);
    setBusyId(null);
    load();
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        !search ||
        [r.full_name, r.student_cnic, r.tracking_id, r.phone, r.email].some((f) =>
          f?.toLowerCase().includes(search.toLowerCase())
        );
      const matchesCourse = !courseFilter || r.enrollments?.[0]?.course_name === courseFilter;
      const matchesStatus = !statusFilter || r.application_status === statusFilter;
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [rows, search, courseFilter, statusFilter]);

  const { page, pageCount, pageItems, setPage, total } = usePagination(filtered, 10);

  function buildExportRows() {
    return filtered.map((r) => ({
      "Tracking ID": r.tracking_id,
      Name: r.full_name,
      Father: r.father_name,
      CNIC: r.student_cnic,
      Mobile: r.phone,
      Email: r.email,
      City: r.city,
      Course: r.enrollments?.[0]?.course_name ?? "",
      Batch: r.enrollments?.[0]?.batches?.batch_name ?? "",
      Status: r.application_status,
    }));
  }

  function exportExcel() {
    const data = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "ithub-students.xlsx");
  }

  function exportCsv() {
    const data = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ithub-students.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-white">Student Data Bank</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-outline !py-2 text-sm">
            <Download size={16} /> Export to CSV
          </button>
          <button onClick={exportExcel} className="btn-outline !py-2 text-sm">
            <Download size={16} /> Export to Excel
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search name, CNIC, tracking ID, phone, email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-auto" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select className="input-field w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="enrolled">Enrolled</option>
          <option value="struck_off">Struck Off</option>
        </select>
      </div>

      <div className="glass-card overflow-x-auto scroll-thin p-0">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Father</th>
              <th className="px-4 py-3">CNIC</th>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonTableRows rows={6} cols={9} />}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={Users}
                    title="No students found"
                    description={search || courseFilter || statusFilter ? "Try adjusting your search or filters." : "Applications will show up here once students apply."}
                  />
                </td>
              </tr>
            )}
            {!loading && pageItems.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="px-4 py-3">
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo_url} className="h-9 w-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-white/10" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-white">{r.full_name}</td>
                <td className="px-4 py-3 text-slate-400">{r.father_name}</td>
                <td className="px-4 py-3 text-slate-400">{r.student_cnic}</td>
                <td className="px-4 py-3 text-cyan-300">{r.tracking_id}</td>
                <td className="px-4 py-3 text-slate-400">{r.enrollments?.[0]?.course_name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-400">{r.enrollments?.[0]?.batches?.batch_name ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[r.application_status] ?? "bg-white/10 text-slate-300"}`}>
                    {r.application_status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {r.application_status !== "enrolled" && (
                      <button onClick={() => setEnrollFor(r)} disabled={busyId === r.id} title="Enroll student"
                        className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25">
                        <UserCheck size={13} /> Enroll
                      </button>
                    )}
                    {r.application_status !== "rejected" && (
                      <button onClick={() => setStatus(r, "rejected")} disabled={busyId === r.id} title="Reject student"
                        className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25">
                        <UserX size={13} /> Reject
                      </button>
                    )}
                    {r.application_status !== "struck_off" && (
                      <button onClick={() => setStatus(r, "struck_off")} disabled={busyId === r.id} title="Strike off student"
                        className="flex items-center gap-1 rounded-md bg-orange-500/15 px-2 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-500/25">
                        <Ban size={13} /> Struck Off
                      </button>
                    )}
                    <Link href={`/admin/students/${r.id}`} className="ml-1 text-cyan-300 hover:text-cyan-200" title="View details">
                      <Eye size={16} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar page={page} pageCount={pageCount} onPageChange={setPage} total={total} pageSize={10} />
      </div>

      {enrollFor && (
        <EnrollModal
          studentId={enrollFor.id}
          studentName={enrollFor.full_name}
          onClose={() => setEnrollFor(null)}
          onDone={() => { setEnrollFor(null); load(); }}
        />
      )}
    </div>
  );
}
