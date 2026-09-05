import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, EmptyState, PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/builder")({
  component: () => (
    <AppLayout>
      <BuilderPage />
    </AppLayout>
  ),
});

function BuilderPage() {
  return (
    <div className="grid-compact">
      <PageHeader
        compact
        title="Builder"
        description="Route /builder aktif — sebelumnya 404 di qc.ptipp.app."
      />
      <Card>
        <h2 className="text-sm font-semibold">Builder siap dikembangkan</h2>
        <EmptyState
          title="Belum ada builder yang dikonfigurasi"
          description="File: src/routes/builder.tsx. Tambahkan form/kanban/konfigurasi di sini."
        />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link className="underline" to="/">
            Dashboard
          </Link>
          <Link className="underline" to="/input">
            Input
          </Link>
          <Link className="underline" to="/laporan">
            Laporan
          </Link>
          <Link className="underline" to="/analitik">
            Analitik
          </Link>
        </div>
      </Card>
    </div>
  );
}
