"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money } from "./order-utils";

type Customer = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  document?: string | null;
};

type Movement = {
  id: number;
  type: string;
  amount: string | number;
  paymentMethod?: string | null;
  description?: string | null;
  createdAt: string;
  balanceAfter: string | number;
  order?: { id: number; total: string | number; status: string; createdAt: string } | null;
  createdByUser?: { id: number; name?: string | null; email: string } | null;
};

type CurrentAccount = {
  id: number;
  customerId: number;
  balance: string | number;
  lastMovementAt?: string | null;
  customer: Customer;
  movements?: Movement[];
};

type FilterStatus = "debt" | "paid" | "all";

const paymentMethods = ["Efectivo", "Tarjeta", "Transferencia", "Mercado Pago"];

export default function AdminCurrentAccountsSection() {
  const [accounts, setAccounts] = useState<CurrentAccount[]>([]);
  const [selected, setSelected] = useState<CurrentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("debt");
  const [paymentCustomer, setPaymentCustomer] = useState<CurrentAccount | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<CurrentAccount[]>([]);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      if (query.trim()) params.set("search", query.trim());
      const data = await api(`/current-accounts?${params.toString()}`);
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las cuentas corrientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAccounts(), 220);
    return () => window.clearTimeout(timeoutId);
  }, [query, status]);

  const totals = useMemo(() => {
    const debtAccounts = accounts.filter((account) => Number(account.balance) > 0);
    return {
      debtAccounts: debtAccounts.length,
      totalDebt: debtAccounts.reduce((sum, account) => sum + Number(account.balance), 0),
    };
  }, [accounts]);

  const openDetail = async (account: CurrentAccount) => {
    setSelected(account);
    setDetailLoading(true);
    try {
      const detail = await api(`/current-accounts/customers/${account.customerId}`);
      setSelected(detail as CurrentAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el detalle.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openPayment = (account: CurrentAccount) => {
    setPaymentModalOpen(true);
    setPaymentCustomer(account);
    setPaymentAmount(String(Number(account.balance)));
    setPaymentMethod("Efectivo");
    setPaymentDescription("");
  };

  const openGlobalPayment = async () => {
    setPaymentModalOpen(true);
    setPaymentCustomer(null);
    setPaymentAmount("");
    setPaymentMethod("Efectivo");
    setPaymentDescription("");
    setPaymentSearch("");
    setError("");

    try {
      const data = await api("/current-accounts?status=debt");
      setPaymentAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar clientes con deuda.");
      setPaymentAccounts([]);
    }
  };

  const selectPaymentCustomer = (account: CurrentAccount) => {
    setPaymentCustomer(account);
    setPaymentAmount(String(Number(account.balance)));
    setPaymentDescription("");
  };

  const registerPayment = async () => {
    if (!paymentCustomer) return;
    const amount = Number(paymentAmount);
    const balance = Number(paymentCustomer.balance);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (amount > balance) {
      setError("El pago no puede superar el saldo actual.");
      return;
    }

    setSavingPayment(true);
    setError("");
    try {
      await api(`/current-accounts/customers/${paymentCustomer.customerId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          paymentMethod,
          description: paymentDescription.trim() || undefined,
        }),
      });
      setPaymentModalOpen(false);
      setPaymentCustomer(null);
      await loadAccounts();
      if (selected?.customerId === paymentCustomer.customerId) {
        await openDetail(paymentCustomer);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <section data-account-panel style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Administracion</p>
          <h2 style={titleStyle}>Cuentas corrientes</h2>
          <p style={copyStyle}>Clientes con saldo pendiente, movimientos y cobros parciales o totales.</p>
        </div>
        <div style={statsStyle}>
          <button type="button" onClick={() => void openGlobalPayment()} style={primaryButtonStyle}>
            Registrar pago
          </button>
          <Stat label="Con deuda" value={String(totals.debtAccounts)} />
          <Stat label="Saldo total" value={money(totals.totalDebt)} />
        </div>
      </header>

      {error ? <p style={errorStyle}>{error}</p> : null}

      <div style={toolbarStyle}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente, telefono, email o documento"
          style={inputStyle}
        />
        <div style={segmentedStyle}>
          {[
            ["debt", "Con deuda"],
            ["paid", "Saldados"],
            ["all", "Todos"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id as FilterStatus)}
              style={segmentButtonStyle(status === id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <State label="Cargando cuentas..." />
      ) : accounts.length === 0 ? (
        <State label={status === "debt" ? "No hay clientes con deuda pendiente." : "No hay cuentas para este filtro."} />
      ) : (
        <div style={tableShellStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Telefono</Th>
                <Th>Email</Th>
                <Th>Saldo</Th>
                <Th>Ultimo mov.</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <Td>
                    <strong>{customerName(account.customer)}</strong>
                    <span style={mutedBlockStyle}>Cliente #{account.customerId}</span>
                  </Td>
                  <Td>{account.customer.phone || "Sin telefono"}</Td>
                  <Td>{account.customer.email || account.customer.document || "Sin email"}</Td>
                  <Td>
                    <strong>{money(Number(account.balance))}</strong>
                  </Td>
                  <Td>{formatDate(account.lastMovementAt)}</Td>
                  <Td>
                    <div style={rowActionsStyle}>
                      <button type="button" onClick={() => void openDetail(account)} style={softButtonStyle}>
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => openPayment(account)}
                        style={primaryButtonStyle}
                        disabled={Number(account.balance) <= 0}
                      >
                        Registrar pago
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div style={modalOverlayStyle} onClick={() => setSelected(null)}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Detalle</p>
                <h3 style={modalTitleStyle}>{customerName(selected.customer)}</h3>
                <p style={copyStyle}>
                  {selected.customer.phone || "Sin telefono"}
                  {selected.customer.email ? ` · ${selected.customer.email}` : ""}
                  {selected.customer.document ? ` · Doc. ${selected.customer.document}` : ""}
                </p>
              </div>
              <strong style={balanceStyle}>{money(Number(selected.balance))}</strong>
            </header>
            <div style={rowActionsStyle}>
              <button type="button" onClick={() => openPayment(selected)} style={primaryButtonStyle}>
                Registrar pago
              </button>
              <button type="button" onClick={() => setSelected(null)} style={softButtonStyle}>
                Cerrar
              </button>
            </div>
            {detailLoading ? (
              <State label="Cargando movimientos..." />
            ) : (
              <div style={movementListStyle}>
                {(selected.movements ?? []).map((movement) => (
                  <article key={movement.id} style={movementStyle}>
                    <div>
                      <strong>{movementLabel(movement.type)}</strong>
                      <p style={copyStyle}>{movement.description || "Sin descripcion"}</p>
                      <span style={mutedBlockStyle}>
                        {formatDate(movement.createdAt)}
                        {movement.order ? ` · Venta #${movement.order.id}` : ""}
                        {movement.createdByUser ? ` · ${movement.createdByUser.name || movement.createdByUser.email}` : ""}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>{money(Number(movement.amount))}</strong>
                      <span style={mutedBlockStyle}>Saldo {money(Number(movement.balanceAfter))}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {paymentModalOpen ? (
        <div style={modalOverlayStyle} onClick={() => { setPaymentModalOpen(false); setPaymentCustomer(null); }}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Registrar pago</p>
                <h3 style={modalTitleStyle}>
                  {paymentCustomer ? customerName(paymentCustomer.customer) : "Seleccionar cliente"}
                </h3>
              </div>
              {paymentCustomer ? <strong style={balanceStyle}>{money(Number(paymentCustomer.balance))}</strong> : null}
            </header>
            {!paymentCustomer ? (
              <>
                <input
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  placeholder="Buscar cliente, telefono, email o documento"
                  style={inputStyle}
                />
                <div style={paymentCustomerListStyle}>
                  {paymentAccounts
                    .filter((account) => {
                      const normalized = paymentSearch.trim().toLowerCase();
                      if (!normalized) return true;
                      return [
                        account.customer.firstName,
                        account.customer.lastName,
                        account.customer.phone,
                        account.customer.email,
                        account.customer.document,
                      ].filter(Boolean).join(" ").toLowerCase().includes(normalized);
                    })
                    .map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => selectPaymentCustomer(account)}
                        style={paymentCustomerOptionStyle}
                      >
                        <span>
                          <strong>{customerName(account.customer)}</strong>
                          <small style={mutedBlockStyle}>{account.customer.phone || account.customer.email || account.customer.document || `Cliente #${account.customerId}`}</small>
                        </span>
                        <strong>{money(Number(account.balance))}</strong>
                      </button>
                    ))}
                  {paymentAccounts.length === 0 ? <State label="No hay clientes con deuda pendiente." /> : null}
                </div>
              </>
            ) : (
              <>
                <label style={fieldGroupStyle}>
                  <span>Monto a pagar</span>
                  <div style={amountRowStyle}>
                    <div style={moneyInputWrapStyle}>
                      <span style={moneyPrefixStyle}>$</span>
                      <input
                        value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)}
                        inputMode="decimal"
                        style={{ ...inputStyle, paddingLeft: 30 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(Number(paymentCustomer.balance)))}
                      style={softButtonStyle}
                    >
                      Saldar total
                    </button>
                  </div>
                </label>
                <label style={fieldGroupStyle}>
                  <span>Metodo de pago</span>
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} style={inputStyle}>
                    {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </label>
                <label style={fieldGroupStyle}>
                  <span>Observaciones</span>
                  <textarea
                    value={paymentDescription}
                    onChange={(event) => setPaymentDescription(event.target.value)}
                    style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                  />
                </label>
                <div style={rowActionsStyle}>
                  <button type="button" onClick={() => setPaymentCustomer(null)} style={softButtonStyle}>
                    Cambiar cliente
                  </button>
                  <button type="button" onClick={() => void registerPayment()} disabled={savingPayment} style={primaryButtonStyle}>
                    {savingPayment ? "Registrando..." : "Confirmar pago"}
                  </button>
                  <button type="button" onClick={() => { setPaymentModalOpen(false); setPaymentCustomer(null); }} style={softButtonStyle}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function customerName(customer: Customer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email || customer.phone || `Cliente #${customer.id}`;
}

function movementLabel(type: string) {
  const labels: Record<string, string> = {
    SALE: "Venta a cuenta corriente",
    PAYMENT: "Pago",
    ADJUSTMENT_POSITIVE: "Ajuste positivo",
    ADJUSTMENT_NEGATIVE: "Ajuste negativo",
    CREDIT_NOTE: "Nota de credito",
  };
  return labels[type] ?? type;
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

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 20 };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "flex-start" };
const eyebrowStyle: React.CSSProperties = { margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.16em", fontSize: 11, color: "var(--account-text-soft)" };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 28, color: "var(--account-text-strong)" };
const modalTitleStyle: React.CSSProperties = { margin: 0, fontSize: 22, color: "var(--account-text-strong)" };
const copyStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-muted)", lineHeight: 1.5 };
const statsStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const statStyle: React.CSSProperties = { minWidth: 140, padding: 16, borderRadius: 16, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)", display: "grid", gap: 6 };
const errorStyle: React.CSSProperties = { margin: 0, padding: 14, borderRadius: 14, border: "1px solid var(--admin-danger-border)", background: "var(--admin-danger-bg)", color: "var(--admin-danger-color)" };
const toolbarStyle: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 42, borderRadius: 12, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)", color: "var(--account-text-strong)", padding: "10px 12px" };
const segmentedStyle: React.CSSProperties = { display: "flex", gap: 6, padding: 4, borderRadius: 14, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)" };
const segmentButtonStyle = (active: boolean): React.CSSProperties => ({ border: 0, borderRadius: 10, padding: "10px 12px", background: active ? "var(--account-item-bg-active)" : "transparent", color: "var(--account-text-strong)", cursor: "pointer", fontWeight: 700 });
const tableShellStyle: React.CSSProperties = { overflowX: "auto", borderRadius: 18, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)" };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 860 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "13px 14px", fontSize: 12, color: "var(--account-text-soft)", borderBottom: "1px solid var(--account-item-border)", textTransform: "uppercase", letterSpacing: "0.12em" };
const tdStyle: React.CSSProperties = { padding: "14px", borderBottom: "1px solid var(--account-item-border)", color: "var(--account-text-strong)", verticalAlign: "top" };
const mutedBlockStyle: React.CSSProperties = { display: "block", marginTop: 4, color: "var(--account-text-muted)", fontSize: 12 };
const rowActionsStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const primaryButtonStyle: React.CSSProperties = { border: 0, borderRadius: 12, background: "var(--account-item-bg-active)", color: "var(--account-text-strong)", padding: "10px 12px", cursor: "pointer", fontWeight: 800 };
const softButtonStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 12, background: "transparent", color: "var(--account-text-strong)", padding: "10px 12px", cursor: "pointer", fontWeight: 700 };
const stateStyle: React.CSSProperties = { padding: 24, borderRadius: 18, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)", color: "var(--account-text-muted)" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 120, background: "var(--admin-overlay-bg, rgba(0,0,0,.42))", display: "grid", placeItems: "center", padding: 16 };
const modalStyle: React.CSSProperties = { width: "min(720px, 100%)", maxHeight: "min(760px, calc(100vh - 32px))", overflow: "auto", borderRadius: 20, border: "1px solid var(--account-item-border)", background: "var(--account-sidebar-bg)", padding: 20, display: "grid", gap: 16, boxShadow: "var(--admin-modal-shadow)" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" };
const balanceStyle: React.CSSProperties = { color: "var(--account-text-strong)", fontSize: 22 };
const movementListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const movementStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 14, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)" };
const fieldGroupStyle: React.CSSProperties = { display: "grid", gap: 8, color: "var(--account-text-muted)", fontWeight: 700 };
const amountRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center" };
const moneyInputWrapStyle: React.CSSProperties = { position: "relative", minWidth: 0 };
const moneyPrefixStyle: React.CSSProperties = { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--account-text-muted)", fontWeight: 800, pointerEvents: "none" };
const paymentCustomerListStyle: React.CSSProperties = { display: "grid", gap: 10, maxHeight: 320, overflow: "auto" };
const paymentCustomerOptionStyle: React.CSSProperties = { width: "100%", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid var(--account-item-border)", borderRadius: 14, background: "var(--account-item-bg)", color: "var(--account-text-strong)", padding: 14, cursor: "pointer", textAlign: "left" };
