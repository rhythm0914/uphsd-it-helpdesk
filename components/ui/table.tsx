"use client";

import * as React from "react";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export function Table({ className = "", ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table {...props} className={`w-full border-collapse text-sm ${className}`} />
    </div>
  );
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function TableHeader({ className = "", ...props }: TableHeaderProps) {
  return (
    <thead
      {...props}
      className={`border-b border-border [&_th]:border-b [&_th]:px-6 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-neutral-500 [&_th]:uppercase [&_th]:tracking-wider ${className}`}
    />
  );
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export function TableRow({ className = "", ...props }: TableRowProps) {
  return (
    <tr
      {...props}
      className={`border-b border-border hover:bg-neutral-50/40 transition-colors ${className}`}
    />
  );
}

interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {}

export function TableHead({ className = "", ...props }: TableHeadProps) {
  return (
    <th
      {...props}
      className={`px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider ${className}`}
    />
  );
}

interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {}

export function TableCell({ className = "", ...props }: TableCellProps) {
  return (
    <td
      {...props}
      className={`px-6 py-3 text-sm text-foreground ${className}`}
    />
  );
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({ className = "", ...props }: TableBodyProps) {
  return (
    <tbody {...props} className={`[&_tr]:last:border-0 ${className}`} />
  );
}

interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}

export function TableCaption({
  className = "",
  ...props
}: TableCaptionProps) {
  return (
    <caption
      {...props}
      className={`mt-2 text-xs text-neutral-500 ${className}`}
    />
  );
}