"use client";

import * as React from "react";

interface TimelineItem {
  title: string;
  time: string;
  actor?: string;
  note?: string;
  status?: "info" | "success" | "warning" | "danger";
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  info: "bg-neutral-500",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Timeline({ items, className = "" }: TimelineProps) {
  return (
    <div className={className}>
      <ul role="list" className="relative space-y-6 pl-8 border-l border-neutral-200">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="relative mb-6 last:mb-0">
              <span
                className={`absolute -left-[8px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${STATUS_DOT[item.status ?? "info"]} shadow-sm`}
                aria-hidden="true"
              />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.actor && (
                    <p className="mt-0.5 text-xs text-neutral-500">{item.actor}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-500">{item.time}</p>
                  {item.note && (
                    <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{item.note}</p>
                  )}
                </div>
              </div>
              {!isLast && (
                <span className="absolute -left-[8px] top-[20px] bottom-0 w-px bg-neutral-200" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}