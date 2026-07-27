"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import {
  calculateManualSaleDiscountAmount,
  resolveManualSaleUnitPrice,
  resolveStorePricingPolicy,
  type StorePricingPolicy,
} from "@/lib/pricing-policy";
import { getClientStoreId } from "@/lib/tenant/store-context";
import { money } from "@/components/account/order-utils";
import {
  ADMIN_PAYMENT_METHODS,
  isDiscountedAdministrativePaymentMethod,
} from "@/lib/manual-payment-methods";

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

export type ManualReturnDraftLine = {
  variantId: number;
  title: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  price: string;
  unitPrice: number;
  available: number;
  paidPriceLocked?: boolean;
};

type Line = ManualReturnDraftLine;

export type ManualReturnDraft = {
  sourceOrderId?: number;
  customerName?: string;
  returnedPaymentMethod?: string;
  returnedLines: ManualReturnDraftLine[];
};

type ManualReturn = {
  id: number;
  customerName?: string | null;
  notes?: string | null;
  totalReturned: string | number;
  totalExchange: string | number;
  differenceAmount: string | number;
  createdAt: string;
  returnedPaymentMethod?: string | null;
  returnedDiscountApplied?: boolean;
  exchangeDiscountApplied?: boolean;
  settlementMethod?: string | null;
  cashRegister?: { id: number; closedAt?: string | null } | null;
  currentAccountId?: number | null;
  correctionLocked?: boolean;
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

const returnedPaymentMethods: string[] = [...ADMIN_PAYMENT_METHODS];
const exchangePaymentMethods: string[] = [...ADMIN_PAYMENT_METHODS];
const normalizeSearch = (value: string) => value.trim().toLowerCase();

export default function ManualReturnsPanel({
  storeLocationId,
  initialDraft,
}: {
  storeLocationId?: number | null;
  initialDraft?: ManualReturnDraft | null;
}) {
  const [history, setHistory] = useState<ManualReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<CurrentAccountLookup | null>(null);
  const [accountRows, setAccountRows] = useState<CurrentAccountLookup[]>([]);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [createAccountError, setCreateAccountError] = useState("");
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
  const [returnedDiscountApplied, setReturnedDiscountApplied] = useState(true);
  const [exchangeDiscountApplied, setExchangeDiscountApplied] = useState(true);
  const [editingReturn, setEditingReturn] = useState<ManualReturn | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [bankTransferDiscountPercentage, setBankTransferDiscountPercentage] = useState(0);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [returnedQuery, setReturnedQuery] = useState("");
  const [exchangeQuery, setExchangeQuery] = useState("");
  const [returnedRows, setReturnedRows] = useState<VariantRow[]>([]);
  const [exchangeRows, setExchangeRows] = useState<VariantRow[]>([]);
  const [returnedLines, setReturnedLines] = useState<Line[]>([]);
  const [exchangeLines, setExchangeLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!initialDraft?.returnedLines.length) return;

    setCustomerName(initialDraft.customerName ?? "");
    setSelectedAccount(null);
    setAccountRows([]);
    setReturnedPaymentMethod(
      returnedPaymentMethods.includes(initialDraft.returnedPaymentMethod ?? "")
        ? initialDraft.returnedPaymentMethod!
        : "Efectivo",
    );
    setReturnedLines(initialDraft.returnedLines.map((line) => ({ ...line })));
    setReturnedQuery("");
    setReturnedRows([]);
    setExchangeLines([]);
    setExchangeQuery("");
    setExchangeRows([]);
    setNotes(initialDraft.sourceOrderId ? `Devolucion sobre venta #${initialDraft.sourceOrderId}` : "");
    setSuccess(
      initialDraft.sourceOrderId
        ? `Venta #${initialDraft.sourceOrderId} cargada para devolucion.`
        : "Venta cargada para devolucion.",
    );
    setError("");
  }, [initialDraft]);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(withStoreLocationQuery("/returns/manual", storeLocationId));
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial de devoluciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [storeLocationId]);

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
      void searchAccounts(customerName, setAccountRows, storeLocationId);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [customerName, storeLocationId]);

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
        returnedDiscountApplied,
      ),
    [bankTransferDiscountPercentage, pricingPolicy, returnedDiscountApplied, returnedLines, returnedPaymentMethod],
  );
  const exchangeTotals = useMemo(
    () =>
      calculateReturnSideTotals(
        exchangeLines,
        exchangePaymentMethod,
        bankTransferDiscountPercentage,
        pricingPolicy,
        exchangeDiscountApplied,
      ),
    [bankTransferDiscountPercentage, exchangeDiscountApplied, exchangeLines, exchangePaymentMethod, pricingPolicy],
  );
  const totalReturned = returnedTotals.total;
  const totalExchange = exchangeTotals.total;
  const difference = totalExchange - totalReturned;

  const createReturn = async () => {
    if (returnedLines.length === 0) {
      setError("Carga al menos un producto que devuelven.");
      return;
    }

    if (difference < 0 && !selectedAccount && !editingReturn?.currentAccountId) {
      setError("Para dejar saldo a favor, selecciona o crea una cuenta corriente.");
      return;
    }

    if (difference > 0 && exchangePaymentMethod === "Cuenta corriente" && !selectedAccount && !editingReturn?.currentAccountId) {
      setError("Para mandar la diferencia a cuenta corriente, selecciona o crea una cuenta corriente.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editingReturn && !correctionReason.trim()) {
        setError("Indica el motivo de la correccion.");
        return;
      }
      const created = (await api(editingReturn ? `/returns/manual/${editingReturn.id}` : "/returns/manual", {
        method: editingReturn ? "PATCH" : "POST",
        body: JSON.stringify({
          customerId: selectedAccount?.customerId,
          customerName: customerName.trim() || undefined,
          storeLocationId: storeLocationId ?? undefined,
          settlementMethod: difference > 0 ? exchangePaymentMethod : "Cuenta corriente",
          returnedPaymentMethod,
          returnedDiscountApplied,
          exchangeDiscountApplied,
          reason: editingReturn ? correctionReason.trim() : undefined,
          notes: notes.trim() || undefined,
          returnedItems: returnedLines.map((line) => toPayloadItem(line, returnedTotals.unitPrices[line.variantId])),
          exchangeItems: exchangeLines.map((line) => toPayloadItem(line, exchangeTotals.unitPrices[line.variantId])),
        }),
      })) as ManualReturn;
      setHistory((current) => editingReturn
        ? current.map((entry) => entry.id === created.id ? created : entry)
        : [created, ...current]);
      setCustomerName("");
      setSelectedAccount(null);
      setAccountRows([]);
      setReturnedPaymentMethod("Efectivo");
      setExchangePaymentMethod("Efectivo");
      setReturnedDiscountApplied(true);
      setExchangeDiscountApplied(true);
      setEditingReturn(null);
      setCorrectionReason("");
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

  const openReturnEdit = (entry: ManualReturn) => {
    if (entry.correctionLocked || entry.cashRegister?.closedAt) {
      setError("La devolucion no se puede editar porque la caja asociada ya esta cerrada.");
      return;
    }
    const toLine = (item: NonNullable<ManualReturn["items"]>[number]): Line => ({
      variantId: item.variant?.id ?? 0,
      title: item.variant?.product?.title || "Producto",
      variantLabel: getVariantLabel(item.variant),
      sku: item.variant?.sku || "",
      quantity: item.quantity,
      price: String(item.price),
      unitPrice: Number(item.price),
      available: item.variant ? getAvailable(item.variant) : 0,
      paidPriceLocked: true,
    });
    setEditingReturn(entry);
    setCustomerName(entry.customerName ?? "");
    setSelectedAccount(null);
    setReturnedPaymentMethod(entry.returnedPaymentMethod || "Efectivo");
    setExchangePaymentMethod(entry.settlementMethod || "Efectivo");
    setReturnedDiscountApplied(entry.returnedDiscountApplied !== false);
    setExchangeDiscountApplied(entry.exchangeDiscountApplied !== false);
    setReturnedLines((entry.items ?? []).filter((item) => item.kind === "returned").map(toLine));
    setExchangeLines((entry.items ?? []).filter((item) => item.kind === "exchange").map(toLine));
    setNotes(entry.notes ?? "");
    setCorrectionReason("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setCreateAccountError("");
    setError("");
  };

  const createCurrentAccount = async () => {
    if (!createAccountForm.firstName.trim() && !createAccountForm.lastName.trim()) {
      setCreateAccountError("Carga el nombre o apellido del cliente.");
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
      storeLocationId: storeLocationId ?? undefined,
      address: hasAddress
        ? {
            address1: createAccountForm.address1.trim() || undefined,
            city: createAccountForm.city.trim() || undefined,
            zip: createAccountForm.zip.trim() || undefined,
          }
        : undefined,
    };

    setSavingAccount(true);
    setCreateAccountError("");
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
      setCreateAccountError(getErrorMessage(err, "No se pudo crear la cuenta corriente."));
    } finally {
      setSavingAccount(false);
    }
  };

  const addLineFromSearch = async (
    query: string,
    setRows: (rows: VariantRow[]) => void,
    setLines: React.Dispatch<React.SetStateAction<Line[]>>,
    allowNoStock: boolean,
  ) => {
    const rows = await getProductRows(query);
    setRows(rows);

    const rowToAdd = pickBestScannedRow(rows, query, allowNoStock);
    if (!rowToAdd) {
      setError(
        allowNoStock
          ? "No encontramos un producto para agregar con esa busqueda."
          : "No encontramos una variante con stock para agregar con esa busqueda.",
      );
      return false;
    }

    addLine(rowToAdd, setLines, allowNoStock, pricingPolicy);
    setError("");
    return true;
  };

  return (
    <section data-account-panel style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Mostrador</p>
          <h2 style={titleStyle}>Devoluciones y cambios</h2>
          <p style={copyStyle}>Gestiona devoluciones, cambios y diferencias de manera simple.</p>
        </div>
        <div style={summaryCardStyle(difference)}>
          <span>{difference > 0 ? "A cobrar" : difference < 0 ? "A favor cliente" : "Sin diferencia"}</span>
          <strong>{money(Math.abs(difference))}</strong>
        </div>
      </header>

      {error ? <p style={errorStyle}>{error}</p> : null}
      {success ? <p style={successStyle}>{success}</p> : null}

      <div style={formGridStyle}>
        <section style={returnCardStyle}>
          <div style={panelTitleRowStyle}>
            <span style={panelIconStyle}>↩</span>
            <div>
              <p style={panelTitleStyle}>Devuelven</p>
              <span style={panelSubtitleStyle}>¿Como se lo habian llevado?</span>
            </div>
          </div>
          <PaymentSelector
            label=""
            value={returnedPaymentMethod}
            onChange={setReturnedPaymentMethod}
            options={returnedPaymentMethods}
          />
          <DiscountToggle checked={returnedDiscountApplied} onChange={setReturnedDiscountApplied} percentage={bankTransferDiscountPercentage} />
          <ProductPicker
            query={returnedQuery}
            setQuery={setReturnedQuery}
            rows={returnedRows}
            onAdd={(row) => addLine(row, setReturnedLines, true, pricingPolicy)}
            onImmediateAdd={(query) =>
              addLineFromSearch(query, setReturnedRows, setReturnedLines, true)
            }
            placeholder="Buscar producto devuelto..."
            pricingPolicy={pricingPolicy}
          />
          <LineList
            lines={returnedLines}
            setLines={setReturnedLines}
            unitPrices={returnedTotals.unitPrices}
            emptyIcon="↩"
            emptyTitle="Todavia no agregaste productos devueltos"
            emptyCopy="Escanea o busca los productos que el cliente devuelve."
          />
          {returnedTotals.discountAmount > 0 ? (
            <span style={discountHintStyle}>Descuento por pago: - {money(returnedTotals.discountAmount)}</span>
          ) : null}
          <div style={sideTotalStyle}>
            <span>{returnedLines.length} productos</span>
            <strong>Total devuelto: {money(totalReturned)}</strong>
          </div>
        </section>

        <section style={returnCardStyle}>
          <div style={panelTitleRowStyle}>
            <span style={panelIconStyle}>⇄</span>
            <div>
              <p style={panelTitleStyle}>Se llevan</p>
              <span style={panelSubtitleStyle}>¿Como pagara la diferencia?</span>
            </div>
          </div>
          <PaymentSelector
            label=""
            value={exchangePaymentMethod}
            onChange={setExchangePaymentMethod}
            options={exchangePaymentMethods}
          />
          <DiscountToggle checked={exchangeDiscountApplied} onChange={setExchangeDiscountApplied} percentage={bankTransferDiscountPercentage} />
          <ProductPicker
            query={exchangeQuery}
            setQuery={setExchangeQuery}
            rows={exchangeRows}
            onAdd={(row) => addLine(row, setExchangeLines, false, pricingPolicy)}
            onImmediateAdd={(query) =>
              addLineFromSearch(query, setExchangeRows, setExchangeLines, false)
            }
            placeholder="Buscar producto para cambio..."
            pricingPolicy={pricingPolicy}
          />
          <LineList
            lines={exchangeLines}
            setLines={setExchangeLines}
            unitPrices={exchangeTotals.unitPrices}
            emptyIcon="⇄"
            emptyTitle="Todavia no agregaste productos de cambio"
            emptyCopy="Busca y agrega los productos que el cliente desea llevar."
          />
          {exchangeTotals.discountAmount > 0 ? (
            <span style={discountHintStyle}>Descuento por pago: - {money(exchangeTotals.discountAmount)}</span>
          ) : null}
          <div style={sideTotalStyle}>
            <span>{exchangeLines.length} productos</span>
            <strong>Total cambio: {money(totalExchange)}</strong>
          </div>
        </section>
      </div>

      <div style={detailsGridStyle}>
        <div style={customerBoxStyle}>
          <span style={inputIconStyle}>⌕</span>
          <input
            value={customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              setSelectedAccount(null);
            }}
            placeholder="Buscar cliente o cuenta corriente..."
            style={customerInputStyle}
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
                  <small>{accountBalanceLabel(Number(account.balance))}</small>
                </button>
              ))}
            </div>
          ) : null}
          {!selectedAccount ? (
            <button type="button" onClick={openCreateAccount} style={addAccountButtonStyle}>
              + Agregar cuenta corriente
            </button>
          ) : null}
        </div>
        <div style={settlementInfoStyle(difference)}>
          <span>{difference > 0 ? "Debe abonar" : difference < 0 ? "A favor cliente" : "Sin diferencia a liquidar"}</span>
          <strong>{difference === 0 ? "Cuenta equilibrada" : money(Math.abs(difference))}</strong>
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Agregar observaciones de la devolucion..."
          style={notesInputStyle}
        />
        {editingReturn ? (
          <label style={fieldGroupStyle}>
            <span>Motivo de la correccion</span>
            <textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Ej: se corrigio el precio cargado" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} />
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => void createReturn()}
          disabled={
            saving ||
            returnedLines.length === 0 ||
            ((difference < 0 || (difference > 0 && exchangePaymentMethod === "Cuenta corriente")) && !selectedAccount && !editingReturn?.currentAccountId)
          }
          style={primaryButtonStyle}
        >
          {saving ? "Guardando..." : editingReturn ? "Guardar cambios" : "Registrar devolucion/cambio"}
        </button>
        {editingReturn ? <button type="button" onClick={() => { setEditingReturn(null); setCorrectionReason(""); }} style={ghostButtonStyle}>Cancelar edicion</button> : null}
      </div>

      {createAccountOpen ? (
        <div style={modalOverlayStyle} onClick={() => { setCreateAccountOpen(false); setCreateAccountError(""); }}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={headerStyle}>
              <div>
                <p style={eyebrowStyle}>Nueva cuenta</p>
                <h3 style={subtitleStyle}>Agregar cuenta corriente</h3>
              </div>
            </header>
            {createAccountError ? <p style={errorStyle}>{createAccountError}</p> : null}
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
              <button type="button" onClick={() => { setCreateAccountOpen(false); setCreateAccountError(""); }} style={ghostButtonStyle}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section style={historySectionStyle}>
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
                <div style={historyIconStyle}>⇄</div>
                <div style={historyContentStyle}>
                  <strong>Devolucion #{entry.id}</strong>
                  <span style={mutedStyle}>{new Date(entry.createdAt).toLocaleString("es-AR")} {entry.customerName ? `· ${entry.customerName}` : ""}</span>
                  <div style={historyItemsStyle}>
                    {(entry.items ?? []).map((item) => (
                      <span key={item.id}>
                        {item.kind === "exchange" ? "Cambio" : "Devuelve"}: {item.variant?.product?.title || "Producto"} {formatVariantMeta(getVariantLabel(item.variant), item.variant?.sku)} x{item.quantity} · {money(Number(item.price) * item.quantity)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={historyAmountStyle(Number(entry.differenceAmount))}>
                  {returnDifferenceLabel(Number(entry.differenceAmount))}
                  <button type="button" onClick={() => openReturnEdit(entry)} disabled={Boolean(entry.correctionLocked || entry.cashRegister?.closedAt)} style={{ ...miniButtonStyle, marginTop: 8, opacity: entry.correctionLocked || entry.cashRegister?.closedAt ? 0.5 : 1 }}>
                    {entry.correctionLocked || entry.cashRegister?.closedAt ? "Caja cerrada" : "Editar devolucion"}
                  </button>
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
  onImmediateAdd,
  placeholder,
  pricingPolicy,
}: {
  query: string;
  setQuery: (value: string) => void;
  rows: VariantRow[];
  onAdd: (row: VariantRow) => void;
  onImmediateAdd?: (query: string) => Promise<boolean>;
  placeholder: string;
  pricingPolicy: Pick<StorePricingPolicy, "labelPriceRounding">;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={searchFieldStyle}>
        <span>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const currentQuery = event.currentTarget.value;
            void onImmediateAdd?.(currentQuery).then((added) => {
              if (added) setQuery("");
            });
          }}
          placeholder={placeholder}
          style={searchInputStyle}
        />
      </div>
      {rows.length > 0 ? (
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
      ) : null}
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

function DiscountToggle({ checked, onChange, percentage }: { checked: boolean; onChange: (value: boolean) => void; percentage: number }) {
  return (
    <label style={{ display: "flex", gap: 9, alignItems: "center", fontWeight: 700, fontSize: 13 }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>Utilizar descuento por transferencia / efectivo{percentage > 0 ? ` (${percentage}%)` : ""}</span>
    </label>
  );
}

function LineList({
  lines,
  setLines,
  unitPrices,
  emptyIcon,
  emptyTitle,
  emptyCopy,
}: {
  lines: Line[];
  setLines: React.Dispatch<React.SetStateAction<Line[]>>;
  unitPrices: Record<number, number>;
  emptyIcon: string;
  emptyTitle: string;
  emptyCopy: string;
}) {
  if (lines.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} copy={emptyCopy} />;
  }

  return (
    <div style={lineListStyle}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) 92px 120px 130px 42px", gap: 10, padding: "0 12px", fontSize: 12, fontWeight: 800, color: returnMuted }}>
        <span>Producto</span><span>Cantidad</span><span>Precio venta</span><span>Precio total</span><span>Accion</span>
      </div>
      {lines.map((line) => (
        <article key={line.variantId} style={lineStyle}>
          <div>
            <strong>{line.title}</strong>
            <span style={mutedStyle}>{formatVariantMeta(line.variantLabel, line.sku)}</span>
          </div>
          <div style={lineControlsStyle}>
            <input
              value={line.quantity}
              onChange={(event) => updateLine(setLines, line.variantId, { quantity: Math.max(1, Number(event.target.value || 1)) })}
              inputMode="numeric"
              style={smallInputStyle}
              aria-label="Cantidad"
            />
            <input
              value={line.price}
              onChange={(event) => updateLine(setLines, line.variantId, { price: event.target.value })}
              inputMode="decimal"
              style={smallInputStyle}
              aria-label="Precio"
            />
          </div>
          <strong>{money((unitPrices[line.variantId] ?? Number(line.price || 0)) * line.quantity)}</strong>
          <button type="button" onClick={() => setLines((current) => current.filter((item) => item.variantId !== line.variantId))} style={removeLineButtonStyle}>
            ×
          </button>
        </article>
      ))}
    </div>
  );
}

function State({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

function EmptyState({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div style={emptyStateStyle}>
      <span style={emptyIconStyle}>{icon}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
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

async function getProductRows(query: string) {
  const normalized = normalizeSearch(query);
  if (!normalized) {
    return [];
  }

  const data = await api(`/products?search=${encodeURIComponent(normalized)}&limit=120`);
  const products = Array.isArray(data) ? (data as Product[]) : [];
  const rows = products.flatMap((product) => (product.variants ?? []).map((variant) => ({
    product,
    variant,
    available: getAvailable(variant),
  })));
  const exactSkuRows = rows.filter((row) => normalizeSku(row.variant.sku) === normalizeSku(query));

  if (exactSkuRows.length > 0) return exactSkuRows;

  const termRows = rows.filter((row) => variantRowMatchesSearch(row, normalized));
  return termRows.length > 0 ? termRows : rows;
}

async function searchProducts(query: string, setRows: (rows: VariantRow[]) => void) {
  setRows(await getProductRows(query));
}

function pickBestScannedRow(rows: VariantRow[], query: string, allowNoStock: boolean) {
  const exactSkuRow = rows.find(
    (row) =>
      normalizeSku(row.variant.sku) === normalizeSku(query) &&
      (allowNoStock || row.available > 0),
  );
  if (exactSkuRow) return exactSkuRow;

  if (allowNoStock) return rows[0] ?? null;

  return rows.find((row) => row.available > 0) ?? null;
}

async function searchAccounts(
  query: string,
  setRows: (rows: CurrentAccountLookup[]) => void,
  storeLocationId?: number | null,
) {
  const normalized = query.trim();
  if (normalized.length < 2) {
    setRows([]);
    return;
  }

  const params = new URLSearchParams();
  params.set("status", "all");
  params.set("search", normalized);
  appendStoreLocationParam(params, storeLocationId);
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
  discountEnabled = true,
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
  const shouldDiscount = discountEnabled && isDiscountedAdministrativePaymentMethod(paymentMethod);
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
    const unitDiscount =
      line.quantity > 0
        ? discountAmountForLine(line, discountPercentage, shouldDiscount && !line.paidPriceLocked, pricingPolicy)
        : 0;
    acc[line.variantId] = Math.max(line.unitPrice - unitDiscount, 0);
    return acc;
  }, {});

  const lockedDiscount = normalizedLines.reduce((sum, line) => {
    if (!line.paidPriceLocked) return sum;
    return sum + discountAmountForLine(line, discountPercentage, shouldDiscount, pricingPolicy) * line.quantity;
  }, 0);

  return { subtotal, discountAmount: Math.max(discountAmount - lockedDiscount, 0), total: total + lockedDiscount, unitPrices };
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

function variantRowMatchesSearch(row: VariantRow, query: string) {
  const terms = query.split(/\s+/u).filter(Boolean);
  if (!terms.length) return true;

  const haystack = normalizeSearch(
    [
      row.product.title,
      row.product.slug,
      row.variant.sku,
      row.variant.Size,
      row.variant.Color,
      row.variant.product?.title,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return terms.every((term) => haystack.includes(term));
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

function getAccountCustomerName(account: CurrentAccountLookup) {
  const customer = account.customer;
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email || customer.phone || `Cliente #${account.customerId}`;
}

function accountBalanceLabel(value: number) {
  if (value < 0) return `Saldo a favor: ${money(Math.abs(value))}`;
  if (value > 0) return `Debe: ${money(value)}`;
  return "Saldado";
}

function returnDifferenceLabel(value: number) {
  if (value < 0) return `A favor cliente ${money(Math.abs(value))}`;
  if (value > 0) return `A cobrar ${money(value)}`;
  return "Sin diferencia";
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

const returnPrimary = "#1F6F5B";
const returnSoft = "#DDF4E8";
const returnBg = "#FAF7F1";
const returnSurface = "#FFFFFF";
const returnText = "#1F2937";
const returnMuted = "#6B7280";
const returnBorder = "#E5E7EB";

const panelStyle: React.CSSProperties = { display: "grid", gap: 18, border: 0, borderRadius: 0, background: returnBg, padding: 0, color: returnText };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "flex-start" };
const eyebrowStyle: React.CSSProperties = { margin: "0 0 8px", color: returnMuted, textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 11, fontWeight: 850 };
const titleStyle: React.CSSProperties = { margin: 0, color: returnText, fontSize: "clamp(2.1rem, 4vw, 3.35rem)", lineHeight: 0.95, fontWeight: 950 };
const subtitleStyle: React.CSSProperties = { margin: 0, color: returnText, fontSize: 22, fontWeight: 900 };
const copyStyle: React.CSSProperties = { margin: "10px 0 0", color: returnMuted, fontSize: 15 };
const summaryCardStyle = (value: number): React.CSSProperties => ({ minWidth: 230, border: `1px solid ${value < 0 ? "rgba(31,111,91,.22)" : returnBorder}`, borderRadius: 18, background: returnSurface, padding: "18px 22px", display: "grid", gap: 6, boxShadow: "0 16px 42px rgba(31,41,55,.05)", color: returnMuted, fontWeight: 850 });
const formGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, alignItems: "start" };
const returnCardStyle: React.CSSProperties = { display: "grid", gap: 14, alignContent: "start", border: `1px solid rgba(31,111,91,.16)`, borderRadius: 20, background: returnSurface, padding: 18, boxShadow: "0 18px 48px rgba(31,41,55,.045)" };
const panelTitleRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const panelIconStyle: React.CSSProperties = { width: 34, height: 34, borderRadius: 999, background: returnSoft, color: returnPrimary, display: "grid", placeItems: "center", fontWeight: 950 };
const panelTitleStyle: React.CSSProperties = { margin: 0, color: returnText, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 13, fontWeight: 950 };
const panelSubtitleStyle: React.CSSProperties = { display: "block", marginTop: 4, color: returnMuted, fontSize: 14 };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 46, borderRadius: 14, border: `1px solid ${returnBorder}`, background: returnSurface, color: returnText, padding: "11px 13px", font: "inherit" };
const smallInputStyle: React.CSSProperties = { ...inputStyle, width: 76, minHeight: 38, textAlign: "center" };
const primaryButtonStyle: React.CSSProperties = { border: 0, borderRadius: 14, background: `linear-gradient(135deg, ${returnPrimary}, #238A70)`, color: "#FFFFFF", minHeight: 58, padding: "0 18px", cursor: "pointer", fontWeight: 950, boxShadow: "0 18px 34px rgba(31,111,91,.18)" };
const ghostButtonStyle: React.CSSProperties = { border: `1px solid ${returnBorder}`, borderRadius: 12, background: returnSurface, color: returnText, padding: "9px 12px", cursor: "pointer", fontWeight: 800 };
const paymentGroupStyle: React.CSSProperties = { display: "grid", gap: 8 };
const paymentLabelStyle: React.CSSProperties = { display: "none" };
const paymentSegmentedStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0, border: `1px solid ${returnBorder}`, borderRadius: 14, padding: 0, background: returnSurface, overflow: "hidden" };
const paymentButtonStyle = (active: boolean): React.CSSProperties => ({ border: 0, borderRight: `1px solid ${returnBorder}`, background: active ? `linear-gradient(135deg, ${returnPrimary}, #247F68)` : returnSurface, color: active ? "#FFFFFF" : returnText, minHeight: 44, padding: "10px 8px", cursor: "pointer", fontWeight: 900, transition: "background 160ms ease, color 160ms ease" });
const detailsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, alignItems: "stretch", border: `1px solid ${returnBorder}`, borderRadius: 18, background: returnSurface, padding: 14 };
const twoColumnFormStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const fieldGroupStyle: React.CSSProperties = { display: "grid", gap: 8, color: returnMuted, fontWeight: 800 };
const customerBoxStyle: React.CSSProperties = { position: "relative", display: "grid", gap: 8 };
const inputIconStyle: React.CSSProperties = { position: "absolute", left: 14, top: 15, color: returnMuted, fontWeight: 900, zIndex: 1 };
const customerInputStyle: React.CSSProperties = { ...inputStyle, paddingLeft: 38 };
const selectedAccountStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid rgba(31,111,91,.24)", borderRadius: 14, padding: "10px 12px", color: returnText, background: "rgba(221,244,232,.62)" };
const miniButtonStyle: React.CSSProperties = { border: `1px solid ${returnBorder}`, borderRadius: 10, background: returnSurface, color: returnText, padding: "6px 8px", cursor: "pointer", fontWeight: 800 };
const addAccountButtonStyle: React.CSSProperties = { ...ghostButtonStyle, minHeight: 38 };
const accountListStyle: React.CSSProperties = { position: "absolute", zIndex: 20, top: 54, left: 0, right: 0, display: "grid", gap: 6, border: `1px solid ${returnBorder}`, borderRadius: 14, background: returnSurface, padding: 8, boxShadow: "0 16px 40px rgba(31,41,55,.16)" };
const accountButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, border: `1px solid ${returnBorder}`, borderRadius: 10, background: "transparent", color: returnText, padding: 9, cursor: "pointer", textAlign: "left" };
const settlementInfoStyle = (value: number): React.CSSProperties => ({ minHeight: 64, display: "grid", alignContent: "center", gap: 4, borderRadius: 14, border: `1px solid ${value > 0 ? "rgba(245,158,11,.28)" : "rgba(31,111,91,.18)"}`, background: value > 0 ? "rgba(245,158,11,.10)" : value < 0 ? "rgba(221,244,232,.72)" : returnSurface, color: returnMuted, padding: "10px 14px" });
const notesInputStyle: React.CSSProperties = { ...inputStyle, minHeight: 64, resize: "vertical" };
const searchFieldStyle: React.CSSProperties = { minHeight: 50, border: `1px solid ${returnBorder}`, borderRadius: 14, background: returnSurface, display: "grid", gridTemplateColumns: "22px minmax(0, 1fr)", alignItems: "center", gap: 10, padding: "0 14px", color: returnMuted };
const searchInputStyle: React.CSSProperties = { width: "100%", border: 0, outline: 0, background: "transparent", color: returnText, font: "inherit" };
const pickerListStyle: React.CSSProperties = { display: "grid", gap: 8, maxHeight: 250, overflow: "auto", alignContent: "start" };
const pickerButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", textAlign: "left", border: `1px solid ${returnBorder}`, borderRadius: 14, background: returnSurface, color: returnText, padding: 12, cursor: "pointer", transition: "transform 160ms ease, box-shadow 160ms ease" };
const lineListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const lineStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(180px, 1fr) 222px 130px 42px", gap: 10, alignItems: "center", border: `1px solid ${returnBorder}`, borderRadius: 16, background: returnSurface, padding: 12 };
const lineControlsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "92px 120px", gap: 10, alignItems: "center" };
const removeLineButtonStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, border: `1px solid ${returnBorder}`, background: returnSurface, color: returnMuted, cursor: "pointer", fontWeight: 900 };
const sideTotalStyle: React.CSSProperties = { minHeight: 46, border: `1px solid rgba(31,111,91,.14)`, borderRadius: 14, background: "rgba(221,244,232,.34)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", color: returnMuted, padding: "10px 14px" };
const subtotalStyle: React.CSSProperties = { color: returnPrimary, justifySelf: "end" };
const discountHintStyle: React.CSSProperties = { color: returnMuted, fontSize: 13, justifySelf: "end" };
const historySectionStyle: React.CSSProperties = { ...returnCardStyle, gap: 16 };
const historyListStyle: React.CSSProperties = { display: "grid", gap: 10 };
const historyCardStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "54px minmax(0, 1fr) auto", gap: 14, alignItems: "center", border: `1px solid ${returnBorder}`, borderRadius: 16, background: returnSurface, padding: 14, transition: "transform 160ms ease, box-shadow 160ms ease" };
const historyIconStyle: React.CSSProperties = { width: 48, height: 48, borderRadius: 999, display: "grid", placeItems: "center", background: returnSoft, color: returnPrimary, fontWeight: 950 };
const historyContentStyle: React.CSSProperties = { display: "grid", gap: 4, minWidth: 0 };
const historyItemsStyle: React.CSSProperties = { display: "grid", gap: 5, color: returnMuted, fontSize: 13 };
const historyAmountStyle = (value: number): React.CSSProperties => ({ borderRadius: 10, background: value < 0 ? returnSoft : value > 0 ? "rgba(245,158,11,.12)" : "#F8FAFC", color: value > 0 ? "#92400E" : returnPrimary, padding: "10px 14px", fontWeight: 950, whiteSpace: "nowrap" });
const mutedStyle: React.CSSProperties = { display: "block", color: returnMuted, fontSize: 12 };
const stateStyle: React.CSSProperties = { padding: 14, borderRadius: 12, border: `1px solid ${returnBorder}`, color: returnMuted, alignSelf: "start" };
const emptyStateStyle: React.CSSProperties = { minHeight: 230, display: "grid", placeItems: "center", textAlign: "center", alignContent: "center", gap: 10, color: returnMuted };
const emptyIconStyle: React.CSSProperties = { width: 72, height: 72, borderRadius: 999, background: returnSoft, color: returnPrimary, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 950 };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 120, background: "var(--admin-overlay-bg, rgba(0,0,0,.42))", display: "grid", placeItems: "center", padding: 16 };
const modalStyle: React.CSSProperties = { width: "min(780px, 100%)", maxHeight: "min(760px, calc(100vh - 32px))", overflow: "auto", borderRadius: 20, border: "1px solid var(--border-soft)", background: "var(--page-panel-bg)", padding: 20, display: "grid", gap: 16, boxShadow: "var(--admin-modal-shadow)" };
const modalActionsStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" };
const errorStyle: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 12, border: "1px solid var(--admin-danger-border)", background: "var(--admin-danger-bg)", color: "var(--admin-danger-color)" };
const successStyle: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 12, border: "1px solid rgba(22, 163, 74, .35)", background: "rgba(22, 163, 74, .12)", color: "var(--text-strong)" };
const differenceStyle = (value: number): React.CSSProperties => ({ color: value > 0 ? "var(--text-strong)" : "var(--text-muted)", fontSize: 20 });
