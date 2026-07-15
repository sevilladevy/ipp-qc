import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
  compact,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
        compact ? "mb-3" : "mb-6",
      )}
    >
      <div>
        <h1
          className={cn(
            "font-black tracking-tight text-foreground",
            compact ? "text-lg" : "text-[1.9rem]",
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "mt-0.5 text-xs" : "mt-1.5 text-[13px]",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  padding = true,
  compact,
  ...props
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  compact?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "min-w-0 rounded-xl border border-sky-100/80 bg-white/90 shadow-[0_4px_16px_rgba(14,116,144,0.06)] backdrop-blur-sm",
        compact && "!p-3",
        padding && !compact && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent = "primary",
  icon,
  dataTestId,
  valueClassName,
  compact,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "primary" | "accent" | "success" | "warning" | "destructive" | "info";
  icon?: ReactNode;
  dataTestId?: string;
  valueClassName?: string;
  compact?: boolean;
}) {
  const accentBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/15 text-info",
  };
  const iconSize = compact ? "h-7 w-7" : "h-10 w-10";
  return (
    <Card
      className={cn("relative overflow-hidden", compact && "!p-3")}
      padding={!compact}
      {...(dataTestId ? { "data-testid": dataTestId } : {})}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-semibold uppercase tracking-[0.08em] text-muted-foreground",
              compact ? "text-[10px]" : "text-[11px]",
            )}
            {...(dataTestId ? { "data-testid": `${dataTestId}-label` } : {})}
          >
            {label}
          </p>
          <p
            className={cn(
              "font-black leading-none tracking-tight text-foreground",
              compact ? "mt-1 text-base" : "mt-1.5 text-[1.85rem]",
              valueClassName,
            )}
            {...(dataTestId ? { "data-testid": `${dataTestId}-value` } : {})}
          >
            {value}
          </p>
          {sub && (
            <p
              className={cn(
                "text-muted-foreground",
                compact ? "mt-0.5 text-[10px]" : "mt-1.5 text-[11px]",
              )}
            >
              {sub}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex items-center justify-center rounded-lg",
              accentBg[accent],
              iconSize,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "accent" | "outline";
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  const styles: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-success/15 text-success border border-success/30",
    warning: "bg-warning/20 text-warning-foreground border border-warning/40",
    destructive: "bg-destructive/15 text-destructive border border-destructive/30",
    info: "bg-info/15 text-info border border-info/30",
    accent: "bg-accent/15 text-accent border border-accent/30",
    outline: "border border-border text-foreground",
  };
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
