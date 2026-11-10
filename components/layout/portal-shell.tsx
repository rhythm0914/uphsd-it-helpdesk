"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface PortalShellProps {
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  unreadNotifications: number;
  children: React.ReactNode;
}

/**
 * Client shell for the portal. Holds the collapsible-sidebar state (cannot live
 * in the server layout) and renders the header, sidebar and page children.
 */
export function PortalShell({
  userName,
  userEmail,
  userRole,
  unreadNotifications,
  children,
}: PortalShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <>
      <Header
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        unreadNotifications={unreadNotifications}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex-1 flex">
        <Sidebar
          userName={userName}
          userRole={userRole}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
        <main className="flex-1 bg-surface sm:pl-64">{children}</main>
      </div>
    </>
  );
}