"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDownIcon, ExitIcon, PersonIcon } from "@radix-ui/react-icons";


/**
 * Authenticated user profile button + dropdown.
 *
 * Used in the public landing-page nav (replacing the "Sign In" button when a
 * visitor is already signed in) and in the portal header (replacing the bare
 * Sign Out form). Renders the requester's own name and exposes only existing,
 * role-appropriate routes â€” it never invents routes or changes authorization.
 */
export function UserMenu({
  name,
  email,
  role,
}: {
  name: string | null | undefined;
  email: string | null | undefined;
  role: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Display the user's real name when available; never expose tokens or
  // passwords. Fall back to the local part of the email, then a generic label.
  const displayName =
    (name && name.trim()) || (email ? email.split("@")[0] : "") || "User";

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-background border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors"
      >
        <PersonIcon className="h-4 w-4 text-foreground/60" />
        <span className="hidden sm:inline">{displayName}</span>
        <ChevronDownIcon className="h-4 w-4 text-foreground/60" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-48 origin-top-right rounded-lg border border-border bg-background shadow-lg ring-opacity-5 focus:outline-none"
        >
          <div className="py-1 text-sm">
            <div className="px-3 py-2 border-b border-border">
              <p className="font-medium text-foreground">{displayName}</p>
              {email && (
                <p className="text-xs text-foreground/60 truncate">{email}</p>
              )}
              {role && (
                <p className="text-xs text-foreground/50 capitalize">{role}</p>
              )}
            </div>

            <Link
              href="/portal"
              className="flex items-center gap-2 px-3 py-2 text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              <PersonIcon className="h-4 w-4" />
              Dashboard
            </Link>

            <form action="/auth/sign-out" method="post" className="block w-full">
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
              >
                <ExitIcon className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

