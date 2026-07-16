import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isPrivilegedUser } from "@/lib/auth";
import {
  useDefectTypes,
  useInspectionTables,
  useParts,
  useTableDefaultParts,
} from "@/hooks/useMasterData";
import { QUERY_KEYS, STORAGE_KEYS } from "@/lib/constants";
import { fetchDefectDetailsByReportIds, REPORT_COLUMNS } from "@/lib/supabase-queries";
import { saveInspectionReport } from "@/server/reports";
import type { Tables } from "@/integrations/supabase/types";

export type Shift = "A" | "B" | "C";

export type InspectionFormState = {
  date: string;
  shift: Shift;
  noMeja: number | "";
  partNo: string;
  partName: string;
  jamMulai: string;
  jamSelesai: string;
  qtyCheck: number;
  defects: Record<string, number>;
};

type InputPrefs = {
  shift?: Shift;
  noMeja?: number | null;
};

const defaultFormState: InspectionFormState = {
  date: format(new Date(), "yyyy-MM-dd"),
  shift: "A",
  noMeja: "",
  partNo: "",
  partName: "",
  jamMulai: "",
  jamSelesai: "",
  qtyCheck: 0,
  defects: {},
};

export function readStoredPrefs(): InputPrefs {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEYS.INPUT_PREFS);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as InputPrefs;
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS.INPUT_PREFS);
    return {};
  }
}

export function writeStoredPrefs(prefs: InputPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEYS.INPUT_PREFS,
    JSON.stringify({
      shift: prefs.shift,
      noMeja: typeof prefs.noMeja === "number" ? prefs.noMeja : null,
    }),
  );
}

