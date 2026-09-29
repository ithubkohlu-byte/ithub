import { createClient } from "@/lib/supabase/server";
import {
  FileStack,
  Armchair,
  UserCheck,
  UserX,
  Clock,
  GraduationCap,
  BookOpen,
  Award,
} from "lucide-react";

export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = createClient();

  const [
    { count: totalApplications },
    { data: batches },
    { count: pendingCount },
    { count: enrolledCount },
    { count: rejectedCount },
    { count: courseCount },
    { count: publishedResults },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("batches").select("seats_total, seats_filled"),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("application_status", "pending"),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("application_status", "enrolled"),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("application_status", "rejected"),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("results").select("*", { count: "exact", head: true }).eq("is_published", true),
  ]);

  const seatsTotal = (batches ?? []).reduce((s, b) => s + b.seats_total, 0) || 50;
  const seatsFilled = (batches ?? []).reduce((s, b) => s + b.seats_filled, 0);
  const seatsLeft = Math.max(seatsTotal - seatsFilled, 0);
  const total = totalApplications ?? 0;
  const conversionRate = total > 0 ? Math.round(((enrolledCount ?? 0) / total) * 100) : 0;

  const cards = [
    { label: "Total Applications", value: total, icon: FileStack, color: "text-cyan-300", ring: "ring-cyan-400/20" },
    { label: "Enrolled Students", value: enrolledCount ?? 0, icon: GraduationCap, color: "text-emerald-300", ring: "ring-emerald-400/20" },
    { label: "Pending Verification", value: pendingCount ?? 0, icon: Clock, color: "text-amber-300", ring: "ring-amber-400/20" },
    { label: "Rejected", value: rejectedCount ?? 0, icon: UserX, color: "text-red-300", ring: "ring-red-400/20" },
    { label: "Total Seats", value: seatsTotal, icon: Armchair, color: "text-blue-300", ring: "ring-blue-400/20" },
    { label: "Seats Filled", value: seatsFilled, icon: UserCheck, color: "text-emerald-300", ring: "ring-emerald-400/20" },
    { label: "Seats Left", value: seatsLeft, icon: Armchair, color: "text-slate-300", ring: "ring-white/10" },
    { label: "Active Courses", value: courseCount ?? 0, icon: BookOpen, color: "text-purple-300", ring: "ring-purple-400/20" },
    { label: "Published Results", value: publishedResults ?? 0, icon: Award, color: "text-cyan-300", ring: "ring-cyan-400/20" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">A live snapshot of admissions across every course and batch.</p>
        </div>
        <div className="glass-card flex items-center gap-3 !px-4 !py-3">
          <span className="text-xs uppercase tracking-wider text-slate-500">Conversion</span>
          <span className="font-display text-xl font-bold text-emerald-300">{conversionRate}%</span>
          <span className="text-xs text-slate-500">of applicants enrolled</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="glass-card group animate-[float-up_0.35s_ease-out_backwards] p-5 transition-transform duration-200 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ${c.ring} transition-colors group-hover:bg-white/10`}>
                <Icon className={c.color} size={20} />
              </div>
              <p className="mt-4 font-display text-2xl font-bold text-white">{c.value}</p>
              <p className="mt-1 text-xs text-slate-400">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card mt-5 p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Seat utilization</span>
          <span>{seatsFilled} / {seatsTotal} seats</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-700 ease-out"
            style={{ width: `${seatsTotal > 0 ? Math.min(100, (seatsFilled / seatsTotal) * 100) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
