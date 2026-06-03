"use client";

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type BrandProduct = {
  id: string;
  barcode: string;
  name: string;
  source: string;
  verificationStatus: string;
  updatedAt: string;
  createdAt: string;
};

type BrandProductsResponse = {
  ok: true;
  products: BrandProduct[];
};

type BrandProductImportSummary = {
  added: number;
  updated: number;
  needsReview: number;
  skipped: number;
};

const CSV_NULL = String.fromCharCode(0);

function normalizeCsvText(value: string) {
  const withoutBom = value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
  return withoutBom.split(CSV_NULL).join("");
}

function detectCsvDelimiter(headerLine: string) {
  const candidates = [",", ";", "\t"] as const;
  let best = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function parseDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(normalizeCsvText(current).trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(normalizeCsvText(current).trim());
  return values;
}

function parseCsvColumns(line: string, delimiter: string) {
  const firstPass = parseDelimitedLine(line, delimiter);
  if (firstPass.length === 1 && firstPass[0]?.includes(delimiter)) {
    return parseDelimitedLine(firstPass[0], delimiter);
  }
  return firstPass;
}

function findCsvHeaderIndex(lines: string[]) {
  return lines.findIndex((line) => {
    const normalized = normalizeCsvText(line).toLowerCase().replace(/\s+/g, "").trim();
    if (!normalized || normalized.startsWith("sep=")) {
      return false;
    }
    return normalized.includes("barcode") && normalized.includes("name");
  });
}

async function readCsvFile(file: File) {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    throw new Error("Please export the spreadsheet as a CSV file before uploading");
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const hasUtf16LEBom = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe;
  const hasUtf16BEBom = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff;

  let text = "";
  if (hasUtf16LEBom) {
    text = new TextDecoder("utf-16le").decode(bytes);
  } else if (hasUtf16BEBom) {
    text = new TextDecoder("utf-16be").decode(bytes);
  } else {
    text = new TextDecoder("utf-8").decode(bytes);
    if (!hasUtf8Bom && text.includes(CSV_NULL)) {
      text = new TextDecoder("utf-16le").decode(bytes);
    }
  }

  const normalized = normalizeCsvText(text);
  const rawLines = normalized
    .split(/\r?\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeCsvText(line).replace(/^"(.*)"$/, "$1"));

  const headerIndex = findCsvHeaderIndex(rawLines);
  if (headerIndex === -1) {
    throw new Error("CSV must include a barcode column");
  }

  const delimiter = detectCsvDelimiter(rawLines[headerIndex]);
  const headerColumns = parseCsvColumns(rawLines[headerIndex], delimiter).map((column) =>
    column.toLowerCase().replace(/\s+/g, "").trim()
  );

  const barcodeIndex = headerColumns.indexOf("barcode");
  const nameIndex = headerColumns.indexOf("name");

  if (barcodeIndex === -1) {
    throw new Error("CSV must include a barcode column");
  }

  const cleanedRows = rawLines
    .slice(headerIndex + 1)
    .map((line) => parseCsvColumns(line, delimiter))
    .map((columns) => ({
      barcode: (columns[barcodeIndex] || "").replace(/[^\d]/g, "").trim(),
      name: nameIndex >= 0 ? (columns[nameIndex] || "").trim() : "",
    }))
    .filter((item) => item.barcode);

  if (!cleanedRows.length) {
    throw new Error("No valid product rows were found in the uploaded CSV");
  }

  return ["barcode,name", ...cleanedRows.map((item) => `${item.barcode},${item.name}`)].join("\n");
}

export function BrandProductsWorkspace() {
  const router = useRouter();
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null);
  const [productForm, setProductForm] = useState({ barcode: "", name: "" });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [importingProducts, setImportingProducts] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<BrandProductImportSummary | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
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
        const productsResult = await apiFetch("/brand/products", { token });
        setProducts(((productsResult as BrandProductsResponse)?.products ?? []) as BrandProduct[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load brand products");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function upsertProduct(product: BrandProduct) {
    setProducts((current) =>
      [product, ...current.filter((item) => item.id !== product.id)].sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  function openCreateProductModal() {
    setEditingProduct(null);
    setProductError(null);
    setProductForm({ barcode: "", name: "" });
    setShowProductModal(true);
  }

  function openEditProductModal(product: BrandProduct) {
    setEditingProduct(product);
    setProductError(null);
    setProductForm({ barcode: product.barcode, name: product.name });
    setShowProductModal(true);
  }

  function openImportModal() {
    setImportError(null);
    setImportSummary(null);
    setShowImportModal(true);
  }

  async function handleCsvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setImportingProducts(true);
      setImportError(null);
      setImportSummary(null);
      const csv = await readCsvFile(file);
      const result = await apiFetch("/brand/products/import", {
        token,
        method: "POST",
        body: { csv },
      });

      const summary = (result as { summary?: BrandProductImportSummary }).summary;
      if (summary) {
        setImportSummary(summary);
      }

      const refreshed = await apiFetch("/brand/products", { token });
      setProducts(((refreshed as BrandProductsResponse)?.products ?? []) as BrandProduct[]);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Unable to import products");
    } finally {
      setImportingProducts(false);
      if (event.target) event.target.value = "";
    }
  }

  async function handleSaveProduct() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setProductSaving(true);
      setProductError(null);
      const result = await apiFetch(editingProduct ? `/brand/products/${editingProduct.id}` : "/brand/products", {
        token,
        method: editingProduct ? "PATCH" : "POST",
        body: {
          barcode: productForm.barcode.trim(),
          name: productForm.name.trim(),
          ...(editingProduct ? { verificationStatus: editingProduct.verificationStatus } : {}),
        },
      });

      const saved = (result as { product?: BrandProduct })?.product;
      if (saved) upsertProduct(saved);
      setProductForm({ barcode: "", name: "" });
      setEditingProduct(null);
      setShowProductModal(false);
    } catch (err) {
      setProductError(err instanceof Error ? err.message : "Unable to save product");
    } finally {
      setProductSaving(false);
    }
  }

  async function handleMarkVerified(product: BrandProduct) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const result = await apiFetch(`/brand/products/${product.id}`, {
        token,
        method: "PATCH",
        body: { verificationStatus: "verified" },
      });
      const saved = (result as { product?: BrandProduct })?.product;
      if (saved) upsertProduct(saved);
    } catch (err) {
      setProductError(err instanceof Error ? err.message : "Unable to update product");
    }
  }

  async function handleDeleteProduct(product: BrandProduct) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const confirmed = window.confirm(`Remove ${product.name} from your brand product catalog?`);
    if (!confirmed) return;

    try {
      setProductError(null);
      await apiFetch(`/brand/products/${product.id}`, {
        token,
        method: "DELETE",
      });
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setProductError(err instanceof Error ? err.message : "Unable to remove product");
    }
  }

  function handleDownloadProductCatalog() {
    const escapeCsv = (value: string) => {
      const normalized = String(value ?? "");
      if (/[",\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, "\"\"")}"`;
      }
      return normalized;
    };

    const rows = [
      ["barcode", "name", "status", "source"],
      ...products.map((product) => [
        product.barcode,
        product.name,
        product.verificationStatus === "verified" ? "Verified" : "Needs review",
        product.source,
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `brand-product-catalog-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleProducts = products.slice(0, 20);
  const verifiedProductCount = products.filter((product) => product.verificationStatus === "verified").length;
  const needsReviewProductCount = products.filter((product) => product.verificationStatus !== "verified").length;

  if (loading) {
    return <EmptyCopy>Loading brand products...</EmptyCopy>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]">
        {error}
      </div>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-[var(--gl-ink-muted)]">
            These products define what counts toward your brand dashboard. Add missing barcodes here to keep reporting accurate.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={handleDownloadProductCatalog} icon={<Download size={15} />}>Download catalog</ActionButton>
            <ActionButton onClick={openImportModal} icon={<Upload size={15} />}>Upload CSV</ActionButton>
            <button
              onClick={openCreateProductModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--gl-green-deep)]"
            >
              <Plus size={15} />
              Add Product
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Products" value={String(products.length)} />
          <MiniMetric label="Verified" value={String(verifiedProductCount)} />
          <MiniMetric label="Need review" value={String(needsReviewProductCount)} />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--gl-hairline)]">
          <table className="min-w-[680px] w-full text-left text-sm">
            <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
              <tr className="border-b border-[var(--gl-hairline)]">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Barcode</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--gl-ink-muted)]">
                    No products added yet. Add your first barcode to start controlling what counts for this brand.
                  </td>
                </tr>
              ) : (
                visibleProducts.map((product) => (
                  <tr key={product.id} className="border-b border-[var(--gl-hairline)] last:border-b-0">
                    <td className="px-4 py-2.5 font-medium text-[var(--gl-ink)]">{product.name}</td>
                    <td className="px-4 py-2.5 text-[var(--gl-ink-muted)]">{product.barcode}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={product.verificationStatus} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
                        <SmallButton onClick={() => openEditProductModal(product)}>Edit</SmallButton>
                        {product.verificationStatus !== "verified" ? (
                          <SmallButton onClick={() => handleMarkVerified(product)} kind="success">Mark verified</SmallButton>
                        ) : null}
                        <SmallButton onClick={() => handleDeleteProduct(product)} kind="danger">Delete</SmallButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {products.length > visibleProducts.length ? (
          <p className="mt-3 text-xs text-[var(--gl-ink-faint)]">
            Showing the first {visibleProducts.length} products for now.
          </p>
        ) : null}
      </section>

      {showImportModal ? (
        <ModalShell>
          <h3 className="text-xl font-semibold text-[var(--gl-ink)]">Upload Products CSV</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--gl-ink-muted)]">
            Upload a simple CSV with <span className="font-semibold text-[var(--gl-ink)]">barcode,name</span> so we can assign products to your brand in bulk.
          </p>

          <div className="mt-5 rounded-xl border border-dashed border-[var(--gl-hairline-strong)] bg-[var(--gl-card-cream)] p-4">
            <p className="text-sm font-semibold text-[var(--gl-ink)]">Expected format</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--gl-paper)] p-3 text-xs text-[var(--gl-ink-muted)]">barcode,name{"\n"}5449000000996,Coca-Cola Zero 330ml{"\n"}5449000131805,Fanta Orange 330ml</pre>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvSelected}
              className="mt-4 block w-full text-sm text-[var(--gl-ink-soft)]"
            />
          </div>

          {importError ? (
            <div className="mt-4 rounded-lg border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-4 py-2.5 text-sm text-[var(--gl-coral-ink)]">
              {importError}
            </div>
          ) : null}

          {importSummary ? (
            <div className="mt-4 rounded-xl border border-[var(--gl-green-soft)] bg-[var(--gl-green-soft)] p-4">
              <p className="text-base font-semibold text-[var(--gl-green-deep)]">Import complete</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniMetric label="Added" value={String(importSummary.added)} />
                <MiniMetric label="Updated" value={String(importSummary.updated)} />
                <MiniMetric label="Need review" value={String(importSummary.needsReview)} />
                <MiniMetric label="Skipped" value={String(importSummary.skipped)} />
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportError(null);
                setImportSummary(null);
              }}
              className="rounded-lg border border-[var(--gl-hairline)] px-5 py-2.5 text-sm font-medium text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
            >
              {importingProducts ? "Uploading..." : importSummary ? "Close" : "Cancel"}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {showProductModal ? (
        <ModalShell>
          <h3 className="text-xl font-semibold text-[var(--gl-ink)]">{editingProduct ? "Edit Product" : "Add Product"}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--gl-ink-muted)]">
            Add a barcode and product name to assign it to your brand.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--gl-ink-soft)]">Barcode</span>
              <input
                value={productForm.barcode}
                onChange={(event) => setProductForm((current) => ({ ...current, barcode: event.target.value }))}
                inputMode="numeric"
                placeholder="5449000000996"
                className="w-full rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2.5 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--gl-ink-soft)]">Product name</span>
              <input
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Coca-Cola Zero 330ml"
                className="w-full rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2.5 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
              />
            </label>
          </div>

          {productError ? (
            <div className="mt-4 rounded-lg border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-4 py-2.5 text-sm text-[var(--gl-coral-ink)]">
              {productError}
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSaveProduct}
              disabled={productSaving}
              className="flex-1 rounded-lg bg-[var(--gl-green)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gl-green-deep)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {productSaving ? "Saving..." : editingProduct ? "Save Changes" : "Save Product"}
            </button>
            <button
              onClick={() => {
                setShowProductModal(false);
                setProductError(null);
              }}
              className="rounded-lg border border-[var(--gl-hairline)] px-5 py-2.5 text-sm font-medium text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
            >
              Cancel
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}

function ActionButton({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
    >
      {icon}
      {children}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] px-4 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const verified = status === "verified";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        verified
          ? "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
          : "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"
      }`}
    >
      {verified ? "Verified" : "Needs review"}
    </span>
  );
}

function SmallButton({ children, onClick, kind = "default" }: { children: ReactNode; onClick: () => void; kind?: "default" | "success" | "danger" }) {
  const kindClasses = {
    default: "border-[var(--gl-hairline)] bg-[var(--gl-paper)] text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]",
    success: "border-transparent bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)] hover:opacity-90",
    danger: "border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] text-[var(--gl-coral-ink)] hover:opacity-90",
  } as const;

  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${kindClasses[kind]}`}
    >
      {children}
    </button>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-[var(--gl-ink-muted)]">{children}</p>;
}

function ModalShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--gl-green-forest)]/45 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
