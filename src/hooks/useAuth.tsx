import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "cashier" | "user";

export interface Permissions {
  orders?: boolean;
  files?: boolean;
  delete_orders?: boolean;
  analytics?: boolean;
  settings?: boolean;
  [key: string]: boolean | undefined;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole;
  permissions: Permissions;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: "user",
    permissions: {},
    loading: true,
  });

  const fetchRoleAndPermissions = useCallback(async (userId: string) => {
    try {
      const [roleRes, permRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
        supabase.from("permissions").select("permissions").eq("user_id", userId).single(),
      ]);

      return {
        role: (roleRes.data?.role as AppRole) || "user",
        permissions: (permRes.data?.permissions as Permissions) || {},
      };
    } catch {
      return { role: "user" as AppRole, permissions: {} };
    }
  }, []);

  useEffect(() => {
    // If Supabase isn't configured, skip auth entirely
    if (!isSupabaseConfigured) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { role, permissions } = await fetchRoleAndPermissions(session.user.id);
          setState({ user: session.user, session, role, permissions, loading: false });
        } else {
          setState({ user: null, session: null, role: "user", permissions: {}, loading: false });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { role, permissions } = await fetchRoleAndPermissions(session.user.id);
        setState({ user: session.user, session, role, permissions, loading: false });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    }).catch(() => {
      setState((s) => ({ ...s, loading: false }));
    });

    return () => subscription.unsubscribe();
  }, [fetchRoleAndPermissions]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: "Backend not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const hasPermission = useCallback(
    (key: string) => state.role === "admin" || !!state.permissions[key],
    [state.role, state.permissions]
  );

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
