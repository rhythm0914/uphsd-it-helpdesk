"use client";

import * as React from "react";

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface AccordionHeaderProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

interface AccordionItemContext {
  toggle: () => void;
  isOpen: boolean;
  disabled: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContext | null>(
  null
);

function useAccordionItemContext() {
  const ctx = React.useContext(AccordionItemContext);
  if (!ctx) throw new Error("Accordion parts must be used within <AccordionItem>");
  return ctx;
}

export function Accordion({ children, className = "" }: AccordionProps) {
  return <div className={className}>{children}</div>;
}

export function AccordionItem({
  value,
  children,
  className = "",
}: AccordionItemProps) {
  const [open, setOpen] = React.useState(false);
  const ctx: AccordionItemContext = {
    toggle: () => setOpen((o) => !o),
    isOpen: open,
    disabled: false,
  };
  return (
    <div className={`border-b border-border ${className}`}>
      <AccordionItemContext.Provider value={ctx}>{children}</AccordionItemContext.Provider>
    </div>
  );
}

export const AccordionHeader = React.forwardRef<
  HTMLButtonElement,
  AccordionHeaderProps
>((props, ref) => {
  const { toggle, isOpen, disabled } = useAccordionItemContext();
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-expanded={isOpen}
      aria-controls={`accordion-panel-${props.value}`}
      id={`accordion-header-${props.value}`}
      disabled={disabled}
      onClick={toggle}
      className={`flex w-full items-center justify-between py-4 text-left font-medium
        ${isOpen ? "text-primary" : "text-neutral-700"}
        hover:text-primary transition-colors
        focus-visible:ring-1 focus-visible:ring-primary`}
      {...props}
    >
      {props.children}
    </button>
  );
});

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>((props, ref) => {
  const { isOpen } = useAccordionItemContext();
  if (!isOpen) return null;
  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`accordion-panel-${props.value}`}
      aria-labelledby={`accordion-header-${props.value}`}
      className="pt-4 pb-2 text-sm text-neutral-700"
      {...props}
    />
  );
});