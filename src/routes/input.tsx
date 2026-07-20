import { createFileRoute } from "@tanstack/react-router";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { format } from "date-fns";
import { AppLayout } from "@/components/AppLayout";
import { DataTablePagination, DataTableShell, DataTableState } from "@/components/data-table";
import { Card, EmptyState } from "@/components/ui-kit";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Field, InputLogViewModal, InputLogEditModal } from "@/components/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useInspectionForm, type Shift } from "@/hooks/useInspectionForm";
import { useLogManagement, type InputLogRow } from "@/hooks/useLogManagement";
import { fmtNum, kategoriDefectColor } from "@/lib/format";
import { exportToCsv, exportToPdf } from "@/lib/table-export";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  AlertTriangle,
  ChevronsUpDown,
  Check,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Eye,
  FileText,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/input")({
  component: () => (
    <AppLayout>
      <InputPage />
    </AppLayout>
  ),
});

function focusElement(ref: RefObject<HTMLElement | null>) {
  ref.current?.focus();
  if (ref.current instanceof HTMLInputElement) {
    ref.current.select();
  }
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd/MM/yyyy HH:mm");
}

function getNgRate(row: { total_ng: number; qty_check: number }) {
  return row.qty_check > 0 ? row.total_ng / row.qty_check : 0;
}

function getPassRate(row: { total_ok: number | null; qty_check: number }) {
  return row.qty_check > 0 ? (row.total_ok ?? 0) / row.qty_check : 0;
}

const EXPORT_COLUMNS = [
  {
    key: "created_at",
    label: "Timestamp",
    format: (row: InputLogRow) => formatTimestamp(row.created_at),
  },
  { key: "no_meja", label: "Meja", format: (row: InputLogRow) => `Meja Inspeksi ${row.no_meja}` },
  { key: "qty_check", label: "Qty Check", format: (row: InputLogRow) => row.qty_check },
  { key: "total_ng", label: "NG", format: (row: InputLogRow) => row.total_ng },
  {
    key: "ng_rate",
    label: "NG Rate",
    format: (row: InputLogRow) => `${(getNgRate(row) * 100).toFixed(2)}%`,
  },
  {
    key: "pass_rate",
    label: "Pass Rate",
    format: (row: InputLogRow) => `${(getPassRate(row) * 100).toFixed(2)}%`,
  },
];

const DefectInput = memo(function DefectInput({
  defectType,
  value,
  index,
  totalDefects,
  firstDefectRef,
  submitRef,
  updateDefect,
}: {
  defectType: { id: number; kode_defect: string; nama_defect: string };
  value: number;
  index: number;
  totalDefects: number;
  firstDefectRef: RefObject<HTMLInputElement | null>;
  submitRef: RefObject<HTMLButtonElement | null>;
  updateDefect: (kodeDefect: string, value: number) => void;
}) {
  return (
    <Field label={defectType.nama_defect}>
      <input
        ref={index === 0 ? firstDefectRef : undefined}
        type="number"
        inputMode="numeric"
        enterKeyHint={index < totalDefects - 1 ? "next" : "done"}
        min={0}
        value={value}
        onChange={(e) => updateDefect(defectType.kode_defect, Number(e.target.value))}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (index >= totalDefects - 1) {
            focusElement(submitRef);
            return;
          }
          const container = e.currentTarget.closest(".defect-categories");
          const allInputs = container?.querySelectorAll<HTMLInputElement>("input[type='number']");
          const nextInput = allInputs?.[index + 1];
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }}
        className="input-field input-number"
      />
    </Field>
  );
});

