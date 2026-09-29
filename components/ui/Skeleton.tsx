// shadcn/ui-style primitive: a pulsing placeholder shown while data loads,
// so the page never "jumps" from blank to populated. Compose it into
// whatever shape the real content will be (a row, a card, a number).
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} />;
}

/** A full table's worth of skeleton rows, matching a given column count. */
export function SkeletonTableRows({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-white/5">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className="h-4 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** A grid of skeleton stat cards, for dashboards that are still loading. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card space-y-3 p-5">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
