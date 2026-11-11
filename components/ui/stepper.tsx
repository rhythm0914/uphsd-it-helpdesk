"use client";

import * as React from "react";

interface StepperProps {
  steps: { label: string; status?: "current" | "completed" | "upcoming" }[];
  className?: string;
}

export function Stepper({
  steps,
  className = "",
}: StepperProps) {
  return (
    <div className={className}>
      <ol className="flex items-center gap-4 md:gap-6" role="list">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const completed = step.status === "completed";
          const current = step.status === "current";
          return (
            <li key={index} className="flex items-center gap-3 flex-1">
              {!isLast && (
                <span className="hidden md:block h-px w-full bg-neutral-200" />
              )}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
                {completed ? (
                  <>
                    <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground">
                      <span className="sr-only">Completed</span>
                    </span>
                  </>
                ) : current ? (
                  <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {index + 1}
                  </span>
                ) : (
                  <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
                    {index + 1}
                  </span>
                )}
              </div>
              <span className={`text-sm font-medium ${completed || current ? "text-primary" : "text-neutral-500"}`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-neutral-500 hidden md:block">
        Current step is highlighted; completed steps show a checkmark.
      </p>
    </div>
  );
}