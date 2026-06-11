"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { api, apiBlob } from "@/lib/api";
import { downloadBlobFile } from "@/lib/download";
import { money } from "./order-utils";

type CashRegisterMode = "automatic" | "manual";

type CashMovement = {
  id: string;
  kind: "sale_payment" | "current_account_payment" | "current_account_assignment";
  createdAt: string;
  method: string;
  amount: number;
  description: string;
  orderId?: number | null;
  customerName?: string | null;
};

type CashSummary = {
  range: { start: string; end: string };
  openingAmount: number;
  receivedTotal: number;
  expectedAmount: number;
  movementCount: number;
  accountAssignedTotal?: number;
  accountAssignedCount?: number;
  byMethod: Record<string, number>;
  byAccountMethod?: Record<string, number>;
  movements: CashMovement[];
  accountAssignedMovements?: CashMovement[];
};

type CashSession = {
  id: number;
  mode: CashRegisterMode;
  businessDate?: string | null;
  openingAmount: string | number;
  expectedAmount?: string | number | null;
  closingAmount?: string | number | null;
  receivedAmount?: string | number | null;
  differenceAmount?: string | number | null;
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
};

type CashPayload = {
  mode: CashRegisterMode;
  session: CashSession | null;
  summary: CashSummary | null;
};

