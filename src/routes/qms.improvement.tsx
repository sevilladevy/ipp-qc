import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  CA_PRIORITIES,
  CA_PRIORITY_LABEL,
  IMPROVEMENT_CATEGORIES,
  IMPROVEMENT_CATEGORY_LABEL,
  IMPROVEMENT_STATUSES,
  IMPROVEMENT_STATUS_LABEL,
  improvementStatusVariant,
  type CaPriority,
  type ImprovementCategory,
  type ImprovementStatus,
} from "@/lib/qms";
import {
  useImprovementMutations,
  useImprovements,
  useQmsProfiles,
  type Improvement,
} from "@/hooks/useQms";

export const Route = createFileRoute("/qms/improvement")({
  component: () => (
    <AppLayout>
      <QmsImprovementPage />
    </AppLayout>
  ),
});

const IMPROVEMENT_SOURCES = ["management_review", "audit", "non_conformity", "other"] as const;

function sourceLabel(source: string): string {
  switch (source) {
    case "audit":
      return "Audit";
    case "non_conformity":
      return "Non-Conformity";
    case "other":
      return "Lainnya";
    default:
      return "Management Review";
  }
}

type ImprovementForm = {
  title: string;
  description: string;
  category: ImprovementCategory;
  source: string;
  expected_benefit: string;
  status: ImprovementStatus;
  priority: CaPriority;
  assigned_to: string;
  deadline: string;
  actual_result: string;
  lesson_learned: string;
};

const EMPTY_FORM: ImprovementForm = {
  title: "",
  description: "",
  category: "quality",
  source: "management_review",
  expected_benefit: "",
  status: "proposed",
  priority: "medium",
  assigned_to: "",
  deadline: "",
  actual_result: "",
  lesson_learned: "",
};

function toForm(row: Improvement): ImprovementForm {
  return {
    title: row.title,
    description: row.description,
    category: (row.category as ImprovementCategory) || "quality",
    source: row.source,
    expected_benefit: row.expected_benefit ?? "",
    status: row.status,
    priority: row.priority,
    assigned_to: row.assigned_to ?? "",
    deadline: row.deadline ?? "",
    actual_result: row.actual_result ?? "",
    lesson_learned: row.lesson_learned ?? "",
  };
}

function QmsImprovementPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const { data: rows } = useImprovements();
  const { data: profiles } = useQmsProfiles();
  const { createImprovement, updateImprovement, deleteImprovement } = useImprovementMutations();
  const canManage = isPrivilegedUser(role, user?.email);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Improvement | null>(null);
  const [form, setForm] = useState<ImprovementForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Improvement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Improvement | null>(null);
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
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (!kw) return true;
      return [r.title, r.description].join(" ").toLowerCase().includes(kw);
    });
  }, [rows, keyword, statusFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openCreate() {
    if (!canManage) return toast.error("Hanya supervisor yang dapat mengusulkan improvement");
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row: Improvement) {
    setEditing(row);
    setForm(toForm(row));
    setModalOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return toast.error("Hanya supervisor yang dapat menyimpan improvement");
    if (!form.title.trim()) return toast.error("Judul wajib diisi");
    if (!form.description.trim()) return toast.error("Deskripsi wajib diisi");
    setSaving(true);
    try {
      const completed = form.status === "completed";
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        source: form.source,
        expected_benefit: form.expected_benefit.trim() || null,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
        deadline: form.deadline || null,
        actual_result: form.actual_result.trim() || null,
        lesson_learned: form.lesson_learned.trim() || null,
        completed_at: completed ? (editing?.completed_at ?? new Date().toISOString()) : null,
      };
      if (editing) {
        await updateImprovement(editing.id, payload);
        toast.success("Improvement diperbarui");
      } else {
        await createImprovement(payload, user?.id ?? null);
        toast.success("Improvement dibuat");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan improvement");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: Improvement) {
    setDeleting(true);
    try {
      await deleteImprovement(row.id);
      toast.success("Improvement dihapus");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus improvement");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) return toast.error("Tidak ada data improvement");
    exportToCsv({
      filename: "qms-improvement",
      rows: filtered,
      columns: [
        { key: "title", label: "Judul" },
        {
          key: "category",
          label: "Kategori",
          format: (r) =>
            IMPROVEMENT_CATEGORY_LABEL[r.category as ImprovementCategory] ?? r.category,
        },
        {
          key: "status",
          label: "Status",
          format: (r) => IMPROVEMENT_STATUS_LABEL[r.status as ImprovementStatus] ?? r.status,
        },
        {
          key: "deadline",
          label: "Deadline",
          format: (r) => (r.deadline ? fmtDate(r.deadline) : "-"),
        },
      ],
    });
    toast.success("CSV improvement berhasil diexport");
  }

  function exportPdf() {
    if (!filtered.length) return toast.error("Tidak ada data improvement");
    exportToPdf({
      filename: "qms-improvement",
      title: "Continual Improvement",
      rows: filtered,
      columns: [
        { key: "title", label: "Judul" },
        {
          key: "category",
          label: "Kategori",
          format: (r) =>
            IMPROVEMENT_CATEGORY_LABEL[r.category as ImprovementCategory] ?? r.category,
        },
        {
          key: "status",
          label: "Status",
          format: (r) => IMPROVEMENT_STATUS_LABEL[r.status as ImprovementStatus] ?? r.status,
        },
        {
          key: "deadline",
          label: "Deadline",
          format: (r) => (r.deadline ? fmtDate(r.deadline) : "-"),
        },
      ],
    });
    toast.success("PDF improvement berhasil diexport");
  }

  return (
    <div className="master-admin-page space-y-5">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">QMS</p>
          <h1>Continual Improvement</h1>
          <p className="hero-description">
            Usulan perbaikan mutu, proses, safety, dan efisiensi beserta hasilnya.
          </p>
        </div>
        <div className="hero-actions">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["improvements"] })}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {canManage && (
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" />
              Usulkan Improvement
            </button>
          )}
        </div>
      </section>

      <DataTableShell
        title="Daftar Improvement"
        description={`${filtered.length} usulan tercatat`}
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
                placeholder="Cari judul, deskripsi..."
                className="ipt2 pl-8"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ipt2"
            >
              <option value="">Semua status</option>
              {IMPROVEMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {IMPROVEMENT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="ipt2"
            >
              <option value="">Semua kategori</option>
              {IMPROVEMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {IMPROVEMENT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {!pageRows.length ? (
          <div className="p-6">
            <EmptyState title="Belum ada improvement" description="Ubah filter atau buat usulan." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Judul</th>
                    <th className="px-4 py-3 text-left">Kategori</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Prioritas</th>
                    <th className="px-4 py-3 text-left">Deadline</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="max-w-56 truncate px-4 py-2.5 font-medium" title={r.title}>
                        {r.title}
                      </td>
                      <td className="px-4 py-2.5">
                        {IMPROVEMENT_CATEGORY_LABEL[r.category as ImprovementCategory] ??
                          r.category}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={improvementStatusVariant(r.status)}>
                          {IMPROVEMENT_STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {CA_PRIORITY_LABEL[r.priority as CaPriority] ?? r.priority}
                      </td>
                      <td className="px-4 py-2.5">{r.deadline ? fmtDate(r.deadline) : "-"}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setViewing(r)}
                            className="rounded p-1.5 text-primary hover:bg-primary/10"
                            title="Lihat detail"
                            aria-label="Lihat detail improvement"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openEdit(r)}
                                className="rounded p-1.5 text-info hover:bg-info/10"
                                title="Edit improvement"
                                aria-label="Edit improvement"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(r)}
                                className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                                title="Hapus improvement"
                                aria-label="Hapus improvement"
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
          onClick={() => setModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
              <h3 className="font-semibold">
                {editing ? "Edit Improvement" : "Usulan Improvement"}
              </h3>
              <button onClick={() => setModalOpen(false)} aria-label="Tutup form improvement">
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
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Kategori
                  </span>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as ImprovementCategory })
                    }
                    className="ipt4"
                  >
                    {IMPROVEMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {IMPROVEMENT_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Prioritas
                  </span>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as CaPriority })}
                    className="ipt4"
                  >
                    {CA_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {CA_PRIORITY_LABEL[p]}
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
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as ImprovementStatus })
                    }
                    className="ipt4"
                  >
                    {IMPROVEMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {IMPROVEMENT_STATUS_LABEL[s]}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Sumber
                  </span>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="ipt4"
                  >
                    {IMPROVEMENT_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {sourceLabel(s)}
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
                  Manfaat yang Diharapkan
                </span>
                <textarea
                  value={form.expected_benefit}
                  onChange={(e) => setForm({ ...form, expected_benefit: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
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
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Hasil Aktual
                </span>
                <textarea
                  value={form.actual_result}
                  onChange={(e) => setForm({ ...form, actual_result: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Pelajaran (Lesson Learned)
                </span>
                <textarea
                  value={form.lesson_learned}
                  onChange={(e) => setForm({ ...form, lesson_learned: e.target.value })}
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
                  {IMPROVEMENT_CATEGORY_LABEL[viewing.category as ImprovementCategory]} ·{" "}
                  {sourceLabel(viewing.source)}
                </p>
              </div>
              <button onClick={() => setViewing(null)} aria-label="Tutup detail improvement">
                ✕
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant={improvementStatusVariant(viewing.status)}>
                  {IMPROVEMENT_STATUS_LABEL[viewing.status] ?? viewing.status}
                </Badge>
                <Badge variant="default">
                  {CA_PRIORITY_LABEL[viewing.priority as CaPriority] ?? viewing.priority}
                </Badge>
                {viewing.deadline && (
                  <Badge variant="default">Deadline {fmtDate(viewing.deadline)}</Badge>
                )}
              </div>
              {(
                [
                  ["Deskripsi", viewing.description],
                  ["Manfaat yang Diharapkan", viewing.expected_benefit],
                  ["Hasil Aktual", viewing.actual_result],
                  ["Lesson Learned", viewing.lesson_learned],
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
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Penanggung Jawab
                </div>
                <div className="mt-1 text-sm font-medium">{profileName(viewing.assigned_to)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          open={true}
          title="Hapus Improvement"
          message={`Hapus "${confirmDelete.title}"?`}
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Hapus"
          loading={deleting}
        />
      )}
    </div>
  );
}
