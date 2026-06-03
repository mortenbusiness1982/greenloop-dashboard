"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
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
    <div className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border bg-[var(--gl-coral-soft)] border-[var(--gl-coral)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]"
        >
          {error}
        </div>
      ) : null}

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gl-green)]">
          Brand workspace
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--gl-ink)] md:text-4xl">
          Product catalog
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)] md:text-base">
          Manage the barcodes and product names assigned to {brandName}.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-6 py-8 text-base text-[var(--gl-ink-muted)]">
          Loading brand workspace...
        </div>
      ) : (
        <BrandProductsWorkspace />
      )}
    </div>
  );
}
