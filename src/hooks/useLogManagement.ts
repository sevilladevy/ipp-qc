import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isPrivilegedUser } from "@/lib/auth";
import { QUERY_KEYS } from "@/lib/constants";
import { fetchDefectDetailsByReportIds, REPORT_COLUMNS } from "@/lib/supabase-queries";
import type { Shift } from "./useInspectionForm";

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
        await Promise.all([query, supabase.from("profiles").select("id,full_name,email")]);

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
  const filteredLogRows = useMemo(() => {
    const logRows = logQuery.data ?? [];
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
  }, [logQuery.data, logSearch]);

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
      if (editLogForm.report_date > today) return toast.error("Tanggal tidak boleh di masa depan");
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
