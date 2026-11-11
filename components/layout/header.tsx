"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, User, Menu } from "lucide-react";
import { Dropdown, MenuItem } from "../ui/dropdown";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface HeaderProps {
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  unreadNotifications?: number;
  onToggleSidebar: () => void;
}

export function Header({
  userName,
  userEmail,
  userRole,
  unreadNotifications = 0,
  onToggleSidebar,
}: HeaderProps) {
  const displayName =
    (userName && userName.trim()) || (userEmail ? userEmail.split("@")[0] : "") || "User";

  return (
    <nav className="sticky top-0 z-30 flex-shrink-0 border-b border-border bg-surface/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors sm:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif font-semibold text-primary tracking-tight">UPHSD</span>
            <span className="hidden sm:inline text-xs font-semibold text-neutral-900 tracking-wider uppercase">IT Help Desk</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none sm:justify-end">
          <Dropdown trigger={
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Bell className="h-4 w-4" aria-hidden="true" />
              <Badge variant={unreadNotifications > 0 ? "danger" : "ghost"} size="sm">
                {unreadNotifications > 0 ? String(unreadNotifications) : "Notifications"}
              </Badge>
            </Button>
          }>
            <MenuItem label="View notifications" />
            <MenuItem label="Mark all as read" />
          </Dropdown>

          <div className="relative inline-flex items-center">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="ml-2 hidden sm:inline">{displayName}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
