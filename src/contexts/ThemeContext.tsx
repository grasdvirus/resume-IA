
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getInitialStoredTheme = (): Theme => {
    if (typeof window !== 'undefined') {
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme === "light" || storedTheme === "dark") {
            return storedTheme;
        }
        // Future: Check system preference
        // const mql = window.matchMedia('(prefers-color-scheme: dark)');
        // if (mql.matches) return 'dark';
    }
    return "light"; // Default theme
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialStoredTheme);

  const applyThemeToDocument = useCallback((newTheme: Theme) => {
    if (typeof window !== 'undefined') {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(newTheme);
        localStorage.setItem("theme", newTheme);
    }
  }, []);

  useEffect(() => {
    // This effect ensures the class and localStorage are updated whenever the theme state changes.
    // The initial theme is set by the inline script in RootLayout for immediate effect.
    // This effect primarily handles subsequent changes.
    applyThemeToDocument(theme);
  }, [theme, applyThemeToDocument]);
  
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };
  
  useEffect(() => {
    // Sync with localStorage on initial mount if script didn't run or for consistency
    const currentStoredTheme = getInitialStoredTheme();
    if (theme !== currentStoredTheme) {
        setThemeState(currentStoredTheme);
    }
    // Listener for changes in localStorage from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'theme' && event.newValue && (event.newValue === 'light' || event.newValue === 'dark')) {
        setThemeState(event.newValue as Theme);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme]); // Rerun if theme state changes to re-sync if needed


  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
