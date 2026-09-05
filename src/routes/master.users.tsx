import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  ShieldCheck,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  X,
  Users,
  UserCheck,
  Clock3,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/data-table";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { exportToCsv, exportToPdf } from "@/lib/table-export";
import { listUsers, inviteUser, promoteToSupervisor, deleteUser } from "@/server/users";

export const Route = createFileRoute("/master/users")({
  component: UserManagementPage,
});

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  role: "inspector" | "supervisor";
  created_at: string;
  last_sign_in_at: string | null;
};

function UserManagementPage() {
  const { isSupervisor, loading, user } = useAuth();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "inspector" | "supervisor">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  type ConfirmAction = { action: "promote" | "delete"; userId: string; email: string };
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await listUsers();
      return {
        total: res.total,
        users: res.users as Row[],
      };
    },
    enabled: isSupervisor,
    retry: 1,
  });

  const promoteMut = useMutation({
    mutationFn: async (userId: string) => promoteToSupervisor({ data: { userId } }),
    onSuccess: () => {
      toast.success("User dipromosikan menjadi supervisor");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Akun pengguna dihapus permanen");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => usersQuery.data?.users ?? [], [usersQuery.data?.users]);
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesRole = roleFilter === "all" || row.role === roleFilter;
      const matchesSearch =
        !keyword ||
        row.email.toLowerCase().includes(keyword) ||
        (row.full_name ?? "").toLowerCase().includes(keyword);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const supervisorCount = rows.filter((u) => u.role === "supervisor").length;
  const inspectorCount = rows.filter((u) => u.role === "inspector").length;
  const activeCount = rows.filter((u) => Boolean(u.last_sign_in_at)).length;

  function exportCsvData() {
    if (!filteredRows.length) return toast.error("Tidak ada data user");
    exportToCsv({
      filename: "master-users",
      rows: filteredRows,
      columns: [
        { key: "email", label: "Email" },
        { key: "full_name", label: "Nama Lengkap" },
        { key: "role", label: "Role" },
        { key: "created_at", label: "Dibuat", format: (row) => formatDateTime(row.created_at) },
        {
          key: "last_sign_in_at",
          label: "Login Terakhir",
          format: (row) =>
            row.last_sign_in_at ? formatDateTime(row.last_sign_in_at) : "Belum pernah",
        },
      ],
    });
    toast.success("CSV user berhasil diexport");
  }

  function exportPdfData() {
    if (!filteredRows.length) return toast.error("Tidak ada data user");
    exportToPdf({
      filename: "master-users",
      title: "Master Users",
      rows: filteredRows,
      columns: [
        { key: "email", label: "Email" },
        { key: "full_name", label: "Nama Lengkap" },
        { key: "role", label: "Role" },
        { key: "created_at", label: "Dibuat", format: (row) => formatDateTime(row.created_at) },
        {
          key: "last_sign_in_at",
          label: "Login Terakhir",
          format: (row) =>
            row.last_sign_in_at ? formatDateTime(row.last_sign_in_at) : "Belum pernah",
        },
      ],
    });
    toast.success("PDF user berhasil diexport");
  }

  if (loading) return null;

  if (!isSupervisor) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <h2 className="text-lg font-bold text-destructive">Akses Ditolak</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hanya supervisor yang dapat mengelola pengguna.
        </p>
      </div>
    );
  }

  return (
    <div className="users-page space-y-5">
      <section className="users-hero">
        <div>
          <p className="eyebrow">Master Data</p>
          <h1>Manajemen Pengguna</h1>
          <p className="hero-description">
            Kelola akses inspector dan supervisor untuk IPP Quality Inspection Daily Report.
          </p>
        </div>
        <div className="hero-actions">
          <button onClick={() => usersQuery.refetch()} className="btn-secondary">
            <RefreshCw className={cn("h-4 w-4", usersQuery.isFetching && "animate-spin")} />
            Refresh
          </button>
          <button onClick={() => setInviteOpen(true)} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            Tambah User
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={Users} label="Total User" value={usersQuery.data?.total ?? 0} />
        <MetricCard icon={UserCheck} label="Inspector" value={inspectorCount} />
        <MetricCard icon={ShieldCheck} label="Supervisor" value={supervisorCount} />
        <MetricCard icon={Clock3} label="Pernah Login" value={activeCount} />
      </section>

      <section className="users-panel">
        <div className="panel-toolbar">
          <div className="search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Cari nama atau email..."
              aria-label="Cari user"
            />
          </div>
          <div className="role-tabs" role="group" aria-label="Filter role">
            {(["all", "inspector", "supervisor"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoleFilter(role);
                  setPage(1);
                }}
                aria-pressed={roleFilter === role}
                className={cn(roleFilter === role && "active")}
              >
                {role === "all" ? "Semua" : role === "inspector" ? "Inspector" : "Supervisor"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex justify-end gap-2">
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
        </div>
        <div className="table-wrap">
          <table className="users-table cardify">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th className="hidden md:table-cell">Dibuat</th>
                <th className="hidden md:table-cell">Login Terakhir</th>
                <th className="table-sticky-right text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isError ? (
                <tr>
                  <td colSpan={5}>
                    <StateMessage
                      tone="error"
                      title="Data user gagal dimuat"
                      description={
                        usersQuery.error instanceof Error
                          ? usersQuery.error.message
                          : "Terjadi kesalahan saat membaca data pengguna."
                      }
                    />
                  </td>
                </tr>
              ) : usersQuery.isLoading ? (
                <tr>
                  <td colSpan={5}>
                    <StateMessage title="Memuat data user" description="Mohon tunggu sebentar." />
                  </td>
                </tr>
              ) : pageRows.length > 0 ? (
                pageRows.map((u) => {
                  const isMe = u.id === user?.id;
                  const isSup = u.role === "supervisor";
                  const lastSupervisor = isSup && supervisorCount <= 1;

                  return (
                    <tr key={u.id}>
                      <td data-label="User">
                        <div className="user-cell">
                          <div className={cn("avatar", isSup && "supervisor")}>
                            {getInitials(u.full_name || u.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="user-name">
                              {u.full_name || "Tanpa nama"}
                              {isMe && <span className="self-badge">Anda</span>}
                            </div>
                            <div className="user-email">{u.email || u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Role">
                        <RoleBadge role={u.role} />
                      </td>
                      <td data-label="Dibuat" className="hidden date-cell md:table-cell">
                        {formatDateTime(u.created_at)}
                      </td>
                      <td data-label="Login Terakhir" className="hidden date-cell md:table-cell">
                        {u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : "Belum pernah"}
                      </td>
                      <td data-action className="table-sticky-right">
                        <div className="row-actions">
                          {!isSup && (
                            <button
                              disabled={promoteMut.isPending}
                              onClick={() =>
                                setConfirmAction({
                                  action: "promote",
                                  userId: u.id,
                                  email: u.email,
                                })
                              }
                              className="action-btn"
                              title="Promosikan ke Supervisor"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Promosi
                            </button>
                          )}
                          <button
                            disabled={isMe || lastSupervisor || deleteMut.isPending}
                            onClick={() =>
                              setConfirmAction({ action: "delete", userId: u.id, email: u.email })
                            }
                            className="action-btn danger"
                            title={
                              isMe
                                ? "Tidak bisa menghapus akun sendiri"
                                : lastSupervisor
                                  ? "Tidak bisa menghapus supervisor terakhir"
                                  : "Hapus permanen"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>
                    <StateMessage
                      title={rows.length === 0 ? "Belum ada pengguna" : "Tidak ada user yang cocok"}
                      description={
                        rows.length === 0
                          ? "Tambahkan user pertama untuk mulai mengelola akses aplikasi."
                          : "Coba ubah kata kunci pencarian atau filter role."
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRows.length > 0 && (
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
        )}

        <div className="panel-note">
          Demosi supervisor ke inspector dinonaktifkan untuk mencegah lockout. Tambahkan supervisor
          baru sebelum menghapus supervisor lama.
        </div>
      </section>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          open={true}
          title={confirmAction.action === "promote" ? "Promosikan User" : "Hapus User"}
          message={
            confirmAction.action === "promote"
              ? `Promosikan ${confirmAction.email} menjadi supervisor?`
              : `Hapus akun ${confirmAction.email} secara permanen? Tindakan ini tidak dapat dibatalkan.`
          }
          confirmLabel={confirmAction.action === "promote" ? "Promosikan" : "Hapus"}
          tone={confirmAction.action === "promote" ? "warning" : "danger"}
          loading={confirmAction.action === "promote" ? promoteMut.isPending : deleteMut.isPending}
          onConfirm={() => {
            const { action, userId } = confirmAction;
            const done = {
              onSuccess: () => setConfirmAction(null),
            };
            if (action === "promote") promoteMut.mutate(userId, done);
            else deleteMut.mutate(userId, done);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: Row["role"] }) {
  const isSupervisor = role === "supervisor";
  return (
    <span className={cn("role-badge", isSupervisor && "supervisor")}>
      {isSupervisor ? "Supervisor" : "Inspector"}
    </span>
  );
}

function StateMessage({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone?: "error";
}) {
  return (
    <div className={cn("state-message", tone)}>
      <div className="state-title">{title}</div>
      <div className="state-description">{description}</div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInitials(value: string) {
  const words = value
    .replace(/@.*/, "")
    .split(/\s|[._-]/)
    .filter(Boolean);

  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

function generateTempPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState(generateTempPassword());
  const [role, setRole] = useState<"inspector" | "supervisor">("inspector");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const summary = useMemo(
    () =>
      `Akun IPP Quality Inspection Daily Report\nEmail: ${email}\nPassword sementara: ${password}\nRole: ${role}\n\nLogin di: ${typeof window !== "undefined" ? window.location.origin : ""}/login`,
    [email, password, role],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        toast.error("Format email tidak valid");
        return;
      }
      await inviteUser({ data: { email: cleanEmail, password, fullName, role } });
      toast.success("Akun berhasil dibuat. Bagikan password sementara ke inspector.");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat akun");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Undang Inspector Baru"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
          <div>
            <h3 className="text-base font-bold">Undang Inspector Baru</h3>
            <p className="text-xs text-muted-foreground">
              Akun langsung aktif. Bagikan password sementara secara manual.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <Field label="Nama Lengkap">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Budi Santoso"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="inspector@ipp.co.id"
            />
          </Field>
          <Field label="Password Sementara">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  required
                  minLength={6}
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPw}
                  className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPassword(generateTempPassword())}
                className="rounded-md border border-border bg-card px-2 text-xs font-medium hover:bg-muted"
                title="Generate ulang"
                aria-label="Generate ulang password sementara"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "inspector" | "supervisor")}
              className="input"
            >
              <option value="inspector">Inspector</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </Field>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summary);
                toast.success("Detail akun disalin");
              } catch {
                const ta = document.createElement("textarea");
                ta.value = summary;
                document.body.appendChild(ta);
                ta.select();
                try {
                  document.execCommand("copy");
                  toast.success("Detail akun disalin");
                } catch {
                  toast.error("Gagal menyalin, salin manual dari ringkasan");
                }
                document.body.removeChild(ta);
              }
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" /> Salin detail akun (untuk dikirim manual)
          </button>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Membuat..." : "Buat Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
