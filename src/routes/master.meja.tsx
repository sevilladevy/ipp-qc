import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState } from "@/components/ui-kit";
import { DataTablePagination, DataTableShell } from "@/components/data-table";
import { useDefaultPartsByTable, useInspectionTables, useParts } from "@/hooks/useMasterData";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { exportToCsv, exportToPdf } from "@/lib/table-export";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Table,
  Activity,
  Download,
  FileText,
  Package,
} from "lucide-react";

export const Route = createFileRoute("/master/meja")({
  component: MasterMeja,
});

type Meja = Tables<"inspection_tables">;
type MejaForm = {
  no_meja: number | string;
  nama_meja: string;
  status: string;
};

function MasterMeja() {
  const { data: tables, isLoading, isError, error, refetch } = useInspectionTables();
  const { data: defaultPartsMap } = useDefaultPartsByTable();
  const { data: allParts } = useParts();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<Meja | null>(null);
  const [open, setOpen] = useState(false);
  const [partsModal, setPartsModal] = useState<Meja | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Meja | null>(null);
  const rows = useMemo(
    () => [...(tables ?? [])].sort((left, right) => left.no_meja - right.no_meja),
    [tables],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, rows],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function save(form: MejaForm) {
    const noMeja = Math.floor(Number(form.no_meja));
    if (!Number.isFinite(noMeja) || noMeja <= 0) {
      toast.error("No meja harus bilangan bulat lebih dari 0");
      return;
    }
    const payload: TablesInsert<"inspection_tables"> = {
      no_meja: noMeja,
      nama_meja: form.nama_meja || null,
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from("inspection_tables").update(payload).eq("id", editing.id)
      : await supabase.from("inspection_tables").insert(payload);
    if (error) {
      if (error.code === "23505") {
        toast.error(`Meja ${noMeja} sudah terdaftar`);
        return;
      }
      return toast.error(error.message);
    }
    toast.success("Meja tersimpan");
    qc.invalidateQueries({ queryKey: ["inspection_tables"] });
    setOpen(false);
    setEditing(null);
  }

  async function del(id: number) {
    const { error } = await supabase.from("inspection_tables").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Meja dihapus");
    qc.invalidateQueries({ queryKey: ["inspection_tables"] });
  }

  function exportCsvData() {
    if (!rows.length) return toast.error("Tidak ada data meja");
    exportToCsv({
      filename: "master-meja-inspeksi",
      rows,
      columns: [
        { key: "no_meja", label: "No Meja", format: (row) => `Meja Inspeksi ${row.no_meja}` },
        { key: "nama_meja", label: "Nama Meja" },
        { key: "status", label: "Status" },
      ],
    });
    toast.success("CSV meja berhasil diexport");
  }

  function exportPdfData() {
    if (!rows.length) return toast.error("Tidak ada data meja");
    exportToPdf({
      filename: "master-meja-inspeksi",
      title: "Master Meja Inspeksi",
      rows,
      columns: [
        { key: "no_meja", label: "No Meja", format: (row) => `Meja Inspeksi ${row.no_meja}` },
        { key: "nama_meja", label: "Nama Meja" },
        { key: "status", label: "Status" },
      ],
    });
    toast.success("PDF meja berhasil diexport");
  }

  return (
    <div className="master-admin-page space-y-5">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Master Data</p>
          <h1>Master Meja Inspeksi</h1>
          <p className="hero-description">Kelola meja inspeksi dan status operasional harian.</p>
        </div>
        <div className="hero-actions">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["inspection_tables"] })}
            className="btn-secondary"
          >
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
            Tambah Meja
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <Table className="h-5 w-5" />
          </div>
          <div>
            <div className="metric-label">Total Meja</div>
            <div className="metric-value">{tables?.length ?? 0}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon active">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="metric-label">Meja Aktif</div>
            <div className="metric-value">
              {(tables ?? []).filter((m) => m.status === "Aktif").length}
            </div>
          </div>
        </div>
      </section>

      <section className="table-panel">
        <DataTableShell
          title="Daftar Meja Inspeksi"
          description={`${rows.length} meja terdaftar`}
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
          {isLoading ? (
            <div className="p-6">
              <EmptyState title="Memuat meja..." />
            </div>
          ) : isError ? (
            <div className="p-6">
              <EmptyState
                title="Gagal memuat meja"
                description={error instanceof Error ? error.message : "Terjadi kesalahan."}
              />
              <div className="mt-3 flex justify-center">
                <button type="button" onClick={() => refetch()} className="btn2">
                  Coba lagi
                </button>
              </div>
            </div>
          ) : !rows.length ? (
            <div className="p-6">
              <EmptyState title="Belum ada meja" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-pro cardify w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">No Meja</th>
                      <th className="px-4 py-3 text-left">Nama</th>
                      <th className="hidden px-4 py-3 text-center md:table-cell">Status</th>
                      <th className="hidden px-4 py-3 text-center md:table-cell">Default Part</th>
                      <th className="table-sticky-right px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((m) => (
                      <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                        <td data-label="No Meja" className="px-4 py-2.5 font-semibold">
                          Meja Inspeksi {m.no_meja}
                        </td>
                        <td data-label="Nama" className="px-4 py-2.5">
                          {m.nama_meja || "-"}
                        </td>
                        <td
                          data-label="Status"
                          className="hidden px-4 py-2.5 text-center md:table-cell"
                        >
                          <Badge
                            variant={
                              m.status === "Aktif"
                                ? "success"
                                : m.status === "Maintenance"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td
                          data-label="Default Part"
                          className="hidden px-4 py-2.5 text-center md:table-cell"
                        >
                          <span className="text-xs text-muted-foreground">
                            {defaultPartsMap ? (defaultPartsMap.get(m.no_meja)?.length ?? 0) : "-"}
                          </span>
                        </td>
                        <td data-action className="table-sticky-right px-4 py-2.5 text-center">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => setPartsModal(m)}
                              className="rounded p-1.5 text-info/70 hover:bg-info/10 min-h-[44px] min-w-[44px]"
                              title={`Atur default part Meja Inspeksi ${m.no_meja}`}
                              aria-label={`Atur default part Meja Inspeksi ${m.no_meja}`}
                            >
                              <Package className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditing(m);
                                setOpen(true);
                              }}
                              aria-label={`Edit Meja Inspeksi ${m.no_meja}`}
                              title={`Edit Meja Inspeksi ${m.no_meja}`}
                              className="rounded p-1.5 text-info hover:bg-info/10 min-h-[44px] min-w-[44px]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(m)}
                              aria-label={`Hapus Meja Inspeksi ${m.no_meja}`}
                              title={`Hapus Meja Inspeksi ${m.no_meja}`}
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
                totalRows={rows.length}
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
      </section>

      {open && (
        <MejaModal
          initial={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}

      {partsModal && (
        <DefaultPartsModal
          meja={partsModal}
          selectedParts={defaultPartsMap?.get(partsModal.no_meja) ?? []}
          allParts={allParts ?? []}
          onClose={() => setPartsModal(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["default-parts-by-table"] });
            qc.invalidateQueries({ queryKey: ["table-default-parts"] });
            setPartsModal(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          open={true}
          title="Hapus Meja"
          message={`Hapus Meja Inspeksi ${confirmDelete.no_meja}${confirmDelete.nama_meja ? ` - ${confirmDelete.nama_meja}` : ""}?`}
          onConfirm={() => {
            del(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function MejaModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Meja | null;
  onClose: () => void;
  onSave: (f: MejaForm) => void;
}) {
  const [form, setForm] = useState<MejaForm>({
    no_meja: initial?.no_meja ?? "",
    nama_meja: initial?.nama_meja ?? "",
    status: initial?.status ?? "Aktif",
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit Meja" : "Tambah Meja"}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
          <h3 className="font-semibold">{initial ? "Edit Meja" : "Tambah Meja"}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-3 p-5"
        >
          <Lbl label="No Meja">
            <input
              type="number"
              required
              min={1}
              step={1}
              value={form.no_meja}
              readOnly={!!initial}
              title={initial ? "No meja tidak dapat diubah (terkait default part)" : undefined}
              onChange={(e) => setForm({ ...form, no_meja: e.target.value })}
              className="ipt4"
            />
          </Lbl>
          <Lbl label="Nama Meja (opsional)">
            <input
              value={form.nama_meja}
              onChange={(e) => setForm({ ...form, nama_meja: e.target.value })}
              className="ipt4"
            />
          </Lbl>
          <Lbl label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="ipt4"
            >
              <option>Aktif</option>
              <option>Maintenance</option>
              <option>Tidak Aktif</option>
            </select>
          </Lbl>
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

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function DefaultPartsModal({
  meja,
  selectedParts,
  allParts,
  onClose,
  onSaved,
}: {
  meja: Meja;
  selectedParts: string[];
  allParts: Tables<"parts">[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(selectedParts);
  const qc = useQueryClient();

  async function save() {
    const { error: delError } = await supabase
      .from("inspection_table_default_parts")
      .delete()
      .eq("no_meja", meja.no_meja);
    if (delError) return toast.error(delError.message);

    if (selected.length > 0) {
      const rows = selected.map((part_no) => ({ no_meja: meja.no_meja, part_no }));
      const { error: insError } = await supabase
        .from("inspection_table_default_parts")
        .insert(rows);
      if (insError) return toast.error(insError.message);
    }

    toast.success("Default part tersimpan");
    qc.invalidateQueries({ queryKey: ["default-parts-by-table"] });
    onSaved();
  }

  function togglePart(part_no: string) {
    setSelected((prev) =>
      prev.includes(part_no) ? prev.filter((p) => p !== part_no) : [...prev, part_no],
    );
  }

  const activeParts = allParts.filter((p) => p.is_active);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Default Part Meja ${meja.no_meja}`}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
          <h3 className="font-semibold">Default Part - Meja {meja.no_meja}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Pilih part yang menjadi default untuk meja ini ({selected.length} terpilih)
          </p>
          {activeParts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada part aktif</p>
          ) : (
            <div className="space-y-1">
              {activeParts.map((p) => (
                <label
                  key={p.part_no}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p.part_no)}
                    onChange={() => togglePart(p.part_no)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="font-medium">{p.part_no}</span>
                  <span className="text-muted-foreground">- {p.part_name}</span>
                  {p.kategori && (
                    <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {p.kategori}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Batal
          </button>
          <button
            onClick={save}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
