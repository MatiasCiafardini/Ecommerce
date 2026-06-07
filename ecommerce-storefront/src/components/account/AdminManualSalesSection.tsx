"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { money } from "./order-utils";

type ManualSaleProduct = {
  id: number;
  title: string;
  slug: string;
  variants?: Array<{
    id: number;
    sku?: string | null;
    price: string | number;
    Size?: string | null;
    Color?: string | null;
    inventories?: Array<{
      quantity?: number;
      reserved?: number;
    }>;
  }>;
};

type ManualSaleLine = {
  variantId: number;
  productId: number;
  title: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  price: string;
  available: number;
};

type ManualSaleVariant = NonNullable<ManualSaleProduct["variants"]>[number];

type ManualSaleVariantRow = {
  rowId: string;
  product: ManualSaleProduct;
  variant: ManualSaleVariant;
  productTitle: string;
  productSlug: string;
  variantLabel: string;
  sku: string;
  price: string | number;
  available: number;
};

type CreatedOrder = {
  id: number;
  total: string | number;
  status: string;
};

type SaleSuccessSummary = {
  id: number;
  total: string | number;
  status: string;
  customerName?: string;
  paymentMethod: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  items: Array<{
    title: string;
    variantLabel: string;
    quantity: number;
    lineTotal: number;
  }>;
};

const paymentOptions = ["Efectivo", "Tarjeta", "Transferencia"];
const minVariantSearchLength = 4;

const getAvailableStock = (inventories: ManualSaleVariant["inventories"]) =>
  (inventories ?? []).reduce(
    (total: number, inventory: NonNullable<ManualSaleVariant["inventories"]>[number]) =>
      total + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0),
    0,
  );

const normalizeScannerSkuInput = (value: string) =>
  value.replace(/[\u0027\u0060\u2019\u2018\u00b4\u02bc\u02b9\u2032\uff07]/g, "-").trimStart();

