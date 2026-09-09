import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, Eye, FileText, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { DataTablePagination, DataTableShell } from "@/components/data-table";
import { Badge, EmptyState } from "@/components/ui-kit";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth, isPrivilegedUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { exportToCsv, exportToPdf } from "@/lib/table-export";
import {
  AUDIT_STATUSES,
  AUDIT_STATUS_LABEL,
  AUDIT_TYPES,
  AUDIT_TYPE_LABEL,
  NC_SEVERITIES,
  NC_SEVERITY_LABEL,
  auditStatusVariant,
  isAuditOverdue,
  ncSeverityVariant,
  parseChecklist,
  removeChecklistItem,
  toggleChecklistItem,
  type AuditChecklist,
  type AuditStatus,
  type AuditType,
  type NcSeverity,
} from "@/lib/qms";
import {
  useAuditFindings,
  useAuditMutations,
  useAuditSchedules,
  useQmsProfiles,
  type AuditFinding,
  type AuditSchedule,
} from "@/hooks/useQms";

export const Route = createFileRoute("/qms/audit")({
  component: () => (
    <AppLayout>
      <QmsAuditPage />
    </AppLayout>
  ),
});

type ScheduleForm = {
  title: string;
  audit_type: AuditType;
  scope: string;
  area: string;
  planned_date: string;
  completed_date: string;
  status: AuditStatus;
  lead_auditor: string;
  notes: string;
};

const EMPTY_SCHEDULE: ScheduleForm = {
  title: "",
  audit_type: "internal",
  scope: "",
  area: "",
  planned_date: "",
  completed_date: "",
  status: "planned",
  lead_auditor: "",
  notes: "",
};

type FindingForm = {
  finding: string;
  severity: NcSeverity;
  clause: string;
  objective_evidence: string;
};

const EMPTY_FINDING: FindingForm = {
  finding: "",
  severity: "minor",
  clause: "",
  objective_evidence: "",
};

