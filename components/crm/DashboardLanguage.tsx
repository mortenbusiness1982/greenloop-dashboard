"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

export type DashboardLanguage = "en" | "es";

type DashboardLanguageContextValue = {
  language: DashboardLanguage;
  setLanguage: (language: DashboardLanguage) => void;
};

const STORAGE_KEY = "greenloop_dashboard_language";

const DashboardLanguageContext = createContext<DashboardLanguageContextValue | null>(null);

function normalizeLanguage(value: string | null): DashboardLanguage {
  return value === "es" ? "es" : "en";
}

export function DashboardLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<DashboardLanguage>(() => {
    if (typeof window === "undefined") return "en";
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return (
    <DashboardLanguageContext.Provider value={value}>
      {children}
    </DashboardLanguageContext.Provider>
  );
}

export function useDashboardLanguage() {
  const context = useContext(DashboardLanguageContext);
  if (!context) {
    return {
      language: "en" as DashboardLanguage,
      setLanguage: () => {},
    };
  }
  return context;
}
