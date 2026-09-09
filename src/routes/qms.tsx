import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, PageHeader } from "@/components/ui-kit";
import { AlertTriangle, ClipboardCheck, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/qms")({
  component: QmsLayout,
});

const QMS_SECTIONS = [
  {
    to: "/qms/nc",
    title: "Non-Conformity & CAPA",
    description: "Kelola ketidaksesuaian, akar masalah 6M, dan tindak lanjut korektif-preventif.",
    icon: AlertTriangle,
    bullets: ["Nomor NC otomatis", "Buat NC dari laporan/temuan", "Verifikasi & closure"],
  },
  {
    to: "/qms/audit",
    title: "Jadwal Audit",
    description: "Rencana audit, checklist klausul ISO, temuan, dan link ke NC.",
    icon: ClipboardCheck,
    bullets: ["Audit internal/eksternal/supplier", "Checklist per klausul", "Temuan → NC"],
  },
  {
    to: "/qms/improvement",
    title: "Continual Improvement",
    description: "Usulan perbaikan mutu, proses, safety, dan efisiensi beserta hasilnya.",
    icon: TrendingUp,
    bullets: ["Usulan & prioritas", "Lacak status & deadline", "Lesson learned"],
  },
  {
    to: "/qms/review",
    title: "Management Review",
    description: "Risalah tinjauan manajemen: agenda, keputusan, dan action items.",
    icon: Users,
    bullets: ["Agenda & notulen", "Keputusan", "Action items"],
  },
];

function QmsLayout() {
  const location = useLocation();
  const isHub = location.pathname === "/qms";

  return (
    <AppLayout>
      {isHub && (
        <>
          <PageHeader
            title="Quality Management"
            description="Audit, ketidaksesuaian, tindakan korektif, dan continual improvement (ISO 9001:2015)."
          />

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {QMS_SECTIONS.map((section) => {
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
