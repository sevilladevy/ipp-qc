import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: { className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-sky-100/80 bg-white/90 p-4 ${className ?? ""}`}>
      <Skeleton className="mb-3 h-5 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-sky-100/80 bg-white/90 p-4">
      <div className="mb-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="mb-2 flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpiGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-sky-100/80 bg-white/90 p-3">
          <Skeleton className="mb-2 h-3 w-1/2" />
          <Skeleton className="mb-1 h-8 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-sky-100/80 bg-white/90 p-4">
      <Skeleton className="mb-3 h-5 w-1/4" />
      <Skeleton style={{ minHeight: height - 40 }} />
    </div>
  );
}

export function SkeletonGrid({
  cols = 2,
  count = 4,
  children,
}: {
  cols?: number;
  count?: number;
  children?: React.ReactNode;
}) {
  const gridClass = cols === 1 ? "grid-cols-1" : cols === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {children ?? Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
