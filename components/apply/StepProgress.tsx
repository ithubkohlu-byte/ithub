import { Check } from "lucide-react";
import clsx from "clsx";

const STEPS = ["Account", "Personal", "Academic", "Documents", "Enrollment"];

export default function StepProgress({ current }: { current: number }) {
  return (
    <div className="mb-10 flex items-center justify-between">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={clsx(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold transition",
                  done && "border-neon-cyan bg-neon-line text-base-950",
                  active && "border-neon-cyan text-cyan-300",
                  !done && !active && "border-white/15 text-slate-500"
                )}
              >
                {done ? <Check size={16} /> : stepNum}
              </div>
              {i < STEPS.length - 1 && (
                <div className={clsx("mx-1 h-px flex-1", done ? "bg-neon-cyan/60" : "bg-white/10")} />
              )}
            </div>
            <span className={clsx("mt-2 text-[11px]", active ? "text-cyan-300" : "text-slate-500")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
