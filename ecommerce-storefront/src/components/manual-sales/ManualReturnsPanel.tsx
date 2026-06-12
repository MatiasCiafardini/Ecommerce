"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  calculateManualSaleDiscountAmount,
  resolveManualSaleUnitPrice,
  resolveStorePricingPolicy,
  type StorePricingPolicy,
} from "@/lib/pricing-policy";
import { getClientStoreId } from "@/lib/tenant/store-context";
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
  unitPrice: number;
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

type StorePaymentConfig = {
  bankTransfer?: {
    discountPercentage?: number | null;
    enabled?: boolean | null;
  } | null;
};

const returnedPaymentMethods = ["Efectivo", "Tarjeta", "Transferencia"];
const exchangePaymentMethods = ["Efectivo", "Tarjeta", "Transferencia", "Cuenta corriente"];
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
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [createAccountForm, setCreateAccountForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    document: "",
    address1: "",
    city: "",
    zip: "",
    notes: "",
  });
  const [returnedPaymentMethod, setReturnedPaymentMethod] = useState("Efectivo");
  const [exchangePaymentMethod, setExchangePaymentMethod] = useState("Efectivo");
  const [bankTransferDiscountPercentage, setBankTransferDiscountPercentage] = useState(0);
  const [storeId, setStoreId] = useState<number | null>(null);
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
    try {
      setStoreId(getClientStoreId());
    } catch {
      setStoreId(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadPaymentConfig = async () => {
      try {
        const config = (await api("/store/payment-config")) as StorePaymentConfig;
        if (!active) return;

        const enabled = config?.bankTransfer?.enabled !== false;
        const percentage = Number(config?.bankTransfer?.discountPercentage ?? 0);
        setBankTransferDiscountPercentage(
          enabled && Number.isFinite(percentage)
            ? Math.max(0, Math.min(percentage, 100))
            : 0,
        );
      } catch {
        if (active) setBankTransferDiscountPercentage(0);
      }
    };

    void loadPaymentConfig();

    return () => {
      active = false;
    };
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

  const pricingPolicy = useMemo(
    () => resolveStorePricingPolicy({ storeId }),
    [storeId],
  );
  const returnedTotals = useMemo(
    () =>
      calculateReturnSideTotals(
        returnedLines,
        returnedPaymentMethod,
        bankTransferDiscountPercentage,
        pricingPolicy,
      ),
    [bankTransferDiscountPercentage, pricingPolicy, returnedLines, returnedPaymentMethod],
  );
  const exchangeTotals = useMemo(
    () =>
      calculateReturnSideTotals(
        exchangeLines,
        exchangePaymentMethod,
        bankTransferDiscountPercentage,
        pricingPolicy,
      ),
    [bankTransferDiscountPercentage, exchangeLines, exchangePaymentMethod, pricingPolicy],
  );
  const totalReturned = returnedTotals.total;
  const totalExchange = exchangeTotals.total;
  const difference = totalExchange - totalReturned;

  const createReturn = async () => {
    if (returnedLines.length === 0) {
      setError("Carga al menos un producto que devuelven.");
      return;
    }

    if (difference < 0 && !selectedAccount) {
      setError("Para dejar saldo a favor, selecciona o crea una cuenta corriente.");
      return;
    }

    if (difference > 0 && exchangePaymentMethod === "Cuenta corriente" && !selectedAccount) {
      setError("Para mandar la diferencia a cuenta corriente, selecciona o crea una cuenta corriente.");
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
          settlementMethod: difference > 0 ? exchangePaymentMethod : "Cuenta corriente",
          notes: notes.trim() || undefined,
          returnedItems: returnedLines.map((line) => toPayloadItem(line, returnedTotals.unitPrices[line.variantId])),
          exchangeItems: exchangeLines.map((line) => toPayloadItem(line, exchangeTotals.unitPrices[line.variantId])),
        }),
      })) as ManualReturn;
      setHistory((current) => [created, ...current]);
      setCustomerName("");
      setSelectedAccount(null);
      setAccountRows([]);
      setReturnedPaymentMethod("Efectivo");
      setExchangePaymentMethod("Efectivo");
      setNotes("");
      setReturnedQuery("");
      setExchangeQuery("");
      setReturnedRows([]);
      setExchangeRows([]);
      setReturnedLines([]);
      setExchangeLines([]);
      setSuccess(getSuccessMessage(created, difference > 0 ? exchangePaymentMethod : "Cuenta corriente"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la devolucion.");
    } finally {
      setSaving(false);
    }
  };

  const openCreateAccount = () => {
    const parts = customerName.trim().split(/\s+/).filter(Boolean);
    setCreateAccountForm({
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      email: "",
      phone: "",
      document: "",
      address1: "",
      city: "",
      zip: "",
      notes: "",
    });
    setCreateAccountOpen(true);
    setError("");
  };

  const createCurrentAccount = async () => {
    if (!createAccountForm.firstName.trim() && !createAccountForm.lastName.trim()) {
      setError("Carga el nombre o apellido del cliente.");
      return;
    }

    const hasAddress = [createAccountForm.address1, createAccountForm.city, createAccountForm.zip].some((value) => value.trim());
    const payload = {
      firstName: createAccountForm.firstName.trim() || undefined,
      lastName: createAccountForm.lastName.trim() || undefined,
      email: createAccountForm.email.trim() || undefined,
      phone: createAccountForm.phone.trim() || undefined,
      document: createAccountForm.document.trim() || undefined,
      notes: createAccountForm.notes.trim() || undefined,
      address: hasAddress
        ? {
            address1: createAccountForm.address1.trim() || undefined,
            city: createAccountForm.city.trim() || undefined,
            zip: createAccountForm.zip.trim() || undefined,
          }
        : undefined,
    };

    setSavingAccount(true);
    setError("");
    try {
      const created = (await api("/current-accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as CurrentAccountLookup;
      setSelectedAccount(created);
      setCustomerName(getAccountCustomerName(created));
      setAccountRows([]);
      setCreateAccountOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta corriente.");
    } finally {
      setSavingAccount(false);
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
          <PaymentSelector
            label="Como se lo habian llevado"
            value={returnedPaymentMethod}
            onChange={setReturnedPaymentMethod}
            options={returnedPaymentMethods}
          />
          <ProductPicker
            query={returnedQuery}
            setQuery={setReturnedQuery}
            rows={returnedRows}
            onAdd={(row) => addLine(row, setReturnedLines, true, pricingPolicy)}
            placeholder="Buscar producto devuelto"
            pricingPolicy={pricingPolicy}
          />
          <LineList lines={returnedLines} setLines={setReturnedLines} unitPrices={returnedTotals.unitPrices} />
          {returnedTotals.discountAmount > 0 ? (
            <span style={discountHintStyle}>Descuento por pago: - {money(returnedTotals.discountAmount)}</span>
          ) : null}
          <strong style={subtotalStyle}>Total devuelto: {money(totalReturned)}</strong>
        </section>

        <section style={cardStyle}>
          <p style={eyebrowStyle}>Se llevan</p>
          <PaymentSelector
            label="Medio de pago nuevo"
            value={exchangePaymentMethod}
            onChange={setExchangePaymentMethod}
            options={exchangePaymentMethods}
          />
          <ProductPicker
            query={exchangeQuery}
            setQuery={setExchangeQuery}
            rows={exchangeRows}
            onAdd={(row) => addLine(row, setExchangeLines, false, pricingPolicy)}
            placeholder="Buscar producto de cambio"
            pricingPolicy={pricingPolicy}
          />
          <LineList lines={exchangeLines} setLines={setExchangeLines} unitPrices={exchangeTotals.unitPrices} />
          {exchangeTotals.discountAmount > 0 ? (
            <span style={discountHintStyle}>Descuento por pago: - {money(exchangeTotals.discountAmount)}</span>
          ) : null}
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
          {!selectedAccount ? (
            <button type="button" onClick={openCreateAccount} style={ghostButtonStyle}>
              Agregar cuenta corriente
            </button>
          ) : null}
        </div>
        {difference > 0 ? (
          <div style={settlementInfoStyle}>A cobrar por {exchangePaymentMethod}: {money(difference)}</div>
        ) : (
          <div style={settlementInfoStyle}>{difference < 0 ? "Se acredita saldo a favor en cuenta corriente." : "Sin diferencia a liquidar."}</div>
        )}
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas opcionales" style={inputStyle} />
        <button
          type="button"
          onClick={() => void createReturn()}
          disabled={
            saving ||
            returnedLines.length === 0 ||
            ((difference < 0 || (difference > 0 && exchangePaymentMethod === "Cuenta corriente")) && !selectedAccount)
          }
          style={primaryButtonStyle}
        >
          {saving ? "Registrando..." : "Registrar devolucion/cambio"}
        </button>
      </div>

      {createAccountOpen ? (
        <div style={modalOverlayStyle} onClick={() => setCreateAccountOpen(false)}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={headerStyle}>
              <div>
                <p style={eyebrowStyle}>Nueva cuenta</p>
                <h3 style={subtitleStyle}>Agregar cuenta corriente</h3>
              </div>
            </header>
            <div style={twoColumnFormStyle}>
              <TextField label="Nombre" value={createAccountForm.firstName} onChange={(value) => setCreateAccountForm((current) => ({ ...current, firstName: value }))} />
              <TextField label="Apellido" value={createAccountForm.lastName} onChange={(value) => setCreateAccountForm((current) => ({ ...current, lastName: value }))} />
              <TextField label="Email" placeholder="Email opcional" value={createAccountForm.email} onChange={(value) => setCreateAccountForm((current) => ({ ...current, email: value }))} />
              <TextField label="Telefono" placeholder="Telefono opcional" value={createAccountForm.phone} onChange={(value) => setCreateAccountForm((current) => ({ ...current, phone: value }))} />
              <TextField label="Documento" placeholder="Documento opcional" value={createAccountForm.document} onChange={(value) => setCreateAccountForm((current) => ({ ...current, document: value }))} />
              <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                <span>Direccion</span>
                <TextField label="Calle, numero, piso/depto" placeholder="Direccion opcional" value={createAccountForm.address1} onChange={(value) => setCreateAccountForm((current) => ({ ...current, address1: value }))} />
                <div style={twoColumnFormStyle}>
                  <TextField label="Localidad" placeholder="Localidad opcional" value={createAccountForm.city} onChange={(value) => setCreateAccountForm((current) => ({ ...current, city: value }))} />
                  <TextField label="Codigo postal" placeholder="Codigo postal opcional" value={createAccountForm.zip} onChange={(value) => setCreateAccountForm((current) => ({ ...current, zip: value }))} />
                </div>
              </div>
              <label style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                <span>Notas</span>
                <textarea
                  value={createAccountForm.notes}
                  onChange={(event) => setCreateAccountForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Notas opcionales"
                  style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                />
              </label>
            </div>
            <div style={modalActionsStyle}>
              <button type="button" onClick={() => void createCurrentAccount()} disabled={savingAccount} style={primaryButtonStyle}>
                {savingAccount ? "Creando..." : "Crear cuenta"}
              </button>
              <button type="button" onClick={() => setCreateAccountOpen(false)} style={ghostButtonStyle}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                      {item.kind === "exchange" ? "Cambio" : "Devuelve"}: {item.variant?.product?.title || "Producto"} {formatVariantMeta(getVariantLabel(item.variant), item.variant?.sku)} x{item.quantity} - {money(Number(item.price) * item.quantity)}
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
  pricingPolicy,
}: {
  query: string;
  setQuery: (value: string) => void;
  rows: VariantRow[];
  onAdd: (row: VariantRow) => void;
  placeholder: string;
  pricingPolicy: Pick<StorePricingPolicy, "labelPriceRounding">;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} style={inputStyle} />
      <div style={pickerListStyle}>
        {rows.slice(0, 8).map((row) => (
          <button
            key={row.variant.id}
            type="button"
            onClick={() => {
              onAdd(row);
              setQuery("");
            }}
            style={pickerButtonStyle}
          >
            <span>
              <strong>{row.product.title}</strong>
              <small style={mutedStyle}>{formatVariantMeta(getVariantLabel(row.variant), row.variant.sku)}</small>
            </span>
            <span>{money(resolveManualSaleUnitPrice(row.variant.price, pricingPolicy))} - Stock {row.available}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PaymentSelector({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div style={paymentGroupStyle}>
      <span style={paymentLabelStyle}>{label}</span>
      <div style={paymentSegmentedStyle}>
        {options.map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            style={paymentButtonStyle(value === method)}
          >
            {method}
          </button>
        ))}
      </div>
    </div>
  );
}

function LineList({
  lines,
  setLines,
  unitPrices,
}: {
  lines: Line[];
  setLines: React.Dispatch<React.SetStateAction<Line[]>>;
  unitPrices: Record<number, number>;
}) {
  if (lines.length === 0) return <State label="Sin productos cargados." />;

  return (
    <div style={lineListStyle}>
      {lines.map((line) => (
        <article key={line.variantId} style={lineStyle}>
          <div>
            <strong>{line.title}</strong>
            <span style={mutedStyle}>{formatVariantMeta(line.variantLabel, line.sku)}</span>
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
          <strong>{money(unitPrices[line.variantId] ?? Number(line.price || 0))}</strong>
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={fieldGroupStyle}>
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

async function searchProducts(query: string, setRows: (rows: VariantRow[]) => void) {
  const normalized = normalizeSearch(query);
  if (!normalized) {
    setRows([]);
    return;
  }

  const data = await api(`/products?search=${encodeURIComponent(normalized)}&limit=40`);
  const products = Array.isArray(data) ? (data as Product[]) : [];
  const rows = products.flatMap((product) => (product.variants ?? []).map((variant) => ({
    product,
    variant,
    available: getAvailable(variant),
  })));
  const exactSkuRows = rows.filter((row) => normalizeSku(row.variant.sku) === normalizeSku(query));

  setRows(exactSkuRows.length > 0 ? exactSkuRows : rows);
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

function addLine(
  row: VariantRow,
  setLines: React.Dispatch<React.SetStateAction<Line[]>>,
  allowNoStock: boolean,
  pricingPolicy: Pick<StorePricingPolicy, "labelPriceRounding">,
) {
  if (!allowNoStock && row.available <= 0) return;
  const unitPrice = resolveManualSaleUnitPrice(row.variant.price, pricingPolicy);
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
        price: String(unitPrice),
        unitPrice,
        available: row.available,
      },
    ];
  });
}

function updateLine(setLines: React.Dispatch<React.SetStateAction<Line[]>>, variantId: number, patch: Partial<Line>) {
  setLines((current) => current.map((line) => line.variantId === variantId ? { ...line, ...patch } : line));
}

function toPayloadItem(line: Line, unitPrice: number) {
  return { variantId: line.variantId, quantity: line.quantity, price: unitPrice };
}

function calculateReturnSideTotals(
  lines: Line[],
  paymentMethod: string,
  discountPercentage: number,
  pricingPolicy: StorePricingPolicy,
) {
  const normalizedLines = lines.map((line) => {
    const unitPrice = resolveManualSaleUnitPrice(line.price, pricingPolicy);

    return {
      ...line,
      unitPrice,
      price: String(unitPrice),
      quantity: Number(line.quantity || 0),
    };
  });
  const subtotal = normalizedLines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const shouldDiscount = paymentMethod === "Efectivo" || paymentMethod === "Transferencia";
  const discountAmount =
    shouldDiscount && discountPercentage > 0
      ? calculateManualSaleDiscountAmount(
          normalizedLines,
          subtotal,
          discountPercentage,
          pricingPolicy,
        )
      : 0;
  const total = Math.max(subtotal - discountAmount, 0);
  const unitPrices = normalizedLines.reduce<Record<number, number>>((acc, line) => {
    const unitDiscount = line.quantity > 0 ? discountAmountForLine(line, discountPercentage, shouldDiscount, pricingPolicy) : 0;
    acc[line.variantId] = Math.max(line.unitPrice - unitDiscount, 0);
    return acc;
  }, {});

  return { subtotal, discountAmount, total, unitPrices };
}

function discountAmountForLine(
  line: Pick<Line, "unitPrice" | "quantity">,
  discountPercentage: number,
  shouldDiscount: boolean,
  pricingPolicy: StorePricingPolicy,
) {
  if (!shouldDiscount || discountPercentage <= 0 || line.unitPrice <= 0) return 0;
  const discount = calculateManualSaleDiscountAmount(
    [{ price: line.unitPrice, quantity: 1 }],
    line.unitPrice,
    discountPercentage,
    pricingPolicy,
  );

  return Math.min(discount, line.unitPrice);
}

function getAvailable(variant: Variant) {
  return (variant.inventories ?? []).reduce((sum, inventory) => sum + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0), 0);
}

function getVariantLabel(variant?: Variant | null) {
  return [variant?.Size, variant?.Color]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" - ");
}

function formatVariantMeta(label?: string | null, sku?: string | null) {
  return [label?.trim(), sku?.trim()].filter(Boolean).join(" - ") || "Sin variante";
}

function normalizeSku(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
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
const formGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, alignItems: "start" };
const cardStyle: React.CSSProperties = { display: "grid", gap: 12, alignContent: "start", border: "1px solid var(--border-soft)", borderRadius: 18, background: "var(--page-panel-strong-bg)", padding: 16 };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 42, borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--page-panel-bg)", color: "var(--text-strong)", padding: "10px 12px" };
const smallInputStyle: React.CSSProperties = { ...inputStyle, width: 90 };
const primaryButtonStyle: React.CSSProperties = { border: 0, borderRadius: 12, background: "var(--theme-colors-primary, #111)", color: "var(--theme-colors-primary-contrast, #fff)", padding: "11px 14px", cursor: "pointer", fontWeight: 800 };
const ghostButtonStyle: React.CSSProperties = { border: "1px solid var(--border-soft)", borderRadius: 12, background: "transparent", color: "var(--text-strong)", padding: "9px 12px", cursor: "pointer", fontWeight: 700 };
const paymentGroupStyle: React.CSSProperties = { display: "grid", gap: 8 };
const paymentLabelStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
const paymentSegmentedStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 6, border: "1px solid var(--border-soft)", borderRadius: 14, padding: 4, background: "var(--page-panel-bg)" };
const paymentButtonStyle = (active: boolean): React.CSSProperties => ({ border: 0, borderRadius: 10, background: active ? "var(--theme-colors-primary, #111)" : "transparent", color: active ? "var(--theme-colors-primary-contrast, #fff)" : "var(--text-strong)", padding: "10px 8px", cursor: "pointer", fontWeight: 800 });
const detailsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "center" };
const twoColumnFormStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const fieldGroupStyle: React.CSSProperties = { display: "grid", gap: 8, color: "var(--text-muted)", fontWeight: 700 };
const customerBoxStyle: React.CSSProperties = { position: "relative", display: "grid", gap: 8 };
const selectedAccountStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid rgba(22, 163, 74, .35)", borderRadius: 12, padding: "9px 10px", color: "var(--text-strong)", background: "rgba(22, 163, 74, .10)" };
const miniButtonStyle: React.CSSProperties = { border: "1px solid var(--border-soft)", borderRadius: 10, background: "transparent", color: "var(--text-strong)", padding: "6px 8px", cursor: "pointer", fontWeight: 700 };
const accountListStyle: React.CSSProperties = { position: "absolute", zIndex: 20, top: 48, left: 0, right: 0, display: "grid", gap: 6, border: "1px solid var(--border-soft)", borderRadius: 14, background: "var(--page-panel-bg)", padding: 8, boxShadow: "0 16px 40px rgba(0,0,0,.16)" };
const accountButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, border: "1px solid var(--border-soft)", borderRadius: 10, background: "transparent", color: "var(--text-strong)", padding: 9, cursor: "pointer", textAlign: "left" };
const settlementInfoStyle: React.CSSProperties = { minHeight: 42, display: "flex", alignItems: "center", borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--page-panel-bg)", color: "var(--text-muted)", padding: "10px 12px" };
const pickerListStyle: React.CSSProperties = { display: "grid", gap: 8, height: 260, overflow: "auto", alignContent: "start" };
const pickerButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", textAlign: "left", border: "1px solid var(--border-soft)", borderRadius: 12, background: "transparent", color: "var(--text-strong)", padding: 10, cursor: "pointer" };
const lineListStyle: React.CSSProperties = { display: "grid", gap: 8 };
const lineStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto auto auto", gap: 8, alignItems: "center", border: "1px solid var(--border-soft)", borderRadius: 12, padding: 10 };
const subtotalStyle: React.CSSProperties = { color: "var(--text-strong)", justifySelf: "end" };
const discountHintStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 13, justifySelf: "end" };
const historyListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const historyCardStyle: React.CSSProperties = { display: "grid", gap: 10, border: "1px solid var(--border-soft)", borderRadius: 14, padding: 14 };
const historyItemsStyle: React.CSSProperties = { display: "grid", gap: 5, color: "var(--text-muted)", fontSize: 13 };
const mutedStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: 12 };
const stateStyle: React.CSSProperties = { padding: 14, borderRadius: 12, border: "1px solid var(--border-soft)", color: "var(--text-muted)", alignSelf: "start" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 120, background: "var(--admin-overlay-bg, rgba(0,0,0,.42))", display: "grid", placeItems: "center", padding: 16 };
const modalStyle: React.CSSProperties = { width: "min(780px, 100%)", maxHeight: "min(760px, calc(100vh - 32px))", overflow: "auto", borderRadius: 20, border: "1px solid var(--border-soft)", background: "var(--page-panel-bg)", padding: 20, display: "grid", gap: 16, boxShadow: "var(--admin-modal-shadow)" };
const modalActionsStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" };
const errorStyle: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 12, border: "1px solid var(--admin-danger-border)", background: "var(--admin-danger-bg)", color: "var(--admin-danger-color)" };
const successStyle: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 12, border: "1px solid rgba(22, 163, 74, .35)", background: "rgba(22, 163, 74, .12)", color: "var(--text-strong)" };
const differenceStyle = (value: number): React.CSSProperties => ({ color: value > 0 ? "var(--text-strong)" : "var(--text-muted)", fontSize: 20 });
