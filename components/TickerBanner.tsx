import { Zap } from "lucide-react";
import type { Batch } from "@/types";

export default function TickerBanner({ batches }: { batches: Batch[] }) {
  const open = batches.filter((b) => b.is_announced && b.status === "open");
  if (open.length === 0) return null;

  const text = open
    .map((b) => `>> ADMISSIONS OPEN: ${b.batch_name} — ${b.seats_total - b.seats_filled} SEATS REMAINING <<`)
    .join("     |     ");

  return (
    <div
      className="overflow-hidden border-y py-2.5 text-xs"
      style={{
        borderColor: "rgba(34,211,238,0.15)",
        background: "linear-gradient(90deg, rgba(34,211,238,0.03), rgba(59,130,246,0.05), rgba(34,211,238,0.03))",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
      }}
    >
      <div className="flex animate-ticker items-center gap-4 whitespace-nowrap">
        <Zap size={12} className="shrink-0 text-cyan-400" />
        <span className="text-cyan-300">{text}</span>
        <span className="mx-8 text-cyan-400/30">///</span>
        <span className="text-cyan-300">{text}</span>
      </div>
    </div>
  );
}
