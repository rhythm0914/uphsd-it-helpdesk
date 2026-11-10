"use client";

import * as React from "react";

interface DropdownProps {
  children: React.ReactNode;
  trigger: React.ReactElement;
  className?: string;
}

/**
 * Accessible dropdown menu (role="menu").
 * - aria-haspopup on trigger, aria-expanded
 * - Arrow-key navigation, Esc closes, click outside closes
 * - Each item is a focusable menuitem
 */
export function Dropdown({
  children,
  trigger,
  className = "",
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  const items = React.Children.toArray(children).filter(
    (c): c is React.ReactElement => React.isValidElement(c)
  );

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => (i === null || i >= items.length - 1 ? 0 : i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => (i === null || i <= 0 ? items.length - 1 : i - 1));
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, items.length]);

  const triggerProps = {
    ref: buttonRef,
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    onClick: () => setOpen((o) => !o),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setFocusedIndex(e.key === "ArrowDown" ? 0 : items.length - 1);
      }
    },
    ...(trigger.props as object),
  };

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      {React.cloneElement(trigger as React.ReactElement, triggerProps)}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className={`absolute z-50 mt-2 w-56 rounded-lg border border-border bg-surface shadow-md ring-1 ring-neutral-900/10 ${className}`}
        >
          {items.map((item, index) =>
            React.cloneElement(item, {
              key: index,
              role: "menuitem",
              tabIndex: focusedIndex === index ? 0 : -1,
              "aria-disabled": item.props.disabled,
              onClick: () => setOpen(false),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFocusedIndex((i) => (i === null || i >= items.length - 1 ? 0 : i + 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setFocusedIndex((i) => (i === null || i <= 0 ? items.length - 1 : i - 1));
                }
              },
              className: `flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:bg-neutral-100 focus:ring-1 focus:ring-secondary disabled:text-neutral-400 disabled:cursor-not-allowed ${
                focusedIndex === index ? "bg-neutral-100 text-primary" : ""
              } ${item.props.className ?? ""}`,
            })
          )}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function MenuItem({ className = "", disabled, ...props }: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left
        ${disabled ? "text-neutral-400 cursor-not-allowed" : "text-neutral-700 hover:bg-neutral-100"}
        transition-colors ${className}`}
      {...props}
    />
  );
}