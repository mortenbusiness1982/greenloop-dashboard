"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Megaphone, Plus, Trash2 } from "lucide-react";

type Product = { id: string; name: string; barcode: string };
type Challenge = {
  id: string; title: string; review_status: string; sponsor_review_notes?: string | null;
  participants: number; collective_progress: number; required_count: number;
};

const field = "mt-1 w-full rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)]";

export function SponsoredChallengeManager({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Challenge[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [targetKind, setTargetKind] = useState("brand");
  const [selected, setSelected] = useState<string[]>([]);
  const [rewardType, setRewardType] = useState("link_only");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const result = await apiFetch<{ challenges?: Challenge[] }>("/brand/challenges", { token });
    setItems(result.challenges || []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage(null);
    try {
      await apiFetch("/brand/challenges", {
        token, method: "POST", body: {
          title: data.get("title"), description: data.get("description"),
          heroImageUrl: data.get("heroImageUrl") || null,
          visibility: data.get("visibility"), targetKind,
          eligibleProductIds: selected,
          requiredCount: Number(data.get("requiredCount")),
          collectiveGoalCount: data.get("collectiveGoalCount") ? Number(data.get("collectiveGoalCount")) : null,
          eligibleCountryCodes: String(data.get("countries") || "").split(",").map(v => v.trim()).filter(Boolean),
          startsAt: new Date(String(data.get("startsAt"))).toISOString(),
          endsAt: new Date(String(data.get("endsAt"))).toISOString(),
          reward: {
            title: data.get("rewardTitle"), description: data.get("rewardDescription"),
            estimatedSavingsText: data.get("savings"), redemptionType: rewardType,
            affiliateUrl: data.get("affiliateUrl"), promoCode: data.get("promoCode") || undefined,
            unlockDurationHours: Number(data.get("duration") || 72), instructions: data.get("instructions"),
          },
        },
      });
      event.currentTarget.reset(); setSelected([]); setOpen(false);
      setMessage("Submitted for GreenLoop review."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit challenge"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    const token = getToken(); if (!token) return;
    await apiFetch(`/brand/challenges/${id}`, { token, method: "DELETE" });
    await load();
  }

  return <section className="space-y-4">
    <div className="flex items-center justify-between border-b border-[var(--gl-hairline)] pb-4">
      <div><h2 className="text-xl font-bold text-[var(--gl-ink)]">Sponsored challenges</h2><p className="text-sm text-[var(--gl-ink-muted)]">Invite recyclers to complete an earned brand journey.</p></div>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 rounded-lg bg-[var(--gl-green)] px-4 py-2 font-semibold text-white"><Plus size={18}/>Create challenge</button>
    </div>
    {message ? <p className="rounded-lg bg-[var(--gl-card-cream)] px-4 py-3 text-sm text-[var(--gl-ink)]">{message}</p> : null}
    {open ? <form onSubmit={submit} className="space-y-5 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <div className="flex items-center gap-2"><Megaphone className="text-[var(--gl-green)]"/><h3 className="text-lg font-bold">Campaign and benefit</h3></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Challenge title<input name="title" required className={field}/></label>
        <label className="text-sm font-semibold">Banner image URL<input name="heroImageUrl" type="url" className={field}/></label>
        <label className="text-sm font-semibold md:col-span-2">Description<textarea name="description" required rows={3} className={field}/></label>
        <label className="text-sm font-semibold">Access<select name="visibility" className={field}><option value="public">Public</option><option value="private">Private/invite only</option></select></label>
        <label className="text-sm font-semibold">Eligible recycling<select value={targetKind} onChange={e => setTargetKind(e.target.value)} className={field}><option value="any">Any product</option><option value="brand">Any of our products</option><option value="selected_products">Selected products</option></select></label>
        <label className="text-sm font-semibold">Recycles to unlock<input name="requiredCount" type="number" min="1" required className={field}/></label>
        <label className="text-sm font-semibold">Optional collective goal<input name="collectiveGoalCount" type="number" min="1" className={field}/></label>
        <label className="text-sm font-semibold">Starts<input name="startsAt" type="datetime-local" required className={field}/></label>
        <label className="text-sm font-semibold">Ends<input name="endsAt" type="datetime-local" required className={field}/></label>
        <label className="text-sm font-semibold md:col-span-2">Countries (ISO codes, blank means worldwide)<input name="countries" placeholder="ES, PT, FR" className={field}/></label>
      </div>
      {targetKind === "selected_products" ? <div><p className="mb-2 text-sm font-semibold">Eligible products</p><div className="grid max-h-48 gap-2 overflow-auto rounded-lg border p-3 md:grid-cols-2">{products.map(p => <label key={p.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => setSelected(current => current.includes(p.id) ? current.filter(id => id !== p.id) : [...current, p.id])}/><span>{p.name} <span className="text-[var(--gl-ink-muted)]">{p.barcode}</span></span></label>)}</div></div> : null}
      <div className="grid gap-4 border-t border-[var(--gl-hairline)] pt-5 md:grid-cols-2">
        <label className="text-sm font-semibold">Benefit title<input name="rewardTitle" required className={field}/></label>
        <label className="text-sm font-semibold">Estimated saving<input name="savings" placeholder="10% OFF" className={field}/></label>
        <label className="text-sm font-semibold md:col-span-2">Benefit description<textarea name="rewardDescription" rows={2} className={field}/></label>
        <label className="text-sm font-semibold">Delivery<select value={rewardType} onChange={e => setRewardType(e.target.value)} className={field}><option value="link_only">Affiliate link</option><option value="link_with_code">Affiliate link + promo code</option></select></label>
        <label className="text-sm font-semibold">Affiliate URL<input name="affiliateUrl" type="url" required className={field}/></label>
        {rewardType === "link_with_code" ? <label className="text-sm font-semibold">Promo code<input name="promoCode" required className={field}/></label> : null}
        <label className="text-sm font-semibold">Hours available after unlock<input name="duration" type="number" min="1" defaultValue="72" className={field}/></label>
        <label className="text-sm font-semibold md:col-span-2">User instructions<textarea name="instructions" required rows={3} className={field}/></label>
      </div>
      <button disabled={busy} className="w-full rounded-lg bg-[var(--gl-green-deep)] px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Submitting..." : "Submit for GreenLoop review"}</button>
    </form> : null}
    <div className="divide-y divide-[var(--gl-hairline)] rounded-xl border border-[var(--gl-hairline)] bg-white">{items.length ? items.map(item => <div key={item.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-bold">{item.title}</p><p className="text-sm text-[var(--gl-ink-muted)]">{item.review_status.replaceAll("_", " ")} · {item.participants} participants · {item.collective_progress} total recycles</p>{item.sponsor_review_notes ? <p className="mt-1 text-sm text-red-700">{item.sponsor_review_notes}</p> : null}</div>{["draft","pending_review","rejected"].includes(item.review_status) && item.participants === 0 ? <button title="Delete" onClick={() => void remove(item.id)} className="p-2 text-red-700"><Trash2 size={18}/></button> : null}</div>) : <p className="p-5 text-sm text-[var(--gl-ink-muted)]">No sponsored challenges yet.</p>}</div>
  </section>;
}
