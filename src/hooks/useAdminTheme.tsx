import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "admin-theme";
type Theme = "light" | "dark";

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return "light";
}

/**
 * Admin-scoped theme. Toggles the `dark` class on <html> only while the
 * admin panel is mounted; cleans up on unmount so the public site keeps
 * its own (light) appearance.
 */
export function useAdminTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    return () => {
      // when admin unmounts, restore light for the public site
      root.classList.remove("dark");
    };
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  return { theme, setTheme, toggle };
}
