"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { api, apiBlob } from "@/lib/api";
import { downloadBlobFile } from "@/lib/download";
import { money } from "./order-utils";
import type { ManualReturnDraft } from "@/components/manual-sales/ManualReturnsPanel";

type CashRegisterMode = "automatic" | "manual";

type CashMovement = {
  id: string;
  kind: "sale_payment" | "current_account_payment" | "current_account_assignment" | "manual_return_payment";
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
  currentAccountDebt?: number;
  currentAccountDebtCount?: number;
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

export type ManualSaleHistoryOrder = {
  id: number;
  status: string;
  createdAt: string;
  subtotal?: string | number;
  discountAmount?: string | number | null;
  total: string | number;
  customerFirstNameSnapshot?: string | null;
  customerLastNameSnapshot?: string | null;
  customerEmailSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  payments?: Array<{
    method?: string | null;
    provider?: string | null;
    status: string;
    amount?: string | number;
  }>;
  items?: Array<{
    id: number;
    quantity: number;
    price: string | number;
    variant?: {
      id: number;
      sku?: string | null;
      Size?: string | null;
      Color?: string | null;
      product?: { title: string } | null;
    } | null;
  }>;
};

export default function AdminCashRegisterSection({
  storeLocationId,
  onGenerateReturn,
}: {
  storeLocationId?: number | null;
  onGenerateReturn?: (draft: ManualReturnDraft) => void;
}) {
  const { user } = useAuth();
  const [payload, setPayload] = useState<CashPayload | null>(null);
  const [history, setHistory] = useState<CashPayload[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [salesHistoryOpen, setSalesHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<"daily" | "range">("daily");
  const [rangeSummary, setRangeSummary] = useState<CashSummary | null>(null);
  const [rangeStart, setRangeStart] = useState(() => firstDayOfCurrentMonth());
  const [rangeEnd, setRangeEnd] = useState(() => todayInputValue());
  const [rangeLoading, setRangeLoading] = useState(false);
  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [salesHistory, setSalesHistory] = useState<ManualSaleHistoryOrder[]>([]);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesLoading, setSalesLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const mode = payload?.mode ?? "automatic";
  const session = payload?.session ?? null;
  const summary = payload?.summary ?? null;
  const canCloseManual = mode === "manual" && Boolean(session?.id && !session.closedAt);
  const canOpenNewManual = mode === "manual" && Boolean(session?.closedAt);
  const canPrint = mode === "automatic" || Boolean(session?.closedAt);

  const cashCardTotals = useMemo(
    () => ({
      efectivo: methodTotal(summary?.byMethod, ["Efectivo"]),
      transferencia: methodTotal(summary?.byMethod, ["Transferencia"]),
      tarjeta: methodTotal(summary?.byMethod, ["Tarjeta"]),
      cuentaCorriente: Number(summary?.accountAssignedTotal ?? 0),
    }),
    [summary],
  );

  useEffect(() => {
    void loadCurrent();
    void loadSalesHistory();
  }, [storeLocationId]);

  async function loadCurrent() {
    setLoading(true);
    setError("");
    try {
      const data = (await api(withStoreLocationQuery("/cash-register/current", storeLocationId))) as CashPayload;
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

  async function loadSalesHistory() {
    setSalesLoading(true);
    setError("");
    try {
      const data = await api(withStoreLocationQuery("/orders/manual/list", storeLocationId));
      setSalesHistory(Array.isArray(data) ? (data as ManualSaleHistoryOrder[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial de ventas.");
    } finally {
      setSalesLoading(false);
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
          storeLocationId: storeLocationId ?? undefined,
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
          storeLocationId: storeLocationId ?? undefined,
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
    setHistoryTab("daily");
    setError("");
    try {
      const [historyData] = await Promise.all([
        api(withStoreLocationQuery("/cash-register/history", storeLocationId)),
        loadRangeSummary(),
      ]);
      setHistory(Array.isArray(historyData) ? (historyData as CashPayload[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
      setHistory([]);
    }
  }

  async function openSalesHistory() {
    setSalesHistoryOpen(true);
    await loadSalesHistory();
  }

  async function loadRangeSummary(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setRangeLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (rangeStart) params.set("start", rangeStart);
      if (rangeEnd) params.set("end", rangeEnd);
      appendStoreLocationParam(params, storeLocationId);
      const data = (await api(`/cash-register/range-summary?${params.toString()}`)) as CashSummary;
      setRangeSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el resumen por fechas.");
    } finally {
      setRangeLoading(false);
    }
  }

  function printRangeSummary() {
    if (!rangeSummary) return;

    const methodRows = Object.entries(rangeSummary.byMethod ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => `<tr><td>${escapeHtml(method)}</td><td>${money(amount)}</td></tr>`)
      .join("");
    const accountRows = Object.entries(rangeSummary.byAccountMethod ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => `<tr><td>${escapeHtml(method)}</td><td>${money(amount)}</td></tr>`)
      .join("");
    const printWindow = window.open("", "_blank", "width=820,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Resumen de caja</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #1f1f1f; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            .meta { color: #555; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
            .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; }
            .box span { display: block; color: #666; font-size: 12px; text-transform: uppercase; }
            .box strong { font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { text-align: left; border-bottom: 1px solid #ddd; padding: 8px; }
            th { font-size: 12px; text-transform: uppercase; color: #666; }
            td:last-child { text-align: right; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Resumen de caja</h1>
          <div class="meta">Desde ${escapeHtml(rangeStart)} hasta ${escapeHtml(rangeEnd)}${user?.storeLocation?.name ? ` - ${escapeHtml(user.storeLocation.name)}` : ""}</div>
          <div class="grid">
            <div class="box"><span>Recibido</span><strong>${money(rangeSummary.receivedTotal)}</strong></div>
            <div class="box"><span>Asignado a cuenta corriente</span><strong>${money(rangeSummary.accountAssignedTotal ?? 0)}</strong></div>
            <div class="box"><span>Deuda cuentas corrientes</span><strong>${money(rangeSummary.currentAccountDebt ?? 0)}</strong></div>
            <div class="box"><span>Clientes con deuda</span><strong>${rangeSummary.currentAccountDebtCount ?? 0}</strong></div>
            <div class="box"><span>Movimientos</span><strong>${rangeSummary.movementCount}</strong></div>
          </div>
          <h2>Recibido por metodo</h2>
          <table><tbody>${methodRows || "<tr><td>Sin cobros</td><td>$0</td></tr>"}</tbody></table>
          <h2>Cuenta corriente por metodo</h2>
          <table><tbody>${accountRows || "<tr><td>Sin ventas asignadas</td><td>$0</td></tr>"}</tbody></table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function downloadClosure(targetPayload = payload) {
    if (!targetPayload?.session || !targetPayload.summary) return;
    setSaving(true);
    setError("");
    try {
      const sessionId = targetPayload.session.id;
      const params = new URLSearchParams();
      params.set("sessionId", String(sessionId));
      appendStoreLocationParam(params, storeLocationId);
      const blob = await apiBlob(`/cash-register/closure.pdf?${params.toString()}`);
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
          <div class="meta">${cashTitle(targetPayload)} - ${formatDate(targetSession.openedAt)}${targetSession.closedAt ? ` a ${formatDate(targetSession.closedAt)}` : ""}</div>
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
          <button type="button" onClick={() => void openSalesHistory()} style={softButtonStyle}>
            Historial de ventas
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
            <Stat label="Efectivo" value={cashCardMoney(cashCardTotals.efectivo)} />
            <Stat label="Transferencia" value={cashCardMoney(cashCardTotals.transferencia)} />
            <Stat label="Tarjeta" value={cashCardMoney(cashCardTotals.tarjeta)} />
            <Stat label="Cuenta corriente" value={cashCardMoney(cashCardTotals.cuentaCorriente)} />
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
                      {" - "}
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
                      {" - "}
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
                <h3 style={modalTitleStyle}>
                  {historyTab === "daily" ? "Cierres anteriores" : "Resumen por fechas"}
                </h3>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} style={softButtonStyle}>
                Cerrar
              </button>
            </header>
            <div style={tabsStyle} role="tablist" aria-label="Historial de caja">
              <button
                type="button"
                role="tab"
                aria-selected={historyTab === "daily"}
                onClick={() => setHistoryTab("daily")}
                style={tabButtonStyle(historyTab === "daily")}
              >
                Cierres diarios
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={historyTab === "range"}
                onClick={() => setHistoryTab("range")}
                style={tabButtonStyle(historyTab === "range")}
              >
                Resumen por fechas
              </button>
            </div>
            {historyTab === "daily" ? (
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
            ) : (
              <RangeSummaryPanel
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                rangeSummary={rangeSummary}
                rangeLoading={rangeLoading}
                onStartChange={setRangeStart}
                onEndChange={setRangeEnd}
                onSubmit={loadRangeSummary}
                onPrint={printRangeSummary}
              />
            )}
          </div>
        </div>
      ) : null}

      {salesHistoryOpen ? (
        <SalesHistoryModal
          salesHistory={salesHistory}
          salesSearch={salesSearch}
          salesLoading={salesLoading}
          onSearchChange={setSalesSearch}
          onRefresh={loadSalesHistory}
          onClose={() => setSalesHistoryOpen(false)}
          onGenerateReturn={onGenerateReturn}
          onError={setError}
        />
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

function RangeSummaryPanel({
  rangeStart,
  rangeEnd,
  rangeSummary,
  rangeLoading,
  onStartChange,
  onEndChange,
  onSubmit,
  onPrint,
}: {
  rangeStart: string;
  rangeEnd: string;
  rangeSummary: CashSummary | null;
  rangeLoading: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onPrint: () => void;
}) {
  return (
    <section style={cardStyle}>
      <div>
        <p style={eyebrowStyle}>Control por fechas</p>
        <h3 style={subtitleStyle}>Resumen acumulado</h3>
        <p style={copyStyle}>Totales de caja para el periodo seleccionado y deuda vigente de cuentas corrientes.</p>
      </div>
      <form style={rangeFormStyle} onSubmit={onSubmit}>
        <label style={fieldStyle}>
          <span>Desde</span>
          <input
            type="date"
            value={rangeStart}
            onChange={(event) => onStartChange(event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={fieldStyle}>
          <span>Hasta</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(event) => onEndChange(event.target.value)}
            style={inputStyle}
          />
        </label>
        <button type="submit" style={primaryButtonStyle} disabled={rangeLoading}>
          {rangeLoading ? "Calculando..." : "Actualizar"}
        </button>
        <button type="button" style={softButtonStyle} disabled={!rangeSummary || rangeLoading} onClick={onPrint}>
          Imprimir resumen
        </button>
      </form>
      {rangeLoading && !rangeSummary ? <State label="Calculando resumen..." /> : null}
      {rangeSummary ? (
        <>
          <div style={statsGridStyle}>
            <Stat label="Recibido" value={money(rangeSummary.receivedTotal)} />
            <Stat label="Asignado a cuenta corriente" value={money(rangeSummary.accountAssignedTotal ?? 0)} />
            <Stat label="Deuda cuentas corrientes" value={money(rangeSummary.currentAccountDebt ?? 0)} />
            <Stat label="Clientes con deuda" value={String(rangeSummary.currentAccountDebtCount ?? 0)} />
            <Stat label="Movimientos" value={String(rangeSummary.movementCount)} />
          </div>
          <div style={twoColumnStyle}>
            <div style={methodListStyle}>
              <p style={eyebrowStyle}>Recibido por metodo</p>
              {Object.entries(rangeSummary.byMethod ?? {}).length ? (
                Object.entries(rangeSummary.byMethod)
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, amount]) => (
                    <div key={method} style={methodRowStyle}>
                      <span>{method}</span>
                      <strong>{money(amount)}</strong>
                    </div>
                  ))
              ) : (
                <p style={copyStyle}>Sin cobros en el periodo.</p>
              )}
            </div>
            <div style={methodListStyle}>
              <p style={eyebrowStyle}>Cuenta corriente por metodo</p>
              {Object.entries(rangeSummary.byAccountMethod ?? {}).length ? (
                Object.entries(rangeSummary.byAccountMethod ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, amount]) => (
                    <div key={method} style={methodRowStyle}>
                      <span>{method}</span>
                      <strong>{money(amount)}</strong>
                    </div>
                  ))
              ) : (
                <p style={copyStyle}>Sin ventas asignadas a cuenta corriente.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export function SalesHistoryModal({
  salesHistory,
  salesSearch,
  salesLoading,
  onSearchChange,
  onRefresh,
  onClose,
  onGenerateReturn,
  onError,
}: {
  salesHistory: ManualSaleHistoryOrder[];
  salesSearch: string;
  salesLoading: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => Promise<void> | void;
  onClose: () => void;
  onGenerateReturn?: (draft: ManualReturnDraft) => void;
  onError?: (message: string) => void;
}) {
  const filteredSalesHistory = useMemo(() => {
    const normalized = salesSearch.trim().toLowerCase();
    const activeSales = salesHistory.filter((sale) => sale.status !== "cancelled");

    if (!normalized) return activeSales.slice(0, 80);

    return activeSales.filter((sale) =>
      [
        String(sale.id),
        saleCustomerName(sale),
        salePaymentMethod(sale),
        ...(sale.items ?? []).flatMap((item) => [
          item.variant?.product?.title,
          item.variant?.sku,
          item.variant?.Size,
          item.variant?.Color,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    ).slice(0, 80);
  }, [salesHistory, salesSearch]);

  function generateReturnFromSale(sale: ManualSaleHistoryOrder) {
    const returnedLines = (sale.items ?? [])
      .filter((item) => item.variant?.id && Number(item.quantity) > 0)
      .map((item) => {
        const unitPrice = effectiveUnitPrice(sale, item);
        const variant = item.variant!;

        return {
          variantId: variant.id,
          title: variant.product?.title || "Producto",
          variantLabel: formatVariantMeta(getVariantLabel(variant), variant.sku),
          sku: variant.sku || "",
          quantity: Number(item.quantity || 1),
          price: String(unitPrice),
          unitPrice,
          available: 0,
          paidPriceLocked: true,
        };
      });

    if (!returnedLines.length) {
      onError?.("La venta no tiene productos disponibles para cargar una devolucion.");
      return;
    }

    onGenerateReturn?.({
      sourceOrderId: sale.id,
      customerName: saleCustomerName(sale),
      returnedPaymentMethod: normalizeReturnPaymentMethod(salePaymentMethod(sale)),
      returnedLines,
    });
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={wideModalStyle} onClick={(event) => event.stopPropagation()}>
        <header style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Historial</p>
            <h3 style={modalTitleStyle}>Ventas para devoluciones</h3>
            <p style={copyStyle}>Busca una venta para ver productos, precios pagados y generar la devolucion con esos valores.</p>
          </div>
          <div style={actionsStyle}>
            <button type="button" onClick={() => void onRefresh()} style={softButtonStyle} disabled={salesLoading}>
              {salesLoading ? "Actualizando..." : "Actualizar"}
            </button>
            <button type="button" onClick={onClose} style={softButtonStyle}>
              Cerrar
            </button>
          </div>
        </header>
        <input
          value={salesSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por cliente, producto, SKU, metodo o numero de venta"
          style={inputStyle}
          autoFocus
        />
        {salesLoading ? <State label="Cargando ventas..." /> : null}
        {!salesLoading && filteredSalesHistory.length === 0 ? (
          <State label="No hay ventas para la busqueda." />
        ) : null}
        {!salesLoading && filteredSalesHistory.length > 0 ? (
          <div style={salesTableWrapStyle}>
            <table style={salesTableStyle}>
              <thead>
                <tr>
                  <th style={salesThStyle}>Fecha</th>
                  <th style={salesThStyle}>Cliente</th>
                  <th style={salesThStyle}>Productos</th>
                  <th style={salesThStyle}>Precio vendido</th>
                  <th style={salesThStyle}>Metodo</th>
                  <th style={salesThStyle}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesHistory.map((sale) => (
                  <tr key={sale.id}>
                    <td style={salesTdStyle}>
                      <strong>#{sale.id}</strong>
                      <span style={mutedStyle}>{formatDate(sale.createdAt)}</span>
                    </td>
                    <td style={salesTdStyle}>{saleCustomerName(sale)}</td>
                    <td style={salesTdStyle}>
                      <div style={saleItemsStyle}>
                        {(sale.items ?? []).map((item) => (
                          <span key={item.id}>
                            {item.variant?.product?.title || "Producto"} {formatVariantMeta(getVariantLabel(item.variant), item.variant?.sku)} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={salesTdStyle}>
                      <div style={saleItemsStyle}>
                        {(sale.items ?? []).map((item) => (
                          <span key={item.id}>{money(effectiveUnitPrice(sale, item))} c/u</span>
                        ))}
                      </div>
                    </td>
                    <td style={salesTdStyle}>{salePaymentMethod(sale)}</td>
                    <td style={salesTdStyle}>
                      <button type="button" onClick={() => generateReturnFromSale(sale)} style={primaryButtonStyle}>
                        Generar devolucion
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayInputValue() {
  return formatInputDate(new Date());
}

function firstDayOfCurrentMonth() {
  const now = new Date();
  return formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function appendStoreLocationParam(params: URLSearchParams, storeLocationId?: number | null) {
  if (storeLocationId) {
    params.set("storeLocationId", String(storeLocationId));
  }
}

function withStoreLocationQuery(path: string, storeLocationId?: number | null) {
  const params = new URLSearchParams();
  appendStoreLocationParam(params, storeLocationId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function methodTotal(
  values: Record<string, number> | undefined,
  labels: string[],
) {
  if (!values) return 0;
  const normalizedLabels = new Set(labels.map(normalizeMethodKey));

  return Object.entries(values).reduce((total, [method, amount]) => {
    return normalizedLabels.has(normalizeMethodKey(method))
      ? total + Number(amount || 0)
      : total;
  }, 0);
}

function normalizeMethodKey(method: string) {
  return method.trim().toLowerCase();
}

function cashCardMoney(value: number) {
  return money(roundToNearestHundred(value));
}

function roundToNearestHundred(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 100) * 100;
}

function saleCustomerName(sale: ManualSaleHistoryOrder) {
  return (
    [sale.customerFirstNameSnapshot, sale.customerLastNameSnapshot].filter(Boolean).join(" ").trim() ||
    [sale.customer?.firstName, sale.customer?.lastName].filter(Boolean).join(" ").trim() ||
    sale.customerEmailSnapshot ||
    sale.customerPhoneSnapshot ||
    sale.customer?.email ||
    sale.customer?.phone ||
    "Sin cliente"
  );
}

function salePaymentMethod(sale: ManualSaleHistoryOrder) {
  const payment = sale.payments?.find((entry) => entry.status === "approved" || entry.status === "paid") ?? sale.payments?.[0];
  return payment?.method?.trim() || payment?.provider || "Sin metodo";
}

function normalizeReturnPaymentMethod(method: string) {
  if (method === "Cuenta corriente") return "Cuenta corriente";
  if (method === "Tarjeta") return "Tarjeta";
  if (method === "Transferencia") return "Transferencia";
  return "Efectivo";
}

function effectiveUnitPrice(
  sale: ManualSaleHistoryOrder,
  item: NonNullable<ManualSaleHistoryOrder["items"]>[number],
) {
  const quantity = Math.max(Number(item.quantity || 1), 1);
  const lineSubtotal = Number(item.price ?? 0) * quantity;
  const orderSubtotal = Number(sale.subtotal ?? 0);
  const discountAmount = Math.max(Number(sale.discountAmount ?? 0), 0);
  const proportionalDiscount = orderSubtotal > 0
    ? Math.min(discountAmount * (lineSubtotal / orderSubtotal), lineSubtotal)
    : 0;

  return roundMoney(Math.max((lineSubtotal - proportionalDiscount) / quantity, 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getVariantLabel(variant?: { Size?: string | null; Color?: string | null } | null) {
  return [variant?.Size, variant?.Color]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" - ");
}

function formatVariantMeta(label?: string | null, sku?: string | null) {
  return [label?.trim(), sku?.trim()].filter(Boolean).join(" - ") || "Sin variante";
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
const rangeFormStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(160px, 220px)) auto auto", gap: 12, alignItems: "end" };
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
const wideModalStyle: React.CSSProperties = { ...modalStyle, width: "min(1180px, 100%)" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" };
const tabsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6, padding: 4, borderRadius: 14, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)" };
const tabButtonStyle = (active: boolean): React.CSSProperties => ({ border: 0, borderRadius: 10, background: active ? "var(--account-item-bg-active)" : "transparent", color: "var(--account-text-strong)", padding: "10px 12px", cursor: "pointer", fontWeight: 800 });
const historyListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const historyItemStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 12, alignItems: "center", padding: 14, borderRadius: 14, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)" };
const historyAmountsStyle: React.CSSProperties = { display: "grid", gap: 4, textAlign: "right", color: "var(--account-text-muted)" };
const salesTableWrapStyle: React.CSSProperties = { width: "100%", overflowX: "auto", border: "1px solid var(--account-item-border)", borderRadius: 16 };
const salesTableStyle: React.CSSProperties = { width: "100%", minWidth: 980, borderCollapse: "collapse", background: "var(--account-surface-bg)" };
const salesThStyle: React.CSSProperties = { padding: "12px 14px", textAlign: "left", borderBottom: "1px solid var(--account-item-border)", color: "var(--account-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" };
const salesTdStyle: React.CSSProperties = { padding: 14, borderBottom: "1px solid var(--account-item-border)", color: "var(--account-text-strong)", verticalAlign: "top" };
const saleItemsStyle: React.CSSProperties = { display: "grid", gap: 6, color: "var(--account-text-muted)", minWidth: 0 };
