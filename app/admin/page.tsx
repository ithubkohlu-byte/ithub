"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Users, Clock, Layers, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({ total: 0, pending: 0, seatsTotal: 0, seatsFilled: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { count: total } = await supabase.from("students").select("id", { count: "exact", head: true });
      const { count: pending } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "Pending");
      const { data: batches } = await supabase.from("batches").select("seats_total, seats_filled");
      const seatsTotal = (batches || []).reduce((a, b) => a + b.seats_total, 0);
      const seatsFilled = (batches || []).reduce((a, b) => a + b.seats_filled, 0);
      setStats({ total: total || 0, pending: pending || 0, seatsTotal, seatsFilled });

      const { data: recentStudents } = await supabase.from("students").select("*").order("created_at", { ascending: false }).limit(8);
      setRecent(recentStudents || []);
    })();
  }, []);

  const cards = [
    { label: "Total Applications", value: stats.total, icon: Users, color: "from-blue-500 to-cyan-400" },
    { label: "Pending Review", value: stats.pending, icon: Clock, color: "from-yellow-500 to-orange-400" },
    { label: "Total Seats", value: stats.seatsTotal, icon: Layers, color: "from-purple-500 to-pink-400" },
    { label: "Seats Filled", value: stats.seatsFilled, icon: CheckCircle2, color: "from-emerald-500 to-teal-400" },
    { label: "Seats Left", value: Math.max(0, stats.seatsTotal - stats.seatsFilled), icon: XCircle, color: "from-red-500 to-rose-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-xl p-5">
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center mb-4`}>
              <c.icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-white/50 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">Recent Applications</h2>
          <Link href="/admin/students" className="text-accent text-sm hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="py-2 pr-4">Tracking ID</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Applied</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium">
                    <Link href={`/admin/students/${s.id}`} className="text-accent hover:underline">{s.tracking_id}</Link>
                  </td>
                  <td className="py-3 pr-4">{s.full_name}</td>
                  <td className="py-3 pr-4">{s.phone}</td>
                  <td className="py-3 pr-4">{s.status}</td>
                  <td className="py-3 pr-4 text-white/50">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
