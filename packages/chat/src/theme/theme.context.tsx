"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ChatTheme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ChatTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ChatTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "sarchauhan-chat-theme";

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const resolveTheme = (theme: ChatTheme): "light" | "dark" =>
  theme === "system" ? getSystemTheme() : theme;

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ChatTheme;
  theme?: ChatTheme;
  onThemeChange?: (theme: ChatTheme) => void;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  theme: controlledTheme,
  onThemeChange,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [uncontrolledTheme, setUncontrolledTheme] = useState<ChatTheme>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return defaultTheme;
  });

  const theme = controlledTheme ?? uncontrolledTheme;
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    resolveTheme(theme),
  );

  useEffect(() => {
    setResolvedTheme(resolveTheme(theme));

    if (theme !== "system" || typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(getSystemTheme());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: ChatTheme) => {
      onThemeChange?.(next);

      if (controlledTheme === undefined) {
        setUncontrolledTheme(next);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, next);
        }
      }
    },
    [controlledTheme, onThemeChange, storageKey],
  );

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme, setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
