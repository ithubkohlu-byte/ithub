"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Client-side pagination hook. The admin lists in this app are small enough
 * (hundreds, not millions, of rows) to load in one query and page through in
 * memory — this avoids a second round trip per page while still keeping the
 * DOM light (only one page's worth of <tr> rendered at a time).
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  // Snap back to the last valid page whenever the list shrinks below the
  // current page (e.g. a search/filter narrows the results).
  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  return { page: safePage, pageCount, pageItems, setPage, total: items.length };
}

interface PaginationBarProps {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  total: number;
  pageSize: number;
}

export default function PaginationBar({ page, pageCount, onPageChange, total, pageSize }: PaginationBarProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-slate-400">
      <span>
        Showing <span className="text-slate-200">{from}-{to}</span> of <span className="text-slate-200">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-outline !px-2.5 !py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-[70px] text-center text-slate-300">
          Page {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="btn-outline !px-2.5 !py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
