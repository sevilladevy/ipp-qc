import { createFileRoute, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useEffect } from "react";

export const Route = createFileRoute("/qms")({
  component: QmsLayout,
});

function QmsLayout() {
  const location = useLocation();
  const router = useRouter();

  useEffect(() => {
    if (location.pathname === "/qms") {
      router.navigate({ to: "/qms/nc", replace: true });
    }
  }, [location.pathname, router]);

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
