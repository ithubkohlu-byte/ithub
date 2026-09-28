"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, Trash2, Zap } from "lucide-react";

interface EnrolledStudent {
  id: string;
  full_name: string;
  tracking_id: string;
  student_cnic: string;
}

interface IdCardRow {
  id: string;
  student_id: string;
  card_no: string;
  class_section: string | null;
  emergency_contact: string | null;
  blood_group: string | null;
  issue_date: string;
  valid_until: string | null;
  students: { full_name: string; tracking_id: string; student_cnic: string } | null;
}

const EMPTY_FORM = { class_section: "", emergency_contact: "", blood_group: "" };

export default function AdminIdCardsPage() {
  const supabase = createClient();
  const [enrolled, setEnrolled] = useState<EnrolledStudent[]>([]);
  const [cards, setCards] = useState<IdCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [msg, setMsg] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<IdCardRow>>>({});

  async function load() {
    setLoading(true);
    const [{ data: students }, { data: cardRows }] = await Promise.all([
      supabase.from("students").select("id, full_name, tracking_id, student_cnic").eq("application_status", "enrolled"),
      supabase
        .from("id_cards")
        .select("*, students(full_name, tracking_id, student_cnic)")
        .order("created_at", { ascending: false }),
    ]);
    const issuedIds = new Set((cardRows ?? []).map((c: any) => c.student_id));
    setEnrolled(((students as EnrolledStudent[]) ?? []).filter((s) => !issuedIds.has(s.id)));
    setCards((cardRows as IdCardRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const withoutCardCount = enrolled.length;

  async function issueOne(studentId: string, overrides?: Partial<typeof EMPTY_FORM>) {
    const f = { ...form, ...overrides };
    // valid_until is deliberately omitted — a database trigger auto-fills it
    // with the student's batch end date (or +3 months if no batch is found)
    // as soon as this row is inserted.
    const { error } = await supabase.from("id_cards").insert({
      student_id: studentId,
      class_section: f.class_section || null,
      emergency_contact: f.emergency_contact || null,
      blood_group: f.blood_group || null,
    });
    return error;
  }

  async function handleIssue() {
    if (!selectedId) return;
    setIssuing(true);
    setMsg(null);
    const error = await issueOne(selectedId);
    setIssuing(false);
    if (error) {
      setMsg(`❌ ${error.message}`);
      return;
    }
    setMsg("✅ Card issued.");
    setSelectedId("");
    setForm({ ...EMPTY_FORM });
    load();
  }

  async function handleBulkIssue() {
    setIssuing(true);
    setMsg(null);
    const logs: string[] = [];
    for (const s of enrolled) {
      const error = await issueOne(s.id);
      logs.push(error ? `❌ ${s.full_name}: ${error.message}` : `✅ ${s.full_name} → card issued`);
    }
    setBulkLog(logs);
    setIssuing(false);
    load();
  }

  async function updateField(cardId: string, field: keyof IdCardRow, value: string) {
    setSavingId(cardId);
    await supabase
      .from("id_cards")
      .update({ [field]: value.trim() === "" ? null : value })
      .eq("id", cardId);
    setSavingId(null);
    load();
  }

  async function handleRevoke(cardId: string, name: string) {
    if (!confirm(`Revoke the ID card for ${name}? They will no longer be able to download it.`)) return;
    await supabase.from("id_cards").delete().eq("id", cardId);
    load();
  }

  const selectedStudent = useMemo(() => enrolled.find((s) => s.id === selectedId), [enrolled, selectedId]);

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 font-display text-2xl font-semibold text-white">
        <CreditCard size={22} /> Student ID Cards
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Issue one */}
        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Issue a Card</h2>
          {msg && <p className="mb-3 text-sm text-cyan-300">{msg}</p>}
          <div className="space-y-3">
            <div>
              <label className="label">Enrolled Student (without a card yet)</label>
              <select className="input-field" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">— Select a student —</option>
                {enrolled.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.tracking_id})
                  </option>
                ))}
              </select>
              {selectedStudent && <p className="mt-1 text-xs text-slate-500">CNIC: {selectedStudent.student_cnic}</p>}
            </div>
            <input
              className="input-field"
              placeholder="Class / Course label (optional — falls back to their course + batch)"
              value={form.class_section}
              onChange={(e) => setForm({ ...form, class_section: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Emergency Contact"
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Blood Group (e.g. O+)"
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Valid Until</label>
              <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                Auto-calculated from the student&apos;s batch end date once issued — no need to set this manually.
              </p>
            </div>
            <button onClick={handleIssue} disabled={!selectedId || issuing} className="btn-primary w-full !py-2">
              {issuing ? "Issuing..." : "Issue Card"}
            </button>
          </div>
        </div>

        {/* Bulk issue */}
        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Bulk Issue</h2>
          <p className="mb-4 text-sm text-slate-400">
            {loading ? "Loading..." : `${withoutCardCount} enrolled student${withoutCardCount === 1 ? "" : "s"} currently ${withoutCardCount === 1 ? "doesn't" : "don't"} have a card yet.`}
          </p>
          <button
            onClick={handleBulkIssue}
            disabled={withoutCardCount === 0 || issuing}
            className="btn-outline w-full !py-3"
          >
            {issuing ? "Issuing..." : `Issue Cards for All ${withoutCardCount} Enrolled Students`}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Uses default (blank) class/emergency contact/blood group. Valid Until is auto-set from each student&apos;s
            batch end date.
          </p>
          {bulkLog.length > 0 && (
            <div className="mt-4 max-h-48 space-y-1 overflow-y-auto scroll-thin text-xs">
              {bulkLog.map((l, i) => (
                <p key={i} className="text-slate-300">
                  {l}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card mt-6 overflow-x-auto scroll-thin p-0">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Card No</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Class / Course</th>
              <th className="px-4 py-3">Emergency Contact</th>
              <th className="px-4 py-3">Blood Group</th>
              <th className="px-4 py-3">Valid Until</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-b border-white/5">
                <td className="px-4 py-3 font-semibold text-cyan-300">{c.card_no}</td>
                <td className="px-4 py-3 text-slate-200">{c.students?.full_name}</td>
                <td className="px-4 py-3 text-slate-400">{c.students?.tracking_id}</td>
                <td className="px-4 py-3">
                  <input
                    className="input-field !py-1 text-xs"
                    value={drafts[c.id]?.class_section ?? c.class_section ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: { ...d[c.id], class_section: e.target.value } }))}
                    onBlur={(e) => {
                      if (e.target.value !== (c.class_section ?? "")) updateField(c.id, "class_section", e.target.value);
                    }}
                    disabled={savingId === c.id}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="input-field !py-1 text-xs"
                    value={drafts[c.id]?.emergency_contact ?? c.emergency_contact ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: { ...d[c.id], emergency_contact: e.target.value } }))}
                    onBlur={(e) => {
                      if (e.target.value !== (c.emergency_contact ?? "")) updateField(c.id, "emergency_contact", e.target.value);
                    }}
                    disabled={savingId === c.id}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="input-field !py-1 text-xs"
                    value={drafts[c.id]?.blood_group ?? c.blood_group ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: { ...d[c.id], blood_group: e.target.value } }))}
                    onBlur={(e) => {
                      if (e.target.value !== (c.blood_group ?? "")) updateField(c.id, "blood_group", e.target.value);
                    }}
                    disabled={savingId === c.id}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-300">{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleRevoke(c.id, c.students?.full_name ?? "this student")}
                    className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 size={12} /> Revoke
                  </button>
                </td>
              </tr>
            ))}
            {!loading && cards.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No ID cards issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Zap size={12} /> Students download their card themselves from the public{" "}
        <code className="text-cyan-300">/id-card</code> page by entering their CNIC — only enrolled students with a
        card issued here will find a match.
      </p>
    </div>
  );
}
