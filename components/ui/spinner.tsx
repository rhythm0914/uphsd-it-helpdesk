// A small, dependency-free animated loading indicator (three-pulse "dots-ring").
// Uses pure CSS animation via Tailwind utilities and respects reduced motion.
export function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const dot = size === "md" ? "h-2 w-2" : "h-1.5 w-1.5";
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-flex items-center justify-center gap-1"
    >
      <span className={`${dot} rounded-full bg-current animate-loader-dot ${dot}`} style={{ animationDelay: "0ms" }} />
      <span className={`${dot} rounded-full bg-current animate-loader-dot ${dot}`} style={{ animationDelay: "150ms" }} />
      <span className={`${dot} rounded-full bg-current animate-loader-dot ${dot}`} style={{ animationDelay: "300ms" }} />
      <span className="sr-only">Loading</span>
    </span>
  );
}