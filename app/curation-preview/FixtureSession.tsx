"use client";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";
import { setToken } from "@/lib/auth";
import { AdminRecyclingIntelligenceWorkspace } from "@/components/admin/AdminRecyclingIntelligenceWorkspace";
export function FixtureSession() {
  const {language,setLanguage}=useDashboardLanguage();
  const [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (location.hostname !== "127.0.0.1") throw Error("Local preview requires 127.0.0.1");
      return fetch(API_BASE+"/fixture-session", {signal:controller.signal,cache:"no-store"});
    })
      .then((r) => {
        if (!r.ok) throw Error("Local fixture unavailable");
        return r.json();
      })
      .then((data) => {
        if (!data.localFixture || typeof data.token !== "string")
          throw Error("Invalid local fixture");
        if (!controller.signal.aborted) {
          setToken(data.token);
          setReady(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Start the isolated local verification API first.");
      });
    return () => controller.abort();
  }, []);
  return ready ? (
    <><label className="mb-3 block text-sm">Language <select aria-label="Language" value={language} onChange={e=>setLanguage(e.target.value as "en"|"es")}><option value="en">English</option><option value="es">Español</option></select></label><AdminRecyclingIntelligenceWorkspace /></>
  ) : (
    <p role={error ? "alert" : undefined}>
      {error || "Connecting to local verification data…"}
    </p>
  );
}
