import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { Download, Eye, FileText, Presentation, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import {
  DataTablePagination,
  DataTableShell,
  DataTableState,
  SortableHeader,
} from "@/components/data-table";
import { Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui-kit";
import { sanitizeDateRange } from "@/lib/date-range";
import { STORAGE_KEYS } from "@/lib/constants";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import {
  aggregateBy,
  applyManagementFilters,
  buildProfileLookup,
  enrichReports,
  formatValidationIssue,
  type AggregatedReportRow,
  type EnrichedReport,
  type ManagementFilters,
} from "@/lib/management";
import { supabase } from "@/integrations/supabase/client";
import { fetchDefectDetailsByReportIds, REPORT_COLUMNS } from "@/lib/supabase-queries";

export const Route = createFileRoute("/laporan")({
  component: () => (
    <AppLayout>
      <LaporanPage />
    </AppLayout>
  ),
});

type SortKey = keyof Pick<
  EnrichedReport,
  "report_date" | "shift" | "no_meja" | "part_name" | "qty_check" | "total_ok" | "total_ng"
>;
type SortDir = "asc" | "desc";
type GroupBy = "none" | "report_date" | "shift" | "no_meja" | "part_name";
type ReportPreset = {
  id: string;
  name: string;
  filters: ManagementFilters;
  groupBy: GroupBy;
};

function readPresets(): ReportPreset[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEYS.REPORT_PRESETS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ReportPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writePresets(presets: ReportPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.REPORT_PRESETS, JSON.stringify(presets));
}

function LaporanPage() {
  const now = new Date();

  const [filters, setFilters] = useState<ManagementFilters>({
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
    meja: "",
    part: "",
    shift: "",
    inspectorId: "",
    minYield: undefined,
    onlyInvalid: false,
  });
  const [sortKey, setSortKey] = useState<SortKey>("report_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [presets, setPresets] = useState<ReportPreset[]>(() => readPresets());
  const [presetName, setPresetName] = useState("");
  const safeDateRange = useMemo(
    () => sanitizeDateRange(filters.from, filters.to),
    [filters.from, filters.to],
  );

  const reportsQuery = useQuery({
    queryKey: ["report-management", safeDateRange.from, safeDateRange.to],
    queryFn: async () => {
      const [{ data: reports, error: reportError }, { data: profiles, error: profileError }] =
        await Promise.all([
          supabase
            .from("inspection_reports")
            .select(REPORT_COLUMNS)
            .gte("report_date", safeDateRange.from)
            .lte("report_date", safeDateRange.to)
            .order("report_date", { ascending: false })
            .limit(500),
          supabase.from("profiles").select("id,full_name,email"),
        ]);
      if (reportError) throw reportError;
      if (profileError) throw profileError;

      const ids = (reports ?? []).map((row) => row.id);
      const details = await fetchDefectDetailsByReportIds(ids);
      return { reports: reports ?? [], details: details ?? [], profiles: profiles ?? [] };
    },
    staleTime: 60_000,
  });

  const detailsById = useMemo(
    () => new Map((reportsQuery.data?.details ?? []).map((row) => [row.report_id, row])),
    [reportsQuery.data?.details],
  );
  const allRows = useMemo(
    () =>
      enrichReports({
        reports: reportsQuery.data?.reports ?? [],
        detailsByReportId: detailsById,
        profilesById: buildProfileLookup(reportsQuery.data?.profiles),
      }),
    [detailsById, reportsQuery.data?.profiles, reportsQuery.data?.reports],
  );

  const mejaOptions = useMemo(
    () => [...new Set(allRows.map((row) => row.no_meja))].sort((a, b) => a - b),
    [allRows],
  );
  const inspectorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of allRows) {
      if (!row.created_by) continue;
      map.set(row.created_by, row.inspector_name || row.inspector_email || row.created_by);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const base = applyManagementFilters(allRows, { ...filters, ...safeDateRange });
    const keyword = search.trim().toLowerCase();
    if (!keyword) return base;
    return base.filter((row) => {
      return (
        row.part_name.toLowerCase().includes(keyword) ||
        row.inspector_name.toLowerCase().includes(keyword) ||
        String(row.no_meja).includes(keyword)
      );
    });
  }, [allRows, filters, safeDateRange, search]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((left, right) => {
      const text = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "", "id");
      const num = (a: number | null, b: number | null) => (a ?? 0) - (b ?? 0);
      const cmp =
        sortKey === "report_date" || sortKey === "shift" || sortKey === "part_name"
          ? text(left[sortKey] as string, right[sortKey] as string)
          : num(left[sortKey] as number, right[sortKey] as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filteredRows, sortDir, sortKey]);

  const groupedRows = useMemo<AggregatedReportRow[]>(() => {
    if (groupBy === "none") return [];
    return aggregateBy(sortedRows, groupBy).sort((a, b) => b.ng - a.ng);
  }, [groupBy, sortedRows]);

  const isGrouped = groupBy !== "none";
  const totalRows = isGrouped ? groupedRows.length : sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = page * pageSize;
  const pageGroupedRows = groupedRows.slice(pageStart, pageEnd);
  const pageDetailRows = sortedRows.slice(pageStart, pageEnd);
  const hasPageRows = isGrouped ? pageGroupedRows.length > 0 : pageDetailRows.length > 0;

  useEffect(() => {
    setPage(1);
  }, [
    filters.from,
    filters.to,
    filters.meja,
    filters.part,
    filters.shift,
    filters.inspectorId,
    filters.minYield,
    filters.onlyInvalid,
    search,
    groupBy,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summary = useMemo(() => {
    const qtyCheck = filteredRows.reduce((sum, row) => sum + row.qty_check, 0);
    const ok = filteredRows.reduce((sum, row) => sum + (row.total_ok ?? 0), 0);
    const ng = filteredRows.reduce((sum, row) => sum + row.total_ng, 0);
    const passRate = qtyCheck > 0 ? ok / qtyCheck : 0;
    return { qtyCheck, ok, ng, passRate };
  }, [filteredRows]);

  function toggleSort(next: SortKey) {
    setSortKey((current) => {
      if (current === next) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortDir(next === "report_date" ? "desc" : "asc");
      return next;
    });
    setPage(1);
  }

  function applyTemplate(template: "daily" | "weekly" | "monthly" | "meja" | "part" | "defect") {
    const today = format(new Date(), "yyyy-MM-dd");
    if (template === "daily") {
      setFilters((prev) => ({ ...prev, from: today, to: today, onlyInvalid: false }));
      setGroupBy("shift");
    } else if (template === "weekly") {
      setFilters((prev) => ({
        ...prev,
        from: format(subDays(new Date(), 6), "yyyy-MM-dd"),
        to: today,
        onlyInvalid: false,
      }));
      setGroupBy("report_date");
    } else if (template === "monthly") {
      setFilters((prev) => ({
        ...prev,
        from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
        onlyInvalid: false,
      }));
      setGroupBy("report_date");
    } else if (template === "meja") {
      setGroupBy("no_meja");
      setFilters((prev) => ({ ...prev, onlyInvalid: false }));
    } else if (template === "part") {
      setGroupBy("part_name");
      setFilters((prev) => ({ ...prev, onlyInvalid: false }));
    } else {
      setGroupBy("none");
      setFilters((prev) => ({ ...prev, onlyInvalid: true, minYield: 0.95 }));
    }
    setPage(1);
  }

  function savePreset() {
    if (!presetName.trim()) return toast.error("Nama preset wajib diisi");
    const next: ReportPreset = {
      id: crypto.randomUUID(),
      name: presetName.trim(),
      filters,
      groupBy,
    };
    const merged = [next, ...presets].slice(0, 10);
    setPresets(merged);
    writePresets(merged);
    setPresetName("");
    toast.success("Preset disimpan");
  }

  function loadPreset(id: string) {
    const found = presets.find((preset) => preset.id === id);
    if (!found) return;
    setFilters(found.filters);
    setGroupBy(found.groupBy);
    setPage(1);
  }

  function removePreset(id: string) {
    const next = presets.filter((preset) => preset.id !== id);
    setPresets(next);
    writePresets(next);
  }

  function parseDateParts(dateStr: string) {
    const match = dateStr?.match(/^(\d{4})-(\d{2})/);
    if (!match) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    return { year: Number(match[1]), month: Number(match[2]) };
  }

  async function exportExcelFile() {
    if (!sortedRows.length || isGrouped) return toast.error("Excel tersedia untuk mode detail");
    const { exportLaporanExcel } = await import("@/lib/excel-export");
    const { year, month } = parseDateParts(filters.from);
    await exportLaporanExcel({
      reports: sortedRows,
      details: [...detailsById.values()],
      year,
      month,
      filterMesin: filters.meja ?? "",
      filterKategori: "",
    });
    toast.success("Excel berhasil diexport");
  }

  async function exportPdfFile() {
    if (!sortedRows.length || isGrouped) return toast.error("PDF tersedia untuk mode detail");
    const { exportLaporanPDF } = await import("@/lib/pdf-export");
    const { year, month } = parseDateParts(filters.from);
    exportLaporanPDF({
      reports: sortedRows,
      year,
      month,
      filterMesin: filters.meja ?? "",
      filterKategori: "",
    });
    toast.success("PDF berhasil diexport");
  }

  async function exportCsvFile() {
    if (!totalRows) return toast.error("Tidak ada data");
    const { exportToCsv } = await import("@/lib/table-export");
    if (isGrouped) {
      exportToCsv({
        filename: `laporan-grouped-${groupBy}`,
        rows: groupedRows,
        columns: [
          { key: "key", label: "Group" },
          { key: "reports", label: "Jumlah Laporan" },
          { key: "qty_check", label: "Qty Check" },
          { key: "ok", label: "OK" },
          { key: "ng", label: "NG" },
          { key: "passRate", label: "Pass Rate", format: (row) => fmtPct(row.passRate) },
        ],
      });
    } else {
      exportToCsv({
        filename: `laporan-detail-${filters.from}-${filters.to}`,
        rows: sortedRows,
        columns: [
          { key: "report_date", label: "Tanggal", format: (row) => fmtDate(row.report_date) },
          { key: "shift", label: "Shift" },
          { key: "no_meja", label: "Meja" },
          { key: "part_name", label: "Part" },
          { key: "qty_check", label: "Qty Check" },
          { key: "total_ok", label: "OK" },
          { key: "total_ng", label: "NG" },
          { key: "inspector_name", label: "Inspector" },
          {
            key: "validation",
            label: "Validation",
            format: (row) => `${row.validation.score} (${row.validation.status})`,
          },
        ],
      });
    }
    toast.success("CSV berhasil diexport");
  }

  async function exportPptFile() {
    if (!totalRows) return toast.error("Tidak ada data");
    const { exportToPowerPoint } = await import("@/lib/powerpoint-export");
    if (isGrouped) {
      await exportToPowerPoint({
        filename: `laporan-grouped-${groupBy}`,
        title: `Report Grouped by ${groupBy}`,
        subtitle: `${filters.from} s/d ${filters.to}`,
        rows: groupedRows,
        columns: [
          { key: "key", label: "Group" },
          { key: "reports", label: "Jumlah Laporan" },
          { key: "qty_check", label: "Qty Check" },
          { key: "ng", label: "NG" },
          { key: "passRate", label: "Pass Rate", format: (row) => fmtPct(row.passRate) },
        ],
      });
    } else {
      await exportToPowerPoint({
        filename: `laporan-detail-${filters.from}-${filters.to}`,
        title: "Production Report Summary",
        subtitle: `${filters.from} s/d ${filters.to}`,
        rows: sortedRows,
        columns: [
          { key: "report_date", label: "Tanggal", format: (row) => fmtDate(row.report_date) },
          { key: "shift", label: "Shift" },
          { key: "no_meja", label: "Meja" },
          { key: "part_name", label: "Part" },
          { key: "qty_check", label: "Qty Check" },
          { key: "total_ng", label: "NG" },
        ],
      });
    }
    toast.success("PowerPoint berhasil diexport");
  }

  return (
    <div className="report-page">
      <PageHeader
        title="Report Management View"
        description={`Qty Check ${fmtNum(summary.qtyCheck)} | Pass Rate ${fmtPct(summary.passRate)}`}
      >
        <button onClick={exportCsvFile} className="btn2">
          <Download className="h-4 w-4" /> CSV
        </button>
        <button onClick={exportExcelFile} className="btn2 bg-success text-success-foreground">
          <Download className="h-4 w-4" /> Excel
        </button>
        <button onClick={exportPdfFile} className="btn2 bg-destructive text-destructive-foreground">
          <FileText className="h-4 w-4" /> PDF
        </button>
        <button onClick={exportPptFile} className="btn2 bg-primary text-primary-foreground">
          <Presentation className="h-4 w-4" /> PowerPoint
        </button>
      </PageHeader>

      <DataTableShell
        className="mb-4"
        title="Templates & Advanced Filters"
        toolbar={
          <div className="grid w-full gap-3">
            <div className="flex flex-wrap gap-2">
              <button className="tag" onClick={() => applyTemplate("daily")}>
                Daily
              </button>
              <button className="tag" onClick={() => applyTemplate("weekly")}>
                Weekly
              </button>
              <button className="tag" onClick={() => applyTemplate("monthly")}>
                Monthly
              </button>
              <button className="tag" onClick={() => applyTemplate("meja")}>
                Meja Inspeksi
              </button>
              <button className="tag" onClick={() => applyTemplate("part")}>
                Part
              </button>
              <button className="tag" onClick={() => applyTemplate("defect")}>
                Defect Focus
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
              <input
                type="date"
                value={filters.from}
                max={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                className="ipt2"
              />
              <input
                type="date"
                value={filters.to}
                min={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                className="ipt2"
              />
              <select
                value={filters.meja}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    meja: event.target.value ? Number(event.target.value) : "",
                  }))
                }
                className="ipt2"
              >
                <option value="">Semua meja</option>
                {mejaOptions.map((meja) => (
                  <option key={meja} value={meja}>
                    Meja {meja}
                  </option>
                ))}
              </select>
              <select
                value={filters.shift}
                onChange={(event) => setFilters((prev) => ({ ...prev, shift: event.target.value }))}
                className="ipt2"
              >
                <option value="">Semua shift</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
              <input
                value={filters.part}
                onChange={(event) => setFilters((prev) => ({ ...prev, part: event.target.value }))}
                placeholder="Part"
                className="ipt2"
              />
              <select
                value={filters.inspectorId}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, inspectorId: event.target.value }))
                }
                className="ipt2"
              >
                <option value="">Semua inspector</option>
                {inspectorOptions.map((inspector) => (
                  <option key={inspector.id} value={inspector.id}>
                    {inspector.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="Min pass rate %"
                value={filters.minYield ? Math.round(filters.minYield * 100) : ""}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    minYield: event.target.value ? Number(event.target.value) / 100 : undefined,
                  }))
                }
                className="ipt2"
              />
              <label className="flex h-10 items-center gap-2 rounded border border-input px-2 text-xs">
                <input
                  type="checkbox"
                  checked={!!filters.onlyInvalid}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, onlyInvalid: event.target.checked }))
                  }
                />
                Hanya invalid
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search part/inspector/meja..."
                  className="ipt2 pl-8"
                />
              </label>
              <select
                value={groupBy}
                onChange={(event) => {
                  setGroupBy(event.target.value as GroupBy);
                  setPage(1);
                }}
                className="ipt2"
              >
                <option value="none">Tanpa grouping</option>
                <option value="report_date">Group by tanggal</option>
                <option value="shift">Group by shift</option>
                <option value="no_meja">Group by meja</option>
                <option value="part_name">Group by part</option>
              </select>
              <div className="flex gap-2">
                <input
                  className="ipt2"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="Nama preset"
                />
                <button className="btn2" onClick={savePreset}>
                  Save
                </button>
              </div>
            </div>
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <div key={preset.id} className="preset-chip">
                    <button className="preset-chip-name" onClick={() => loadPreset(preset.id)}>
                      {preset.name}
                    </button>
                    <button className="preset-chip-remove" onClick={() => removePreset(preset.id)}>
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        }
      >
        {reportsQuery.isLoading ? (
          <div className="p-4">
            <Skeleton className="h-64" />
          </div>
        ) : reportsQuery.isError ? (
          <DataTableState
            tone="error"
            title="Gagal memuat laporan"
            description={
              reportsQuery.error instanceof Error
                ? reportsQuery.error.message
                : "Terjadi kesalahan."
            }
          />
        ) : !hasPageRows ? (
          <div className="p-6">
            <EmptyState
              title="Tidak ada data report"
              description="Ubah filter atau template laporan."
            />
          </div>
        ) : isGrouped ? (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Group</th>
                    <th className="px-3 py-2 text-right">Reports</th>
                    <th className="px-3 py-2 text-right">Qty Check</th>
                    <th className="px-3 py-2 text-right">OK</th>
                    <th className="px-3 py-2 text-right">NG</th>
                    <th className="px-3 py-2 text-right">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {pageGroupedRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2 font-medium">{row.key}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(row.reports)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(row.qty_check)}</td>
                      <td className="px-3 py-2 text-right text-success">{fmtNum(row.ok)}</td>
                      <td className="px-3 py-2 text-right text-destructive">{fmtNum(row.ng)}</td>
                      <td className="px-3 py-2 text-right">{fmtPct(row.passRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              totalRows={totalRows}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onPageChange={setPage}
            />
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left">No</th>
                    <th className="px-3 py-3 text-left">
                      <SortableHeader
                        label="Tanggal"
                        active={sortKey === "report_date"}
                        direction={sortDir}
                        onClick={() => toggleSort("report_date")}
                      />
                    </th>
                    <th className="px-3 py-3 text-left">
                      <SortableHeader
                        label="Shift"
                        active={sortKey === "shift"}
                        direction={sortDir}
                        onClick={() => toggleSort("shift")}
                      />
                    </th>
                    <th className="px-3 py-3 text-left">
                      <SortableHeader
                        label="Meja"
                        active={sortKey === "no_meja"}
                        direction={sortDir}
                        onClick={() => toggleSort("no_meja")}
                      />
                    </th>
                    <th className="px-3 py-3 text-left">
                      <SortableHeader
                        label="Part"
                        active={sortKey === "part_name"}
                        direction={sortDir}
                        onClick={() => toggleSort("part_name")}
                      />
                    </th>
                    <th className="px-3 py-3 text-right">
                      <SortableHeader
                        label="Qty Check"
                        active={sortKey === "qty_check"}
                        direction={sortDir}
                        onClick={() => toggleSort("qty_check")}
                        align="right"
                      />
                    </th>
                    <th className="px-3 py-3 text-right">OK</th>
                    <th className="px-3 py-3 text-right">NG</th>
                    <th className="px-3 py-3 text-left">Validation</th>
                    <th className="px-3 py-3 text-left">Inspector</th>
                    <th className="px-3 py-3 text-center">Expand</th>
                  </tr>
                </thead>
                <tbody>
                  {pageDetailRows.map((row, index) => {
                    const detail = detailsById.get(row.id);
                    const isOpen = !!expanded[row.id];
                    const rowTone =
                      row.validation.status === "critical"
                        ? "bg-destructive/5"
                        : row.validation.status === "warning"
                          ? "bg-warning/10"
                          : "";
                    return (
                      <Fragment key={row.id}>
                        <tr key={row.id} className={rowTone}>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {(page - 1) * pageSize + index + 1}
                          </td>
                          <td className="px-3 py-2.5">{fmtDate(row.report_date)}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant="info">{row.shift}</Badge>
                          </td>
                          <td className="px-3 py-2.5 font-medium">Meja Inspeksi {row.no_meja}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium">{row.part_name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">{fmtNum(row.qty_check)}</td>
                          <td className="px-3 py-2.5 text-right text-success">
                            {fmtNum(row.total_ok)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-destructive">
                            {fmtNum(row.total_ng)}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={
                                row.validation.status === "good"
                                  ? "success"
                                  : row.validation.status === "warning"
                                    ? "warning"
                                    : "destructive"
                              }
                            >
                              {row.validation.score}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs">{row.inspector_name}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              className="inline-flex rounded p-1.5 text-info hover:bg-info/10"
                              onClick={() =>
                                setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                              }
                              title="Expand row"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr key={`${row.id}-expanded`} className="bg-muted/30">
                            <td colSpan={20} className="px-4 py-3 text-xs">
                              <p className="font-semibold">Validation details</p>
                              {row.validation.issues.length === 0 ? (
                                <p className="text-success">Data valid - tidak ada issue.</p>
                              ) : (
                                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                                  {row.validation.issues.map((issue) => (
                                    <li key={issue}>{formatValidationIssue(issue)}</li>
                                  ))}
                                </ul>
                              )}
                              {detail && (
                                <p className="mt-2 text-muted-foreground">
                                  Defect detail terisi. Extra defects:{" "}
                                  {
                                    Object.keys(
                                      (detail.extra_defects ?? {}) as Record<string, number>,
                                    ).length
                                  }
                                </p>
                              )}
                              <p className="mt-1 text-muted-foreground">
                                Qty Check: {fmtNum(row.qty_check)} | OK: {fmtNum(row.total_ok)} |
                                NG: {fmtNum(row.total_ng)} | Pass Rate:{" "}
                                {fmtPct(
                                  row.qty_check > 0 ? (row.total_ok ?? 0) / row.qty_check : 0,
                                )}
                              </p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              totalRows={totalRows}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onPageChange={setPage}
            />
          </>
        )}
      </DataTableShell>
    </div>
  );
}
