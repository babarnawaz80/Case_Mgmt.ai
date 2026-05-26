// ThemeContext — persistent light/dark mode
// Reads from localStorage("icm.theme"), applies "dark" class to <html>,
// exposes toggle from anywhere in the app.
//
// Key design decisions:
// 1. applyTheme runs immediately (not in useEffect) on first render to prevent
//    a flash of the wrong theme on page load.
// 2. The "dark" class is the only thing needed — all CSS vars live in the
//    stylesheet under html.dark { ... } inside @layer base.
// 3. We deliberately do NOT touch --icm-accent inline styles here; that's
//    handled by OrgSettingsContext using --icm-accent-brand.

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("icm.theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  // Default: light — let users opt-in to dark mode via the menu toggle
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = getStoredTheme();
    // Apply synchronously so there's no flash of wrong theme before React renders
    applyTheme(t);
    return t;
  });

  // Re-apply whenever theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("icm.theme", t); } catch {}
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
