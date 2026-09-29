const VARIANTS: Record<string, string> = {
  default: "bg-white/10 text-slate-300",
  cyan: "bg-cyan-500/15 text-cyan-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  amber: "bg-amber-500/15 text-amber-300",
  red: "bg-red-500/15 text-red-300",
  orange: "bg-orange-500/15 text-orange-300",
  blue: "bg-blue-500/15 text-blue-300",
};

interface BadgeProps {
  variant?: keyof typeof VARIANTS;
  className?: string;
  children: React.ReactNode;
}

/** shadcn/ui-style status pill. Reuses the same color tokens already used across the admin panel. */
export default function Badge({ variant = "default", className = "", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}
