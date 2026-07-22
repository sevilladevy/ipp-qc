import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Badge, EmptyState } from "@/components/ui-kit";
import { DataTablePagination, DataTableShell } from "@/components/data-table";
import { useParts } from "@/hooks/useMasterData";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { exportToCsv, exportToPdf } from "@/lib/table-export";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Package,
  Activity,
  Download,
  FileText,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/master/part")({
  component: MasterPart,
});

type Part = Tables<"parts">;
type PartForm = {
  part_no: string;
  part_name: string;
  kategori: string;
  customer: string;
  standard_cycle_time: number | string;
  is_active: boolean;
};

function MasterPart() {
  const partsQuery = useParts();
  const { data: parts } = partsQuery;
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Part | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      [...(parts ?? [])].sort((left, right) => left.part_name.localeCompare(right.part_name, "id")),
    [parts],
  );
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter(
      (row) =>
        row.part_name.toLowerCase().includes(keyword) ||
        row.part_no.toLowerCase().includes(keyword),
    );
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  );

  async function save(form: PartForm) {
    const payloadInsert: TablesInsert<"parts"> = {
      part_no: form.part_no.trim(),
      part_name: form.part_name.trim(),
      kategori: form.kategori || null,
      customer: form.customer || null,
      standard_cycle_time: form.standard_cycle_time ? Number(form.standard_cycle_time) : null,
      is_active: form.is_active,
    };
    const payloadUpdate: TablesUpdate<"parts"> = {
      part_name: form.part_name.trim(),
      kategori: form.kategori || null,
      customer: form.customer || null,
      standard_cycle_time: form.standard_cycle_time ? Number(form.standard_cycle_time) : null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("parts").update(payloadUpdate).eq("id", editing.id)
      : await supabase.from("parts").insert(payloadInsert);
    if (error) return toast.error(error.message);
    toast.success("Part tersimpan");
    qc.invalidateQueries({ queryKey: ["parts"] });
    setOpen(false);
    setEditing(null);
  }

  async function del(id: string) {
    const { error } = await supabase.from("parts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Part dihapus");
    qc.invalidateQueries({ queryKey: ["parts"] });
  }

  function exportCsvData() {
    if (!filteredRows.length) return toast.error("Tidak ada data part");
    exportToCsv({
      filename: "master-part",
      rows: filteredRows,
      columns: [
        { key: "part_no", label: "Part No" },
        { key: "part_name", label: "Nama Part" },
        { key: "kategori", label: "Kategori" },
        {
          key: "standard_cycle_time",
          label: "Cycle Time (detik)",
          format: (row) =>
            row.standard_cycle_time != null ? String(row.standard_cycle_time) : "-",
        },
        {
          key: "is_active",
          label: "Status",
          format: (row) => (row.is_active ? "Aktif" : "Nonaktif"),
        },
      ],
    });
    toast.success("CSV part berhasil diexport");
  }

  function exportPdfData() {
    if (!filteredRows.length) return toast.error("Tidak ada data part");
    exportToPdf({
      filename: "master-part",
      title: "Master Part",
      rows: filteredRows,
      columns: [
        { key: "part_no", label: "Part No" },
        { key: "part_name", label: "Nama Part" },
        { key: "kategori", label: "Kategori" },
        {
          key: "standard_cycle_time",
          label: "Cycle Time (detik)",
          format: (row) =>
            row.standard_cycle_time != null ? String(row.standard_cycle_time) : "-",
        },
        {
          key: "is_active",
          label: "Status",
          format: (row) => (row.is_active ? "Aktif" : "Nonaktif"),
        },
      ],
    });
    toast.success("PDF part berhasil diexport");
  }

  return (
    <div className="master-admin-page space-y-5">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Master Data</p>
          <h1>Master Part / Produk</h1>
          <p className="hero-description">
            Kelola part, part_no, kategori, dan standard cycle time.
          </p>
        </div>
        <div className="hero-actions">
          <button onClick={() => partsQuery.refetch()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Tambah Part
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="metric-label">Total Part</div>
            <div className="metric-value">{parts?.length ?? 0}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon active">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="metric-label">Part Aktif</div>
            <div className="metric-value">{(parts ?? []).filter((p) => p.is_active).length}</div>
          </div>
        </div>
      </section>

      <DataTableShell
        title="Daftar Part"
        description={`${filteredRows.length} part`}
        toolbar={
          <label className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari part_no atau nama part..."
              className="w-full rounded-md border border-input bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
        }
        actions={
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
        }
      >
        {!filteredRows.length ? (
          <div className="p-6">
            <EmptyState title="Data part tidak ditemukan" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-pro w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Part No</th>
                    <th className="px-4 py-3 text-left">Nama Part</th>
                    <th className="hidden px-4 py-3 text-left md:table-cell">Kategori</th>
                    <th className="hidden px-4 py-3 text-right md:table-cell">Cycle Time (dtk)</th>
                    <th className="hidden px-4 py-3 text-center md:table-cell">Status</th>
                    <th className="table-sticky-right px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs">{p.part_no}</td>
                      <td className="px-4 py-2.5 font-medium">{p.part_name}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        <Badge variant="outline">{p.kategori || "-"}</Badge>
                      </td>
                      <td className="hidden px-4 py-2.5 text-right font-mono text-xs md:table-cell">
                        {p.standard_cycle_time != null ? `${p.standard_cycle_time}s` : "-"}
                      </td>
                      <td className="hidden px-4 py-2.5 text-center md:table-cell">
                        <Badge variant={p.is_active ? "success" : "default"}>
                          {p.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="table-sticky-right px-4 py-2.5 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => {
                              setEditing(p);
                              setOpen(true);
                            }}
                            className="rounded p-1.5 text-info hover:bg-info/10 min-h-[44px] min-w-[44px]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p.id)}
                            className="rounded p-1.5 text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
              totalRows={filteredRows.length}
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
        <PartModal
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
          title="Hapus Part"
          message="Hapus part ini?"
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

function PartModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Part | null;
  onClose: () => void;
  onSave: (f: PartForm) => void;
}) {
  const [form, setForm] = useState<PartForm>({
    part_no: initial?.part_no ?? "",
    part_name: initial?.part_name ?? "",
    kategori: initial?.kategori ?? "SMALL",
    customer: initial?.customer ?? "",
    standard_cycle_time: initial?.standard_cycle_time ?? "",
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
          <h3 className="font-semibold">{initial ? "Edit Part" : "Tambah Part"}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-3 p-5"
        >
          <L label="Part No">
            <input
              required
              value={form.part_no}
              onChange={(e) => setForm({ ...form, part_no: e.target.value })}
              className="ipt5"
              placeholder="Contoh: IPP-001"
            />
          </L>
          <L label="Nama Part">
            <input
              required
              value={form.part_name}
              onChange={(e) => setForm({ ...form, part_name: e.target.value })}
              className="ipt5"
            />
          </L>
          <L label="Kategori">
            <select
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              className="ipt5"
            >
              <option>SMALL</option>
              <option>MEDIUM</option>
              <option>BIG</option>
              <option>SA</option>
            </select>
          </L>
          <L label="Customer (opsional)">
            <input
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
              className="ipt5"
            />
          </L>
          <L label="Standard Cycle Time (detik)">
            <input
              type="number"
              min={0}
              step={0.1}
              value={form.standard_cycle_time}
              onChange={(e) => setForm({ ...form, standard_cycle_time: e.target.value })}
              className="ipt5"
              placeholder="Dalam detik"
            />
          </L>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Aktif
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
