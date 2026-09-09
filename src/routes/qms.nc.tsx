import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Download, Eye, FileText, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { DataTablePagination, DataTableShell } from "@/components/data-table";
import { Badge, EmptyState } from "@/components/ui-kit";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth, isPrivilegedUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { exportToCsv, exportToPdf } from "@/lib/table-export";
import {
  NC_SEVERITIES,
  NC_SEVERITY_LABEL,
  NC_STATUSES,
  NC_STATUS_LABEL,
  ROOT_CAUSE_CATEGORIES,
  ncSeverityVariant,
  ncStatusVariant,
  type NcSeverity,
  type NcStatus,
} from "@/lib/qms";
import {
  useNcMutations,
  useNonConformities,
  useQmsProfiles,
  type NonConformity,
} from "@/hooks/useQms";

const ncSearchSchema = z.object({
  create: z.string().optional(),
  source: z.string().optional(),
  sourceId: z.string().optional(),
  description: z.string().optional(),
});

export const Route = createFileRoute("/qms/nc")({
  validateSearch: (search) => ncSearchSchema.parse(search),
  component: () => (
    <AppLayout>
      <QmsNcPage />
    </AppLayout>
  ),
});

const NC_SOURCES = ["internal", "audit", "complaint", "daily_qc", "other"] as const;

function sourceLabel(source: string): string {
  switch (source) {
    case "audit":
      return "Audit";
    case "complaint":
      return "Complaint";
    case "daily_qc":
      return "Daily QC";
    case "other":
      return "Lainnya";
    default:
      return "Internal";
  }
}

type NcForm = {
  description: string;
  severity: NcSeverity;
  source: string;
  source_id: string;
  root_cause: string;
  root_cause_category: string;
  corrective_action: string;
  preventive_action: string;
  deadline: string;
  assigned_to: string;
  status: NcStatus;
  closure_note: string;
};

const EMPTY_FORM: NcForm = {
  description: "",
  severity: "minor",
  source: "internal",
  source_id: "",
  root_cause: "",
  root_cause_category: "",
  corrective_action: "",
  preventive_action: "",
  deadline: "",
  assigned_to: "",
  status: "open",
  closure_note: "",
};

function toForm(row: NonConformity): NcForm {
  return {
    description: row.description,
    severity: row.severity,
    source: row.source,
    source_id: row.source_id ?? "",
    root_cause: row.root_cause ?? "",
    root_cause_category: row.root_cause_category ?? "",
    corrective_action: row.corrective_action ?? "",
    preventive_action: row.preventive_action ?? "",
    deadline: row.deadline ?? "",
    assigned_to: row.assigned_to ?? "",
    status: row.status,
    closure_note: row.closure_note ?? "",
  };
}

function QmsNcPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { data: rows } = useNonConformities();
  const { data: profiles } = useQmsProfiles();
  const { createNc, updateNc, deleteNc } = useNcMutations();
  const canManage = isPrivilegedUser(role, user?.email);
  const canRaise = user !== null;

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NonConformity | null>(null);
  const [form, setForm] = useState<NcForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<NonConformity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NonConformity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const prefillUsedRef = useRef(false);

  const profileName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles ?? []) {
      map.set(p.id, p.full_name || p.email || p.id);
    }
    return (id: string | null) => (id ? (map.get(id) ?? "-") : "-");
  }, [profiles]);

  // Prefill dari halaman laporan (?create=1&source=daily_qc&sourceId=...&description=...)
  useEffect(() => {
    if (prefillUsedRef.current || search.create !== "1") return;
    if (!user) {
      toast.error("Silakan login untuk membuat NC");
      return;
    }
    prefillUsedRef.current = true;
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      source: search.source || "daily_qc",
      source_id: search.sourceId || "",
      description: search.description || "",
    });
    setModalOpen(true);
  }, [search, user]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (severityFilter && r.severity !== severityFilter) return false;
      if (!kw) return true;
      return [r.nc_number, r.description, r.source_id ?? ""].join(" ").toLowerCase().includes(kw);
    });
  }, [rows, keyword, statusFilter, severityFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openCreate() {
    if (!user) return toast.error("Silakan login untuk membuat NC");
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row: NonConformity) {
    setEditing(row);
    setForm(toForm(row));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    if (prefillUsedRef.current) {
      prefillUsedRef.current = false;
      router.navigate({ to: "/qms/nc", search: {}, replace: true });
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return toast.error("Silakan login untuk menyimpan NC");
    if (editing && !canManage) return toast.error("Hanya supervisor yang dapat mengubah NC");
    if (!form.description.trim()) return toast.error("Deskripsi wajib diisi");
    if ((form.status === "verified" || form.status === "closed") && !form.closure_note.trim()) {
      return toast.error("Closure note wajib diisi saat Verified/Closed");
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(),
        severity: form.severity,
        source: form.source,
        source_id: form.source_id.trim() || null,
        root_cause: form.root_cause.trim() || null,
        root_cause_category: form.root_cause_category || null,
        corrective_action: form.corrective_action.trim() || null,
        preventive_action: form.preventive_action.trim() || null,
        deadline: form.deadline || null,
        assigned_to: form.assigned_to || null,
        closure_note: form.closure_note.trim() || null,
      };
      if (editing) {
        const closing = form.status === "verified" || form.status === "closed";
        const wasClosing = editing.status === "verified" || editing.status === "closed";
        await updateNc(editing.id, {
          ...payload,
          status: form.status,
          verified_by: closing ? (user?.id ?? null) : null,
          verified_at: closing ? new Date().toISOString() : null,
          ...(wasClosing && !closing ? { verified_by: null, verified_at: null } : {}),
        });
        toast.success(`NC ${editing.nc_number} diperbarui`);
      } else {
        const created = await createNc({ ...payload, status: "open" }, user?.id ?? null);
        toast.success(`NC ${created.nc_number} dibuat`);
      }
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan NC");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: NonConformity) {
    setDeleting(true);
    try {
      await deleteNc(row.id);
      toast.success(`NC ${row.nc_number} dihapus`);
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus NC");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) return toast.error("Tidak ada data NC");
    exportToCsv({
      filename: "qms-non-conformity",
      rows: filtered,
      columns: [
        { key: "nc_number", label: "No NC" },
        {
          key: "status",
          label: "Status",
          format: (r) => NC_STATUS_LABEL[r.status as NcStatus] ?? r.status,
        },
        {
          key: "severity",
          label: "Severity",
          format: (r) => NC_SEVERITY_LABEL[r.severity as NcSeverity] ?? r.severity,
        },
        { key: "description", label: "Deskripsi" },
        {
          key: "deadline",
          label: "Deadline",
          format: (r) => (r.deadline ? fmtDate(r.deadline) : "-"),
        },
      ],
    });
    toast.success("CSV NC berhasil diexport");
  }

  function exportPdf() {
    if (!filtered.length) return toast.error("Tidak ada data NC");
    exportToPdf({
      filename: "qms-non-conformity",
      title: "Non-Conformity & CAPA",
      rows: filtered,
      columns: [
        { key: "nc_number", label: "No NC" },
        {
          key: "status",
          label: "Status",
          format: (r) => NC_STATUS_LABEL[r.status as NcStatus] ?? r.status,
        },
        {
          key: "severity",
          label: "Severity",
          format: (r) => NC_SEVERITY_LABEL[r.severity as NcSeverity] ?? r.severity,
        },
        { key: "description", label: "Deskripsi" },
        {
          key: "deadline",
          label: "Deadline",
          format: (r) => (r.deadline ? fmtDate(r.deadline) : "-"),
        },
      ],
    });
    toast.success("PDF NC berhasil diexport");
  }

  return (
    <div className="master-admin-page space-y-5">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">QMS</p>
          <h1>Non-Conformity &amp; CAPA</h1>
          <p className="hero-description">
            Kelola ketidaksesuaian, akar masalah 6M, dan tindak lanjut korektif-preventif.
          </p>
        </div>
        <div className="hero-actions">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["non_conformities"] })}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {canRaise && (
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" />
              Buat NC
            </button>
          )}
        </div>
      </section>

      <DataTableShell
        title="Daftar NC"
        description={`${filtered.length} NC tercatat`}
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
                placeholder="Cari nomor, deskripsi, source id..."
                className="ipt2 pl-8"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ipt2"
            >
              <option value="">Semua status</option>
              {NC_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {NC_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="ipt2"
            >
              <option value="">Semua severity</option>
              {NC_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {NC_SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {!pageRows.length ? (
          <div className="p-6">
            <EmptyState title="Belum ada NC" description="Ubah filter atau buat NC baru." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">No NC</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Deskripsi</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Deadline</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono font-semibold">{r.nc_number}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={ncStatusVariant(r.status)}>
                          {NC_STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={ncSeverityVariant(r.severity)}>
                          {NC_SEVERITY_LABEL[r.severity] ?? r.severity}
                        </Badge>
                      </td>
                      <td className="max-w-72 truncate px-4 py-2.5" title={r.description}>
                        {r.description}
                      </td>
                      <td className="px-4 py-2.5">{sourceLabel(r.source)}</td>
                      <td className="px-4 py-2.5">{r.deadline ? fmtDate(r.deadline) : "-"}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setViewing(r)}
                            className="rounded p-1.5 text-primary hover:bg-primary/10"
                            title="Lihat detail"
                            aria-label="Lihat detail NC"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openEdit(r)}
                                className="rounded p-1.5 text-info hover:bg-info/10"
                                title="Edit NC"
                                aria-label="Edit NC"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(r)}
                                className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                                title="Hapus NC"
                                aria-label="Hapus NC"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
              <h3 className="font-semibold">
                {editing ? `Edit ${editing.nc_number}` : "Buat NC Baru"}
              </h3>
              <button onClick={closeModal} aria-label="Tutup form NC">
                ✕
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Severity
                  </span>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as NcSeverity })}
                    className="ipt4"
                  >
                    {NC_SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {NC_SEVERITY_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Source
                  </span>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="ipt4"
                  >
                    {NC_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {sourceLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Deskripsi *
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="ipt4 min-h-20"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Source ID (opsional)
                </span>
                <input
                  value={form.source_id}
                  onChange={(e) => setForm({ ...form, source_id: e.target.value })}
                  placeholder="ID laporan / temuan audit"
                  className="ipt4 font-mono text-xs"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Kategori Akar Masalah (6M)
                  </span>
                  <select
                    value={form.root_cause_category}
                    onChange={(e) => setForm({ ...form, root_cause_category: e.target.value })}
                    className="ipt4"
                  >
                    <option value="">Pilih...</option>
                    {ROOT_CAUSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Deadline
                  </span>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="ipt4"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Akar Masalah
                </span>
                <textarea
                  value={form.root_cause}
                  onChange={(e) => setForm({ ...form, root_cause: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Tindakan Korektif
                </span>
                <textarea
                  value={form.corrective_action}
                  onChange={(e) => setForm({ ...form, corrective_action: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Tindakan Preventif
                </span>
                <textarea
                  value={form.preventive_action}
                  onChange={(e) => setForm({ ...form, preventive_action: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Penanggung Jawab
                  </span>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
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
                {editing && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                      Status
                    </span>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as NcStatus })}
                      className="ipt4"
                    >
                      {NC_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {NC_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {editing && (form.status === "verified" || form.status === "closed") && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Closure Note *
                  </span>
                  <textarea
                    value={form.closure_note}
                    onChange={(e) => setForm({ ...form, closure_note: e.target.value })}
                    className="ipt4 min-h-16"
                    required
                  />
                </label>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
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
                <h3 className="font-mono font-semibold">{viewing.nc_number}</h3>
                <p className="text-xs opacity-80">
                  {sourceLabel(viewing.source)}
                  {viewing.source_id ? ` · ${viewing.source_id}` : ""}
                </p>
              </div>
              <button onClick={() => setViewing(null)} aria-label="Tutup detail NC">
                ✕
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant={ncStatusVariant(viewing.status)}>
                  {NC_STATUS_LABEL[viewing.status] ?? viewing.status}
                </Badge>
                <Badge variant={ncSeverityVariant(viewing.severity)}>
                  {NC_SEVERITY_LABEL[viewing.severity] ?? viewing.severity}
                </Badge>
                {viewing.deadline && (
                  <Badge variant="default">Deadline {fmtDate(viewing.deadline)}</Badge>
                )}
              </div>
              {(
                [
                  ["Deskripsi", viewing.description],
                  ["Akar Masalah", viewing.root_cause],
                  ["Kategori 6M", viewing.root_cause_category ? viewing.root_cause_category : null],
                  ["Tindakan Korektif", viewing.corrective_action],
                  ["Tindakan Preventif", viewing.preventive_action],
                  ["Closure Note", viewing.closure_note],
                ] as [string, string | null][]
              ).map(
                ([label, value]) =>
                  value && (
                    <div
                      key={label}
                      className="rounded-md border border-border bg-muted/20 px-3 py-2"
                    >
                      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                        {label}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{value}</div>
                    </div>
                  ),
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Penanggung Jawab
                  </div>
                  <div className="mt-1 text-sm font-medium">{profileName(viewing.assigned_to)}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Verifikasi
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    {viewing.verified_by
                      ? `${profileName(viewing.verified_by)}${viewing.verified_at ? ` · ${fmtDate(viewing.verified_at)}` : ""}`
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          open={true}
          title="Hapus NC"
          message={`Hapus ${confirmDelete.nc_number}? Tindakan terkait ikut terhapus.`}
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Hapus"
          loading={deleting}
        />
      )}
    </div>
  );
}
