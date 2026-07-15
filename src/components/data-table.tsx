export { RichTable } from "./ui/RichTable";
export type { RichColumn } from "./ui/RichTable";
export { ChartWithValues } from "./ui/ChartWithValues";

import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DataTableShellProps = {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DataTableShell({
  title,
  description,
  toolbar,
  actions,
  children,
  className,
}: DataTableShellProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-sky-100/80 bg-white/90 shadow-[0_10px_26px_rgba(14,116,144,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      {(title || description || toolbar || actions) && (
        <header className="border-b border-sky-100/80 p-5">
          {(title || description || actions) && (
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                {title && <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>}
                {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function DataTableState({
  title,
  description,
  tone = "default",
}: {
  title: string;
  description?: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-4 py-10 text-center",
        tone === "error" && "text-destructive",
      )}
    >
      <AlertCircle
        className={cn("h-5 w-5 text-muted-foreground", tone === "error" && "text-destructive")}
      />
      <p className="font-semibold">{title}</p>
      {description && (
        <p
          className={cn(
            "max-w-2xl text-sm text-muted-foreground",
            tone === "error" && "text-destructive/80",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export function SortableHeader({
  label,
  active,
  direction,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right" | "center";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-sm px-0.5 py-0.5 font-inherit text-inherit hover:text-foreground",
        align === "right" && "justify-end",
        align === "center" && "justify-center",
      )}
    >
      <span>{label}</span>
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
      )}
    </button>
  );
}

export function DataTablePagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-100/80 px-5 py-3.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Total: {totalRows}</span>
        <span>|</span>
        <span>
          Halaman {page} / {Math.max(1, totalPages)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-1 rounded-md border border-input bg-card px-1.5 py-1 text-xs text-foreground"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  );
}
