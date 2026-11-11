"use client";

import * as React from "react";

interface TooltipProps {
  children: React.ReactElement;
  label: string;
}

export function Tooltip({ children, label }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {React.cloneElement(children as React.ReactElement<any>, {
        "aria-label": label,
      })}
      {open && (
        <div className="absolute z-50 mt-1 px-2 py-1 text-xs text-white bg-neutral-900 rounded-lg whitespace-nowrap pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}