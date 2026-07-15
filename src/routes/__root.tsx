import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initDevObservability } from "@/lib/dev-observability";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IPP Quality Inspection Daily Report" },
      {
        name: "description",
        content:
          "Sistem laporan inspeksi kualitas harian PT. Injeksi Plastik Pasifik - input data inspeksi, monitoring KPI, dan analisis defect.",
      },
      { name: "author", content: "PT. Injeksi Plastik Pasifik" },
      { property: "og:title", content: "IPP Quality Inspection Daily Report" },
      {
        property: "og:description",
        content: "Sistem pelaporan inspeksi kualitas harian PT. Injeksi Plastik Pasifik.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "IPP Quality Inspection Daily Report" },
      {
        name: "twitter:description",
        content:
          "Sistem laporan inspeksi kualitas harian PT. Injeksi Plastik Pasifik - input data inspeksi, monitoring KPI, dan analisis defect.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/52e5e657-6251-40cd-8f66-824e9a6d6e6d/id-preview-c465bda1--df82cfbb-15cd-426b-9ac1-91322d69e6b3.lovable.app-1776609403990.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/52e5e657-6251-40cd-8f66-824e9a6d6e6d/id-preview-c465bda1--df82cfbb-15cd-426b-9ac1-91322d69e6b3.lovable.app-1776609403990.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initDevObservability();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
