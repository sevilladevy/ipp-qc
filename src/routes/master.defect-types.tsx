import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, Badge, EmptyState } from "@/components/ui-kit";
import { DataTablePagination, DataTableShell } from "@/components/data-table";
import { useDefectTypes } from "@/hooks/useMasterData";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { kategoriDefectColor, KODE_TO_COLUMN } from "@/lib/format";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { exportToCsv, exportToPdf } from "@/lib/table-export";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Search,
  ArrowUpDown,
  EyeOff,
  Eye,
  RefreshCw,
  ShieldAlert,
  Activity,
  Download,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/master/defect-types")({
  component: MasterDefect,
});

type DefectType = Tables<"defect_types">;
type DefectForm = {
  kode_defect: string;
  nama_defect: string;
  kategori_defect: string;
  deskripsi: string;
  urutan: number | string;
  is_active: boolean;
};

function MasterDefect() {
  const { data: defects } = useDefectTypes(false);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kat, setKat] = useState("");
  const [stat, setStat] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<DefectType | null>(null);
  const [open, setOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DefectType | null>(null);
  const [draftOrder, setDraftOrder] = useState<DefectType[]>([]);

  // Get usage counts per defect (for delete protection)
  const { data: usage } = useQuery({
    queryKey: ["defect-usage"],
    queryFn: async () => {
      const columns = Object.values(KODE_TO_COLUMN);
      const { data, error } = await supabase
        .from("inspection_defect_details")
        .select(columns.join(","));
      if (error) throw error;

      const usage: Record<string, number> = {};
      for (const c of columns) {
        usage[c] = (data ?? []).filter((row) => Number(row[c as keyof typeof row] ?? 0) > 0).length;
      }
      return usage;
    },
  });

  const filtered = useMemo(() => {
    if (!defects) return [];
    return defects.filter((d) => {
      if (
        search &&
        !d.nama_defect.toLowerCase().includes(search.toLowerCase()) &&
        !d.kode_defect.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (kat && d.kategori_defect !== kat) return false;
      if (stat === "active" && !d.is_active) return false;
      if (stat === "inactive" && d.is_active) return false;
      return true;
    });
  }, [defects, search, kat, stat]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  async function save(form: DefectForm) {
    const payload: TablesUpdate<"defect_types"> = {
      nama_defect: form.nama_defect.trim(),
      kategori_defect: form.kategori_defect,
      deskripsi: form.deskripsi || null,
      urutan: form.urutan ? Number(form.urutan) : null,
      is_active: form.is_active,
    };
    if (!editing) {
      const code = form.kode_defect.trim().toUpperCase();
      if (!/^[A-Z0-9_]+$/.test(code))
        return toast.error("Kode hanya boleh huruf kapital, angka, underscore");
      const insertPayload: TablesInsert<"defect_types"> = {
        ...payload,
        kode_defect: code,
        nama_defect: payload.nama_defect ?? form.nama_defect.trim(),
        urutan: payload.urutan || (defects?.length ?? 0) + 1,
      };
      const { error } = await supabase.from("defect_types").insert(insertPayload);
      if (error)
        return toast.error(error.code === "23505" ? "Kode defect sudah ada" : error.message);
    } else {
      const { error } = await supabase.from("defect_types").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    }
    toast.success("Tersimpan");
    qc.invalidateQueries({ queryKey: ["defect_types"] });
    setOpen(false);
    setEditing(null);
  }

  async function del(d: DefectType) {
    const col = KODE_TO_COLUMN[d.kode_defect];
    const used = col && (usage?.[col] ?? 0) > 0;
    if (used)
      return toast.error("Defect sudah digunakan, tidak bisa dihapus. Gunakan Nonaktifkan.");
    const { error } = await supabase.from("defect_types").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
    qc.invalidateQueries({ queryKey: ["defect_types"] });
  }

  async function toggleActive(d: DefectType) {
    const { error } = await supabase
      .from("defect_types")
      .update({ is_active: !d.is_active })
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(d.is_active ? "Dinonaktifkan" : "Diaktifkan");
    qc.invalidateQueries({ queryKey: ["defect_types"] });
  }

  function exportCsvData() {
    if (!filtered.length) return toast.error("Tidak ada data defect");
    exportToCsv({
      filename: "master-defect-types",
      rows: filtered,
      columns: [
        { key: "kode_defect", label: "Kode" },
        { key: "nama_defect", label: "Nama Defect" },
        { key: "kategori_defect", label: "Kategori" },
        { key: "deskripsi", label: "Deskripsi" },
        { key: "urutan", label: "Urutan" },
        {
          key: "is_active",
          label: "Status",
          format: (row) => (row.is_active ? "Aktif" : "Nonaktif"),
        },
      ],
    });
    toast.success("CSV defect berhasil diexport");
  }

  function exportPdfData() {
    if (!filtered.length) return toast.error("Tidak ada data defect");
    exportToPdf({
      filename: "master-defect-types",
      title: "Master Defect Types",
      rows: filtered,
      columns: [
        { key: "kode_defect", label: "Kode" },
        { key: "nama_defect", label: "Nama Defect" },
        { key: "kategori_defect", label: "Kategori" },
        { key: "deskripsi", label: "Deskripsi" },
        { key: "urutan", label: "Urutan" },
        {
          key: "is_active",
          label: "Status",
          format: (row) => (row.is_active ? "Aktif" : "Nonaktif"),
        },
      ],
    });
    toast.success("PDF defect berhasil diexport");
  }

  function startReorder() {
    setDraftOrder([...(defects ?? [])]);
    setReorderMode(true);
  }

  async function saveOrder() {
    const updates = draftOrder.map((d, i) =>
      supabase
        .from("defect_types")
        .update({ urutan: i + 1 })
        .eq("id", d.id),
    );
    await Promise.all(updates);
    toast.success("Urutan disimpan");
    qc.invalidateQueries({ queryKey: ["defect_types"] });
    setReorderMode(false);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = draftOrder.findIndex((d) => d.id === active.id);
    const newIdx = draftOrder.findIndex((d) => d.id === over.id);
    setDraftOrder(arrayMove(draftOrder, oldIdx, newIdx));
  }

  return (
    <div className="master-admin-page space-y-5">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Master Data</p>
          <h1>Master Jenis Defect</h1>
          <p className="hero-description">Kelola referensi defect/reject untuk proses input.</p>
        </div>
        <div className="hero-actions">
          {!reorderMode ? (
            <>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["defect_types"] })}
                className="btn-secondary"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button onClick={startReorder} className="btn-secondary">
                <ArrowUpDown className="h-4 w-4" />
                Atur Urutan
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Tambah Defect
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setReorderMode(false)} className="btn-secondary">
                Batal
              </button>
              <button onClick={saveOrder} className="btn-primary">
                Simpan Urutan
              </button>
            </>
          )}
        </div>
      </section>

      <section className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="metric-label">Total Defect</div>
            <div className="metric-value">{defects?.length ?? 0}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon active">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="metric-label">Defect Aktif</div>
            <div className="metric-value">{(defects ?? []).filter((d) => d.is_active).length}</div>
          </div>
        </div>
      </section>

      {!reorderMode && (
        <Card className="mb-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama/kode..."
                className="ipt6 pl-8"
              />
            </div>
            <select
              value={kat}
              onChange={(e) => {
                setKat(e.target.value);
                setPage(1);
              }}
              className="ipt6"
            >
              <option value="">Semua kategori</option>
              <option>Dimensi</option>
              <option>Kosmetik</option>
              <option>Fungsi</option>
              <option>Material</option>
              <option>Proses</option>
            </select>
            <select
              value={stat}
              onChange={(e) => {
                setStat(e.target.value);
                setPage(1);
              }}
              className="ipt6"
            >
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </Card>
      )}

      <DataTableShell
        title="Daftar Jenis Defect"
        description={`${filtered.length} data (setelah filter)`}
        actions={
          !reorderMode ? (
            <>
              <button
                onClick={exportCsvData}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={exportPdfData}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:opacity-90"
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </>
          ) : undefined
        }
      >
        {reorderMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={draftOrder.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-border">
                {draftOrder.map((d, i) => (
                  <SortableRow key={d.id} d={d} index={i} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Tidak ada jenis defect" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left">No</th>
                    <th className="px-3 py-3 text-left">Kode</th>
                    <th className="px-3 py-3 text-left">Nama Defect</th>
                    <th className="hidden px-3 py-3 text-left md:table-cell">Kategori</th>
                    <th className="hidden px-3 py-3 text-left lg:table-cell">Deskripsi</th>
                    <th className="hidden px-3 py-3 text-right md:table-cell">Urutan</th>
                    <th className="hidden px-3 py-3 text-center md:table-cell">Status</th>
                    <th className="table-sticky-right px-3 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((d, i) => {
                    const col = KODE_TO_COLUMN[d.kode_defect];
                    const used = col ? (usage?.[col] ?? 0) > 0 : false;
                    return (
                      <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{d.kode_defect}</td>
                        <td className="px-3 py-2.5 font-medium">{d.nama_defect}</td>
                        <td className="hidden px-3 py-2.5 md:table-cell">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${kategoriDefectColor(d.kategori_defect)}`}
                          >
                            {d.kategori_defect}
                          </span>
                        </td>
                        <td className="hidden px-3 py-2.5 max-w-xs truncate text-xs text-muted-foreground lg:table-cell">
                          {d.deskripsi || "-"}
                        </td>
                        <td className="hidden px-3 py-2.5 text-right font-mono md:table-cell">
                          {d.urutan}
                        </td>
                        <td className="hidden px-3 py-2.5 text-center md:table-cell">
                          <Badge variant={d.is_active ? "success" : "default"}>
                            {d.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="table-sticky-right px-3 py-2.5 text-center">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => {
                                setEditing(d);
                                setOpen(true);
                              }}
                              className="rounded p-1.5 text-info hover:bg-info/10 min-h-[44px] min-w-[44px]"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleActive(d)}
                              className="rounded p-1.5 text-warning-foreground hover:bg-warning/15 min-h-[44px] min-w-[44px]"
                              title={d.is_active ? "Nonaktifkan" : "Aktifkan"}
                            >
                              {d.is_active ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            {!used && (
                              <button
                                onClick={() => setConfirmDelete(d)}
                                className="rounded p-1.5 text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px]"
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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

      {open && (
        <DefectModal
          initial={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          open={true}
          title="Hapus Jenis Defect"
          message={`Hapus jenis defect "${confirmDelete.nama_defect}"?`}
          onConfirm={() => {
            del(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function SortableRow({ d, index }: { d: DefectType; index: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: d.id,
  });
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-3 bg-card px-4 py-3 hover:bg-muted/30",
        isDragging && "opacity-60",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-8 text-xs text-muted-foreground">{index + 1}</span>
      <span className="flex-1 font-medium text-sm">{d.nama_defect}</span>
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${kategoriDefectColor(d.kategori_defect)}`}
      >
        {d.kategori_defect}
      </span>
      <span className="font-mono text-xs text-muted-foreground">{d.kode_defect}</span>
    </li>
  );
}

function DefectModal({
  initial,
  onClose,
  onSave,
}: {
  initial: DefectType | null;
  onClose: () => void;
  onSave: (f: DefectForm) => void;
}) {
  const [form, setForm] = useState<DefectForm>({
    kode_defect: initial?.kode_defect ?? "",
    nama_defect: initial?.nama_defect ?? "",
    kategori_defect: initial?.kategori_defect ?? "Proses",
    deskripsi: initial?.deskripsi ?? "",
    urutan: initial?.urutan ?? "",
    is_active: initial?.is_active ?? true,
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
          <h3 className="font-semibold">{initial ? "Edit Jenis Defect" : "Tambah Jenis Defect"}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-3 p-5"
        >
          <L label="Kode Defect">
            <input
              required
              readOnly={!!initial}
              value={form.kode_defect}
              onChange={(e) => setForm({ ...form, kode_defect: e.target.value.toUpperCase() })}
              className={`ipt7 font-mono ${initial ? "bg-muted/40" : ""}`}
              placeholder="MISAL_BARU"
            />
            {initial && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Kode tidak dapat diubah karena digunakan sebagai referensi data.
              </p>
            )}
          </L>
          <L label="Nama Defect">
            <input
              required
              value={form.nama_defect}
              onChange={(e) => setForm({ ...form, nama_defect: e.target.value })}
              className="ipt7"
            />
          </L>
          <L label="Kategori">
            <select
              value={form.kategori_defect}
              onChange={(e) => setForm({ ...form, kategori_defect: e.target.value })}
              className="ipt7"
            >
              <option>Dimensi</option>
              <option>Kosmetik</option>
              <option>Fungsi</option>
              <option>Material</option>
              <option>Proses</option>
            </select>
          </L>
          <L label="Deskripsi (opsional)">
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="ipt7 min-h-[60px]"
            />
          </L>
          <L label="Urutan (opsional)">
            <input
              type="number"
              value={form.urutan}
              onChange={(e) => setForm({ ...form, urutan: e.target.value })}
              className="ipt7"
            />
          </L>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Aktif (muncul di form input)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
