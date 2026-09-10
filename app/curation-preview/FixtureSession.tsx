"use client";
import { useEffect, useState } from "react";
import { setToken } from "@/lib/auth";
import { AdminRecyclingIntelligenceWorkspace } from "@/components/admin/AdminRecyclingIntelligenceWorkspace";
export function FixtureSession() {
  const [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (location.hostname !== "127.0.0.1") throw Error("Local preview requires 127.0.0.1");
      return fetch("http://127.0.0.1:8096/fixture-session", {signal:controller.signal,cache:"no-store"});
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
    <AdminRecyclingIntelligenceWorkspace />
  ) : (
    <p role={error ? "alert" : undefined}>
      {error || "Connecting to local verification data…"}
    </p>
  );
}
