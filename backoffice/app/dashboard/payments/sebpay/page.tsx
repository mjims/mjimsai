"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";
import type { SebpayCountry, SebpayOperator } from "@/types";

export default function SebpayCatalogPage() {
  const [countries, setCountries] = useState<SebpayCountry[]>([]);
  const [operators, setOperators] = useState<SebpayOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [cForm, setCForm] = useState({ code: "", name: "", prefix: "", currency: "XOF" });
  const [oForm, setOForm] = useState({ slug: "", label: "", country_code: "" });

  useEffect(() => {
    Promise.all([adminService.listSebpayCountries(), adminService.listSebpayOperators()])
      .then(([c, o]) => { setCountries(c); setOperators(o); })
      .catch((e) => setErr(getApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function addCountry(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy("country");
    try {
      const created = await adminService.createSebpayCountry({ ...cForm, code: cForm.code.toUpperCase(), is_active: true, sort_order: countries.length });
      setCountries((p) => [...p, created]);
      setCForm({ code: "", name: "", prefix: "", currency: "XOF" });
    } catch (e2) { setErr(getApiError(e2)); }
    finally { setBusy(null); }
  }

  async function toggleCountry(c: SebpayCountry) {
    setBusy(c.id);
    try {
      const u = await adminService.updateSebpayCountry(c.id, { is_active: !c.is_active });
      setCountries((p) => p.map((x) => (x.id === u.id ? u : x)));
    } catch (e) { setErr(getApiError(e)); } finally { setBusy(null); }
  }
  async function delCountry(c: SebpayCountry) {
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    setBusy(c.id);
    try { await adminService.deleteSebpayCountry(c.id); setCountries((p) => p.filter((x) => x.id !== c.id)); }
    catch (e) { setErr(getApiError(e)); } finally { setBusy(null); }
  }

  async function addOperator(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy("operator");
    try {
      const created = await adminService.createSebpayOperator({
        slug: oForm.slug.toLowerCase().trim(), label: oForm.label.trim(),
        country_code: oForm.country_code ? oForm.country_code.toUpperCase() : null,
        is_active: true, sort_order: operators.length,
      });
      setOperators((p) => [...p, created]);
      setOForm({ slug: "", label: "", country_code: "" });
    } catch (e2) { setErr(getApiError(e2)); }
    finally { setBusy(null); }
  }
  async function toggleOperator(o: SebpayOperator) {
    setBusy(o.id);
    try {
      const u = await adminService.updateSebpayOperator(o.id, { is_active: !o.is_active });
      setOperators((p) => p.map((x) => (x.id === u.id ? u : x)));
    } catch (e) { setErr(getApiError(e)); } finally { setBusy(null); }
  }
  async function delOperator(o: SebpayOperator) {
    if (!confirm(`Supprimer ${o.slug} ?`)) return;
    setBusy(o.id);
    try { await adminService.deleteSebpayOperator(o.id); setOperators((p) => p.filter((x) => x.id !== o.id)); }
    catch (e) { setErr(getApiError(e)); } finally { setBusy(null); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  const inputCls = "px-3 py-2 rounded-lg border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";
  const toggleBtn = (active: boolean) => `w-10 h-6 rounded-full p-0.5 transition-colors ${active ? "bg-emerald-500" : "bg-surface-300"}`;
  const knob = (active: boolean) => `block w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? "translate-x-4" : "translate-x-0"}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/dashboard/payments" className="text-sm text-surface-500 hover:text-surface-900">← Paiements</Link>
        <h1 className="text-2xl font-bold text-surface-900 mt-2">Catalogue Sebpay</h1>
        <p className="text-surface-500 mt-1">Pays supportés et opérateurs Mobile Money (un opérateur sans pays = disponible partout).</p>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{err}</p>}

      {/* Countries */}
      <section className="space-y-3">
        <h2 className="font-semibold text-surface-800">Pays</h2>
        <form onSubmit={addCountry} className="bg-white rounded-2xl border border-surface-200 p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1"><label className="text-xs text-surface-500">Code ISO</label><input value={cForm.code} onChange={(e) => setCForm((f) => ({ ...f, code: e.target.value }))} required maxLength={5} placeholder="BJ" className={`${inputCls} w-20 uppercase`} /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]"><label className="text-xs text-surface-500">Nom</label><input value={cForm.name} onChange={(e) => setCForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Bénin" className={`${inputCls} w-full`} /></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-surface-500">Préfixe</label><input value={cForm.prefix} onChange={(e) => setCForm((f) => ({ ...f, prefix: e.target.value }))} required placeholder="+229" className={`${inputCls} w-24`} /></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-surface-500">Devise</label><input value={cForm.currency} onChange={(e) => setCForm((f) => ({ ...f, currency: e.target.value }))} required placeholder="XOF" className={`${inputCls} w-24 uppercase`} /></div>
          <button type="submit" disabled={busy === "country"} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">+ Ajouter</button>
        </form>
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <table className="w-full"><tbody className="divide-y divide-surface-100">
            {countries.map((c) => (
              <tr key={c.id} className="hover:bg-surface-50">
                <td className="px-5 py-3"><span className="font-mono text-sm font-medium">{c.code}</span> <span className="text-surface-600 text-sm">{c.name}</span></td>
                <td className="px-5 py-3 text-sm text-surface-500">{c.prefix} · {c.currency}</td>
                <td className="px-5 py-3 w-16"><button onClick={() => toggleCountry(c)} disabled={busy === c.id} className={toggleBtn(c.is_active)}><span className={knob(c.is_active)} /></button></td>
                <td className="px-5 py-3 w-24 text-right"><button onClick={() => delCountry(c)} disabled={busy === c.id} className="px-3 py-1.5 text-xs text-red-700 border border-red-200 rounded-lg hover:bg-red-50">Suppr.</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </section>

      {/* Operators */}
      <section className="space-y-3">
        <h2 className="font-semibold text-surface-800">Opérateurs</h2>
        <form onSubmit={addOperator} className="bg-white rounded-2xl border border-surface-200 p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1"><label className="text-xs text-surface-500">Slug</label><input value={oForm.slug} onChange={(e) => setOForm((f) => ({ ...f, slug: e.target.value }))} required placeholder="mtn" className={`${inputCls} w-28`} /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]"><label className="text-xs text-surface-500">Label</label><input value={oForm.label} onChange={(e) => setOForm((f) => ({ ...f, label: e.target.value }))} required placeholder="MTN Mobile Money" className={`${inputCls} w-full`} /></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-surface-500">Pays (vide = tous)</label>
            <select value={oForm.country_code} onChange={(e) => setOForm((f) => ({ ...f, country_code: e.target.value }))} className={inputCls}>
              <option value="">Tous</option>
              {countries.map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <button type="submit" disabled={busy === "operator"} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">+ Ajouter</button>
        </form>
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <table className="w-full"><tbody className="divide-y divide-surface-100">
            {operators.map((o) => (
              <tr key={o.id} className="hover:bg-surface-50">
                <td className="px-5 py-3"><span className="font-mono text-sm font-medium">{o.slug}</span> <span className="text-surface-600 text-sm">{o.label}</span></td>
                <td className="px-5 py-3 text-sm text-surface-500">{o.country_code || "Tous pays"}</td>
                <td className="px-5 py-3 w-16"><button onClick={() => toggleOperator(o)} disabled={busy === o.id} className={toggleBtn(o.is_active)}><span className={knob(o.is_active)} /></button></td>
                <td className="px-5 py-3 w-24 text-right"><button onClick={() => delOperator(o)} disabled={busy === o.id} className="px-3 py-1.5 text-xs text-red-700 border border-red-200 rounded-lg hover:bg-red-50">Suppr.</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </section>
    </div>
  );
}