export default function AdminManualSalesSection({
  onSaleRegistered,
}: {
  onSaleRegistered?: () => Promise<void> | void;
}) {
  const [products, setProducts] = useState<ManualSaleProduct[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ManualSaleLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saleSummary, setSaleSummary] = useState<SaleSuccessSummary | null>(null);
  const [selectedCatalogVariantId, setSelectedCatalogVariantId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const productsData = await api("/products");
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo preparar la venta manual.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const variantRows = useMemo<ManualSaleVariantRow[]>(
    () =>
      products.flatMap((product) =>
        (product.variants ?? []).map((variant) => ({
          rowId: `${product.id}-${variant.id}`,
          product,
          variant,
          productTitle: product.title,
          productSlug: product.slug,
          variantLabel: getVariantLabel(variant),
          sku: String(variant.sku ?? ""),
          price: variant.price,
          available: getAvailableStock(variant.inventories),
        })),
      ),
    [products],
  );

  const filteredVariantRows = useMemo(() => {
    const query = normalizeScannerSkuInput(productQuery).trim().toLowerCase();
    if (query.length < minVariantSearchLength) return [];

    return variantRows.filter((row) => {
      const variantText = normalizeScannerSkuInput(
        [row.sku, row.variantLabel, row.productTitle, row.productSlug].filter(Boolean).join(" "),
      ).toLowerCase();

      return variantText.includes(query);
    });
  }, [productQuery, variantRows]);

  const visibleVariantRows = filteredVariantRows.slice(0, 120);
  const normalizedSearchLength = normalizeScannerSkuInput(productQuery).trim().length;

  useEffect(() => {
    if (visibleVariantRows.length === 0) {
      setSelectedCatalogVariantId(null);
      return;
    }

    setSelectedCatalogVariantId((current) =>
      current && visibleVariantRows.some((row) => row.variant.id === current)
        ? current
        : visibleVariantRows[0].variant.id,
    );
  }, [visibleVariantRows]);

  const totalAvailableUnits = useMemo(
    () =>
      variantRows.reduce((total, row) => total + row.available, 0),
    [variantRows],
  );
  const subtotal = lines.reduce(
    (total, line) => total + Number(line.price || 0) * Number(line.quantity || 0),
    0,
  );
  const totalItems = lines.reduce((total, line) => total + Number(line.quantity || 0), 0);
  const normalizedDiscountValue = Number(discountValue || 0);
  const safeDiscountValue = Number.isFinite(normalizedDiscountValue)
    ? Math.max(normalizedDiscountValue, 0)
    : 0;
  const discountAmount =
    discountType === "percentage"
      ? calculateRoundedPercentageDiscount(subtotal, safeDiscountValue)
      : Math.min(safeDiscountValue, subtotal);
  const total = Math.max(subtotal - discountAmount, 0);
  const hasDiscount = discountAmount > 0;

  const addVariant = (product: ManualSaleProduct, variant: ManualSaleVariant) => {
    const available = getAvailableStock(variant.inventories);
    if (available <= 0) {
      setError("Esa variante no tiene stock disponible.");
      return false;
    }

    setError("");
    setSuccess("");
    setLines((current) => {
      const existing = current.find((line) => line.variantId === variant.id);
      if (existing) {
        return current.map((line) =>
          line.variantId === variant.id
            ? { ...line, quantity: Math.min(line.quantity + 1, line.available) }
            : line,
        );
      }

      return [
        ...current,
        {
          variantId: variant.id,
          productId: product.id,
          title: product.title,
          variantLabel: getVariantLabel(variant),
          sku: String(variant.sku ?? ""),
          quantity: 1,
          price: String(variant.price ?? "0"),
          available,
        },
      ];
    });
    return true;
  };

  const focusSearchInput = () => {
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const addVariantRow = (row: ManualSaleVariantRow) => {
    const added = addVariant(row.product, row.variant);
    if (!added) return;
    setProductQuery("");
    setSelectedCatalogVariantId(null);
    focusSearchInput();
  };

  const addCurrentCatalogSelection = () => {
    const normalizedQuery = normalizeScannerSkuInput(productQuery).trim().toLowerCase();
    if (normalizedQuery.length < minVariantSearchLength) {
      setError(`Escribi al menos ${minVariantSearchLength} caracteres para buscar una variante.`);
      focusSearchInput();
      return;
    }

    const exactSkuMatch = normalizedQuery
      ? variantRows.find(
          (row) =>
            normalizeScannerSkuInput(row.sku).trim().toLowerCase() === normalizedQuery,
        )
      : null;

    const selectedRow = selectedCatalogVariantId
      ? visibleVariantRows.find((row) => row.variant.id === selectedCatalogVariantId)
      : null;
    const rowToAdd =
      exactSkuMatch ??
      selectedRow ??
      (visibleVariantRows.length === 1 ? visibleVariantRows[0] : null);

    if (!rowToAdd) {
      setError("No encontramos una variante para agregar con esa busqueda.");
      focusSearchInput();
      return;
    }

    addVariantRow(rowToAdd);
  };

  const moveCatalogSelection = (direction: 1 | -1) => {
    if (visibleVariantRows.length === 0) return;

    const currentIndex = visibleVariantRows.findIndex(
      (row) => row.variant.id === selectedCatalogVariantId,
    );
    const fallbackIndex = direction === 1 ? 0 : visibleVariantRows.length - 1;
    const nextIndex =
      currentIndex === -1
        ? fallbackIndex
        : Math.min(Math.max(currentIndex + direction, 0), visibleVariantRows.length - 1);

    setSelectedCatalogVariantId(visibleVariantRows[nextIndex].variant.id);
  };

  const updateLine = (variantId: number, patch: Partial<ManualSaleLine>) => {
    setLines((current) =>
      current.map((line) => (line.variantId === variantId ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (variantId: number) => {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  };

  const resetForm = () => {
    setCustomerName("");
    setPaymentMethod("Efectivo");
    setDiscountType("percentage");
    setDiscountValue("");
    setNotes("");
    setProductQuery("");
    setLines([]);
    setSelectedCatalogVariantId(null);
    setSuccess("");
    setError("");
    focusSearchInput();
  };

  const handleCreateSale = async () => {
    if (lines.length === 0) {
      setError("Agrega al menos una variante a la venta.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        customerId: undefined,
        customerFirstName: customerName.trim() || undefined,
        customerLastName: undefined,
        customerEmail: undefined,
        customerPhone: undefined,
        shippingMethod: undefined,
        shippingCost: 0,
        paymentMethod: paymentMethod.trim() || undefined,
        discountType,
        discountValue: safeDiscountValue,
        paymentStatus: "approved" as const,
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({
          variantId: line.variantId,
          quantity: Number(line.quantity),
          price: Number(line.price || 0),
        })),
      };

      const created = (await api("/orders/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as CreatedOrder;

      setSuccess(`Venta #${created.id} registrada por ${money(created.total)}.`);
      setSaleSummary({
        id: created.id,
        total: created.total,
        status: created.status,
        customerName: customerName.trim() || undefined,
        paymentMethod,
        discountType,
        discountValue: safeDiscountValue,
        discountAmount,
        items: lines.map((line) => ({
          title: line.title,
          variantLabel: line.variantLabel,
          quantity: Number(line.quantity),
          lineTotal: Number(line.price || 0) * Number(line.quantity || 0),
        })),
      });
      resetForm();
      await onSaleRegistered?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta manual.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="manual-sale-panel" data-account-panel>
      <header className="manual-sale-header">
        <div>
          <p className="manual-sale-eyebrow">Mostrador</p>
          <h2>Venta manual</h2>
          <p>
            Busca productos, arma el ticket con stock real y cierra el cobro en el mismo flujo.
          </p>
        </div>
        <div className="manual-sale-kpis" aria-label="Resumen del mostrador">
          <MiniStat label="Productos" value={String(products.length)} />
          <MiniStat label="Stock" value={String(totalAvailableUnits)} />
          <MiniStat label="Ticket" value={String(totalItems)} />
        </div>
      </header>

      {error ? <p className="manual-sale-alert manual-sale-alert-error">{error}</p> : null}
      {success ? <p className="manual-sale-alert manual-sale-alert-success">{success}</p> : null}

      {loading ? (
        <StateCard label="Preparando mostrador..." />
      ) : (
        <div className="manual-sale-workspace">
          <section className="manual-sale-catalog" aria-label="Catalogo">
            <div className="manual-sale-card manual-sale-search-card">
              <div>
                <p className="manual-sale-eyebrow">Catalogo</p>
                <h3>Agregar productos</h3>
              </div>

              <div className="manual-sale-search-row">
                <input
                  ref={searchInputRef}
                  value={productQuery}
                  onChange={(event) => setProductQuery(normalizeScannerSkuInput(event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveCatalogSelection(1);
                      return;
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveCatalogSelection(-1);
                      return;
                    }

                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addCurrentCatalogSelection();
                  }}
                  placeholder="Buscar por nombre, slug o SKU"
                  className="manual-sale-field"
                />
                <button
                  type="button"
                  onClick={addCurrentCatalogSelection}
                  className="manual-sale-button"
                >
                  Agregar
                </button>
              </div>

              <div className="manual-sale-search-meta">
                <span>
                  {normalizedSearchLength < minVariantSearchLength
                    ? `Escribi ${minVariantSearchLength} caracteres para buscar`
                    : `${filteredVariantRows.length} variantes`}
                </span>
                {filteredVariantRows.length > visibleVariantRows.length ? (
                  <span>Mostrando las primeras {visibleVariantRows.length}</span>
                ) : null}
              </div>
            </div>

            <div className="manual-sale-variant-table-shell">
              {visibleVariantRows.length === 0 ? (
                <StateCard
                  label={
                    normalizedSearchLength < minVariantSearchLength
                      ? "La tabla aparece cuando escribis al menos 4 caracteres o escaneas un codigo."
                      : "No encontramos variantes con esa busqueda."
                  }
                />
              ) : (
                <div className="manual-sale-variant-table">
                  <div className="manual-sale-variant-table-head" aria-hidden="true">
                    <span>Producto</span>
                    <span>Variante</span>
                    <span>SKU</span>
                    <span>Precio</span>
                    <span>Stock</span>
                    <span />
                  </div>

                  <div className="manual-sale-variant-table-body">
                    {visibleVariantRows.map((row) => {
                      const selected = selectedCatalogVariantId === row.variant.id;
                      const added = lines.some((line) => line.variantId === row.variant.id);

                      return (
                        <div
                          key={row.rowId}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedCatalogVariantId(row.variant.id)}
                          onDoubleClick={() => addVariantRow(row)}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setSelectedCatalogVariantId(row.variant.id);
                            addVariantRow(row);
                          }}
                          className={`manual-sale-variant-row${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                        >
                          <span className="manual-sale-variant-product">
                            <strong>{row.productTitle}</strong>
                            <small>/{row.productSlug}</small>
                          </span>
                          <span>{row.variantLabel}</span>
                          <span className="manual-sale-variant-sku">{row.sku || "-"}</span>
                          <strong>{money(row.price)}</strong>
                          <span
                            className={
                              row.available > 0
                                ? "manual-sale-stock"
                                : "manual-sale-stock is-empty"
                            }
                          >
                            {row.available > 0 ? row.available : "Sin stock"}
                          </span>
                          <span className="manual-sale-row-action">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                addVariantRow(row);
                              }}
                              className={`manual-sale-button manual-sale-button-soft${
                                added ? " is-added" : ""
                              }`}
                            >
                              {added ? "Sumar" : "Agregar"}
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="manual-sale-checkout" aria-label="Ticket y cierre">
            <section className="manual-sale-card">
              <div className="manual-sale-card-title">
                <div>
                  <p className="manual-sale-eyebrow">Ticket</p>
                  <h3>Venta en curso</h3>
                </div>
                <span>{lines.length} lineas</span>
              </div>

              <div className="manual-sale-lines">
                {lines.length === 0 ? (
                  <StateCard label="Todavia no agregaste productos al ticket." />
                ) : (
                  lines.map((line) => (
                    <article key={line.variantId} className="manual-sale-line">
                      <div className="manual-sale-line-top">
                        <div>
                          <strong>{line.title}</strong>
                          <span>
                            {line.variantLabel}
                            {line.sku ? ` - ${line.sku}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.variantId)}
                          className="manual-sale-icon-button"
                          aria-label={`Quitar ${line.title}`}
                        >
                          ×
                        </button>
                      </div>

                      <div className="manual-sale-line-controls">
                        <div className="manual-sale-qty">
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(line.variantId, {
                                quantity: Math.max(1, Number(line.quantity || 1) - 1),
                              })
                            }
                            aria-label="Restar cantidad"
                          >
                            -
                          </button>
                          <strong>{line.quantity}</strong>
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(line.variantId, {
                                quantity: Math.min(line.available, Number(line.quantity || 1) + 1),
                              })
                            }
                            aria-label="Sumar cantidad"
                          >
                            +
                          </button>
                        </div>
                        <input
                          inputMode="decimal"
                          value={line.price}
                          onChange={(event) =>
                            updateLine(line.variantId, { price: event.target.value })
                          }
                          className="manual-sale-field"
                          aria-label={`Precio de ${line.title}`}
                        />
                        <strong className="manual-sale-line-total">
                          {money(Number(line.price || 0) * Number(line.quantity || 0))}
                        </strong>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="manual-sale-card manual-sale-total-card">
              <div className="manual-sale-totals">
                <div className="manual-sale-grand-total">
                  <span>Total</span>
                  <strong>{money(total)}</strong>
                </div>
                {hasDiscount ? (
                  <div className="manual-sale-discount-summary">
                    <SummaryRow label="Subtotal" value={money(subtotal)} />
                    <SummaryRow
                      label={
                        discountType === "percentage"
                          ? `Descuento (${safeDiscountValue}%)`
                          : "Descuento"
                      }
                      value={`- ${money(discountAmount)}`}
                    />
                  </div>
                ) : null}
              </div>

              <div className="manual-sale-checkout-form">
                <label>
                  <span>Cliente</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Ej. Juan Perez"
                    className="manual-sale-field"
                  />
                </label>

                <div className="manual-sale-field-group">
                  <span>Medio de pago</span>
                  <div className="manual-sale-segmented">
                    {paymentOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPaymentMethod(option)}
                        className={paymentMethod === option ? "is-active" : ""}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="manual-sale-discount-row">
                  <div className="manual-sale-field-group">
                    <span>Descuento</span>
                    <div className="manual-sale-segmented manual-sale-discount-type">
                      <button
                        type="button"
                        onClick={() => setDiscountType("percentage")}
                        className={discountType === "percentage" ? "is-active" : ""}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("fixed")}
                        className={discountType === "fixed" ? "is-active" : ""}
                      >
                        $
                      </button>
                    </div>
                  </div>

                  <label>
                    <span>{discountType === "percentage" ? "Valor (%)" : "Valor ($)"}</span>
                    <input
                      inputMode="decimal"
                      value={discountValue}
                      onChange={(event) => setDiscountValue(event.target.value)}
                      onBlur={() => {
                        if (!discountValue.trim()) {
                          setDiscountValue("0");
                        }
                      }}
                      placeholder="0"
                      className="manual-sale-field"
                    />
                  </label>
                </div>
              </div>

              <label className="manual-sale-notes">
                <span>Notas internas</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="manual-sale-field"
                />
              </label>

              <div className="manual-sale-actions">
                <button type="button" onClick={resetForm} className="manual-sale-button-ghost">
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateSale()}
                  className="manual-sale-button manual-sale-button-primary"
                  disabled={saving || lines.length === 0}
                >
                  {saving ? "Registrando..." : "Registrar venta"}
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {saleSummary ? (
        <div className="manual-sale-modal-overlay" onClick={() => setSaleSummary(null)}>
          <div className="manual-sale-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-sale-modal-header">
              <p className="manual-sale-eyebrow">Venta exitosa</p>
              <h3>Venta #{saleSummary.id}</h3>
              <strong>{money(saleSummary.total)}</strong>
            </div>

            <div className="manual-sale-receipt">
              {saleSummary.customerName ? (
                <SummaryRow label="Cliente" value={saleSummary.customerName} />
              ) : null}
              <SummaryRow label="Pago" value={saleSummary.paymentMethod} />
              <SummaryRow
                label={
                  saleSummary.discountType === "percentage"
                    ? `Descuento (${saleSummary.discountValue}%)`
                    : "Descuento"
                }
                value={`- ${money(saleSummary.discountAmount)}`}
              />
              <SummaryRow label="Estado" value={saleSummary.status} />
            </div>

            <div className="manual-sale-receipt-lines">
              {saleSummary.items.map((item, index) => (
                <article key={`${item.title}-${item.variantLabel}-${index}`}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.variantLabel}</span>
                  </div>
                  <span>x{item.quantity}</span>
                  <strong>{money(item.lineTotal)}</strong>
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSaleSummary(null)}
              className="manual-sale-button manual-sale-button-primary"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .manual-sale-panel {
          border-radius: 28px;
          border: 1px solid var(--border-soft);
          background: var(--page-panel-bg);
          padding: clamp(18px, 3vw, 28px);
          display: grid;
          gap: 20px;
        }

        .manual-sale-header,
        .manual-sale-card-title,
        .manual-sale-line-top,
        .manual-sale-actions,
        .manual-sale-search-meta {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .manual-sale-header {
          align-items: stretch;
        }

        .manual-sale-header h2,
        .manual-sale-card h3,
        .manual-sale-modal h3 {
          margin: 0;
          color: var(--text-strong);
          line-height: 1.05;
        }

        .manual-sale-header h2 {
          font-size: clamp(2rem, 4vw, 3.2rem);
        }

        .manual-sale-card h3,
        .manual-sale-modal h3 {
          font-size: clamp(1.25rem, 2vw, 1.65rem);
        }

        .manual-sale-header p,
        .manual-sale-card-title span,
        .manual-sale-search-meta,
        .manual-sale-product-main span,
        .manual-sale-line span,
        .manual-sale-field-group > span,
        label > span {
          color: var(--text-muted);
        }

        .manual-sale-eyebrow {
          margin: 0 0 8px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
          font-weight: 700;
        }

        .manual-sale-header p {
          margin: 10px 0 0;
          max-width: 680px;
          line-height: 1.6;
        }

        .manual-sale-kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(90px, 1fr));
          gap: 10px;
          min-width: min(100%, 360px);
        }

        .manual-sale-mini-stat,
        .manual-sale-card,
        .manual-sale-line,
        .manual-sale-state,
        .manual-sale-receipt {
          border: 1px solid var(--border-soft);
          background: var(--page-panel-strong-bg);
        }

        .manual-sale-mini-stat {
          border-radius: 18px;
          padding: 14px;
          display: grid;
          gap: 6px;
        }

        .manual-sale-mini-stat span {
          color: var(--text-muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .manual-sale-mini-stat strong {
          color: var(--text-strong);
          font-size: 24px;
        }

        .manual-sale-alert {
          margin: 0;
          border-radius: 16px;
          padding: 12px 14px;
          font-weight: 700;
        }

        .manual-sale-alert-error {
          color: var(--accent-strong);
          background: color-mix(in srgb, var(--accent-strong) 10%, transparent);
        }

        .manual-sale-alert-success {
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 10%, transparent);
        }

        .manual-sale-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(460px, 0.48fr);
          gap: 18px;
          align-items: start;
        }

        .manual-sale-catalog,
        .manual-sale-checkout {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .manual-sale-checkout {
          position: sticky;
          top: 18px;
          align-self: start;
        }

        .manual-sale-card,
        .manual-sale-product-card,
        .manual-sale-line,
        .manual-sale-state {
          border-radius: 18px;
          padding: 18px;
        }

        .manual-sale-search-card {
          gap: 14px;
        }

        .manual-sale-search-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }

        .manual-sale-field {
          width: 100%;
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid var(--border-soft);
          background: var(--muted-field-bg);
          color: var(--muted-field-color);
          padding: 11px 13px;
          outline: none;
        }

        textarea.manual-sale-field {
          min-height: 78px;
          resize: vertical;
        }

        .manual-sale-variant-table-shell {
          min-width: 0;
          overflow-x: auto;
        }

        .manual-sale-variant-table {
          display: grid;
          gap: 8px;
          min-width: 760px;
        }

        .manual-sale-variant-table-head,
        .manual-sale-variant-row {
          display: grid;
          grid-template-columns:
            minmax(190px, 1.3fr)
            minmax(130px, 0.9fr)
            minmax(110px, 0.7fr)
            minmax(110px, 0.7fr)
            minmax(86px, 0.45fr)
            minmax(96px, 0.45fr);
          gap: 12px;
          align-items: center;
        }

        .manual-sale-variant-table-head {
          padding: 0 14px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 800;
        }

        .manual-sale-variant-table-body {
          display: grid;
          gap: 8px;
          max-height: 54vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .manual-sale-variant-row {
          width: 100%;
          border: 1px solid var(--border-soft);
          border-radius: 16px;
          background: var(--page-panel-strong-bg);
          color: var(--text-strong);
          padding: 12px 14px;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .manual-sale-variant-row:hover,
        .manual-sale-variant-row.is-selected {
          border-color: var(--border-strong);
          background: color-mix(in srgb, var(--accent) 13%, var(--page-panel-strong-bg));
        }

        .manual-sale-variant-row.is-selected {
          box-shadow: inset 4px 0 0 var(--accent-strong);
        }

        .manual-sale-variant-product {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .manual-sale-variant-product strong,
        .manual-sale-variant-row strong {
          color: var(--text-strong);
        }

        .manual-sale-variant-product small,
        .manual-sale-variant-row span {
          color: var(--text-muted);
          overflow-wrap: anywhere;
        }

        .manual-sale-variant-sku {
          font-weight: 800;
          color: var(--text-strong) !important;
        }

        .manual-sale-line strong,
        .manual-sale-grand-total strong,
        .manual-sale-receipt strong,
        .manual-sale-receipt-lines strong {
          color: var(--text-strong);
        }

        .manual-sale-line-top > div {
          min-width: 0;
          display: grid;
          gap: 6px;
        }

        .manual-sale-line span {
          overflow-wrap: anywhere;
          font-size: 13px;
        }

        .manual-sale-stock {
          align-self: center;
          border-radius: 999px;
          background: color-mix(in srgb, var(--accent) 13%, transparent);
          color: var(--text-strong);
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
        }

        .manual-sale-stock.is-empty {
          background: color-mix(in srgb, var(--accent-strong) 12%, transparent);
          color: var(--accent-strong);
        }

        .manual-sale-lines {
          display: grid;
          gap: 10px;
          max-height: 34vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .manual-sale-line {
          display: grid;
          gap: 10px;
          background: var(--page-panel-bg);
          padding: 14px 16px;
        }

        .manual-sale-line-controls {
          display: grid;
          grid-template-columns: 124px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .manual-sale-qty {
          min-height: 44px;
          border-radius: 14px;
          border: 1px solid var(--border-soft);
          background: var(--muted-field-bg);
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) 38px;
          overflow: hidden;
        }

        .manual-sale-qty button,
        .manual-sale-icon-button {
          border: 0;
          background: transparent;
          color: var(--text-strong);
          cursor: pointer;
        }

        .manual-sale-qty strong {
          display: grid;
          place-items: center;
          border-inline: 1px solid var(--border-soft);
          font-size: 16px;
        }

        .manual-sale-icon-button {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid var(--border-soft);
          flex: 0 0 auto;
          background: transparent;
          font-size: 16px;
          line-height: 1;
        }

        .manual-sale-line-total {
          justify-self: end;
          min-width: 112px;
          text-align: right;
          white-space: nowrap;
        }

        .manual-sale-total-card {
          gap: 16px;
          overflow: hidden;
        }

        .manual-sale-totals,
        .manual-sale-checkout-form,
        .manual-sale-notes,
        .manual-sale-field-group {
          display: grid;
          gap: 10px;
        }

        .manual-sale-summary-row,
        .manual-sale-receipt-lines article {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .manual-sale-discount-summary {
          display: grid;
          gap: 4px;
          border-top: 1px solid var(--border-soft);
          padding-top: 10px;
        }

        .manual-sale-grand-total {
          display: grid;
          gap: 4px;
          border-radius: 18px;
          background: color-mix(in srgb, var(--page-panel-bg) 72%, transparent);
          border: 1px solid var(--border-soft);
          padding: 16px;
        }

        .manual-sale-summary-row span,
        .manual-sale-grand-total span {
          color: var(--text-muted);
        }

        .manual-sale-summary-row {
          min-height: 28px;
          padding-inline: 2px;
        }

        .manual-sale-grand-total strong {
          font-size: clamp(2rem, 4vw, 2.8rem);
          line-height: 1;
          text-align: left;
          white-space: nowrap;
        }

        .manual-sale-checkout-form {
          border-top: 1px solid var(--border-soft);
          padding-top: 14px;
        }

        label,
        .manual-sale-field-group {
          min-width: 0;
        }

        label > span,
        .manual-sale-field-group > span {
          display: block;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
        }

        .manual-sale-segmented {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
          gap: 6px;
          border-radius: 16px;
          border: 1px solid var(--border-soft);
          background: var(--muted-field-bg);
          padding: 5px;
        }

        .manual-sale-segmented button {
          min-height: 40px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--muted-field-color);
          cursor: pointer;
          font-weight: 700;
        }

        .manual-sale-discount-row {
          display: grid;
          grid-template-columns: minmax(140px, 0.45fr) minmax(0, 1fr);
          gap: 10px;
          align-items: end;
        }

        .manual-sale-discount-type {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .manual-sale-segmented button.is-active {
          border-color: var(--border-strong);
          background: var(--ghost-chip-active-bg);
          color: var(--text-strong);
        }

        .manual-sale-button,
        .manual-sale-button-ghost {
          min-height: 44px;
          border-radius: 999px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 800;
          white-space: nowrap;
        }

        .manual-sale-button {
          border: 1px solid var(--border-soft);
          background: var(--page-panel-bg);
          color: var(--text-strong);
        }

        .manual-sale-button-primary {
          border-color: var(--accent-strong);
          background: var(--accent-strong);
          color: var(--accent-contrast);
        }

        .manual-sale-button-soft {
          min-height: 40px;
          padding-inline: 14px;
        }

        .manual-sale-row-action {
          display: flex;
          justify-content: flex-end;
        }

        .manual-sale-button-soft.is-added {
          background: var(--ghost-chip-active-bg);
          border-color: var(--border-strong);
        }

        .manual-sale-button-ghost {
          border: 1px solid var(--border-soft);
          background: transparent;
          color: var(--text-strong);
        }

        .manual-sale-actions {
          margin: 0 -18px -18px;
          padding: 16px 18px 18px;
          background: color-mix(in srgb, var(--page-panel-strong-bg) 92%, transparent);
          border-top: 1px solid var(--border-soft);
          align-items: center;
        }

        .manual-sale-actions .manual-sale-button-primary {
          min-width: 190px;
        }

        .manual-sale-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .manual-sale-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          background: rgba(0, 0, 0, 0.56);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .manual-sale-modal {
          width: min(100%, 620px);
          max-height: min(88vh, 860px);
          overflow-y: auto;
          border-radius: 26px;
          border: 1px solid var(--border-soft);
          background: var(--page-panel-bg);
          padding: 22px;
          display: grid;
          gap: 16px;
        }

        .manual-sale-modal-header {
          text-align: center;
          display: grid;
          gap: 8px;
        }

        .manual-sale-modal-header strong {
          color: var(--text-strong);
          font-size: 34px;
        }

        .manual-sale-receipt,
        .manual-sale-receipt-lines {
          display: grid;
          gap: 10px;
          border-radius: 20px;
          padding: 16px;
        }

        .manual-sale-receipt-lines article {
          border-radius: 16px;
          border: 1px solid var(--border-soft);
          background: var(--page-panel-strong-bg);
          padding: 12px;
        }

        .manual-sale-receipt-lines div {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .manual-sale-state {
          color: var(--text-muted);
        }

        @media (max-width: 980px) {
          .manual-sale-header,
          .manual-sale-workspace {
            grid-template-columns: 1fr;
          }

          .manual-sale-header {
            display: grid;
          }

          .manual-sale-checkout {
            position: static;
          }
        }

        @media (max-width: 680px) {
          .manual-sale-panel {
            border-radius: 20px;
            padding: 14px;
          }

          .manual-sale-kpis,
          .manual-sale-search-row,
          .manual-sale-discount-row {
            grid-template-columns: 1fr;
          }

          .manual-sale-line-controls {
            grid-template-columns: 116px minmax(0, 1fr);
          }

          .manual-sale-line-total {
            grid-column: 1 / -1;
          }

          .manual-sale-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .manual-sale-button,
          .manual-sale-button-ghost {
            width: 100%;
          }

          .manual-sale-lines {
            max-height: none;
          }
        }
      `}</style>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="manual-sale-mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="manual-sale-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StateCard({ label }: { label: string }) {
  return <div className="manual-sale-state">{label}</div>;
}

function getVariantLabel(variant: Pick<ManualSaleVariant, "Size" | "Color">) {
  return [variant.Size, variant.Color].filter(Boolean).join(" - ") || "Variante principal";
}

function roundManualSaleAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 100) * 100;
}

function calculateRoundedPercentageDiscount(subtotal: number, discountValue: number) {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(subtotal, 0) : 0;
  const safePercentage = Number.isFinite(discountValue)
    ? Math.min(Math.max(discountValue, 0), 100)
    : 0;
  const roundedTotal = roundManualSaleAmount(safeSubtotal * (1 - safePercentage / 100));

  return Math.min(Math.max(safeSubtotal - roundedTotal, 0), safeSubtotal);
}
