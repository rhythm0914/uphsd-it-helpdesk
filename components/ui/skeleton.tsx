// Dependency-free skeleton loading placeholders shaped to match each page's
// real layout. Server-safe (no "use client"). Colors come from CSS theme
// variables so skeletons adapt to light/dark automatically. The animation is
// opacity-only (no layout properties) and disabled under reduced motion.

export function Skeleton({
  className = "",
  pill = false,
}: {
  className?: string;
  pill?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-skeleton bg-surface-muted ${pill ? "rounded-full" : "rounded-md"} ${className}`}
    />
  );
}

function PageHeaderSkeleton({
  titleWidth = "w-56",
  subWidth = "w-40",
}: {
  titleWidth?: string;
  subWidth?: string;
}) {
  return (
    <div className="mb-8">
      <Skeleton className={`h-8 ${titleWidth}`} />
      <Skeleton className={`mt-2 h-4 ${subWidth}`} />
    </div>
  );
}

// /portal - welcome header, CTA button, 3 stat cards, recent requests list
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeaderSkeleton titleWidth="w-64" subWidth="w-32" />
      <Skeleton pill className="mb-8 h-12 w-44" />
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-background">
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="divide-y divide-border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton pill className="h-5 w-20" />
              </div>
              <Skeleton className="mt-2 h-4 w-full max-w-xs" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// /portal/queue - header, filter bar, 7-column ticket table
export function TicketTableSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeaderSkeleton titleWidth="w-52" subWidth="w-64" />
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="hidden gap-6 border-b border-border px-6 py-4 md:flex">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-border">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2 px-6 py-4 md:flex md:items-center md:gap-6 md:space-y-0">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton pill className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// /portal/tickets/[id] and /portal/queue/[id] - detail header, meta grid, cards
export function TicketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-2 flex items-center gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton pill className="h-5 w-24" />
      </div>
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-1 h-4 w-28" />
      </div>
      <div className="mb-8 mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="mb-8 rounded-2xl border border-border bg-background p-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
      <div className="rounded-2xl border border-border bg-background p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// /portal/admin/users - header, 6-column users table
export function UsersTableSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeaderSkeleton titleWidth="w-60" subWidth="w-56" />
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="hidden gap-6 border-b border-border px-6 py-4 md:flex">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-border">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2 px-6 py-4 md:flex md:items-center md:gap-6 md:space-y-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-44" />
              <Skeleton pill className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton pill className="h-5 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// /portal/admin/services - header, two-column services/categories lists
export function ServicesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeaderSkeleton titleWidth="w-64" subWidth="w-60" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-6">
            <div className="rounded-2xl border border-border bg-background">
              <div className="border-b border-border px-6 py-4">
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="divide-y divide-border">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton pill className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
