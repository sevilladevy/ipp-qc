import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  checkRateLimit,
  clearRateLimit,
  getRateLimitInfo,
  recordFailedAttempt,
} from "@/lib/rate-limit";

export type AppRole = "inspector" | "supervisor";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

// Demo users for development/demo mode (bypass Supabase auth)
const DEMO_USERS: Record<string, { password: string; role: AppRole; name: string }> = {
  "inspector@demo.com": { password: "demo123", role: "inspector", name: "Demo Inspector" },
  "inspector@ipp.co.id": { password: "inspector123", role: "inspector", name: "Inspector QC" },
};

export function isPrivilegedUser(role: AppRole | null, email: string | null | undefined): boolean {
  return (
    role === "supervisor" ||
    (ADMIN_EMAIL ? email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() : false)
  );
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isSupervisor: boolean;
  demoMode?: boolean;
  rateLimitInfo?: {
    isLimited: boolean;
    remaining: number;
    resetIn: number;
    limit: number;
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Create a mock user for demo mode
function createMockUser(email: string, role: AppRole): User {
  return {
    id: `demo-${role}-${Date.now()}`,
    email,
    role,
    aud: "authenticated",
    created_at: new Date().toISOString(),
    app_metadata: { provider: "email", role },
    user_metadata: { full_name: DEMO_USERS[email]?.name || email },
  } as unknown as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const loading = !authReady || roleLoading;

  // Check for demo session on mount
  useEffect(() => {
    const demoSession = sessionStorage.getItem("demo_session");
    if (demoSession) {
      try {
        const { email, role: demoRole } = JSON.parse(demoSession);
        setUser(createMockUser(email, demoRole));
        setRole(demoRole);
        setDemoMode(true);
      } catch {
        sessionStorage.removeItem("demo_session");
      }
    }
  }, []);

  useEffect(() => {
    if (demoMode) {
      setAuthReady(true);
      return;
    }

    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      if (event === "SIGNED_OUT" && !newSession) {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("sb-")) localStorage.removeItem(key);
        }
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: existing } }) => {
        if (!active) return;
        setSession(existing);
        setUser(existing?.user ?? null);
      })
      .catch((error) => {
        console.error("Failed to load auth session", error);
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("sb-")) localStorage.removeItem(key);
        }
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [demoMode]);

  useEffect(() => {
    if (!authReady || demoMode) return;

    let active = true;

    if (!user) {
      setRole(null);
      return;
    }

    setRoleLoading(true);

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .order("role", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!active) return;
        if (error) {
          console.error("Failed to fetch role", error);
          setRole(null);
          return;
        }
        setRole((data?.role as AppRole | undefined) ?? "inspector");
      } catch (error) {
        if (!active) return;
        console.error("Failed to fetch role", error);
        setRole(null);
      } finally {
        if (active) setRoleLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [authReady, user, demoMode]);

  const [rateLimitInfo, setRateLimitInfo] = useState<AuthContextValue["rateLimitInfo"]>();

  async function signIn(email: string, password: string) {
    // Check rate limit before attempting login
    try {
      checkRateLimit(email);
    } catch (error) {
      const info = getRateLimitInfo(email);
      setRateLimitInfo(info);
      return { error: (error as Error).message };
    }

    // Check for demo user first (bypasses Supabase auth)
    const demoUser = DEMO_USERS[email.toLowerCase()];
    if (demoUser && demoUser.password === password) {
      // Clear rate limit on successful demo login
      clearRateLimit(email);
      setRateLimitInfo(undefined);
      setDemoMode(true);

      const mockUser = createMockUser(email.toLowerCase(), demoUser.role);
      setUser(mockUser);
      setRole(demoUser.role);

      // Store demo session
      sessionStorage.setItem(
        "demo_session",
        JSON.stringify({ email: email.toLowerCase(), role: demoUser.role }),
      );

      return { error: null };
    }

    // Normal Supabase auth
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Record failed attempt
      recordFailedAttempt(email);
      const info = getRateLimitInfo(email);
      setRateLimitInfo(info);

      // Provide more helpful message if rate limited
      if (info.isLimited) {
        return {
          error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${Math.ceil(info.resetIn / 60)} menit.`,
        };
      }
      return { error: error.message };
    }

    // Clear rate limit on successful login
    clearRateLimit(email);
    setRateLimitInfo(undefined);
    return { error: null };
  }

  async function signOut() {
    // Clear demo mode
    if (demoMode) {
      sessionStorage.removeItem("demo_session");
      setDemoMode(false);
      setUser(null);
      setRole(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signIn,
        signOut,
        isSupervisor: role === "supervisor",
        demoMode,
        rateLimitInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
