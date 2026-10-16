import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { Download, FileText, Presentation } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { isPrivilegedUser, useAuth } from "@/lib/auth";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui-kit";
import { sanitizeDateRange } from "@/lib/date-range";
import { STORAGE_KEYS } from "@/lib/constants";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import {
  aggregateBy,
  applyManagementFilters,
  buildProfileLookup,
  enrichReports,
  type AggregatedReportRow,
  type EnrichedReport,
  type ManagementFilters,
} from "@/lib/management";
import { supabase } from "@/integrations/supabase/client";
import { fetchDefectDetailsByReportIds, REPORT_COLUMNS } from "@/lib/supabase-queries";
import { LaporanFilterBar, LaporanTable } from "@/components/laporan";

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
  const [confirmDelete, setConfirmDelete] = useState<EnrichedReport | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { role, user } = useAuth();
  const canDelete = isPrivilegedUser(role);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
            .limit(1000),
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
    () =>
      [...new Set(allRows.map((row) => row.no_meja))]
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => (a as number) - (b as number)),
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

  const allParts = useMemo(
    () =>
      [...new Set(allRows.map((row) => row.part_name))].sort((a, b) => a.localeCompare(b, "id")),
    [allRows],
  );

  const filteredRows = useMemo(() => {
    const base = applyManagementFilters(allRows, { ...filters, ...safeDateRange });
    const keyword = search.trim().toLowerCase();
    if (!keyword) return base;
    return base.filter((row) => {
      return (
        (row.part_name ?? "").toLowerCase().includes(keyword) ||
        (row.inspector_name ?? "").toLowerCase().includes(keyword) ||
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
  const isTruncated = (reportsQuery.data?.reports.length ?? 0) >= 1000;
  const totalRows = isGrouped ? groupedRows.length : sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = page * pageSize;
  const pageGroupedRows = groupedRows.slice(pageStart, pageEnd);
  const pageDetailRows = sortedRows.slice(pageStart, pageEnd);

  useEffect(() => {
    setPage(1);
    setExpanded({});
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
    // State updaters must stay pure; derive next values from current state.
    if (sortKey === next) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(next);
      setSortDir(next === "report_date" ? "desc" : "asc");
    }
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

  async function handleDelete(row: EnrichedReport) {
    setDeletingId(row.id);
    try {
      const { deleteInspectionReport } = await import("@/server/reports");
      await deleteInspectionReport({ data: { id: row.id } });
      toast.success("Laporan berhasil dihapus");
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["report-management"] });
    } catch (err) {
      const msg = err instanceof Response ? await err.text() : "Gagal menghapus laporan";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  function savePreset() {
    if (!presetName.trim()) return toast.error("Nama preset wajib diisi");
    const next: ReportPreset = {
      id:
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    const { year, month } = parseDateParts(safeDateRange.from);
    await exportLaporanExcel({
      reports: sortedRows,
      details: [...detailsById.values()],
      year,
      month,
      filterMeja: filters.meja ?? "",
      filterKategori: "",
    });
    toast.success("Excel berhasil diexport");
  }

  async function exportPdfFile() {
    if (!sortedRows.length || isGrouped) return toast.error("PDF tersedia untuk mode detail");
    const { exportLaporanPDF } = await import("@/lib/pdf-export");
    const { year, month } = parseDateParts(safeDateRange.from);
    exportLaporanPDF({
      reports: sortedRows,
      year,
      month,
      filterMeja: filters.meja ?? "",
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
        filename: `laporan-detail-${safeDateRange.from}-${safeDateRange.to}`,
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
        subtitle: `${safeDateRange.from} s/d ${safeDateRange.to}`,
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
        filename: `laporan-detail-${safeDateRange.from}-${safeDateRange.to}`,
        title: "Production Report Summary",
        subtitle: `${safeDateRange.from} s/d ${safeDateRange.to}`,
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
        description={`Qty Check ${fmtNum(summary.qtyCheck)} | Pass Rate ${fmtPct(summary.passRate)} | NG ${fmtNum(summary.ng)} | Reports ${fmtNum(filteredRows.length)}${isTruncated ? " | ≥1000 baris, persempit rentang tanggal" : ""}`}
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

      <LaporanFilterBar
        filters={filters}
        setFilters={setFilters}
        search={search}
        setSearch={setSearch}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        presets={presets.map((p) => ({ id: p.id, name: p.name }))}
        presetName={presetName}
        setPresetName={setPresetName}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        onRemovePreset={removePreset}
        mejaOptions={mejaOptions}
        inspectorOptions={inspectorOptions}
        allParts={allParts}
        onTemplate={applyTemplate}
      />

      <LaporanTable
        isGrouped={isGrouped}
        totalRows={totalRows}
        totalPages={totalPages}
        page={page}
        pageSize={pageSize}
        sortKey={sortKey}
        sortDir={sortDir}
        pageGroupedRows={pageGroupedRows}
        pageDetailRows={pageDetailRows}
        expanded={expanded}
        canDelete={canDelete}
        deletingId={deletingId}
        user={user}
        queryLoading={reportsQuery.isLoading}
        queryError={reportsQuery.error}
        onRefetch={() => reportsQuery.refetch()}
        onSort={toggleSort}
        onToggleExpand={(id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))}
        onDelete={handleDelete}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onNavigateNC={(row) =>
          navigate({
            to: "/qms/nc",
            search: {
              create: "1",
              source: "daily_qc",
              sourceId: row.id,
              description: `Laporan ${fmtDate(row.report_date)} Shift ${row.shift} — Meja ${row.no_meja} — ${row.part_no} ${row.part_name} (NG ${fmtNum(row.total_ng)}/${fmtNum(row.qty_check)})`,
            },
          })
        }
      />

      <ConfirmModal
        open={confirmDelete !== null}
        title="Hapus Laporan"
        message={
          confirmDelete
            ? `Hapus laporan Meja Inspeksi ${confirmDelete.no_meja} (${confirmDelete.part_name}) pada ${fmtDate(confirmDelete.report_date)} shift ${confirmDelete.shift}?`
            : ""
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        tone="danger"
        loading={deletingId !== null}
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
        }}
        onCancel={() => {
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
