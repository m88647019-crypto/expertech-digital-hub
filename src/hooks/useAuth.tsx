import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
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
  roleLoading: boolean;
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
    roleLoading: false,
  });

  // Prevent duplicate role fetches
  const lastFetchedUserId = useRef<string | null>(null);
  const initialSessionHandled = useRef(false);

  const fetchRoleAndPermissions = useCallback(async (userId: string) => {
    // Skip if we already fetched for this user
    if (lastFetchedUserId.current === userId) return null;
    lastFetchedUserId.current = userId;

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
    if (!isSupabaseConfigured) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    // 1. Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (initialSessionHandled.current === false) {
          // Let getSession handle the first load to avoid double-fetch
          return;
        }

        if (session?.user) {
          // Immediately set user (no lag), then fetch role in background
          setState((s) => ({
            ...s,
            user: session.user,
            session,
            loading: false,
            roleLoading: true,
          }));
          lastFetchedUserId.current = null; // Reset to allow re-fetch
          fetchRoleAndPermissions(session.user.id).then((result) => {
            if (result) {
              setState((s) => ({
                ...s,
                role: result.role,
                permissions: result.permissions,
                roleLoading: false,
              }));
            }
          });
        } else {
          lastFetchedUserId.current = null;
          setState({
            user: null,
            session: null,
            role: "user",
            permissions: {},
            loading: false,
            roleLoading: false,
          });
        }
      }
    );

    // 2. Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialSessionHandled.current = true;
      if (session?.user) {
        // Set user immediately
        setState((s) => ({
          ...s,
          user: session.user,
          session,
          loading: false,
          roleLoading: true,
        }));
        const result = await fetchRoleAndPermissions(session.user.id);
        if (result) {
          setState((s) => ({
            ...s,
            role: result.role,
            permissions: result.permissions,
            roleLoading: false,
          }));
        }
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    }).catch(() => {
      initialSessionHandled.current = true;
      setState((s) => ({ ...s, loading: false }));
    });

    return () => subscription.unsubscribe();
  }, [fetchRoleAndPermissions]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: "Backend not configured" };
    // Reset to allow fresh role fetch on sign-in
    lastFetchedUserId.current = null;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signOut = useCallback(async () => {
    lastFetchedUserId.current = null;
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