function InputPage() {
  const {
    formState,
    submitting,
    defectOverflow,
    totalDefects,
    ok,
    passRate,
    passRateStatus,
    activeTables,
    activeParts,
    visibleParts,
    partOpen,
    partQuery,
    defectTypes,
    today,
    canManageInputLog,
    updateField,
    resetForm,
    setPartOpen,
    setPartQuery,
    updateDefect,
    choosePart,
    handleSubmit,
  } = useInspectionForm();

  const groupedDefects = useMemo(() => {
    if (!defectTypes?.length) return [];
    const groups: Record<string, typeof defectTypes> = {};
    for (const dt of defectTypes) {
      const cat = dt.kategori_defect ?? "Lainnya";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(dt);
    }
    return Object.entries(groups);
  }, [defectTypes]);

  // Flat index map for keyboard navigation across categories
  const defectIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const [, defects] of groupedDefects) {
      for (const dt of defects) {
        map.set(dt.kode_defect, idx++);
      }
    }
    return map;
  }, [groupedDefects]);

  const {
    logDate,
    logSearch,
    logPage,
    logPageSize,
    viewingLog,
    editingLog,
    editLogForm,
    savingLogEdit,
    deletingLogId,
    confirmDelete,
    logQuery,
    filteredLogRows,
    pageLogRows,
    logTotalPages,
    setLogDate,
    setLogSearch,
    setLogPage,
    setLogPageSize,
    setViewingLog,
    setEditingLog,
    setEditLogForm,
    setConfirmDelete,
    openEditLog,
    handleSaveEdit,
    handleDelete,
    invalidateLogQueries,
    canViewInputLog,
  } = useLogManagement();

  // Refs for keyboard navigation
  const shiftRef = useRef<HTMLSelectElement | null>(null);
  const mejaRef = useRef<HTMLSelectElement | null>(null);
  const partTriggerRef = useRef<HTMLButtonElement | null>(null);
  const partSearchRef = useRef<HTMLInputElement | null>(null);
  const lotNoRef = useRef<HTMLInputElement | null>(null);
  const jamMulaiRef = useRef<HTMLInputElement | null>(null);
  const jamSelesaiRef = useRef<HTMLInputElement | null>(null);
  const qtyCheckRef = useRef<HTMLInputElement | null>(null);
  const firstDefectRef = useRef<HTMLInputElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  // Keyboard navigation handler
  function handleEnter(
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextRef: RefObject<HTMLElement | null>,
  ) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    focusElement(nextRef);
  }

  // Part selection handler
  function onChoosePart(part: (typeof activeParts)[number]) {
    choosePart(part);
    requestAnimationFrame(() => focusElement(lotNoRef));
  }

  // Focus part search on open
  useEffect(() => {
    if (!partOpen) {
      setPartQuery("");
      return;
    }
    requestAnimationFrame(() => focusElement(partSearchRef));
  }, [partOpen, setPartQuery]);

  // Form submission handler
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    handleSubmit(() => {
      invalidateLogQueries();
      requestAnimationFrame(() => focusElement(shiftRef));
    });
  }

  // Export functions
  function exportLogCsv() {
    if (!filteredLogRows.length) return toast.error("Tidak ada log input untuk diexport");

    exportToCsv({
      filename: `log-input-daily-${logDate}`,
      rows: filteredLogRows,
      columns: EXPORT_COLUMNS,
    });
    toast.success("CSV log input berhasil diexport");
  }

  function exportLogPdf() {
    if (!filteredLogRows.length) return toast.error("Tidak ada log input untuk diexport");

    exportToPdf({
      filename: `log-input-daily-${logDate}`,
      title: `Log Input Daily - ${logDate}`,
      rows: filteredLogRows,
      columns: EXPORT_COLUMNS,
    });
    toast.success("PDF log input berhasil diexport");
  }

  return (
    <div className="inspection-page space-y-6">
      <section className="hero-shell">
        <div className="hero-header">
          <div className="hero-copy">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Input Laporan Inspeksi
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Input data inspeksi harian per meja dan part
            </p>
          </div>

          <div className="hero-meta">
            <div className="hero-pill">
              <span className="hero-pill-label">Shift</span>
              <strong>{formState.shift}</strong>
            </div>
            <div className="hero-pill">
              <span className="hero-pill-label">Meja</span>
              <strong>{formState.noMeja || "--"}</strong>
            </div>
            <div className="hero-pill">
              <span className="hero-pill-label">Part Aktif</span>
              <strong>{activeParts.length}</strong>
            </div>
            <div className="hero-pill">
              <span className="hero-pill-label">Meja Aktif</span>
              <strong>{activeTables.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={onSubmit}
        className="inspection-form grid items-start gap-6 lg:grid-cols-[1fr_minmax(380px,440px)]"
      >
        <div className="space-y-6 lg:sticky lg:top-20">
          <div className="kpi-grid">
            <div className={cn("kpi-card", passRateStatus === "excellent" && "kpi-excellent")}>
              <div className="kpi-label">Pass Rate</div>
              <div className="kpi-value">{(passRate * 100).toFixed(1)}%</div>
              <div className="kpi-subtitle">Persentase OK live</div>
              {passRate >= 0.98 ? (
                <TrendingUp className="kpi-icon" />
              ) : (
                <TrendingDown className="kpi-icon" />
              )}
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Qty Check</div>
              <div className="kpi-value">{formState.qtyCheck}</div>
              <div className="kpi-subtitle">Total diperiksa</div>
              <Activity className="kpi-icon" />
            </div>

            <div className="kpi-card kpi-success">
              <div className="kpi-label">OK Parts</div>
              <div className="kpi-value">{ok}</div>
              <div className="kpi-subtitle">Auto dari qty - NG</div>
              <Check className="kpi-icon" />
            </div>

            <div className={cn("kpi-card", totalDefects > 0 && "kpi-warning")}>
              <div className="kpi-label">NG Parts</div>
              <div className="kpi-value">{totalDefects}</div>
              <div className="kpi-subtitle">Total defect terinput</div>
              {defectOverflow && <AlertTriangle className="kpi-icon" />}
            </div>
          </div>

          <Card className="input-card">
            <div className="card-header">
              <div>
                <div className="card-kicker">Core Input</div>
                <h3 className="card-title">Inspection Context</h3>
              </div>
            </div>

            <div className="input-grid">
              <Field label="Tanggal">
                <input
                  type="date"
                  value={formState.date}
                  max={today}
                  onChange={(e) => updateField("date", e.target.value)}
                  onKeyDown={(e) => handleEnter(e, shiftRef)}
                  className="input-field"
                  required
                />
              </Field>

              <Field label="Shift">
                <select
                  ref={shiftRef}
                  value={formState.shift}
                  onChange={(e) => {
                    const shift = e.target.value as Shift;
                    updateField("shift", shift);
                    const defaults: Record<Shift, string> = { A: "07:00", B: "15:00", C: "23:00" };
                    updateField("jamMulai", defaults[shift]);
                  }}
                  onKeyDown={(e) => handleEnter(e, mejaRef)}
                  className="input-field"
                >
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                </select>
              </Field>

              <Field label="No Meja">
                <select
                  ref={mejaRef}
                  value={formState.noMeja}
                  onChange={(e) =>
                    updateField("noMeja", e.target.value ? Number(e.target.value) : "")
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setPartOpen(true);
                    }
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Pilih meja...</option>
                  {activeTables.map((table) => (
                    <option key={table.id} value={table.no_meja}>
                      Meja {table.no_meja}
                      {table.nama_meja ? ` - ${table.nama_meja}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="field-full">
                <Field label="Part">
                  <Popover open={partOpen} onOpenChange={setPartOpen}>
                    <PopoverTrigger asChild>
                      <button
                        ref={partTriggerRef}
                        type="button"
                        className={cn(
                          "input-field part-trigger",
                          !formState.partName && "placeholder",
                        )}
                      >
                        <span className="truncate">
                          {formState.partName
                            ? `${formState.partNo} - ${formState.partName}`
                            : "Pilih part..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          ref={partSearchRef}
                          value={partQuery}
                          onValueChange={setPartQuery}
                          placeholder="Cari part_no atau nama part..."
                        />
                        <CommandList className="max-h-72">
                          <CommandEmpty>Part tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {visibleParts.map((part) => (
                              <CommandItem
                                key={part.id}
                                value={part.part_no}
                                onSelect={() => onChoosePart(part)}
                              >
                                <Check
                                  className={cn(
                                    "h-4 w-4",
                                    formState.partName === part.part_name
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <span className="truncate">
                                  {part.part_no} - {part.part_name}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </Field>
              </div>

              {formState.noMeja && activeParts.length > 0 && (
                <div className="field-full">
                  <div className="part-suggestions">
                    <div className="suggestions-label">Part Default Meja {formState.noMeja}</div>
                    <div className="suggestions-grid">
                      {activeParts.slice(0, 8).map((part) => (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() => onChoosePart(part)}
                          className="suggestion-chip"
                        >
                          {part.part_no}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Field label="Lot No.">
                <input
                  ref={lotNoRef}
                  type="text"
                  value={formState.lotNo || ""}
                  onChange={(e) => updateField("lotNo", e.target.value)}
                  onKeyDown={(e) => handleEnter(e, jamMulaiRef)}
                  placeholder="Masukkan lot number..."
                  className="input-field"
                  maxLength={50}
                />
              </Field>

              <Field label="Jam Mulai">
                <input
                  ref={jamMulaiRef}
                  type="time"
                  value={formState.jamMulai}
                  onChange={(e) => updateField("jamMulai", e.target.value)}
                  onKeyDown={(e) => handleEnter(e, jamSelesaiRef)}
                  className="input-field"
                  required
                />
              </Field>

              <Field label="Jam Selesai">
                <input
                  ref={jamSelesaiRef}
                  type="time"
                  value={formState.jamSelesai}
                  onChange={(e) => updateField("jamSelesai", e.target.value)}
                  onBlur={() => {
                    if (
                      formState.jamMulai &&
                      formState.jamSelesai &&
                      formState.jamMulai >= formState.jamSelesai
                    ) {
                      toast.error("Jam Selesai harus setelah Jam Mulai");
                    }
                  }}
                  onKeyDown={(e) => handleEnter(e, qtyCheckRef)}
                  className="input-field"
                  required
                />
              </Field>

              <Field label="Qty Check">
                <input
                  ref={qtyCheckRef}
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  min={0}
                  value={formState.qtyCheck}
                  onChange={(e) => {
                    const next = Math.max(0, Number(e.target.value));
                    updateField("qtyCheck", next);
                  }}
                  onBlur={() => {
                    if (formState.qtyCheck <= 0) {
                      toast.error("Qty Check harus lebih dari 0");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    focusElement(Number(e.currentTarget.value) > 0 ? firstDefectRef : submitRef);
                  }}
                  className="input-field input-number"
                  required
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {formState.qtyCheck > 0 ? (
            <Card className="defect-card">
              <div className="card-header">
                <div>
                  <div className="card-kicker">Quality Check</div>
                  <h3 className="card-title">Defect Breakdown</h3>
                </div>
                <div className={cn("defect-badge", defectOverflow && "warning")}>
                  {totalDefects} / {formState.qtyCheck}
                  {defectOverflow && <AlertTriangle className="h-3.5 w-3.5 ml-1" />}
                </div>
              </div>

              {defectOverflow && (
                <div className="alert-box">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="alert-title">Defect count exceeds qty check</p>
                    <p className="alert-text">
                      Gap: {totalDefects - formState.qtyCheck}. Total defects must not exceed qty
                      check.
                    </p>
                  </div>
                </div>
              )}

              <div className="defect-categories space-y-3">
                {groupedDefects.map(([category, defects]) => (
                  <div
                    key={category}
                    className="defect-category rounded-lg border border-border/60 bg-muted/10"
                  >
                    <div
                      className={`flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${kategoriDefectColor(category)}`}
                    >
                      <span>{category}</span>
                      <span className="text-[10px] font-normal opacity-70">
                        {defects.length} jenis
                      </span>
                    </div>
                    <div className="defect-grid p-3">
                      {defects.map((defectType) => {
                        const flatIdx = defectIndexMap.get(defectType.kode_defect) ?? 0;
                        return (
                          <DefectInput
                            key={defectType.id}
                            defectType={defectType}
                            value={formState.defects[defectType.kode_defect] ?? 0}
                            index={flatIdx}
                            totalDefects={defectTypes?.length ?? 0}
                            firstDefectRef={firstDefectRef}
                            submitRef={submitRef}
                            updateDefect={updateDefect}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="empty-state">
              <div className="empty-content">
                <div className="empty-icon">
                  <Check className="h-6 w-6" />
                </div>
                <p className="empty-title">Waiting For Qty Check</p>
                <p className="empty-text">Defect input will appear here when Qty Check &gt; 0</p>
              </div>
            </Card>
          )}

          <Card className="action-card">
            <div className={cn("status-badge", defectOverflow ? "error" : "success")}>
              {defectOverflow ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Defect total exceeds qty check
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Ready to submit
                </>
              )}
            </div>

            <div className="action-buttons">
              <button
                ref={submitRef}
                type="submit"
                disabled={submitting || formState.qtyCheck <= 0 || defectOverflow}
                className="btn-primary"
              >
                <Save className="h-4 w-4" />
                {submitting ? "Saving..." : "Save Report"}
              </button>
              <button type="button" onClick={() => resetForm(false)} className="btn-secondary">
                <RotateCcw className="h-4 w-4" />
                Reset All
              </button>
            </div>
          </Card>
        </div>
      </form>

      {canViewInputLog && (
        <DataTableShell
          title="Log Input Daily"
          description={`${filteredLogRows.length} row ditampilkan dari ${logQuery.data?.length ?? 0} input pada ${logDate}`}
          actions={
            <>
              <button
                type="button"
                onClick={() => logQuery.refetch()}
                disabled={logQuery.isFetching}
                className="btn2"
              >
                <RefreshCw className={cn("h-4 w-4", logQuery.isFetching && "animate-spin")} />
                Refresh
              </button>
              <button
                type="button"
                onClick={exportLogCsv}
                disabled={!filteredLogRows.length}
                className="btn2"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={exportLogPdf}
                disabled={!filteredLogRows.length}
                className="btn2 bg-destructive text-destructive-foreground"
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
            </>
          }
          toolbar={
            <div className="grid w-full gap-3 md:grid-cols-[180px_minmax(240px,1fr)]">
              <input
                type="date"
                value={logDate}
                max={today}
                onChange={(event) => setLogDate(event.target.value)}
                className="ipt2"
              />
              <label className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={logSearch}
                  onChange={(event) => setLogSearch(event.target.value)}
                  placeholder="Search timestamp, meja, part, shift, inspector..."
                  className="ipt2 pl-8"
                />
              </label>
            </div>
          }
        >
          {logQuery.isLoading ? (
            <DataTableState title="Memuat log input" description="Mengambil data input harian." />
          ) : logQuery.isError ? (
            <DataTableState
              tone="error"
              title="Gagal memuat log input"
              description={
                logQuery.error instanceof Error ? logQuery.error.message : "Terjadi kesalahan."
              }
            />
          ) : !pageLogRows.length ? (
            <div className="p-6">
              <EmptyState title="Belum ada log input" description="Ubah tanggal atau kata kunci." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-pro w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 text-left">Timestamp</th>
                      <th className="px-3 py-3 text-left">Meja</th>
                      <th className="px-3 py-3 text-left">Shift</th>
                      <th className="px-3 py-3 text-left">Inspector</th>
                      <th className="px-3 py-3 text-left">Part</th>
                      <th className="px-3 py-3 text-left">Lot No.</th>
                      <th className="px-3 py-3 text-right">Qty Check</th>
                      <th className="px-3 py-3 text-right">OK</th>
                      <th className="px-3 py-3 text-right">NG</th>
                      <th className="px-3 py-3 text-right">NG Rate</th>
                      {canManageInputLog && <th className="px-3 py-3 text-center">Edit</th>}
                      <th className="px-3 py-3 text-center">View</th>
                      {canManageInputLog && <th className="px-3 py-3 text-center">Delete</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageLogRows.map((row) => (
                      <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {formatTimestamp(row.created_at)}
                        </td>
                        <td className="px-3 py-2.5 font-medium">Meja Inspeksi {row.no_meja}</td>
                        <td className="px-3 py-2.5">Shift {row.shift}</td>
                        <td className="px-3 py-2.5">{row.inspectorName}</td>
                        <td className="px-3 py-2.5">
                          {row.part_no} - {row.part_name}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{row.lot_no || "-"}</td>
                        <td className="px-3 py-2.5 text-right">{fmtNum(row.qty_check)}</td>
                        <td className="px-3 py-2.5 text-right text-success">
                          {fmtNum(row.total_ok ?? 0)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-destructive">
                          {fmtNum(row.total_ng)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {(getNgRate(row) * 100).toFixed(2)}%
                        </td>
                        {canManageInputLog && (
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => openEditLog(row)}
                              className="inline-flex rounded p-1.5 text-info hover:bg-info/10"
                              title="Edit log"
                              aria-label="Edit log"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingLog(row)}
                            className="inline-flex rounded p-1.5 text-primary hover:bg-primary/10"
                            title="View log"
                            aria-label="View log"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                        {canManageInputLog && (
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(row)}
                              disabled={deletingLogId === row.id}
                              className="inline-flex rounded p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                              title="Delete log"
                              aria-label="Delete log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DataTablePagination
                page={logPage}
                totalPages={logTotalPages}
                totalRows={filteredLogRows.length}
                pageSize={logPageSize}
                onPageSizeChange={(size) => {
                  setLogPageSize(size);
                  setLogPage(1);
                }}
                onPageChange={setLogPage}
              />
            </>
          )}
        </DataTableShell>
      )}

      {viewingLog && <InputLogViewModal row={viewingLog} onClose={() => setViewingLog(null)} />}

      {editingLog && editLogForm && (
        <InputLogEditModal
          row={editingLog}
          form={editLogForm}
          saving={savingLogEdit}
          today={today}
          onChange={setEditLogForm}
          onClose={() => {
            setEditingLog(null);
            setEditLogForm(null);
          }}
          onSubmit={handleSaveEdit}
        />
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Hapus Log Input"
        message={
          confirmDelete
            ? `Hapus log input Meja Inspeksi ${confirmDelete.no_meja} pada ${new Date(confirmDelete.created_at ?? "").toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}?`
            : ""
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        tone="danger"
        loading={deletingLogId !== null}
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
