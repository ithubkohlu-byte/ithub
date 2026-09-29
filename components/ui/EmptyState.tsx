import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Consistent "nothing here yet" panel, used anywhere a list, table or
 * search can come back empty — replaces ad-hoc "No results" text rows.
 */
export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center animate-[float-up_0.4s_ease-out]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-500">
        <Icon size={22} />
      </div>
      <div>
        <p className="font-medium text-slate-200">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
