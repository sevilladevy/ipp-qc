import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/table-export";

export type RichColumn<T> = {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  width?: number;
  minWidth?: number;
  align?: "left" | "right" | "center";
  format?: (value: string | number | null | undefined) => string;
  cell?: (row: T) => ReactNode;
  hideable?: boolean;
  hidden?: boolean;
};

type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir };

type RichTableProps<T> = {
  columns: RichColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  pageSize?: number;
  striped?: boolean;
  compact?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  columnToggle?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
  className?: string;
};

function filterRows<T>(rows: T[], columns: RichColumn<T>[], query: string): T[] {
  if (!query.trim()) return rows;
  const q = query.toLowerCase();
  return rows.filter((row) =>
    columns.some((col) => {
      const v = col.accessor(row);
      return v != null && String(v).toLowerCase().includes(q);
    }),
  );
}

function sortRows<T>(rows: T[], sorts: SortState[], columns: RichColumn<T>[]): T[] {
  if (!sorts.length) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sorts) {
      const col = columns.find((c) => c.key === s.key);
      if (!col) continue;
      const va = col.accessor(a);
      const vb = col.accessor(b);
      if (va == null && vb == null) continue;
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb));
      }
      if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

export function RichTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize: initialPageSize = 50,
  striped = true,
  compact = false,
  searchable = false,
  exportable = false,
  columnToggle = false,
  stickyHeader = true,
  maxHeight,
  emptyMessage = "Tidak ada data",
  className,
}: RichTableProps<T>) {
  const [sorts, setSorts] = useState<SortState[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(columns.filter((c) => !c.hidden).map((c) => c.key)),
  );
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ key: string; startX: number; startW: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [showColMenu, setShowColMenu] = useState(false);

  const filtered = useMemo(() => filterRows(data, columns, search), [data, columns, search]);
  const sorted = useMemo(() => sortRows(filtered, sorts, columns), [filtered, sorts, columns]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const visibleCols = useMemo(
    () => columns.filter((c) => visibleColumns.has(c.key)),
    [columns, visibleColumns],
  );

  useEffect(() => {
    setPage(0);
  }, [search, sorts]);

  useEffect(() => {
    if (safePage >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [safePage, totalPages]);

  const toggleSort = useCallback((key: string) => {
    setSorts((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (!existing) return [{ key, dir: "asc" }];
      if (existing.dir === "asc") return [{ key, dir: "desc" }];
      return [];
    });
  }, []);

  const getSortDir = (key: string): SortDir | null => sorts.find((s) => s.key === key)?.dir ?? null;

  const handleExport = () => {
    exportToCsv({
      filename: "export",
      columns: visibleCols.map((col) => ({
        key: col.key,
        label: col.header,
        format: col.format ? (row: unknown) => col.format!(col.accessor(row as T)) : undefined,
      })),
      rows: sorted,
    });
  };

  const handleMouseDown = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[key] ?? columns.find((c) => c.key === key)?.width ?? 120;
    resizingRef.current = { key, startX, startW };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const r = resizingRef.current;
    if (!r) return;
    const diff = e.clientX - r.startX;
    const newW = Math.max(40, r.startW + diff);
    setColWidths((prev) => ({ ...prev, [r.key]: newW }));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-sky-100/80 bg-white/90 shadow-[0_4px_16px_rgba(14,116,144,0.06)]",
        className,
      )}
    >
      {(searchable || exportable || columnToggle) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100/80 px-3 py-2">
          {searchable && (
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {exportable && (
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
            )}
            {columnToggle && (
              <div className="relative">
                <button
                  onClick={() => setShowColMenu((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  <Eye className="h-3 w-3" />
                  Kolom
                </button>
                {showColMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-card p-2 shadow-lg">
                      {columns
                        .filter((c) => c.hideable !== false)
                        .map((col) => (
                          <label
                            key={col.key}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns.has(col.key)}
                              onChange={() =>
                                setVisibleColumns((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(col.key)) next.delete(col.key);
                                  else next.add(col.key);
                                  return next;
                                })
                              }
                            />
                            {visibleColumns.has(col.key) ? (
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                            )}
                            {col.header}
                          </label>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={tableRef}
        className={cn("overflow-x-auto scrollbar-thin", maxHeight && "overflow-y-auto")}
        style={{ maxHeight }}
      >
        <table className={cn("w-full border-collapse text-sm", compact && "table-compact")}>
          <thead>
            <tr className="border-b border-sky-100 bg-sky-50/50">
              {visibleCols.map((col) => {
                const w = colWidths[col.key] ?? col.width;
                const sortDir = getSortDir(col.key);
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
                      stickyHeader && "sticky top-0 z-10 bg-sky-50/50",
                      col.sortable && "cursor-pointer select-none hover:bg-sky-100/50",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                    style={{
                      width: w,
                      minWidth: col.minWidth ?? 60,
                      position: "relative",
                    }}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <div className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : sortDir === "desc" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </div>
                    <div
                      onMouseDown={(e) => handleMouseDown(col.key, e)}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCols.length}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    "border-b border-sky-50 transition-colors hover:bg-sky-50/40",
                    striped && idx % 2 === 1 && "bg-sky-50/20",
                  )}
                >
                  {visibleCols.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2 text-xs",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                      )}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.format
                          ? col.format(col.accessor(row))
                          : (col.accessor(row) ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-100/80 px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {sorted.length} baris
          {search && ` (filter dari ${data.length})`}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-md border border-input bg-card px-1.5 py-1 text-xs"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>
                {s}/hlm
              </option>
            ))}
          </select>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage <= 0}
            className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-muted-foreground">
            {safePage + 1}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
