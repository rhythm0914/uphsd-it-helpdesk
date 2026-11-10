"use client";

import * as React from "react";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

interface TabsTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className = "", ...props }: TabsListProps) {
  return (
    <div
      {...props}
      role="tablist"
      aria-orientation="horizontal"
      className={`inline-flex gap-1 border-b border-border ${className}`}
    />
  );
}

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>((props, ref) => {
  const { value, onValueChange } = useTabsContext();
  const selected = value === props.value;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={selected}
      id={`tab-${props.value}`}
      onClick={() => onValueChange(props.value)}
      className={`-mb-px inline-flex items-center whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors
        ${selected
          ? "border-primary text-primary"
          : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"}
        ${props.className ?? ""}`}
      {...props}
    />
  );
});

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  TabsContentProps
>((props, ref) => {
  const { value } = useTabsContext();
  const current = value === props.value;
  if (!current) return null;
  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`panel-${props.value}`}
      aria-labelledby={`tab-${props.value}`}
      className={`mt-4 ${props.className ?? ""}`}
      {...props}
    />
  );
});