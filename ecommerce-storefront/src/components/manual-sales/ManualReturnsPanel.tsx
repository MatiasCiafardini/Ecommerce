"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/components/account/order-utils";

type Product = {
  id: number;
  title: string;
  slug: string;
  variants?: Variant[];
};

type Variant = {
  id: number;
  sku?: string | null;
  price: string | number;
  Size?: string | null;
  Color?: string | null;
  inventories?: Array<{ quantity?: number; reserved?: number }>;
  product?: { title: string };
};

type Line = {
  variantId: number;
  title: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  price: string;
  available: number;
};

type ManualReturn = {
  id: number;
  customerName?: string | null;
  notes?: string | null;
  totalReturned: string | number;
  totalExchange: string | number;
  differenceAmount: string | number;
  createdAt: string;
  items?: Array<{
    id: number;
    kind: "returned" | "exchange" | string;
    quantity: number;
    price: string | number;
    variant?: Variant | null;
  }>;
};

type CurrentAccountLookup = {
  customerId: number;
  balance: string | number;
  customer: {
    id: number;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    document?: string | null;
  };
};

type VariantRow = {
  product: Product;
  variant: Variant;
  available: number;
};

const settlementMethods = ["Efectivo", "Tarjeta", "Transferencia", "Mercado Pago", "Cuenta corriente"];
const normalizeSearch = (value: string) => value.trim().toLowerCase();