export default function AdminCashRegisterSection() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<CashPayload | null>(null);
  const [history, setHistory] = useState<CashPayload[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const mode = payload?.mode ?? "automatic";
  const session = payload?.session ?? null;
  const summary = payload?.summary ?? null;
  const canCloseManual = mode === "manual" && Boolean(session?.id && !session.closedAt);
  const canOpenNewManual = mode === "manual" && Boolean(session?.closedAt);
  const canPrint = mode === "automatic" || Boolean(session?.closedAt);

  const methods = useMemo(
    () => Object.entries(summary?.byMethod ?? {}).sort((a, b) => b[1] - a[1]),
    [summary],
  );
  const accountMethods = useMemo(
    () => Object.entries(summary?.byAccountMethod ?? {}).sort((a, b) => b[1] - a[1]),
    [summary],
  );

  useEffect(() => {
    void loadCurrent();
  }, []);

  async function loadCurrent() {
    setLoading(true);
    setError("");
    try {
      const data = (await api("/cash-register/current")) as CashPayload;
      setPayload(data);
      if (data.summary) {
        setClosingAmount(String(data.summary.expectedAmount));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la caja.");
    } finally {
      setLoading(false);
    }
  }

  async function openManualCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = (await api("/cash-register/open", {
        method: "POST",
        body: JSON.stringify({
          openingAmount: Number(openingAmount || 0),
          notes: notes.trim() || undefined,
        }),
      })) as CashPayload;
      setPayload(data);
      setOpeningAmount("");
      setNotes("");
      setClosingAmount(String(data.summary?.expectedAmount ?? 0));
      setOpeningModalOpen(false);
      setMessage("Caja abierta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la caja.");
    } finally {
      setSaving(false);
    }
  }

  async function closeManualCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = (await api("/cash-register/close", {
        method: "POST",
        body: JSON.stringify({
          closingAmount: Number(closingAmount || 0),
          notes: notes.trim() || undefined,
        }),
      })) as CashPayload;
      setPayload(data);
      setNotes("");
      setMessage("Caja cerrada. Ya podes imprimir el cierre.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la caja.");
    } finally {
      setSaving(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    setError("");
    try {
      const data = await api("/cash-register/history");
      setHistory(Array.isArray(data) ? (data as CashPayload[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
      setHistory([]);
    }
  }

  async function downloadClosure(targetPayload = payload) {
    if (!targetPayload?.session || !targetPayload.summary) return;
    setSaving(true);
    setError("");
    try {
      const sessionId = targetPayload.session.id;
      const blob = await apiBlob(`/cash-register/closure.pdf?sessionId=${sessionId}`);
      downloadBlobFile(blob, `cierre-caja-${sessionId}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el cierre de caja.");
    } finally {
      setSaving(false);
    }
    return;
    /*
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;
    const targetSession = targetPayload.session;
    const targetSummary = targetPayload.summary;
    const isManualPrint = targetPayload.mode === "manual";
    const methodRows = Object.entries(targetSummary.byMethod)
      .map(([method, amount]) => `<tr><td>${escapeHtml(method)}</td><td>${money(amount)}</td></tr>`)
      .join("");
    const movementRows = targetSummary.movements
      .map((movement) => `<tr><td>${formatDate(movement.createdAt)}</td><td>${escapeHtml(movement.method)}</td><td>${escapeHtml(movement.description)}</td><td>${money(movement.amount)}</td></tr>`)
      .join("");
    printWindow.document.write(`
      <html>
        <head>
          <title>Cierre de caja</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #1f1f1f; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            .meta { color: #555; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
            .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; }
            .box span { display: block; color: #666; font-size: 12px; text-transform: uppercase; }
            .box strong { font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { text-align: left; border-bottom: 1px solid #ddd; padding: 8px; }
            th { font-size: 12px; text-transform: uppercase; color: #666; }
          </style>
        </head>
        <body>
          <h1>Cierre de caja</h1>
          <div class="meta">${cashTitle(targetPayload)} · ${formatDate(targetSession.openedAt)}${targetSession.closedAt ? ` a ${formatDate(targetSession.closedAt)}` : ""}</div>
          <div class="grid">
            ${isManualPrint ? `<div class="box"><span>Apertura</span><strong>${money(targetSummary.openingAmount)}</strong></div>` : ""}
            <div class="box"><span>Recibido</span><strong>${money(targetSummary.receivedTotal)}</strong></div>
            ${isManualPrint ? `<div class="box"><span>Total esperado en caja</span><strong>${money(targetSummary.expectedAmount)}</strong></div>` : ""}
          </div>
          <h2>Por medio de pago</h2>
          <table><tbody>${methodRows || "<tr><td>Sin movimientos</td><td>$0</td></tr>"}</tbody></table>
          <h2>Movimientos</h2>
          <table><thead><tr><th>Fecha</th><th>Metodo</th><th>Detalle</th><th>Importe</th></tr></thead><tbody>${movementRows || "<tr><td colspan='4'>Sin movimientos</td></tr>"}</tbody></table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    */
  }

  return (
    <section data-account-panel style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Mostrador</p>
          <h2 style={titleStyle}>Caja</h2>
          <p style={copyStyle}>
            {mode === "automatic"
              ? "Caja automatica por dia, con movimientos recibidos y cierre imprimible."
              : "Caja manual para abrir, controlar movimientos y cerrar cuando corresponda."}
          </p>
          {user?.storeLocation?.name ? (
            <p style={mutedStyle}>Local: {user.storeLocation.name}</p>
          ) : null}
        </div>
        <div style={actionsStyle}>
          {canOpenNewManual ? (
            <button type="button" onClick={() => setOpeningModalOpen(true)} style={primaryButtonStyle} disabled={saving}>
              Abrir nueva caja
            </button>
          ) : null}
          <button type="button" onClick={() => void openHistory()} style={softButtonStyle}>
            Historial
          </button>
          <button type="button" onClick={() => void downloadClosure()} style={primaryButtonStyle} disabled={!canPrint || !summary || saving}>
            Descargar cierre
          </button>
        </div>
      </header>

      {error ? <p style={errorStyle}>{error}</p> : null}
      {message ? <p style={successStyle}>{message}</p> : null}

      {loading ? <State label="Cargando caja..." /> : null}

      {!loading && mode === "manual" && !session ? (
        <form style={cardStyle} onSubmit={openManualCash}>
          <div>
            <p style={eyebrowStyle}>Apertura manual</p>
            <h3 style={subtitleStyle}>Abrir caja</h3>
            <p style={copyStyle}>Indica con cuanto efectivo inicia la caja.</p>
          </div>
          <label style={fieldStyle}>
            <span>Importe inicial</span>
            <div style={moneyInputWrapStyle}>
              <span style={moneyPrefixStyle}>$</span>
              <input
                value={openingAmount}
                onChange={(event) => setOpeningAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
          </label>
          <label style={fieldStyle}>
            <span>Notas</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            />
          </label>
          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving ? "Abriendo..." : "Abrir caja"}
          </button>
        </form>
      ) : null}

      {!loading && session && summary ? (
        <>
          <div style={statsGridStyle}>
            {mode === "manual" ? <Stat label="Apertura" value={money(summary.openingAmount)} /> : null}
            <Stat label="Recibido" value={money(summary.receivedTotal)} />
            <Stat label="Cuenta corriente" value={money(summary.accountAssignedTotal ?? 0)} />
            {mode === "manual" ? <Stat label="Total esperado en caja" value={money(summary.expectedAmount)} /> : null}
            <Stat label="Movimientos" value={String(summary.movementCount)} />
          </div>

          <div style={twoColumnStyle}>
            <section style={cardStyle}>
              <div>
                <p style={eyebrowStyle}>{mode === "automatic" ? "Caja automatica" : "Caja manual"}</p>
                <h3 style={subtitleStyle}>{cashTitle(payload)}</h3>
                <p style={copyStyle}>
                  {formatDate(session.openedAt)}
                  {session.closedAt ? ` a ${formatDate(session.closedAt)}` : ""}
                </p>
              </div>

              <div style={methodListStyle}>
                <p style={eyebrowStyle}>Recibido por metodo</p>
                {methods.length ? methods.map(([method, amount]) => (
                  <div key={method} style={methodRowStyle}>
                    <span>{method}</span>
                    <strong>{money(amount)}</strong>
                  </div>
                )) : <p style={copyStyle}>Todavia no hay movimientos recibidos.</p>}
              </div>
              <div style={methodListStyle}>
                <p style={eyebrowStyle}>Asignado a cuenta corriente</p>
                {accountMethods.length ? accountMethods.map(([method, amount]) => (
                  <div key={method} style={methodRowStyle}>
                    <span>{method}</span>
                    <strong>{money(amount)}</strong>
                  </div>
                )) : <p style={copyStyle}>Todavia no hay importes asignados a cuenta corriente.</p>}
              </div>
            </section>

            {canCloseManual ? (
              <form style={cardStyle} onSubmit={closeManualCash}>
                <div>
                  <p style={eyebrowStyle}>Cierre manual</p>
                  <h3 style={subtitleStyle}>Cerrar caja</h3>
                </div>
                <label style={fieldStyle}>
                  <span>Importe final contado</span>
                  <div style={moneyInputWrapStyle}>
                    <span style={moneyPrefixStyle}>$</span>
                    <input
                      value={closingAmount}
                      onChange={(event) => setClosingAmount(event.target.value)}
                      inputMode="decimal"
                      style={{ ...inputStyle, paddingLeft: 30 }}
                    />
                  </div>
                </label>
                <label style={fieldStyle}>
                  <span>Notas de cierre</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  />
                </label>
                <button type="submit" disabled={saving} style={primaryButtonStyle}>
                  {saving ? "Cerrando..." : "Cerrar caja"}
                </button>
              </form>
            ) : null}
          </div>

          <section style={cardStyle}>
            <div>
              <p style={eyebrowStyle}>Movimientos</p>
              <h3 style={subtitleStyle}>Recibido en caja</h3>
            </div>
            <div style={movementListStyle}>
              {summary.movements.map((movement) => (
                <article key={movement.id} style={movementStyle}>
                  <div>
                    <strong>{movement.description}</strong>
                    <p style={copyStyle}>
                      {movement.customerName || "Sin cliente"}
                      {" · "}
                      {movement.method}
                    </p>
                    <span style={mutedStyle}>{formatDate(movement.createdAt)}</span>
                  </div>
                  <strong>{money(movement.amount)}</strong>
                </article>
              ))}
              {!summary.movements.length ? <State label="No hay movimientos para esta caja." /> : null}
            </div>
          </section>

          <section style={cardStyle}>
            <div>
              <p style={eyebrowStyle}>Cuenta corriente</p>
              <h3 style={subtitleStyle}>Asignado a cuenta corriente</h3>
            </div>
            <div style={movementListStyle}>
              {(summary.accountAssignedMovements ?? []).map((movement) => (
                <article key={movement.id} style={movementStyle}>
                  <div>
                    <strong>{movement.description}</strong>
                    <p style={copyStyle}>
                      {movement.customerName || "Sin cliente"}
                      {" Â· "}
                      {movement.method}
                    </p>
                    <span style={mutedStyle}>{formatDate(movement.createdAt)}</span>
                  </div>
                  <strong>{money(movement.amount)}</strong>
                </article>
              ))}
              {!(summary.accountAssignedMovements ?? []).length ? <State label="No hay importes asignados a cuenta corriente en esta caja." /> : null}
            </div>
          </section>
        </>
      ) : null}

      {historyOpen ? (
        <div style={modalOverlayStyle} onClick={() => setHistoryOpen(false)}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Historial</p>
                <h3 style={modalTitleStyle}>Cierres anteriores</h3>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} style={softButtonStyle}>
                Cerrar
              </button>
            </header>
            <div style={historyListStyle}>
              {history.map((item) => (
                <article key={item.session?.id ?? `${item.mode}-${item.summary?.range.start}`} style={historyItemStyle}>
                  <div>
                    <strong>{cashTitle(item)}</strong>
                    <span style={mutedStyle}>
                      {item.session ? formatDate(item.session.openedAt) : ""}
                      {item.session?.closedAt ? ` a ${formatDate(item.session.closedAt)}` : ""}
                    </span>
                  </div>
                  <div style={historyAmountsStyle}>
                    <span>Recibido {money(item.summary?.receivedTotal ?? 0)}</span>
                    {item.mode === "manual" ? (
                      <strong>Total esperado {money(item.summary?.expectedAmount ?? 0)}</strong>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => void downloadClosure(item)} style={softButtonStyle}>
                    Descargar
                  </button>
                </article>
              ))}
              {!history.length ? <State label="Todavia no hay cierres registrados." /> : null}
            </div>
          </div>
        </div>
      ) : null}

      {openingModalOpen ? (
        <div style={modalOverlayStyle} onClick={() => setOpeningModalOpen(false)}>
          <form style={modalStyle} onSubmit={openManualCash} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Apertura manual</p>
                <h3 style={modalTitleStyle}>Abrir nueva caja</h3>
              </div>
              <button type="button" onClick={() => setOpeningModalOpen(false)} style={softButtonStyle}>
                Cerrar
              </button>
            </header>
            <label style={fieldStyle}>
              <span>Importe inicial</span>
              <div style={moneyInputWrapStyle}>
                <span style={moneyPrefixStyle}>$</span>
                <input
                  value={openingAmount}
                  onChange={(event) => setOpeningAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  style={{ ...inputStyle, paddingLeft: 30 }}
                  autoFocus
                />
              </div>
            </label>
            <label style={fieldStyle}>
              <span>Notas</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              />
            </label>
            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Abriendo..." : "Abrir caja"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function cashTitle(payload: CashPayload | null) {
  if (!payload?.session) return "Caja";
  if (payload.mode === "automatic") {
    return `Caja del dia #${payload.session.id}`;
  }
  return payload.session.closedAt ? `Caja cerrada #${payload.session.id}` : `Caja abierta #${payload.session.id}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function State({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 20 };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "flex-start" };
const actionsStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.16em", fontSize: 11, color: "var(--account-text-soft)" };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 30, color: "var(--account-text-strong)" };
const subtitleStyle: React.CSSProperties = { margin: 0, fontSize: 22, color: "var(--account-text-strong)" };
const modalTitleStyle: React.CSSProperties = { margin: 0, fontSize: 24, color: "var(--account-text-strong)" };
const copyStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-muted)", lineHeight: 1.5 };
const mutedStyle: React.CSSProperties = { display: "block", marginTop: 4, color: "var(--account-text-muted)", fontSize: 12 };
const statsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 };
const statStyle: React.CSSProperties = { padding: 16, borderRadius: 16, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)", display: "grid", gap: 6 };
const twoColumnStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, alignItems: "start" };
const cardStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 18, background: "var(--account-item-bg)", padding: 18, display: "grid", gap: 14 };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 8, color: "var(--account-text-muted)", fontWeight: 700 };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 44, borderRadius: 12, border: "1px solid var(--account-item-border)", background: "var(--account-surface-bg)", color: "var(--account-text-strong)", padding: "10px 12px" };
const moneyInputWrapStyle: React.CSSProperties = { position: "relative", minWidth: 0 };
const moneyPrefixStyle: React.CSSProperties = { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--account-text-muted)", fontWeight: 800, pointerEvents: "none" };
const methodListStyle: React.CSSProperties = { display: "grid", gap: 8 };
const methodRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--account-item-border)" };
const movementListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const movementStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 14, border: "1px solid var(--account-item-border)", background: "var(--account-surface-bg)" };
const primaryButtonStyle: React.CSSProperties = { border: 0, borderRadius: 12, background: "var(--account-item-bg-active)", color: "var(--account-text-strong)", padding: "10px 14px", cursor: "pointer", fontWeight: 800 };
const softButtonStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 12, background: "transparent", color: "var(--account-text-strong)", padding: "10px 14px", cursor: "pointer", fontWeight: 700 };
const errorStyle: React.CSSProperties = { margin: 0, padding: 14, borderRadius: 14, border: "1px solid var(--admin-danger-border)", background: "var(--admin-danger-bg)", color: "var(--admin-danger-color)" };
const successStyle: React.CSSProperties = { margin: 0, padding: 14, borderRadius: 14, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg-active)", color: "var(--account-text-strong)" };
const stateStyle: React.CSSProperties = { padding: 22, borderRadius: 16, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)", color: "var(--account-text-muted)" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 120, background: "var(--admin-overlay-bg, rgba(0,0,0,.42))", display: "grid", placeItems: "center", padding: 16 };
const modalStyle: React.CSSProperties = { width: "min(760px, 100%)", maxHeight: "min(760px, calc(100vh - 32px))", overflow: "auto", borderRadius: 20, border: "1px solid var(--account-item-border)", background: "var(--account-sidebar-bg)", padding: 20, display: "grid", gap: 16, boxShadow: "var(--admin-modal-shadow)" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" };
const historyListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const historyItemStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 12, alignItems: "center", padding: 14, borderRadius: 14, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)" };
const historyAmountsStyle: React.CSSProperties = { display: "grid", gap: 4, textAlign: "right", color: "var(--account-text-muted)" };
