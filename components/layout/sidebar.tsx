"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LayoutDashboard, FileText, Search, Bell, User, ShieldCheck, LogOut, X } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  request: FileText,
  track: Search,
  notifications: Bell,
  profile: User,
  admin: ShieldCheck,
};

interface SidebarItem {
  key: string;
  label: string;
  icon: keyof typeof ICONS;
  href: string;
  role?: string[];
}

interface SidebarProps {
  items?: SidebarItem[];
  userName: string | null;
  userRole: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: SidebarItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/portal" },
  { key: "request", label: "New Request", icon: "request", href: "/portal/request", role: ["student", "employee"] },
  { key: "track", label: "Track", icon: "track", href: "/portal/track", role: ["student", "employee"] },
  { key: "queue", label: "IT Queue", icon: "track", href: "/portal/queue", role: ["it_staff", "admin", "manager"] },
  { key: "notifications", label: "Notifications", icon: "notifications", href: "/portal/notifications" },
  { key: "admin", label: "Admin", icon: "admin", href: "/portal/admin", role: ["admin", "manager"] },
];

export function Sidebar({
  items = NAV_ITEMS,
  userName,
  userRole,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = items.filter(
    (i) => !i.role || i.role.includes(userRole ?? "")
  );

  const currentKey = React.useMemo(() => {
    const match = visibleItems
      .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0];
    return match ? match.key : null;
  }, [pathname, visibleItems]);

  const navLinkClass = collapsed ? "hidden" : "block text-xs font-semibold text-neutral-900 tracking-wider uppercase";

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface shadow-sm transition-width duration-200 ${collapsed ? "w-16" : "w-64"}`} aria-label="Main navigation">
      <div className="flex h-16 items-center justify-center gap-2 px-3 shrink-0">
        <span className="text-source-serif-4 font-semibold text-primary tracking-tight">UPHSD</span>
        <span className={navLinkClass}>IT Help Desk</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" aria-label="Primary navigation">
        {visibleItems.map((item) => {
          const active = currentKey === item.key;
          const Icon = ICONS[item.icon];
          return (
            <Link key={item.key} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary-light text-primary border border-primary/20" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`}>
              <Icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-neutral-400"}`} aria-hidden="true" />
              {collapsed ? null : <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border shrink-0">
        <button type="button" onClick={onToggleCollapse} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed}>
          <ChevronLeft className="h-4 w-4" />
          {collapsed ? <span>Expand</span> : <span>Collapse</span>}
        </button>
      </div>

      <div className="px-3 py-4 border-t border-border shrink-0">
        <Link href="/auth/sign-out" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-light hover:text-danger transition-colors">
          <LogOut className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <span className={collapsed ? "hidden" : "block"}>Sign Out</span>
        </Link>
        <div className="mt-2">
          <p className="text-xs font-medium text-neutral-700">{userName || "User"}</p>
          <p className="text-xs text-neutral-500 capitalize">{userRole || ""}</p>
        </div>
      </div>
    </aside>
  );
}
/**
 * Mobile drawer â€” slides in from the left with an overlay.
 */
export function MobileSidebarDrawer({
  open,
  onClose,
  items = NAV_ITEMS,
  currentKey,
  userName,
  userRole,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  items?: SidebarItem[];
  currentKey: string | null;
  userName: string | null;
  userRole: string | null;
  onSelect: (key: string) => void;
}) {
  const visibleItems = items.filter(
    (i) => !i.role || i.role.includes(userRole ?? "")
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-border bg-surface shadow-xl" aria-label="Navigation menu">
        <div className="flex h-16 items-center justify-between gap-2 px-3 shrink-0">
          <span className="text-source-serif-4 font-semibold text-primary tracking-tight">UPHSD</span>
          <span className="block text-xs font-semibold text-neutral-900 tracking-wider uppercase">IT Help Desk</span>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors" aria-label="Close menu">
            <span className="sr-only">Close menu</span>
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const active = currentKey === item.key;
            const Icon = ICONS[item.icon];
            return (
              <Link key={item.key} href={item.href} onClick={onClose} onClickCapture={() => onSelect(item.key)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary-light text-primary border border-primary/20" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`}>
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-neutral-400"}`} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <Link href="/auth/sign-out" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-light hover:text-danger transition-colors">
            <X className="h-4 w-4 text-danger" aria-hidden="true" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

