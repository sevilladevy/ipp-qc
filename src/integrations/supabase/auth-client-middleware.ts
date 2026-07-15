// Client-side auth middleware - attaches Supabase token OR demo headers to server requests
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const attachAuthHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
  try {
    // Check for demo session
    const demoSessionRaw = typeof window !== "undefined" ? sessionStorage.getItem("demo_session") : null;
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
      } catch { /* ignore */ }
    }

    // Normal Supabase auth
    const { data: { session } } = await supabase.auth.getSession();
    return next({
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
  } catch (e) {
    console.error("Auth attach error:", e);
    return next({});
  }
});
