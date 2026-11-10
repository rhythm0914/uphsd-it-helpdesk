"use client";

import * as React from "react";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav
      className={`flex items-center justify-end gap-1 ${className}`}
      aria-label="Pagination"
    >
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium text-neutral-700
          disabled:opacity-50 disabled:pointer-events-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-secondary"
      >
        <span className="sr-only">Previous page</span>
        <span className="text-neutral-400">&lsaquo;</span>
      </button>
      {Array.from({ length: pageCount }).map((_, i) => {
        const p = i + 1;
        const isCurrent = p === page;
        return (
          <button
            key={p}
            type="button"
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-secondary
              ${isCurrent
                ? "bg-primary text-primary-foreground"
                : "border-transparent text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"}`}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium text-neutral-700
          disabled:opacity-50 disabled:pointer-events-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-secondary"
      >
        <span className="sr-only">Next page</span>
        <span className="text-neutral-400">&rsaquo;</span>
      </button>
    </nav>
  );
}