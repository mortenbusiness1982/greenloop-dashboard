"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";
import { BrandProductsWorkspace } from "@/components/brand/BrandProductsWorkspace";

type BrandMetaResponse = {
  ok: true;
  brand: {
    id: string;
    name: string;
    initials: string;
    color?: string;
  };
};

export default function BrandProductsPage() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const [brandMeta, setBrandMeta] = useState<BrandMetaResponse["brand"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const metaResult = await apiFetch("/brand/meta", { token });
        setBrandMeta((metaResult as BrandMetaResponse)?.brand ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load brand information");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const brandName = brandMeta?.name ?? "Your brand";

  return (
    <div className="min-w-0 space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border bg-[var(--gl-coral-soft)] border-[var(--gl-coral)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]"
        >
          {error}
        </div>
      ) : null}

      <WorkspaceHeader>
        <p className="sr-only">
          {language === "es" ? "Espacio de marca" : "Brand workspace"}
        </p>
        <h1 className="text-2xl font-semibold text-[var(--gl-ink)]">
          {language === "es" ? "Catálogo de productos" : "Product catalog"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)] md:text-base">
          {brandName}
        </p>
      </WorkspaceHeader>

      {loading ? (
        <div className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-6 py-8 text-base text-[var(--gl-ink-muted)]">
          {language === "es" ? "Cargando espacio de marca..." : "Loading brand workspace..."}
        </div>
      ) : (
        <BrandProductsWorkspace />
      )}
    </div>
  );
}
