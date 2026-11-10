"use client";

import * as React from "react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      className={`flex items-center gap-1 text-xs ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.label}>
            {isLast ? (
              <span aria-current="page" className="text-neutral-500">
                {item.label}
              </span>
            ) : (
              <>
                <Link
                  href={item.href}
                  className="text-neutral-600 hover:text-primary underline underline-offset-4"
                >
                  {item.label}
                </Link>
                <span className="text-neutral-400" aria-hidden="true">
                  &rsaquo;
                </span>
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}