export function useInspectionForm() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { user, role } = useAuth();
  const canManageInputLog = isPrivilegedUser(role, user?.email);

  // Form state
  const [formState, setFormState] = useState<InspectionFormState>({
    ...defaultFormState,
    date: today,
  });
  const [submitting, setSubmitting] = useState(false);

  // Part selection state
  const [partOpen, setPartOpen] = useState(false);
  const [partQuery, setPartQuery] = useState("");

  // Load saved preferences
  useEffect(() => {
    const saved = readStoredPrefs();
    if (saved.shift === "A" || saved.shift === "B" || saved.shift === "C") {
      setFormState((prev) => ({ ...prev, shift: saved.shift as Shift }));
    }
    if (typeof saved.noMeja === "number") {
      setFormState((prev) => ({ ...prev, noMeja: saved.noMeja as number }));
    }
  }, []);

  // Save preferences when they change
  useEffect(() => {
    writeStoredPrefs({
      shift: formState.shift,
      noMeja: formState.noMeja || null,
    });
  }, [formState.shift, formState.noMeja]);

  // Master data queries
  const { data: tables } = useInspectionTables();
  const { data: parts } = useParts();
  const { data: defectTypes } = useDefectTypes(true);
  const { data: defaultPartNos } = useTableDefaultParts(
    typeof formState.noMeja === "number" ? formState.noMeja : null,
  );

  // Computed values
  const activeTables = useMemo(
    () => (tables ?? []).filter((t) => t.status === "Aktif"),
    [tables],
  );

  const activeParts = useMemo(() => {
    if (!Array.isArray(parts)) return [];
    const active = parts.filter((p) => p.is_active);
    if (defaultPartNos && defaultPartNos.length > 0) {
      const defaultSet = new Set(defaultPartNos);
      return active.filter((p) => defaultSet.has(p.part_no));
    }
    return active;
  }, [parts, defaultPartNos]);

  const selectedPart = useMemo(
    () => activeParts.find((p) => p.part_no === formState.partNo && p.part_name === formState.partName) ?? null,
    [activeParts, formState.partNo, formState.partName],
  );

  const visibleParts = useMemo(() => {
    const keyword = partQuery.trim().toUpperCase();
    if (!keyword) return activeParts;
    return activeParts.filter(
      (p) =>
        p.part_no.toUpperCase().includes(keyword) || p.part_name.toUpperCase().includes(keyword),
    );
  }, [activeParts, partQuery]);

  // Calculated values
  const totalDefects = useMemo(
    () => Object.values(formState.defects).reduce((sum, value) => sum + (value || 0), 0),
    [formState.defects],
  );
  const ok = Math.max(0, formState.qtyCheck - totalDefects);
  const passRate = formState.qtyCheck > 0 ? ok / formState.qtyCheck : 1;
  const defectOverflow = totalDefects > formState.qtyCheck;
  const passRateStatus = passRate >= 0.98 ? "excellent" : passRate >= 0.95 ? "good" : "poor";

  // Actions
  const updateField = useCallback(<K extends keyof InspectionFormState>(
    field: K,
    value: InspectionFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback((preserveContext = false) => {
    setFormState((prev) => ({
      ...defaultFormState,
      date: preserveContext ? prev.date : today,
      shift: preserveContext ? prev.shift : "A",
      noMeja: preserveContext ? prev.noMeja : "",
      defects: {},
    }));
  }, [today]);

  const choosePart = useCallback((part: Tables<"parts">) => {
    setFormState((prev) => ({
      ...prev,
      partNo: part.part_no,
      partName: part.part_name,
    }));
    setPartOpen(false);
    setPartQuery("");
  }, []);

  const updateDefect = useCallback((kodeDefect: string, value: number) => {
    setFormState((prev) => ({
      ...prev,
      defects: {
        ...prev.defects,
        [kodeDefect]: Math.max(0, value),
      },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (onSuccess?: () => void) => {
      if (!user) return;
      if (formState.date > today) {
        toast.error("Tanggal tidak boleh di masa depan");
        return;
      }
      if (!selectedPart) {
        toast.error("Pilih part dari master data");
        return;
      }
      if (!formState.noMeja) {
        toast.error("Pilih meja inspeksi");
        return;
      }
      if (!formState.jamMulai.trim()) {
        toast.error("Jam mulai wajib diisi");
        return;
      }
      if (!formState.jamSelesai.trim()) {
        toast.error("Jam selesai wajib diisi");
        return;
      }
      if (formState.qtyCheck <= 0) {
        toast.error("Qty check harus > 0");
        return;
      }
      if (defectOverflow) {
        toast.error(
          `Total defect (${totalDefects}) tidak boleh lebih besar dari Qty Check (${formState.qtyCheck})`,
        );
        return;
      }

      setSubmitting(true);

      try {
        await saveInspectionReport({
          data: {
            date: formState.date,
            shift: formState.shift,
            noMeja: Number(formState.noMeja),
            partNo: selectedPart.part_no,
            partName: selectedPart.part_name,
            qtyCheck: formState.qtyCheck,
            jamMulai: formState.jamMulai,
            jamSelesai: formState.jamSelesai,
            defects: formState.defects,
          },
        });
        toast.success("Laporan tersimpan");
        resetForm(true);
        onSuccess?.();
      } catch (error) {
        if (error instanceof Response) {
          const text = await error.text();
          toast.error(text);
        } else if (error instanceof Error) {
          if (error.message.includes("duplicate key")) {
            toast.error("Laporan duplikat: kombinasi tanggal+shift+meja+part sudah ada");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.error("Gagal menyimpan laporan");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [user, formState, selectedPart, defectOverflow, totalDefects, today, resetForm],
  );

  return {
    // State
    formState,
    submitting,
    defectOverflow,
    totalDefects,
    ok,
    passRate,
    passRateStatus,
    activeTables,
    activeParts,
    selectedPart,
    visibleParts,
    partOpen,
    partQuery,
    defectTypes,
    today,
    canManageInputLog,

    // Setters
    updateField,
    resetForm,
    setPartOpen,
    setPartQuery,
    updateDefect,
    choosePart,
    handleSubmit,
  };
}

export type InputLogRow = {
  id: string;
  report_date: string;
  shift: "A" | "B" | "C";
  no_meja: number;
  part_no: string;
  part_name: string;
  qty_check: number;
  total_ok: number | null;
  total_ng: number;
  created_by: string | null;
  created_at: string;
  jam_mulai?: string;
  jam_selesai?: string;
  // Defect detail fields - use flexible object type
  detail: Record<string, unknown> | null;
  inspectorName: string;
  inspectorEmail: string;
};

export type EditLogForm = {
  report_date: string;
  shift: Shift;
  no_meja: number;
  qty_check: number;
  total_ng: number;
  jam_mulai: string;
  jam_selesai: string;
};

export function useLogManagement() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { user, role } = useAuth();
  const canManageInputLog = isPrivilegedUser(role, user?.email);
  const canViewInputLog = role === "supervisor" || role === "inspector";
  const qc = useQueryClient();

  // Log state
  const [logDate, setLogDate] = useState(today);
  const [logSearch, setLogSearch] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(20);

  // Modal state
  const [viewingLog, setViewingLog] = useState<InputLogRow | null>(null);
  const [editingLog, setEditingLog] = useState<InputLogRow | null>(null);
  const [editLogForm, setEditLogForm] = useState<EditLogForm | null>(null);
  const [savingLogEdit, setSavingLogEdit] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<InputLogRow | null>(null);

  // Query
  const logQuery = useQuery({
    queryKey: QUERY_KEYS.INPUT_DAILY_LOG(logDate),
    enabled: canViewInputLog,
    queryFn: async () => {
      let query = supabase
        .from("inspection_reports")
        .select(REPORT_COLUMNS)
        .eq("report_date", logDate);

      if (role === "inspector" && user?.id) {
        query = query.eq("created_by", user.id);
      }

      query = query.order("created_at", { ascending: false });

      const [{ data: reports, error: reportError }, { data: profiles, error: profileError }] =
        await Promise.all([
          query,
          supabase.from("profiles").select("id,full_name,email"),
        ]);

      if (reportError) throw reportError;
      if (profileError) throw profileError;

      const reportRows = reports ?? [];
      const details = await fetchDefectDetailsByReportIds(reportRows.map((row) => row.id));
      const detailsByReportId = new Map(details.map((detail) => [detail.report_id, detail]));
      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      return reportRows.map((row): InputLogRow => {
        const profile = row.created_by ? profilesById.get(row.created_by) : undefined;
        return {
          ...row,
          detail: detailsByReportId.get(row.id) ?? null,
          inspectorName: profile?.full_name ?? profile?.email ?? row.created_by ?? "-",
          inspectorEmail: profile?.email ?? "",
        };
      });
    },
    staleTime: 30_000,
  });

  // Computed values
  const logRows = logQuery.data ?? [];
  const filteredLogRows = useMemo(() => {
    const keyword = logSearch.trim().toLowerCase();
    if (!keyword) return logRows;

    return logRows.filter((row) => {
      const haystack = [
        row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy HH:mm") : "-",
        `meja-${row.no_meja}`,
        String(row.no_meja),
        row.shift,
        row.part_name,
        row.part_no,
        row.inspectorName,
        String(row.qty_check),
        String(row.total_ng),
        row.jam_mulai,
        row.jam_selesai,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [logRows, logSearch]);

  const logTotalPages = Math.max(1, Math.ceil(filteredLogRows.length / logPageSize));
  const pageLogRows = useMemo(
    () => filteredLogRows.slice((logPage - 1) * logPageSize, logPage * logPageSize),
    [filteredLogRows, logPage, logPageSize],
  );

  // Effects
  useEffect(() => {
    setLogPage(1);
  }, [logDate, logSearch]);

  useEffect(() => {
    setLogPage((current) => Math.min(current, logTotalPages));
  }, [logTotalPages]);

  // Actions
  const invalidateLogQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.INPUT_DAILY_LOG(logDate) });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["defects"] });
    qc.invalidateQueries({ queryKey: ["trend"] });
    qc.invalidateQueries({ queryKey: ["report-management"] });
  }, [qc, logDate]);

  const openEditLog = useCallback((row: InputLogRow) => {
    setEditingLog(row);
    setEditLogForm({
      report_date: row.report_date,
      shift: row.shift as Shift,
      no_meja: row.no_meja,
      qty_check: row.qty_check,
      total_ng: row.total_ng,
      jam_mulai: row.jam_mulai ?? "",
      jam_selesai: row.jam_selesai ?? "",
    });
  }, []);

  const { updateInspectionReport, deleteInspectionReport } = useMemo(
    () => ({
      updateInspectionReport: async (data: EditLogForm) => {
        const { updateInspectionReport: updateFn } = await import("@/server/reports");
        return updateFn({
          data: {
            id: editingLog!.id,
            report_date: data.report_date,
            shift: data.shift,
            no_meja: data.no_meja,
            qty_check: data.qty_check,
            total_ng: data.total_ng,
            jam_mulai: data.jam_mulai,
            jam_selesai: data.jam_selesai,
          },
        });
      },
      deleteInspectionReport: async (id: string) => {
        const { deleteInspectionReport: deleteFn } = await import("@/server/reports");
        return deleteFn({ data: { id } });
      },
    }),
    [editingLog],
  );

  const handleSaveEdit = useCallback(
    async (event: { preventDefault: () => void }) => {
      event.preventDefault();
      if (!editingLog || !editLogForm) return;
      if (editLogForm.report_date > today)
        return toast.error("Tanggal tidak boleh di masa depan");
      if (editLogForm.no_meja <= 0) return toast.error("Meja tidak valid");
      if (editLogForm.qty_check <= 0) return toast.error("Qty check harus > 0");
      if (editLogForm.total_ng < 0) return toast.error("NG tidak boleh negatif");
      if (editLogForm.total_ng > editLogForm.qty_check) {
        return toast.error("NG tidak boleh lebih besar dari Qty Check");
      }

      setSavingLogEdit(true);
      try {
        await updateInspectionReport(editLogForm);
        toast.success("Log input diperbarui");
        const previousReportDate = editLogForm.report_date;
        setEditingLog(null);
        setEditLogForm(null);
        if (previousReportDate !== logDate) setLogDate(previousReportDate);
        invalidateLogQueries();
      } catch (error) {
        const message =
          error instanceof Response
            ? await error.text()
            : error instanceof Error
              ? error.message
              : "Gagal memperbarui laporan";
        toast.error(message);
      } finally {
        setSavingLogEdit(false);
      }
    },
    [editingLog, editLogForm, today, logDate, invalidateLogQueries, updateInspectionReport],
  );

  const handleDelete = useCallback(
    async (row: InputLogRow) => {
      setDeletingLogId(row.id);
      try {
        await deleteInspectionReport(row.id);
        toast.success("Log input dihapus");
        invalidateLogQueries();
      } catch (error) {
        const message =
          error instanceof Response
            ? await error.text()
            : error instanceof Error
              ? error.message
              : "Gagal menghapus laporan";
        toast.error(message);
      } finally {
        setDeletingLogId(null);
      }
    },
    [deleteInspectionReport, invalidateLogQueries],
  );

  return {
    // State
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
    today,
    canManageInputLog,
    canViewInputLog,

    // Setters
    setLogDate,
    setLogSearch,
    setLogPage,
    setLogPageSize,
    setViewingLog,
    setEditingLog,
    setEditLogForm,
    setConfirmDelete,

    // Actions
    openEditLog,
    handleSaveEdit,
    handleDelete,
    invalidateLogQueries,
  };
}
