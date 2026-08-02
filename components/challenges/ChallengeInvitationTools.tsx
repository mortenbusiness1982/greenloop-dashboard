"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import { Copy, Download, Link as LinkIcon, QrCode, Share2, Trash2, Upload } from "lucide-react";
import Papa from "papaparse";
import QRCode from "qrcode";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type InvitationLink = {
  id: string;
  label?: string | null;
  expiresAt: string;
  maxUses?: number | null;
  useCount: number;
  revokedAt?: string | null;
  active: boolean;
  shareUrl?: string;
  deepLink?: string;
};

type CsvRow = Record<string, string | undefined>;

function findValue(row: CsvRow, names: string[]) {
  const normalized = Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/[ _-]+/g, ""), value] as const);
  for (const name of names) {
    const match = normalized.find(([key]) => key === name);
    if (match?.[1]) return String(match[1]).trim();
  }
  return "";
}

export function ChallengeInvitationTools({ challengeId, basePath }: { challengeId: string; basePath: string }) {
  const [links, setLinks] = useState<InvitationLink[]>([]);
  const [createdLink, setCreatedLink] = useState<InvitationLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [maxUses, setMaxUses] = useState("");
  const [csvName, setCsvName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadLinks() {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<{ links: InvitationLink[] }>(`${basePath}/${challengeId}/invitation-links`, { token });
      setLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invitation links");
    }
  }

  useEffect(() => {
    setCreatedLink(null);
    setQrDataUrl("");
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, basePath]);

  async function createLink() {
    const token = getToken();
    if (!token) return;
    setBusy("create-link");
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{ link: InvitationLink }>(`${basePath}/${challengeId}/invitation-links`, {
        token,
        method: "POST",
        body: {
          label: label.trim() || null,
          expiresInDays: Math.max(1, Number(expiresInDays) || 30),
          maxUses: maxUses.trim() ? Math.max(1, Number(maxUses)) : null,
        },
      });
      setCreatedLink(data.link);
      setQrDataUrl(await QRCode.toDataURL(String(data.link.shareUrl), { width: 420, margin: 2, color: { dark: "#103A2B", light: "#FFFFFF" } }));
      setMessage("Invitation link created. Copy it now; the secure token is only shown once.");
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invitation link");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!createdLink?.shareUrl) return;
    await navigator.clipboard.writeText(createdLink.shareUrl);
    setMessage("Invitation link copied.");
  }

  async function shareLink() {
    if (!createdLink?.shareUrl) return;
    if (navigator.share) {
      await navigator.share({ title: "Join my GreenLoop challenge", url: createdLink.shareUrl });
      return;
    }
    await copyLink();
  }

  async function revokeLink(linkId: string) {
    const token = getToken();
    if (!token) return;
    setBusy(`revoke-${linkId}`);
    setError(null);
    try {
      await apiFetch(`${basePath}/${challengeId}/invitation-links/${linkId}`, { token, method: "DELETE" });
      if (createdLink?.id === linkId) {
        setCreatedLink(null);
        setQrDataUrl("");
      }
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke invitation link");
    } finally {
      setBusy(null);
    }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCsvName(file.name);
    setBusy("csv");
    setError(null);
    setMessage(null);
    try {
      const parsed = Papa.parse<CsvRow>(await file.text(), { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim() });
      if (parsed.errors.length) throw new Error(parsed.errors[0].message);
      const byEmail = new Map<string, { email: string; displayName?: string }>();
      for (const row of parsed.data) {
        const email = findValue(row, ["email", "emailaddress", "correo", "correoelectronico"]).toLowerCase();
        if (!email || !email.includes("@")) continue;
        const displayName = findValue(row, ["displayname", "name", "nombre"]);
        byEmail.set(email, { email, ...(displayName ? { displayName } : {}) });
      }
      const participants = Array.from(byEmail.values());
      if (!participants.length) throw new Error("No valid email column was found. Use email and optionally display_name.");
      if (participants.length > 500) throw new Error("A single CSV can contain up to 500 participants.");
      const token = getToken();
      if (!token) throw new Error("Please sign in again.");
      const result = await apiFetch<{ invited?: unknown[] }>(`${basePath}/${challengeId}/invitations`, {
        token,
        method: "POST",
        body: { source: "uploaded", participants },
      });
      setMessage(`${result.invited?.length || participants.length} participants imported from ${file.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import CSV");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] p-4">
        <div className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-[var(--gl-green)]" /><h3 className="font-semibold text-[var(--gl-ink)]">Invitation link and QR</h3></div>
        <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">Create a revocable link that approves participants when they join.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label (optional)" className="rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm" />
          <input value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)} type="number" min="1" max="365" aria-label="Expiry in days" className="rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm" />
          <input value={maxUses} onChange={(event) => setMaxUses(event.target.value)} type="number" min="1" placeholder="Unlimited uses" aria-label="Maximum uses" className="rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={createLink} disabled={busy === "create-link"} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><QrCode className="h-4 w-4" />{busy === "create-link" ? "Creating..." : "Create invitation"}</button>
        {createdLink?.shareUrl ? (
          <div className="mt-4 rounded-xl border border-[var(--gl-hairline)] bg-white p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {qrDataUrl ? <Image src={qrDataUrl} alt="Challenge invitation QR code" width={132} height={132} unoptimized className="rounded-lg border border-[var(--gl-hairline)]" /> : null}
              <div className="min-w-0 flex-1">
                <p className="break-all text-xs text-[var(--gl-ink-muted)]">{createdLink.shareUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm font-semibold"><Copy className="h-4 w-4" /> Copy</button>
                  <button type="button" onClick={shareLink} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm font-semibold"><Share2 className="h-4 w-4" /> Share</button>
                  {qrDataUrl ? <a href={qrDataUrl} download={`greenloop-challenge-${challengeId}-qr.png`} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm font-semibold"><Download className="h-4 w-4" /> QR</a> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {links.length ? <div className="mt-4 space-y-2">{links.map((link) => <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm"><div><p className="font-semibold text-[var(--gl-ink)]">{link.label || "Invitation link"}</p><p className="text-xs text-[var(--gl-ink-muted)]">{link.useCount}{link.maxUses ? ` / ${link.maxUses}` : ""} uses · expires {new Date(link.expiresAt).toLocaleDateString()} · {link.active ? "active" : "inactive"}</p></div>{link.active ? <button type="button" onClick={() => revokeLink(link.id)} disabled={busy === `revoke-${link.id}`} title="Revoke link" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}</div>)}</div> : null}
      </div>

      <div className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] p-4">
        <div className="flex items-center gap-2"><Upload className="h-4 w-4 text-[var(--gl-green)]" /><h3 className="font-semibold text-[var(--gl-ink)]">Upload participant CSV</h3></div>
        <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">Headers: <strong>email</strong> and optional <strong>display_name</strong>. Up to 500 people per file.</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink)] hover:bg-[var(--gl-paper)]">
          <Upload className="h-4 w-4" /> {busy === "csv" ? "Importing..." : "Choose CSV file"}
          <input type="file" accept=".csv,text/csv" onChange={importCsv} disabled={busy === "csv"} className="sr-only" />
        </label>
        {csvName ? <p className="mt-2 text-xs text-[var(--gl-ink-muted)]">{csvName}</p> : null}
        <a href="data:text/csv;charset=utf-8,email%2Cdisplay_name%0Aname%40example.com%2CGreen%20Turtle" download="greenloop-challenge-participants-template.csv" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gl-green)]"><Download className="h-4 w-4" /> Download template</a>
      </div>
      {message ? <p className="lg:col-span-2 text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="lg:col-span-2 text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
