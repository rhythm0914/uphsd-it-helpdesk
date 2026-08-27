"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// A slim, dependency-free top progress bar that appears when the route changes
// (navigation started) and fades out shortly after the new route is committed.
// Renders nothing on the first load when no navigation has happened yet.
export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const shownOnce = useRef(false);

  useEffect(() => {
    // Skip the very first render (initial page load).
    if (!shownOnce.current) {
      shownOnce.current = true;
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent" aria-hidden="true">
      <div className="h-full w-[35%] animate-route-progress rounded-full bg-brand-gold" />
    </div>
  );
}