function ScheduleDetail({
  schedule,
  canManage,
  canRaise,
  profileName,
  today,
}: {
  schedule: AuditSchedule;
  canManage: boolean;
  canRaise: boolean;
  profileName: (id: string | null) => string;
  today: string;
}) {
  const navigate = useNavigate();
  const findingsQuery = useAuditFindings(schedule.id);
  const { updateSchedule, createFinding, updateFinding, deleteFinding } = useAuditMutations();
  const [checklist, setChecklist] = useState<AuditChecklist>(() =>
    parseChecklist(schedule.checklist),
  );
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [newItemClause, setNewItemClause] = useState("");
  const [findingForm, setFindingForm] = useState<FindingForm>(EMPTY_FINDING);
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);
  const [savingFinding, setSavingFinding] = useState(false);
  const [deletingFindingId, setDeletingFindingId] = useState<string | null>(null);

  useEffect(() => {
    setChecklist(parseChecklist(schedule.checklist));
  }, [schedule]);

  const findings = findingsQuery.data ?? [];
  const overdue = isAuditOverdue(schedule.planned_date, schedule.status, today);

  async function saveChecklist() {
    setSavingChecklist(true);
    try {
      await updateSchedule(schedule.id, { checklist });
      toast.success("Checklist tersimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan checklist");
    } finally {
      setSavingChecklist(false);
    }
  }

  function addItem() {
    if (!newItemText.trim()) return toast.error("Isi item checklist dulu");
    setChecklist((prev) => ({
      items: [
        ...prev.items,
        {
          id: `${Date.now()}-${prev.items.length}`,
          text: newItemText.trim(),
          clause: newItemClause.trim(),
          done: false,
          note: "",
        },
      ],
    }));
    setNewItemText("");
    setNewItemClause("");
  }

  async function submitFinding(event: FormEvent) {
    event.preventDefault();
    if (!findingForm.finding.trim()) return toast.error("Isi temuan dulu");
    setSavingFinding(true);
    try {
      if (editingFinding) {
        await updateFinding(editingFinding.id, schedule.id, {
          finding: findingForm.finding.trim(),
          severity: findingForm.severity,
          clause: findingForm.clause.trim() || null,
          objective_evidence: findingForm.objective_evidence.trim() || null,
        });
        toast.success("Temuan diperbarui");
      } else {
        await createFinding({
          audit_id: schedule.id,
          finding: findingForm.finding.trim(),
          severity: findingForm.severity,
          clause: findingForm.clause.trim() || null,
          objective_evidence: findingForm.objective_evidence.trim() || null,
        });
        toast.success("Temuan ditambahkan");
      }
      setFindingForm(EMPTY_FINDING);
      setEditingFinding(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan temuan");
    } finally {
      setSavingFinding(false);
    }
  }

  async function removeFinding(f: AuditFinding) {
    setDeletingFindingId(f.id);
    try {
      await deleteFinding(f.id, schedule.id);
      toast.success("Temuan dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus temuan");
    } finally {
      setDeletingFindingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant={auditStatusVariant(schedule.status)}>
          {AUDIT_STATUS_LABEL[schedule.status] ?? schedule.status}
        </Badge>
        {overdue && <Badge variant="destructive">Overdue</Badge>}
        <Badge variant="default">{AUDIT_TYPE_LABEL[schedule.audit_type]}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Scope" value={schedule.scope} />
        <Info label="Area" value={schedule.area ?? "-"} />
        <Info label="Planned" value={fmtDate(schedule.planned_date)} />
        <Info
          label="Completed"
          value={schedule.completed_date ? fmtDate(schedule.completed_date) : "-"}
        />
        <Info label="Lead Auditor" value={profileName(schedule.lead_auditor)} />
        <Info label="Dibuat" value={fmtDate(schedule.created_at)} />
      </div>
      {schedule.notes && <Info label="Catatan" value={schedule.notes} />}

      <div>
        <h4 className="mb-2 text-sm font-semibold">
          Checklist ({checklist.items.filter((i) => i.done).length}/{checklist.items.length})
        </h4>
        <div className="space-y-1">
          {checklist.items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={item.done}
                disabled={!canManage}
                onChange={() => setChecklist((prev) => toggleChecklistItem(prev, item.id))}
                className="h-4 w-4"
              />
              <span className={item.done ? "text-muted-foreground line-through" : "font-medium"}>
                {item.text}
              </span>
              {item.clause && (
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {item.clause}
                </span>
              )}
              {canManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setChecklist((prev) => removeChecklistItem(prev, item.id));
                  }}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  aria-label="Hapus item checklist"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
          ))}
          {!checklist.items.length && (
            <p className="text-sm text-muted-foreground">Belum ada item checklist.</p>
          )}
        </div>
        {canManage && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Item baru..."
              className="ipt2 sm:flex-1"
            />
            <input
              value={newItemClause}
              onChange={(e) => setNewItemClause(e.target.value)}
              placeholder="Klausul (mis. 8.5.1)"
              className="ipt2 sm:w-40"
            />
            <div className="flex gap-2">
              <button type="button" onClick={addItem} className="btn2">
                <Plus className="h-4 w-4" /> Item
              </button>
              <button
                type="button"
                onClick={saveChecklist}
                disabled={savingChecklist}
                className="btn2 bg-primary text-primary-foreground"
              >
                {savingChecklist ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Temuan ({findings.length})</h4>
        {findingsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat temuan...</p>
        ) : (
          <div className="space-y-2">
            {findings.map((f) => (
              <div key={f.id} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={ncSeverityVariant(f.severity)}>
                    {NC_SEVERITY_LABEL[f.severity] ?? f.severity}
                  </Badge>
                  {f.clause && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {f.clause}
                    </span>
                  )}
                  <span className="ml-auto inline-flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/qms/nc",
                          search: {
                            create: "1",
                            source: "audit",
                            sourceId: f.id,
                            description: `Temuan audit "${schedule.title}" [${f.severity}]${f.clause ? ` klausul ${f.clause}` : ""}: ${f.finding}`,
                          },
                        })
                      }
                      className="tag"
                    >
                      Buat NC
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFinding(f);
                            setFindingForm({
                              finding: f.finding,
                              severity: f.severity,
                              clause: f.clause ?? "",
                              objective_evidence: f.objective_evidence ?? "",
                            });
                          }}
                          className="rounded p-1 text-info hover:bg-info/10"
                          aria-label="Edit temuan"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFinding(f)}
                          disabled={deletingFindingId === f.id}
                          className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                          aria-label="Hapus temuan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </span>
                </div>
                <p className="mt-1 font-medium">{f.finding}</p>
                {f.objective_evidence && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bukti: {f.objective_evidence}
                  </p>
                )}
              </div>
            ))}
            {!findings.length && <p className="text-sm text-muted-foreground">Belum ada temuan.</p>}
          </div>
        )}
        {canRaise && (
          <form
            onSubmit={submitFinding}
            className="mt-3 space-y-2 rounded-md border border-border p-3"
          >
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {editingFinding ? "Edit temuan" : "Tambah temuan"}
            </p>
            <textarea
              value={findingForm.finding}
              onChange={(e) => setFindingForm({ ...findingForm, finding: e.target.value })}
              placeholder="Uraian temuan..."
              className="ipt2 min-h-16"
              required
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                value={findingForm.severity}
                onChange={(e) =>
                  setFindingForm({ ...findingForm, severity: e.target.value as NcSeverity })
                }
                className="ipt2"
              >
                {NC_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {NC_SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
              <input
                value={findingForm.clause}
                onChange={(e) => setFindingForm({ ...findingForm, clause: e.target.value })}
                placeholder="Klausul ISO"
                className="ipt2"
              />
              <input
                value={findingForm.objective_evidence}
                onChange={(e) =>
                  setFindingForm({ ...findingForm, objective_evidence: e.target.value })
                }
                placeholder="Bukti objektif"
                className="ipt2"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingFinding}
                className="btn2 bg-primary text-primary-foreground"
              >
                {savingFinding ? "Menyimpan..." : editingFinding ? "Update" : "Tambah"}
              </button>
              {editingFinding && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFinding(null);
                    setFindingForm(EMPTY_FINDING);
                  }}
                  className="btn2"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "-"}</div>
    </div>
  );
}

function QmsAuditPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const { data: rows } = useAuditSchedules();
  const { data: profiles } = useQmsProfiles();
  const { createSchedule, updateSchedule, deleteSchedule } = useAuditMutations();
  const canManage = isPrivilegedUser(role, user?.email);
  const canRaise = user !== null;
  const today = format(new Date(), "yyyy-MM-dd");

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AuditSchedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<AuditSchedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AuditSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const profileName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles ?? []) {
      map.set(p.id, p.full_name || p.email || p.id);
    }
    return (id: string | null) => (id ? (map.get(id) ?? "-") : "-");
  }, [profiles]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (typeFilter && r.audit_type !== typeFilter) return false;
      if (!kw) return true;
      return [r.title, r.scope, r.area ?? ""].join(" ").toLowerCase().includes(kw);
    });
  }, [rows, keyword, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openCreate() {
    if (!canManage) return toast.error("Hanya supervisor yang dapat menjadwalkan audit");
    setEditing(null);
    setForm({ ...EMPTY_SCHEDULE, planned_date: today });
    setModalOpen(true);
  }

  function openEdit(row: AuditSchedule) {
    setEditing(row);
    setForm({
      title: row.title,
      audit_type: row.audit_type,
      scope: row.scope,
      area: row.area ?? "",
      planned_date: row.planned_date,
      completed_date: row.completed_date ?? "",
      status: row.status,
      lead_auditor: row.lead_auditor ?? "",
      notes: row.notes ?? "",
    });
    setModalOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return toast.error("Hanya supervisor yang dapat menyimpan audit");
    if (!form.title.trim()) return toast.error("Judul wajib diisi");
    if (!form.scope.trim()) return toast.error("Scope wajib diisi");
    if (!form.planned_date) return toast.error("Tanggal rencana wajib diisi");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        audit_type: form.audit_type,
        scope: form.scope.trim(),
        area: form.area.trim() || null,
        planned_date: form.planned_date,
        completed_date: form.completed_date || null,
        status: form.status,
        lead_auditor: form.lead_auditor || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await updateSchedule(editing.id, payload);
        toast.success("Jadwal audit diperbarui");
      } else {
        await createSchedule(payload, user?.id ?? null);
        toast.success("Jadwal audit dibuat");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan audit");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: AuditSchedule) {
    setDeleting(true);
    try {
      await deleteSchedule(row.id);
      toast.success("Jadwal audit dihapus");
      setConfirmDelete(null);
      if (viewing?.id === row.id) setViewing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus audit");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) return toast.error("Tidak ada data audit");
    exportToCsv({
      filename: "qms-audit-schedules",
      rows: filtered,
      columns: [
        { key: "title", label: "Judul" },
        {
          key: "audit_type",
          label: "Tipe",
          format: (r) => AUDIT_TYPE_LABEL[r.audit_type as AuditType] ?? r.audit_type,
        },
        { key: "scope", label: "Scope" },
        {
          key: "planned_date",
          label: "Planned",
          format: (r) => fmtDate(r.planned_date),
        },
        {
          key: "status",
          label: "Status",
          format: (r) => AUDIT_STATUS_LABEL[r.status as AuditStatus] ?? r.status,
        },
      ],
    });
    toast.success("CSV audit berhasil diexport");
  }

  function exportPdf() {
    if (!filtered.length) return toast.error("Tidak ada data audit");
    exportToPdf({
      filename: "qms-audit-schedules",
      title: "Jadwal Audit",
      rows: filtered,
      columns: [
        { key: "title", label: "Judul" },
        {
          key: "audit_type",
          label: "Tipe",
          format: (r) => AUDIT_TYPE_LABEL[r.audit_type as AuditType] ?? r.audit_type,
        },
        { key: "scope", label: "Scope" },
        {
          key: "planned_date",
          label: "Planned",
          format: (r) => fmtDate(r.planned_date),
        },
        {
          key: "status",
          label: "Status",
          format: (r) => AUDIT_STATUS_LABEL[r.status as AuditStatus] ?? r.status,
        },
      ],
    });
    toast.success("PDF audit berhasil diexport");
  }

  return (
    <div className="master-admin-page space-y-5">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">QMS</p>
          <h1>Jadwal Audit</h1>
          <p className="hero-description">
            Rencana audit internal/eksternal/supplier, checklist klausul, dan temuan.
          </p>
        </div>
        <div className="hero-actions">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["audit_schedules"] })}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {canManage && (
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" />
              Jadwalkan Audit
            </button>
          )}
        </div>
      </section>

      <DataTableShell
        title="Daftar Audit"
        description={`${filtered.length} audit tercatat`}
        actions={
          <>
            <button onClick={exportCsv} className="btn2">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={exportPdf} className="btn2 bg-destructive text-destructive-foreground">
              <FileText className="h-4 w-4" /> PDF
            </button>
          </>
        }
        toolbar={
          <div className="grid w-full gap-3 md:grid-cols-[minmax(220px,1fr)_160px_160px]">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari judul, scope, area..."
                className="ipt2 pl-8"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ipt2"
            >
              <option value="">Semua status</option>
              {AUDIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {AUDIT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="ipt2"
            >
              <option value="">Semua tipe</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {AUDIT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {!pageRows.length ? (
          <div className="p-6">
            <EmptyState title="Belum ada audit" description="Ubah filter atau jadwalkan audit." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Judul</th>
                    <th className="px-4 py-3 text-left">Tipe</th>
                    <th className="px-4 py-3 text-left">Scope</th>
                    <th className="px-4 py-3 text-left">Planned</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const overdue = isAuditOverdue(r.planned_date, r.status, today);
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                        <td className="max-w-56 truncate px-4 py-2.5 font-medium" title={r.title}>
                          {r.title}
                        </td>
                        <td className="px-4 py-2.5">{AUDIT_TYPE_LABEL[r.audit_type]}</td>
                        <td className="max-w-48 truncate px-4 py-2.5" title={r.scope}>
                          {r.scope}
                        </td>
                        <td className="px-4 py-2.5">{fmtDate(r.planned_date)}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex gap-1">
                            <Badge variant={auditStatusVariant(r.status)}>
                              {AUDIT_STATUS_LABEL[r.status] ?? r.status}
                            </Badge>
                            {overdue && <Badge variant="destructive">Overdue</Badge>}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => setViewing(r)}
                              className="rounded p-1.5 text-primary hover:bg-primary/10"
                              title="Lihat detail"
                              aria-label="Lihat detail audit"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => openEdit(r)}
                                  className="rounded p-1.5 text-info hover:bg-info/10"
                                  title="Edit audit"
                                  aria-label="Edit audit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(r)}
                                  className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                                  title="Hapus audit"
                                  aria-label="Hapus audit"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              totalRows={filtered.length}
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

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
              <h3 className="font-semibold">{editing ? "Edit Jadwal Audit" : "Jadwalkan Audit"}</h3>
              <button onClick={() => setModalOpen(false)} aria-label="Tutup form audit">
                ✕
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Judul *
                </span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="ipt4"
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Tipe
                  </span>
                  <select
                    value={form.audit_type}
                    onChange={(e) => setForm({ ...form, audit_type: e.target.value as AuditType })}
                    className="ipt4"
                  >
                    {AUDIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {AUDIT_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as AuditStatus })}
                    className="ipt4"
                  >
                    {AUDIT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {AUDIT_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Scope *
                </span>
                <textarea
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  className="ipt4 min-h-16"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Area
                </span>
                <input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Departemen / lini"
                  className="ipt4"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Tanggal Rencana *
                  </span>
                  <input
                    type="date"
                    value={form.planned_date}
                    onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                    className="ipt4"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Tanggal Selesai
                  </span>
                  <input
                    type="date"
                    value={form.completed_date}
                    min={form.planned_date || undefined}
                    onChange={(e) => setForm({ ...form, completed_date: e.target.value })}
                    className="ipt4"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Lead Auditor
                </span>
                <select
                  value={form.lead_auditor}
                  onChange={(e) => setForm({ ...form, lead_auditor: e.target.value })}
                  className="ipt4"
                >
                  <option value="">Belum ditentukan</option>
                  {(profiles ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email || p.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Catatan
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
              <div>
                <h3 className="font-semibold">{viewing.title}</h3>
                <p className="text-xs opacity-80">
                  {AUDIT_TYPE_LABEL[viewing.audit_type]} · Planned {fmtDate(viewing.planned_date)}
                </p>
              </div>
              <button onClick={() => setViewing(null)} aria-label="Tutup detail audit">
                ✕
              </button>
            </div>
            <div className="p-5">
              <ScheduleDetail
                key={viewing.id}
                schedule={viewing}
                canManage={canManage}
                canRaise={canRaise}
                profileName={profileName}
                today={today}
              />
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          open={true}
          title="Hapus Audit"
          message={`Hapus "${confirmDelete.title}"? Semua temuan audit ini ikut terhapus.`}
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Hapus"
          loading={deleting}
        />
      )}
    </div>
  );
}
