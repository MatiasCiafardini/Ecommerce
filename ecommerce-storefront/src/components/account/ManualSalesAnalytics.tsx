"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { money } from "./order-utils";

type AnalyticsRow = {
  name: string;
  brand?: string;
  sku?: string;
  units: number;
  revenue: number;
  returns: number;
  stock: number;
  share: number;
  sellThrough: number;
};

type AnalyticsPayload = {
  summary: { revenue: number; units: number; returnedUnits: number; sales: number; averageTicket: number; returnRate: number };
  brands: AnalyticsRow[];
  products: AnalyticsRow[];
  timeline: Array<{ date: string; revenue: number; units: number; sales: number }>;
  availableBrands: string[];
};

const colors = ["#2f7665", "#79a99c", "#d7a85c", "#8a6f9e", "#c97366", "#5f88a5"];
const dateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function ManualSalesAnalytics({ storeLocationId }: { storeLocationId?: number | null }) {
  const today = useMemo(() => new Date(), []);
  const initialFrom = useMemo(() => new Date(today.getTime() - 29 * 86400000), [today]);
  const [from, setFrom] = useState(dateInput(initialFrom));
  const [to, setTo] = useState(dateInput(today));
  const [brand, setBrand] = useState("");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams({
      from: `${from}T00:00:00.000-03:00`,
      to: `${to}T23:59:59.999-03:00`,
    });
    if (storeLocationId) params.set("storeLocationId", String(storeLocationId));
    if (brand) params.set("brand", brand);
    setLoading(true);
    setError("");
    void api(`/orders/manual/analytics?${params}`).then((result) => {
      if (mounted) setData(result as AnalyticsPayload);
    }).catch((reason) => {
      if (mounted) setError(getErrorMessage(reason, "No pudimos cargar las estadísticas."));
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [brand, from, storeLocationId, to]);

  const maxTimeline = Math.max(...(data?.timeline.map((row) => row.revenue) ?? [0]), 1);
  const pie = useMemo(() => {
    const rows = data?.brands ?? [];
    if (!rows.length) return "conic-gradient(#e5e7eb 0 100%)";
    let cursor = 0;
    return `conic-gradient(${rows.slice(0, 6).map((row, index) => {
      const start = cursor;
      cursor += row.share;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    }).join(", ")}${cursor < 100 ? `, #d8dedc ${cursor}% 100%` : ""})`;
  }, [data]);

  return (
    <section className="sales-analytics">
      <style>{styles}</style>
      <header className="sales-analytics__header">
        <div><p>Análisis comercial</p><h2>Estadísticas de venta manual</h2><span>Ventas anuladas excluidas; devoluciones y descuentos descontados.</span></div>
        <div className="sales-analytics__filters">
          <label>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label>Marca<select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">Todas</option>{data?.availableBrands.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </header>
      {error ? <div className="sales-analytics__error">{error}</div> : null}
      {loading && !data ? <div className="sales-analytics__empty">Calculando métricas…</div> : null}
      {data ? <>
        <div className="sales-analytics__cards">
          <Metric label="Facturación neta" value={money(data.summary.revenue)} />
          <Metric label="Unidades netas" value={String(data.summary.units)} />
          <Metric label="Ventas" value={String(data.summary.sales)} />
          <Metric label="Ticket promedio" value={money(data.summary.averageTicket)} />
          <Metric label="Tasa de devolución" value={`${data.summary.returnRate}%`} detail={`${data.summary.returnedUnits} unidades`} />
        </div>
        <div className="sales-analytics__grid">
          <article className="sales-analytics__panel"><h3>Participación por marca</h3>
            {data.brands.length ? <div className="sales-analytics__pie-wrap"><div className="sales-analytics__pie" style={{ background: pie }}><span>{money(data.summary.revenue)}</span></div><div className="sales-analytics__legend">{data.brands.slice(0, 6).map((row, index) => <div key={row.name}><i style={{ background: colors[index % colors.length] }} /><span>{row.name}</span><strong>{row.share}%</strong></div>)}</div></div> : <Empty />}
          </article>
          <article className="sales-analytics__panel"><h3>Evolución de facturación</h3>
            {data.timeline.length ? <div className="sales-analytics__bars">{data.timeline.map((row) => <div key={row.date} title={`${row.date}: ${money(row.revenue)}`}><span style={{ height: `${Math.max(row.revenue / maxTimeline * 100, 3)}%` }} /><small>{row.date.slice(5)}</small></div>)}</div> : <Empty />}
          </article>
        </div>
        <article className="sales-analytics__panel"><h3>Rendimiento por marca</h3><AnalyticsTable rows={data.brands} showBrand={false} /></article>
        <article className="sales-analytics__panel"><h3>Artículos más vendidos</h3><AnalyticsTable rows={data.products.slice(0, 15)} showBrand /></article>
        <p className="sales-analytics__note">Rotación aproximada (sell-through): unidades netas ÷ unidades netas más stock disponible actual.</p>
      </> : null}
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) { return <article className="sales-analytics__metric"><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>; }
function Empty() { return <div className="sales-analytics__empty">No hay ventas para este período.</div>; }
function AnalyticsTable({ rows, showBrand }: { rows: AnalyticsRow[]; showBrand: boolean }) {
  if (!rows.length) return <Empty />;
  return <div className="sales-analytics__table-wrap"><table><thead><tr><th>{showBrand ? "Artículo" : "Marca"}</th>{showBrand ? <th>Marca</th> : null}<th>Unidades</th><th>Facturación</th><th>Participación</th><th>Devoluciones</th><th>Stock</th><th>Rotación aprox.</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.name}-${row.sku ?? ""}`}><td><strong>{row.name}</strong>{row.sku ? <small>{row.sku}</small> : null}</td>{showBrand ? <td>{row.brand}</td> : null}<td>{row.units}</td><td>{money(row.revenue)}</td><td>{row.share}%</td><td>{row.returns}</td><td>{row.stock}</td><td><span className="sales-analytics__progress"><i style={{ width: `${Math.min(row.sellThrough, 100)}%` }} /></span>{row.sellThrough}%</td></tr>)}</tbody></table></div>;
}

const styles = `
.sales-analytics{display:grid;gap:20px;padding:26px;color:var(--account-text,#24332f)}.sales-analytics__header{display:flex;justify-content:space-between;gap:24px;align-items:end}.sales-analytics__header p{margin:0;color:#2f7665;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em}.sales-analytics__header h2{margin:5px 0;font-size:27px}.sales-analytics__header span{color:var(--text-muted,#687772)}.sales-analytics__filters{display:flex;gap:10px;flex-wrap:wrap}.sales-analytics__filters label{display:grid;gap:4px;font-size:11px;font-weight:700;color:#687772}.sales-analytics__filters input,.sales-analytics__filters select{border:1px solid #d7dfdc;border-radius:9px;background:white;padding:9px 11px;color:#24332f}.sales-analytics__cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.sales-analytics__metric,.sales-analytics__panel{background:#fff;border:1px solid #dfe6e3;border-radius:14px;box-shadow:0 8px 28px rgba(34,55,49,.05)}.sales-analytics__metric{padding:17px;display:grid;gap:7px}.sales-analytics__metric span,.sales-analytics__metric small{color:#71807b;font-size:12px}.sales-analytics__metric strong{font-size:22px}.sales-analytics__grid{display:grid;grid-template-columns:1fr 1.2fr;gap:16px}.sales-analytics__panel{padding:20px;min-width:0}.sales-analytics__panel h3{margin:0 0 18px;font-size:17px}.sales-analytics__pie-wrap{display:flex;align-items:center;justify-content:center;gap:28px}.sales-analytics__pie{width:175px;height:175px;border-radius:50%;display:grid;place-items:center;position:relative}.sales-analytics__pie:after{content:"";position:absolute;inset:34px;background:#fff;border-radius:50%}.sales-analytics__pie span{z-index:1;font-weight:800;font-size:13px}.sales-analytics__legend{display:grid;gap:9px;min-width:180px}.sales-analytics__legend div{display:grid;grid-template-columns:10px 1fr auto;gap:8px;align-items:center;font-size:12px}.sales-analytics__legend i{width:9px;height:9px;border-radius:50%}.sales-analytics__bars{height:205px;display:flex;align-items:end;gap:4px;border-bottom:1px solid #dfe6e3;padding-top:12px;overflow:hidden}.sales-analytics__bars>div{height:100%;flex:1;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:5px;min-width:10px}.sales-analytics__bars span{width:70%;max-width:22px;background:#79a99c;border-radius:5px 5px 0 0}.sales-analytics__bars small{font-size:8px;color:#7b8884;writing-mode:vertical-rl}.sales-analytics__table-wrap{overflow:auto}.sales-analytics table{border-collapse:collapse;width:100%;font-size:13px}.sales-analytics th{text-align:left;color:#71807b;font-size:10px;text-transform:uppercase;letter-spacing:.07em;padding:9px;border-bottom:1px solid #dfe6e3;white-space:nowrap}.sales-analytics td{padding:12px 9px;border-bottom:1px solid #edf1ef;white-space:nowrap}.sales-analytics td:first-child{white-space:normal}.sales-analytics td small{display:block;color:#71807b;margin-top:3px}.sales-analytics__progress{display:inline-block;width:52px;height:6px;background:#e6ecea;border-radius:8px;margin-right:7px;overflow:hidden;vertical-align:middle}.sales-analytics__progress i{display:block;height:100%;background:#2f7665}.sales-analytics__empty,.sales-analytics__error{padding:28px;text-align:center;color:#71807b}.sales-analytics__error{background:#fff2f0;color:#a3453b;border-radius:12px}.sales-analytics__note{margin:0;color:#71807b;font-size:12px}@media(max-width:900px){.sales-analytics{padding:16px}.sales-analytics__header{align-items:stretch;flex-direction:column}.sales-analytics__cards{grid-template-columns:repeat(2,1fr)}.sales-analytics__grid{grid-template-columns:1fr}.sales-analytics__pie-wrap{flex-direction:column}.sales-analytics__filters label{flex:1;min-width:120px}}
`;
