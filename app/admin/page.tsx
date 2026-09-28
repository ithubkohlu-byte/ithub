import { createClient } from "@/lib/supabase/server";
import { FileStack, Armchair, UserCheck, UserX, Clock } from "lucide-react";

export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = createClient();

  const [{ count: totalApplications }, { data: batches }, { count: pendingCount }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("batches").select("seats_total, seats_filled"),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("application_status", "pending"),
  ]);

  const seatsTotal = (batches ?? []).reduce((s, b) => s + b.seats_total, 0) || 50;
  const seatsFilled = (batches ?? []).reduce((s, b) => s + b.seats_filled, 0);
  const seatsLeft = Math.max(seatsTotal - seatsFilled, 0);

  const cards = [
    { label: "Total Applications", value: totalApplications ?? 0, icon: FileStack, color: "text-cyan-300" },
    { label: "Total Seats", value: seatsTotal, icon: Armchair, color: "text-blue-300" },
    { label: "Seats Filled", value: seatsFilled, icon: UserCheck, color: "text-emerald-300" },
    { label: "Seats Left", value: seatsLeft, icon: UserX, color: "text-amber-300" },
    { label: "Pending Verification", value: pendingCount ?? 0, icon: Clock, color: "text-red-300" },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-white">Dashboard</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="glass-card p-5">
              <Icon className={c.color} size={22} />
              <p className="mt-4 text-2xl font-bold text-white">{c.value}</p>
              <p className="mt-1 text-xs text-slate-400">{c.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
