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
  REVIEW_STATUSES,
  REVIEW_STATUS_LABEL,
  linesToList,
  parseStringList,
  type ReviewStatus,
} from "@/lib/qms";
import { useManagementReviews, useReviewMutations, type ManagementReview } from "@/hooks/useQms";

export const Route = createFileRoute("/qms/review")({
  component: () => (
    <AppLayout>
      <QmsReviewPage />
    </AppLayout>
  ),
});

type ReviewForm = {
  title: string;
  review_date: string;
  period_from: string;
  period_to: string;
  status: ReviewStatus;
  agenda: string;
  minutes: string;
  attendees: string;
  decisions: string;
  action_items: string;
};

const EMPTY_FORM: ReviewForm = {
  title: "",
  review_date: "",
  period_from: "",
  period_to: "",
  status: "draft",
  agenda: "",
  minutes: "",
  attendees: "",
  decisions: "",
  action_items: "",
};

function toForm(row: ManagementReview): ReviewForm {
  return {
    title: row.title,
    review_date: row.review_date,
    period_from: row.period_from,
    period_to: row.period_to,
    status: (row.status as ReviewStatus) || "draft",
    agenda: row.agenda,
    minutes: row.minutes ?? "",
    attendees: parseStringList(row.attendees).join("\n"),
    decisions: parseStringList(row.decisions).join("\n"),
    action_items: parseStringList(row.action_items).join("\n"),
  };
}

function QmsReviewPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const { data: rows } = useManagementReviews();
  const { createReview, updateReview, deleteReview } = useReviewMutations();
  const canManage = isPrivilegedUser(role, user?.email);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManagementReview | null>(null);
  const [form, setForm] = useState<ReviewForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<ManagementReview | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ManagementReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!kw) return true;
      return [r.title, r.agenda, r.minutes ?? ""].join(" ").toLowerCase().includes(kw);
    });
  }, [rows, keyword, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openCreate() {
    if (!canManage) return toast.error("Hanya supervisor yang dapat membuat tinjauan");
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row: ManagementReview) {
    setEditing(row);
    setForm(toForm(row));
    setModalOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return toast.error("Hanya supervisor yang dapat menyimpan tinjauan");
    if (!form.title.trim()) return toast.error("Judul wajib diisi");
    if (!form.review_date) return toast.error("Tanggal tinjauan wajib diisi");
    if (!form.period_from || !form.period_to) return toast.error("Periode tinjauan wajib diisi");
    if (!form.agenda.trim()) return toast.error("Agenda wajib diisi");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        review_date: form.review_date,
        period_from: form.period_from,
        period_to: form.period_to,
        status: form.status,
        agenda: form.agenda.trim(),
        minutes: form.minutes.trim() || null,
        attendees: linesToList(form.attendees),
        decisions: linesToList(form.decisions),
        action_items: linesToList(form.action_items),
      };
      if (editing) {
        await updateReview(editing.id, payload);
        toast.success("Tinjauan diperbarui");
      } else {
        await createReview(payload, user?.id ?? null);
        toast.success("Tinjauan dibuat");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan tinjauan");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: ManagementReview) {
    setDeleting(true);
    try {
      await deleteReview(row.id);
      toast.success("Tinjauan dihapus");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus tinjauan");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) return toast.error("Tidak ada data tinjauan");
    exportToCsv({
      filename: "qms-management-review",
      rows: filtered,
      columns: [
        { key: "title", label: "Judul" },
        {
          key: "review_date",
          label: "Tanggal",
          format: (r) => fmtDate(r.review_date),
        },
        {
          key: "status",
          label: "Status",
          format: (r) => REVIEW_STATUS_LABEL[r.status as ReviewStatus] ?? r.status,
        },
      ],
    });
    toast.success("CSV tinjauan berhasil diexport");
  }

  function exportPdf() {
    if (!filtered.length) return toast.error("Tidak ada data tinjauan");
    exportToPdf({
      filename: "qms-management-review",
      title: "Management Review",
      rows: filtered,
      columns: [
        { key: "title", label: "Judul" },
        {
          key: "review_date",
          label: "Tanggal",
          format: (r) => fmtDate(r.review_date),
        },
        {
          key: "status",
          label: "Status",
          format: (r) => REVIEW_STATUS_LABEL[r.status as ReviewStatus] ?? r.status,
        },
      ],
    });
    toast.success("PDF tinjauan berhasil diexport");
  }

  return (
    <div className="master-admin-page space-y-5">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">QMS</p>
          <h1>Management Review</h1>
          <p className="hero-description">
            Risalah tinjauan manajemen: agenda, keputusan, dan action items.
          </p>
        </div>
        <div className="hero-actions">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["management_reviews"] })}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {canManage && (
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" />
              Buat Tinjauan
            </button>
          )}
        </div>
      </section>

      <DataTableShell
        title="Daftar Tinjauan"
        description={`${filtered.length} tinjauan tercatat`}
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
          <div className="grid w-full gap-3 md:grid-cols-[minmax(220px,1fr)_160px]">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari judul, agenda..."
                className="ipt2 pl-8"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ipt2"
            >
              <option value="">Semua status</option>
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REVIEW_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {!pageRows.length ? (
          <div className="p-6">
            <EmptyState title="Belum ada tinjauan" description="Ubah filter atau buat tinjauan." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Judul</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Periode</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="max-w-56 truncate px-4 py-2.5 font-medium" title={r.title}>
                        {r.title}
                      </td>
                      <td className="px-4 py-2.5">{fmtDate(r.review_date)}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {fmtDate(r.period_from)} – {fmtDate(r.period_to)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={r.status === "completed" ? "success" : "info"}>
                          {REVIEW_STATUS_LABEL[r.status as ReviewStatus] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setViewing(r)}
                            className="rounded p-1.5 text-primary hover:bg-primary/10"
                            title="Lihat detail"
                            aria-label="Lihat detail tinjauan"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openEdit(r)}
                                className="rounded p-1.5 text-info hover:bg-info/10"
                                title="Edit tinjauan"
                                aria-label="Edit tinjauan"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(r)}
                                className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                                title="Hapus tinjauan"
                                aria-label="Hapus tinjauan"
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
              <h3 className="font-semibold">{editing ? "Edit Tinjauan" : "Buat Tinjauan"}</h3>
              <button onClick={() => setModalOpen(false)} aria-label="Tutup form tinjauan">
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
                    Tanggal *
                  </span>
                  <input
                    type="date"
                    value={form.review_date}
                    onChange={(e) => setForm({ ...form, review_date: e.target.value })}
                    className="ipt4"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Periode Dari *
                  </span>
                  <input
                    type="date"
                    value={form.period_from}
                    max={form.period_to || undefined}
                    onChange={(e) => setForm({ ...form, period_from: e.target.value })}
                    className="ipt4"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                    Periode Sampai *
                  </span>
                  <input
                    type="date"
                    value={form.period_to}
                    min={form.period_from || undefined}
                    onChange={(e) => setForm({ ...form, period_to: e.target.value })}
                    className="ipt4"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Status
                </span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ReviewStatus })}
                  className="ipt4"
                >
                  {REVIEW_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {REVIEW_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Agenda *
                </span>
                <textarea
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  className="ipt4 min-h-20"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Notulen
                </span>
                <textarea
                  value={form.minutes}
                  onChange={(e) => setForm({ ...form, minutes: e.target.value })}
                  className="ipt4 min-h-20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Peserta (satu per baris)
                </span>
                <textarea
                  value={form.attendees}
                  onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Keputusan (satu per baris)
                </span>
                <textarea
                  value={form.decisions}
                  onChange={(e) => setForm({ ...form, decisions: e.target.value })}
                  className="ipt4 min-h-16"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Action Items (satu per baris)
                </span>
                <textarea
                  value={form.action_items}
                  onChange={(e) => setForm({ ...form, action_items: e.target.value })}
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
                  {fmtDate(viewing.review_date)} · {fmtDate(viewing.period_from)} –{" "}
                  {fmtDate(viewing.period_to)}
                </p>
              </div>
              <button onClick={() => setViewing(null)} aria-label="Tutup detail tinjauan">
                ✕
              </button>
            </div>
            <div className="space-y-3 p-5">
              <Badge variant={viewing.status === "completed" ? "success" : "info"}>
                {REVIEW_STATUS_LABEL[viewing.status as ReviewStatus] ?? viewing.status}
              </Badge>
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Agenda
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm">{viewing.agenda}</div>
              </div>
              {viewing.minutes && (
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Notulen
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{viewing.minutes}</div>
                </div>
              )}
              {(
                [
                  ["Peserta", parseStringList(viewing.attendees)],
                  ["Keputusan", parseStringList(viewing.decisions)],
                  ["Action Items", parseStringList(viewing.action_items)],
                ] as [string, string[]][]
              ).map(
                ([label, items]) =>
                  items.length > 0 && (
                    <div
                      key={label}
                      className="rounded-md border border-border bg-muted/20 px-3 py-2"
                    >
                      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                        {label}
                      </div>
                      <ul className="mt-1 list-disc pl-4 text-sm">
                        {items.map((item, i) => (
                          <li key={`${label}-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ),
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          open={true}
          title="Hapus Tinjauan"
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
