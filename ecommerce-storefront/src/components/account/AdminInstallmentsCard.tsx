"use client";

import { useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

export default function AdminInstallmentsCard() {
  const [config, setConfig] = useState({ enabled: false, count: 3, minimumAmount: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { let active = true; api("/store/admin/integrations/installments").then(value => { if (active) { setConfig(value); setReady(true); } }).catch(error => { if (active) setMessage(getErrorMessage(error)); }); return () => { active = false; }; }, []);
  async function save() {
    setBusy(true); setMessage("");
    try { const value = await api("/store/admin/integrations/installments", { method: "PUT", body: JSON.stringify(config) }); setConfig(value); setMessage("Configuración guardada. El catálogo se actualizará al volver a cargarlo."); }
    catch (error) { setMessage(getErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section style={{ padding: 20, border: "1px solid var(--border-soft)", borderRadius: 16, display: "grid", gap: 14 }}>
    <h5 style={{ margin: 0, fontSize: 20 }}>Cuotas sin interés en el catálogo</h5>
    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>Activá primero la promoción para Checkout en tu cuenta de Mercado Pago. Esta configuración controla el anuncio en los productos y debe coincidir con esa promoción.</p>
    <fieldset disabled={!ready || busy} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 12 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={config.enabled} onChange={event => setConfig({ ...config, enabled: event.target.checked })}/>Mostrar cuotas sin interés</label>
      <label style={{ display: "grid", gap: 6 }}>Cantidad de cuotas<select value={config.count} onChange={event => setConfig({ ...config, count: Number(event.target.value) })}>{[2, 3, 6].map(count => <option key={count} value={count}>{count} cuotas</option>)}</select></label>
      <label style={{ display: "grid", gap: 6 }}>Monto mínimo de compra ($)<input type="number" min="0" step="0.01" value={config.minimumAmount} onChange={event => setConfig({ ...config, minimumAmount: Number(event.target.value) })}/></label>
      <small style={{ color: "var(--text-muted)" }}>El anuncio aparece en productos desde {formatCurrency(config.minimumAmount)}. Las condiciones finales se confirman en el checkout.</small>
      <button type="button" className="theme-button" onClick={save}>{busy ? "Guardando…" : "Guardar cuotas"}</button>
    </fieldset>
    {message ? <p role="status" style={{ margin: 0 }}>{message}</p> : null}
  </section>;
}
