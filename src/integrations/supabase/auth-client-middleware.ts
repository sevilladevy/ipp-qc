// Client-side auth middleware - attaches Supabase token OR demo headers to server requests
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const attachAuthHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
  // Demo headers are only valid when demo mode is enabled (must match the
  // server-side requireSupabaseAuth check). A stale demo_session must never
  // hijack real authenticated requests, otherwise server functions return 401.
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
  if (DEMO_MODE) {
    const demoSessionRaw =
      typeof window !== "undefined" ? sessionStorage.getItem("demo_session") : null;
    if (demoSessionRaw) {
      try {
        const { role } = JSON.parse(demoSessionRaw);
        const demoUserId = `demo-${role}-${Date.now()}`;
        return next({
          headers: {
            "x-demo-user-id": demoUserId,
            "x-demo-user-role": role,
          },
        });
      } catch {
        /* ignore */
      }
    }
  }

  // Normal Supabase auth
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return next({
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
});
