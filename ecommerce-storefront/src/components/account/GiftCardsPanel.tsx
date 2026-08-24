"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { money } from "./order-utils";

export type GiftCardForSale = {
  id: number;
  code: string;
  codeLastFour: string;
  recipientName: string;
  balance: string | number;
};

type GiftCardRow = GiftCardForSale & {
  purchaserName?: string | null;
  initialAmount: string | number;
  status: "ACTIVE" | "REDEEMED" | "CANCELLED";
  expiresAt?: string | null;
  createdAt: string;
  expired?: boolean;
};

type GiftCardStats = { count: number; issuedTotal: number; activeBalance: number; redeemedTotal: number };
type GiftCardDetail = GiftCardRow & { message?: string | null; movements?: Array<{ id: number; type: string; amount: string | number; balanceAfter: string | number; reason?: string | null; createdAt: string; orderId?: number | null }> };

export default function GiftCardsPanel({ onUse }: { onUse: (card: GiftCardForSale) => void }) {
  const [cards, setCards] = useState<GiftCardRow[]>([]);
  const [stats, setStats] = useState<GiftCardStats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<GiftCardDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const [list, summary] = await Promise.all([
        api(`/gift-cards?${params.toString()}`),
        api("/gift-cards/stats"),
      ]);
      setCards(Array.isArray(list) ? list as GiftCardRow[] : []);
      setStats(summary as GiftCardStats);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las gift cards."));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer); }, [load]);

  const openCardForSale = async (id: number) => {
    try {
      const card = await api(`/gift-cards/${id}`) as GiftCardForSale;
      onUse(card);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo abrir la gift card."));
    }
  };

  const openDetail = async (id: number) => {
    try { setDetail(await api(`/gift-cards/${id}`) as GiftCardDetail); }
    catch (err) { setError(getErrorMessage(err, "No se pudo abrir el detalle.")); }
  };

  const cancelCard = async (id: number) => {
    const reason = window.prompt("Motivo de cancelación");
    if (!reason?.trim()) return;
    try {
      await api(`/gift-cards/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cancelar la gift card."));
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header><h2 style={{ margin: 0 }}>Gift Cards</h2><p>Consulta saldos, destinatarios y usa una tarjeta en una venta.</p></header>
      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <Stat label="Saldo activo" value={money(stats?.activeBalance ?? 0)} />
        <Stat label="Total emitido" value={money(stats?.issuedTotal ?? 0)} />
        <Stat label="Total canjeado" value={money(stats?.redeemedTotal ?? 0)} />
      </div>
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, comprador o destinatario" style={{ padding: 12, border: "1px solid var(--theme-colors-border)", borderRadius: 10 }} />
      {loading ? <p>Cargando gift cards...</p> : (
        <div style={{ overflowX: "auto", border: "1px solid var(--theme-colors-border)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Código", "Comprador", "Destinatario", "Inicial", "Saldo", "Vencimiento", "Estado", "Acciones"].map((label) => <th key={label} style={cell}>{label}</th>)}</tr></thead>
            <tbody>{cards.map((card) => <tr key={card.id}>
              <td style={cell}>{card.code}</td><td style={cell}>{card.purchaserName || "—"}</td><td style={cell}>{card.recipientName}</td>
              <td style={cell}>{money(Number(card.initialAmount))}</td><td style={cell}>{money(Number(card.balance))}</td>
              <td style={cell}>{card.expiresAt ? new Date(card.expiresAt).toLocaleDateString("es-AR") : "Sin vencimiento"}</td>
              <td style={cell}>{card.expired ? "Vencida" : card.status}</td>
              <td style={cell}><div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => void openDetail(card.id)}>Ver</button>
                <button type="button" disabled={card.status !== "ACTIVE" || card.expired || Number(card.balance) <= 0} onClick={() => void openCardForSale(card.id)}>Usar en venta</button>
                <button type="button" disabled={card.status !== "ACTIVE"} onClick={() => void cancelCard(card.id)}>Cancelar</button>
              </div></td>
            </tr>)}</tbody>
          </table>
          {!cards.length ? <p style={{ padding: 16 }}>No hay gift cards para mostrar.</p> : null}
        </div>
      )}
      {detail ? (
        <section style={{ padding: 16, border: "1px solid var(--theme-colors-border)", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><small>Código completo</small><h3 style={{ margin: "4px 0" }}>{detail.code}</h3><p>{detail.recipientName} · Saldo {money(Number(detail.balance))}</p></div><button type="button" onClick={() => setDetail(null)}>Cerrar</button></div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><button type="button" onClick={() => void navigator.clipboard.writeText(detail.code)}>Copiar código</button><button type="button" onClick={() => window.print()}>Imprimir</button></div>
          <strong>Movimientos</strong>
          <div>{(detail.movements ?? []).map((movement) => <p key={movement.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>{movement.type} {movement.orderId ? `· Venta #${movement.orderId}` : ""}<small style={{ display: "block" }}>{movement.reason}</small></span><strong>{money(Number(movement.amount))} · saldo {money(Number(movement.balanceAfter))}</strong></p>)}</div>
        </section>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <article style={{ padding: 16, border: "1px solid var(--theme-colors-border)", borderRadius: 12 }}><small>{label}</small><strong style={{ display: "block", fontSize: 22 }}>{value}</strong></article>;
}

const cell = { padding: 10, borderBottom: "1px solid var(--theme-colors-border)", textAlign: "left" as const, whiteSpace: "nowrap" as const };
