import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { SESSION_ONLY_KEY, resetSupabaseClient, supabase } from "@/integrations/supabase/client";

export type AppRole = "inspector" | "supervisor";

const REMEMBERED_EMAIL_KEY = "ipp_remembered_email";

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
}

function setRememberedEmail(email: string, remember: boolean) {
  if (typeof window === "undefined") return;
  if (remember && email) {
    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  } else {
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }
}

export function isSessionOnly(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SESSION_ONLY_KEY) === "1";
}

export function setSessionOnlyMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) {
    window.sessionStorage.setItem(SESSION_ONLY_KEY, "1");
  } else {
    window.sessionStorage.removeItem(SESSION_ONLY_KEY);
  }
}

function supabaseTokenKey(source: Storage): string | null {
  for (let i = 0; i < source.length; i++) {
    const key = source.key(i);
    if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) return key;
  }
  return null;
}

/** Move the persisted session so it matches the requested persistence,
 * then reload so the Supabase client boots with the right storage. */
function migrateAuthStorage(toSessionOnly: boolean) {
  if (typeof window === "undefined") return;
  const from = toSessionOnly ? window.localStorage : window.sessionStorage;
  const to = toSessionOnly ? window.sessionStorage : window.localStorage;
  const tokenKey = supabaseTokenKey(from);
  if (tokenKey) {
    const value = from.getItem(tokenKey);
    if (value) to.setItem(tokenKey, value);
    from.removeItem(tokenKey);
  }
  // Default session storage for first-time visitors
  if (!toSessionOnly && !from) {
    window.sessionStorage.setItem(SESSION_ONLY_KEY, "1");
  } else if (toSessionOnly) {
    window.sessionStorage.setItem(SESSION_ONLY_KEY, "1");
  } else {
    window.sessionStorage.removeItem(SESSION_ONLY_KEY);
  }
  window.location.reload();
}

function clearPersistedAuth() {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (key.startsWith("sb-")) storage.removeItem(key);
    }
  }
  window.sessionStorage.removeItem("demo_session");
}

export function isPrivilegedUser(role: AppRole | null): boolean {
  return role === "supervisor";
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    remember?: boolean,
  ) => Promise<{ error: string | null; reloaded?: boolean }>;
  signOut: () => Promise<void>;
  isSupervisor: boolean;
  /** Switch auth persistence without a page reload (login page toggle). */
  switchAuthStorage: (sessionOnly: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [storageMode, setStorageMode] = useState<"local" | "session">(() =>
    typeof window !== "undefined" && isSessionOnly() ? "session" : "local",
  );

  // Reboot auth on the newly selected storage without a page reload.
  // Only used pre-login (no active session to migrate).
  const switchAuthStorage = useCallback((sessionOnly: boolean) => {
    setSessionOnlyMode(sessionOnly);
    resetSupabaseClient();
    setSession(null);
    setUser(null);
    setRole(null);
    setAuthReady(false);
    setStorageMode(sessionOnly ? "session" : "local");
  }, []);
  const loading = !authReady || roleLoading;

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;

      if (event === "TOKEN_REFRESHED") {
        // Token successfully refreshed
        setSession(newSession);
        setUser(newSession?.user ?? null);
        return;
      }

      if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Clear persisted auth from both storages (remember-me aware)
        clearPersistedAuth();
      }

      if (event === "SIGNED_OUT" && !newSession) {
        // User signed out - clear state and redirect to login
        setSession(null);
        setUser(null);
        setRole(null);
        // Redirect to login if not already there
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login?expired=true";
        }
        return;
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
        clearPersistedAuth();
        setSession(null);
        setUser(null);
        setRole(null);
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [storageMode]);

  useEffect(() => {
    if (!authReady) return;

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
  }, [authReady, user]);

  async function signIn(email: string, password: string, remember = true) {
    // Normal Supabase auth only - no client-side bypass
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    // Ensure a leftover demo session never shadows the real session
    sessionStorage.removeItem("demo_session");
    setRememberedEmail(email.toLowerCase(), remember);

    // Reconcile session persistence with the remember choice. A reload
    // is required so the Supabase client boots with the right storage.
    if (remember === isSessionOnly()) {
      migrateAuthStorage(!remember);
      return { error: null, reloaded: true };
    }
    return { error: null };
  }

  async function signOut() {
    // A fresh login starts with default (persistent) storage
    switchAuthStorage(false);

    try {
      // Try to refresh session first, then sign out
      const { error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        // If refresh fails (session already expired), just clear local state
        console.warn("Session already expired, clearing local state");
      } else {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Sign out failed", error);
    } finally {
      // Always clear local state regardless of server response
      clearPersistedAuth();
      setSession(null);
      setUser(null);
      setRole(null);
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
        switchAuthStorage,
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
