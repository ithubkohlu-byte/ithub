"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, Download } from "lucide-react";
import { COURSES } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function AdminStudentsPage() {
  const supabase = createClient();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("students")
      .select("*, enrollments(course_name, batch_id, batches(batch_name))")
      .order("created_at", { ascending: false });
    setStudents(data || []);
  }

  const filtered = students.filter((s) => {
    const matchesSearch =
      !search ||
      [s.full_name, s.cnic, s.tracking_id, s.phone, s.email].some((v) =>
        (v || "").toLowerCase().includes(search.toLowerCase())
      );
    const matchesCourse = !courseFilter || s.enrollments?.[0]?.course_name === courseFilter;
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  function handleExport() {
    const rows = filtered.map((s) => ({
      Name: s.full_name,
      Father: s.father_name,
      CNIC: s.cnic,
      Phone: s.phone,
      Email: s.email,
      "Tracking ID": s.tracking_id,
      Course: s.enrollments?.[0]?.course_name || "",
      Batch: s.enrollments?.[0]?.batches?.batch_name || "",
      Status: s.status,
      "Matric %": s.matric_percent,
      "FSC %": s.fsc_percent,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "ithub_students.xlsx");
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold">Students</h1>
        <button onClick={handleExport} className="btn-neon text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Download size={16} /> Export to Excel
        </button>
      </div>

      <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-3 text-white/30" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, CNIC, tracking ID, phone, email"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm">
          <option value="" className="bg-base">All Courses</option>
          {COURSES.map((c) => <option key={c} value={c} className="bg-base">{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm">
          <option value="" className="bg-base">All Status</option>
          {["Pending", "Verified", "Rejected", "Enrolled"].map((s) => <option key={s} value={s} className="bg-base">{s}</option>)}
        </select>
      </div>

      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="py-2 pr-4">Tracking ID</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">CNIC</th>
              <th className="py-2 pr-4">Course</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-white/5">
                <td className="py-3 pr-4 font-medium">{s.tracking_id}</td>
                <td className="py-3 pr-4">{s.full_name}</td>
                <td className="py-3 pr-4">{s.cnic}</td>
                <td className="py-3 pr-4">{s.enrollments?.[0]?.course_name || "-"}</td>
                <td className="py-3 pr-4">{s.status}</td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/students/${s.id}`} className="text-accent hover:underline">View</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-white/40">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