export default function ManualReturnsPanel() {
  const [history, setHistory] = useState<ManualReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<CurrentAccountLookup | null>(null);
  const [accountRows, setAccountRows] = useState<CurrentAccountLookup[]>([]);
  const [settlementMethod, setSettlementMethod] = useState("Efectivo");
  const [notes, setNotes] = useState("");
  const [returnedQuery, setReturnedQuery] = useState("");
  const [exchangeQuery, setExchangeQuery] = useState("");
  const [returnedRows, setReturnedRows] = useState<VariantRow[]>([]);
  const [exchangeRows, setExchangeRows] = useState<VariantRow[]>([]);
  const [returnedLines, setReturnedLines] = useState<Line[]>([]);
  const [exchangeLines, setExchangeLines] = useState<Line[]>([]);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/returns/manual");
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial de devoluciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    void searchProducts(returnedQuery, setReturnedRows);
  }, [returnedQuery]);

  useEffect(() => {
    void searchProducts(exchangeQuery, setExchangeRows);
  }, [exchangeQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void searchAccounts(customerName, setAccountRows);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [customerName]);

  const totalReturned = useMemo(() => lineTotal(returnedLines), [returnedLines]);
  const totalExchange = useMemo(() => lineTotal(exchangeLines), [exchangeLines]);
  const difference = totalExchange - totalReturned;

  const createReturn = async () => {
    if (returnedLines.length === 0) {
      setError("Carga al menos un producto que devuelven.");
      return;
    }

    if (!selectedAccount && !customerName.trim()) {
      setError("Selecciona una cuenta corriente o carga el nombre del cliente.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const created = (await api("/returns/manual", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedAccount?.customerId,
          customerName: customerName.trim() || undefined,
          settlementMethod: difference > 0 ? settlementMethod : "Cuenta corriente",
          notes: notes.trim() || undefined,
          returnedItems: returnedLines.map(toPayloadItem),
          exchangeItems: exchangeLines.map(toPayloadItem),
        }),
      })) as ManualReturn;
      setHistory((current) => [created, ...current]);
      setCustomerName("");
      setSelectedAccount(null);
      setAccountRows([]);
      setSettlementMethod("Efectivo");
      setNotes("");
      setReturnedQuery("");
      setExchangeQuery("");
      setReturnedRows([]);
      setExchangeRows([]);
      setReturnedLines([]);
      setExchangeLines([]);
      setSuccess(getSuccessMessage(created, difference > 0 ? settlementMethod : "Cuenta corriente"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la devolucion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-account-panel style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Mostrador</p>
          <h2 style={titleStyle}>Devoluciones y cambios</h2>
          <p style={copyStyle}>Carga lo que vuelve, lo que se lleva como cambio y registra la cuenta corriente.</p>
        </div>
        <strong style={differenceStyle(difference)}>
          {difference >= 0 ? "A cobrar " : "A favor "}
          {money(Math.abs(difference))}
        </strong>
      </header>

      {error ? <p style={errorStyle}>{error}</p> : null}
      {success ? <p style={successStyle}>{success}</p> : null}

      <div style={formGridStyle}>
        <section style={cardStyle}>
          <p style={eyebrowStyle}>Devuelven</p>
          <ProductPicker
            query={returnedQuery}
            setQuery={setReturnedQuery}
            rows={returnedRows}
            onAdd={(row) => addLine(row, setReturnedLines, true)}
            placeholder="Buscar producto devuelto"
          />
          <LineList lines={returnedLines} setLines={setReturnedLines} />
          <strong style={subtotalStyle}>Total devuelto: {money(totalReturned)}</strong>
        </section>

        <section style={cardStyle}>
          <p style={eyebrowStyle}>Se llevan</p>
          <ProductPicker
            query={exchangeQuery}
            setQuery={setExchangeQuery}
            rows={exchangeRows}
            onAdd={(row) => addLine(row, setExchangeLines, false)}
            placeholder="Buscar producto de cambio"
          />
          <LineList lines={exchangeLines} setLines={setExchangeLines} />
          <strong style={subtotalStyle}>Total cambio: {money(totalExchange)}</strong>
        </section>
      </div>

      <div style={detailsGridStyle}>
        <div style={customerBoxStyle}>
          <input
            value={customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              setSelectedAccount(null);
            }}
            placeholder="Buscar o cargar cliente"
            style={inputStyle}
          />
          {selectedAccount ? (
            <div style={selectedAccountStyle}>
              <span>Cuenta corriente: {getAccountCustomerName(selectedAccount)}</span>
              <button type="button" onClick={() => setSelectedAccount(null)} style={miniButtonStyle}>Cambiar</button>
            </div>
          ) : accountRows.length > 0 ? (
            <div style={accountListStyle}>
              {accountRows.slice(0, 5).map((account) => (
                <button
                  key={account.customerId}
                  type="button"
                  onClick={() => {
                    setSelectedAccount(account);
                    setCustomerName(getAccountCustomerName(account));
                    setAccountRows([]);
                  }}
                  style={accountButtonStyle}
                >
                  <span>{getAccountCustomerName(account)}</span>
                  <small>Saldo {money(Number(account.balance))}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {difference > 0 ? (
          <select value={settlementMethod} onChange={(event) => setSettlementMethod(event.target.value)} style={inputStyle}>
            {settlementMethods.map((method) => <option key={method}>{method}</option>)}
          </select>
        ) : (
          <div style={settlementInfoStyle}>{difference < 0 ? "Se acredita saldo a favor en cuenta corriente." : "Sin diferencia a liquidar."}</div>
        )}
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas opcionales" style={inputStyle} />
        <button type="button" onClick={() => void createReturn()} disabled={saving || returnedLines.length === 0 || (!selectedAccount && !customerName.trim())} style={primaryButtonStyle}>
          {saving ? "Registrando..." : "Registrar devolucion/cambio"}
        </button>
      </div>

      <section style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Historial</p>
            <h3 style={subtitleStyle}>Ultimas devoluciones</h3>
          </div>
        </div>
        {loading ? (
          <State label="Cargando devoluciones..." />
        ) : history.length === 0 ? (
          <State label="Todavia no hay devoluciones manuales." />
        ) : (
          <div style={historyListStyle}>
            {history.map((entry) => (
              <article key={entry.id} style={historyCardStyle}>
                <div style={headerStyle}>
                  <div>
                    <strong>Devolucion #{entry.id}</strong>
                    <span style={mutedStyle}>{new Date(entry.createdAt).toLocaleString("es-AR")} {entry.customerName ? `- ${entry.customerName}` : ""}</span>
                  </div>
                  <strong style={differenceStyle(Number(entry.differenceAmount))}>{money(Number(entry.differenceAmount))}</strong>
                </div>
                <div style={historyItemsStyle}>
                  {(entry.items ?? []).map((item) => (
                    <span key={item.id}>
                      {item.kind === "exchange" ? "Cambio" : "Devuelve"}: {item.variant?.product?.title || "Producto"} {getVariantLabel(item.variant)} x{item.quantity} - {money(Number(item.price) * item.quantity)}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function ProductPicker({
  query,
  setQuery,
  rows,
  onAdd,
  placeholder,
}: {
  query: string;
  setQuery: (value: string) => void;
  rows: VariantRow[];
  onAdd: (row: VariantRow) => void;
  placeholder: string;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} style={inputStyle} />
      <div style={pickerListStyle}>
        {rows.slice(0, 8).map((row) => (
          <button key={row.variant.id} type="button" onClick={() => onAdd(row)} style={pickerButtonStyle}>
            <span>
              <strong>{row.product.title}</strong>
              <small style={mutedStyle}>{getVariantLabel(row.variant)} {row.variant.sku || ""}</small>
            </span>
            <span>{money(Number(row.variant.price))} · Stock {row.available}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LineList({ lines, setLines }: { lines: Line[]; setLines: React.Dispatch<React.SetStateAction<Line[]>> }) {
  if (lines.length === 0) return <State label="Sin productos cargados." />;

  return (
    <div style={lineListStyle}>
      {lines.map((line) => (
        <article key={line.variantId} style={lineStyle}>
          <div>
            <strong>{line.title}</strong>
            <span style={mutedStyle}>{line.variantLabel} {line.sku}</span>
          </div>
          <input
            value={line.quantity}
            onChange={(event) => updateLine(setLines, line.variantId, { quantity: Math.max(1, Number(event.target.value || 1)) })}
            inputMode="numeric"
            style={smallInputStyle}
          />
          <input
            value={line.price}
            onChange={(event) => updateLine(setLines, line.variantId, { price: event.target.value })}
            inputMode="decimal"
            style={smallInputStyle}
          />
          <button type="button" onClick={() => setLines((current) => current.filter((item) => item.variantId !== line.variantId))} style={ghostButtonStyle}>
            Quitar
          </button>
        </article>
      ))}
    </div>
  );
}

function State({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

async function searchProducts(query: string, setRows: (rows: VariantRow[]) => void) {
  const normalized = normalizeSearch(query);
  if (!normalized) {
    setRows([]);
    return;
  }

  const data = await api(`/products?search=${encodeURIComponent(normalized)}&limit=40`);
  const products = Array.isArray(data) ? (data as Product[]) : [];
  setRows(products.flatMap((product) => (product.variants ?? []).map((variant) => ({
    product,
    variant,
    available: getAvailable(variant),
  }))));
}

async function searchAccounts(query: string, setRows: (rows: CurrentAccountLookup[]) => void) {
  const normalized = query.trim();
  if (normalized.length < 2) {
    setRows([]);
    return;
  }

  const params = new URLSearchParams();
  params.set("status", "all");
  params.set("search", normalized);
  const data = await api(`/current-accounts?${params.toString()}`);
  setRows(Array.isArray(data) ? (data as CurrentAccountLookup[]) : []);
}

function addLine(row: VariantRow, setLines: React.Dispatch<React.SetStateAction<Line[]>>, allowNoStock: boolean) {
  if (!allowNoStock && row.available <= 0) return;
  setLines((current) => {
    const existing = current.find((line) => line.variantId === row.variant.id);
    if (existing) {
      return current.map((line) => line.variantId === row.variant.id ? { ...line, quantity: line.quantity + 1 } : line);
    }
    return [
      ...current,
      {
        variantId: row.variant.id,
        title: row.product.title,
        variantLabel: getVariantLabel(row.variant),
        sku: row.variant.sku || "",
        quantity: 1,
        price: String(Number(row.variant.price)),
        available: row.available,
      },
    ];
  });
}

function updateLine(setLines: React.Dispatch<React.SetStateAction<Line[]>>, variantId: number, patch: Partial<Line>) {
  setLines((current) => current.map((line) => line.variantId === variantId ? { ...line, ...patch } : line));
}

function toPayloadItem(line: Line) {
  return { variantId: line.variantId, quantity: line.quantity, price: Number(line.price || 0) };
}

function lineTotal(lines: Line[]) {
  return lines.reduce((sum, line) => sum + Number(line.price || 0) * Number(line.quantity || 0), 0);
}

function getAvailable(variant: Variant) {
  return (variant.inventories ?? []).reduce((sum, inventory) => sum + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0), 0);
}

function getVariantLabel(variant?: Variant | null) {
  return [variant?.Size, variant?.Color, variant?.sku].filter(Boolean).join(" · ") || "Sin variante";
}

function getAccountCustomerName(account: CurrentAccountLookup) {
  const customer = account.customer;
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email || customer.phone || `Cliente #${account.customerId}`;
}

function getSuccessMessage(created: ManualReturn, settlementMethod: string) {
  const difference = Number(created.differenceAmount);
  if (difference < 0) {
    return `Devolucion #${created.id} registrada. Saldo a favor: ${money(Math.abs(difference))}.`;
  }
  if (difference > 0 && settlementMethod === "Cuenta corriente") {
    return `Devolucion #${created.id} registrada. Diferencia a cuenta corriente: ${money(difference)}.`;
  }
  if (difference > 0) {
    return `Devolucion #${created.id} registrada. Cobro en ${settlementMethod}: ${money(difference)}.`;
  }
  return `Devolucion #${created.id} registrada sin diferencia.`;
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 18, borderRadius: 22, border: "1px solid var(--border-soft)", background: "var(--page-panel-bg)", padding: 20 };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" };
const eyebrowStyle: React.CSSProperties = { margin: "0 0 8px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 11, fontWeight: 700 };
const titleStyle: React.CSSProperties = { margin: 0, color: "var(--text-strong)", fontSize: 34 };
const subtitleStyle: React.CSSProperties = { margin: 0, color: "var(--text-strong)" };
const copyStyle: React.CSSProperties = { margin: "8px 0 0", color: "var(--text-muted)" };
const formGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 };
const cardStyle: React.CSSProperties = { display: "grid", gap: 12, border: "1px solid var(--border-soft)", borderRadius: 18, background: "var(--page-panel-strong-bg)", padding: 16 };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 42, borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--page-panel-bg)", color: "var(--text-strong)", padding: "10px 12px" };
const smallInputStyle: React.CSSProperties = { ...inputStyle, width: 90 };
const primaryButtonStyle: React.CSSProperties = { border: 0, borderRadius: 12, background: "var(--theme-colors-primary, #111)", color: "var(--theme-colors-primary-contrast, #fff)", padding: "11px 14px", cursor: "pointer", fontWeight: 800 };
const ghostButtonStyle: React.CSSProperties = { border: "1px solid var(--border-soft)", borderRadius: 12, background: "transparent", color: "var(--text-strong)", padding: "9px 12px", cursor: "pointer", fontWeight: 700 };
const detailsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "center" };
const customerBoxStyle: React.CSSProperties = { position: "relative", display: "grid", gap: 8 };
const selectedAccountStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid rgba(22, 163, 74, .35)", borderRadius: 12, padding: "9px 10px", color: "var(--text-strong)", background: "rgba(22, 163, 74, .10)" };
const miniButtonStyle: React.CSSProperties = { border: "1px solid var(--border-soft)", borderRadius: 10, background: "transparent", color: "var(--text-strong)", padding: "6px 8px", cursor: "pointer", fontWeight: 700 };
const accountListStyle: React.CSSProperties = { position: "absolute", zIndex: 20, top: 48, left: 0, right: 0, display: "grid", gap: 6, border: "1px solid var(--border-soft)", borderRadius: 14, background: "var(--page-panel-bg)", padding: 8, boxShadow: "0 16px 40px rgba(0,0,0,.16)" };
const accountButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, border: "1px solid var(--border-soft)", borderRadius: 10, background: "transparent", color: "var(--text-strong)", padding: 9, cursor: "pointer", textAlign: "left" };
const settlementInfoStyle: React.CSSProperties = { minHeight: 42, display: "flex", alignItems: "center", borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--page-panel-bg)", color: "var(--text-muted)", padding: "10px 12px" };
const pickerListStyle: React.CSSProperties = { display: "grid", gap: 8, maxHeight: 260, overflow: "auto" };
const pickerButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", textAlign: "left", border: "1px solid var(--border-soft)", borderRadius: 12, background: "transparent", color: "var(--text-strong)", padding: 10, cursor: "pointer" };
const lineListStyle: React.CSSProperties = { display: "grid", gap: 8 };
const lineStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto auto", gap: 8, alignItems: "center", border: "1px solid var(--border-soft)", borderRadius: 12, padding: 10 };
const subtotalStyle: React.CSSProperties = { color: "var(--text-strong)", justifySelf: "end" };
const historyListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const historyCardStyle: React.CSSProperties = { display: "grid", gap: 10, border: "1px solid var(--border-soft)", borderRadius: 14, padding: 14 };
const historyItemsStyle: React.CSSProperties = { display: "grid", gap: 5, color: "var(--text-muted)", fontSize: 13 };
const mutedStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: 12 };
const stateStyle: React.CSSProperties = { padding: 14, borderRadius: 12, border: "1px solid var(--border-soft)", color: "var(--text-muted)" };
const errorStyle: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 12, border: "1px solid var(--admin-danger-border)", background: "var(--admin-danger-bg)", color: "var(--admin-danger-color)" };
const successStyle: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 12, border: "1px solid rgba(22, 163, 74, .35)", background: "rgba(22, 163, 74, .12)", color: "var(--text-strong)" };
const differenceStyle = (value: number): React.CSSProperties => ({ color: value > 0 ? "var(--text-strong)" : "var(--text-muted)", fontSize: 20 });
