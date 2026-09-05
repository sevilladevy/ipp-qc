import { createFileRoute, Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui-kit";
import { Users, Cog, Package, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/master")({
  component: MasterLayout,
});

const MASTER_SECTIONS = [
  {
    to: "/master/users",
    title: "User Dan Role",
    description: "Tambah user baru, atur role inspector/supervisor, dan kelola akses akun.",
    icon: Users,
    bullets: ["Tambah user baru", "Atur role user", "Hapus akun yang tidak dipakai"],
  },
  {
    to: "/master/meja",
    title: "Meja Inspeksi",
    description: "Kelola nomor meja inspeksi, status meja, dan pengaturan meja kerja.",
    icon: Cog,
    bullets: ["Tambah meja inspeksi baru", "Atur status meja", "Pantau ketersediaan meja"],
  },
  {
    to: "/master/part",
    title: "Part Dan Produk",
    description: "Kelola part/product, part_no, nama part, kategori, dan standard cycle time.",
    icon: Package,
    bullets: ["Tambah part baru", "Atur part_no", "Set kategori dan standard cycle time"],
  },
  {
    to: "/master/defect-types",
    title: "NG Name",
    description: "Kelola nama NG/defect yang muncul pada form input dan laporan analitik.",
    icon: AlertTriangle,
    bullets: ["Tambah NG name", "Atur urutan tampil", "Aktif/nonaktifkan jenis NG"],
  },
];

function MasterLayout() {
  const { isSupervisor, loading } = useAuth();
  const location = useLocation();
  const router = useRouter();

  useEffect(() => {
    if (location.pathname === "/master" && isSupervisor) {
      router.navigate({ to: "/master/users", replace: true });
    }
  }, [location.pathname, isSupervisor, router]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!isSupervisor) {
    return (
      <AppLayout>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <h2 className="text-lg font-bold text-destructive">Akses Ditolak</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hanya supervisor yang dapat mengakses Master Data.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Hub cards only on the exact /master route; child pages render
  // their own headers so mobile users don't scroll past dead chrome.
  const isHub = location.pathname === "/master";

  return (
    <AppLayout>
      {isHub && (
        <>
          <PageHeader
            title="Master Data"
            description="Pusat pengelolaan data referensi untuk user, meja inspeksi, part, kategori, dan NG name."
          />

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {MASTER_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <Link key={section.to} to={section.to} className="block">
                  <Card className="h-full border-border/70 transition-transform hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold">{section.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                    <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <Outlet />
    </AppLayout>
  );
}
