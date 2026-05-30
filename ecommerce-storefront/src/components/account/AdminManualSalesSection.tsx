"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import ThemeSelect from "@/components/ui/ThemeSelect";
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

const getAvailableStock = (inventories: ManualSaleVariant["inventories"]) =>
  (inventories ?? []).reduce(
    (total: number, inventory: NonNullable<ManualSaleVariant["inventories"]>[number]) =>
      total + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0),
    0,
  );

const getProductBasePrice = (product: ManualSaleProduct) => {
  const prices = (product.variants ?? [])
    .map((variant) => Number(variant.price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0);

  return prices.length > 0 ? Math.min(...prices) : 0;
};

const normalizeScannerSkuInput = (value: string) =>
  value.replace(/['’‘`´ʼʹ′＇]/g, "-");

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
  const [discountValue, setDiscountValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ManualSaleLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saleSummary, setSaleSummary] = useState<SaleSuccessSummary | null>(null);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, string>>(
    {},
  );
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

  const filteredProducts = useMemo(() => {
    const query = normalizeScannerSkuInput(productQuery).trim().toLowerCase();

    return products.filter((product) => {
      if (!query) return true;

      const variantsText = normalizeScannerSkuInput(
        (product.variants ?? [])
        .map((variant) => [variant.sku, variant.Size, variant.Color].filter(Boolean).join(" "))
          .join(" "),
      ).toLowerCase();

      return (
        product.title.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        variantsText.includes(query)
      );
    });
  }, [productQuery, products]);

  const subtotal = lines.reduce(
    (total, line) => total + Number(line.price || 0) * Number(line.quantity || 0),
    0,
  );
  const normalizedDiscountValue = Number(discountValue || 0);
  const safeDiscountValue = Number.isFinite(normalizedDiscountValue)
    ? Math.max(normalizedDiscountValue, 0)
    : 0;
  const discountAmount =
    discountType === "percentage"
      ? subtotal * (Math.min(safeDiscountValue, 100) / 100)
      : Math.min(safeDiscountValue, subtotal);
  const total = Math.max(subtotal - discountAmount, 0);

  const addVariant = (product: ManualSaleProduct, variant: ManualSaleVariant) => {
    const available = getAvailableStock(variant.inventories);
    if (available <= 0) {
      setError("Esa variante no tiene stock disponible.");
      return;
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
          variantLabel:
            [variant.Size, variant.Color].filter(Boolean).join(" · ") ||
            "Variante principal",
          sku: String(variant.sku ?? ""),
          quantity: 1,
          price: String(variant.price ?? "0"),
          available,
        },
      ];
    });
  };

  const focusSearchInput = () => {
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const addScannedVariant = () => {
    const normalizedQuery = normalizeScannerSkuInput(productQuery).trim().toLowerCase();
    if (!normalizedQuery) return;

    if (filteredProducts.length !== 1) {
      setError("El escaneo debe dejar una unica coincidencia antes de agregar.");
      focusSearchInput();
      return;
    }

    const product = filteredProducts[0];
    const variant = (product.variants ?? []).find(
      (entry) =>
        normalizeScannerSkuInput(String(entry.sku ?? "")).trim().toLowerCase() ===
        normalizedQuery,
    );

    if (!variant) {
      setError("No encontramos una variante con ese SKU exacto.");
      focusSearchInput();
      return;
    }

    addVariant(product, variant);
    setProductQuery("");
    setSelectedVariantByProduct((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
    focusSearchInput();
  };

  const handleVariantSelectionChange = (productId: number, value: string) => {
    setSelectedVariantByProduct((current) => ({
      ...current,
      [productId]: value,
    }));
  };

  const addSelectedVariant = (product: ManualSaleProduct) => {
    const selectedVariantId = selectedVariantByProduct[product.id];
    if (!selectedVariantId) {
      setError("Selecciona una variante antes de agregarla al ticket.");
      return;
    }

    const variant = (product.variants ?? []).find(
      (entry) => String(entry.id) === selectedVariantId,
    );
    if (!variant) {
      setError("No encontramos esa variante para agregarla a la venta.");
      return;
    }

    addVariant(product, variant);
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
    setDiscountValue("0");
    setNotes("");
    setLines([]);
    setSelectedVariantByProduct({});
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

      setSuccess(
        `Venta #${created.id} registrada por ${money(created.total)} con estado ${created.status}.`,
      );
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
    <section style={panelStyle} data-account-panel>
      <Header
        title="Venta manual"
        copy="Registra ventas de mostrador usando el mismo stock real de la tienda, con precio editable por linea y cierre desde el mismo admin."
      />

      {error ? <p style={errorStyle}>{error}</p> : null}
      {success ? <p style={successStyle}>{success}</p> : null}

      {loading ? (
        <StateCard label="Preparando mostrador..." />
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <section style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Catalogo</p>
                <h3 style={title3Style}>Buscar y agregar productos</h3>
                <p style={copyStyle}>
                  Busca productos y agrega variantes al ticket.
                </p>
              </div>
            </div>

            <input
              ref={searchInputRef}
              value={productQuery}
              onChange={(event) => {
                const normalizedValue = normalizeScannerSkuInput(event.target.value);
                event.currentTarget.value = normalizedValue;
                setProductQuery(normalizedValue);
              }}
              onInput={(event) => {
                const normalizedValue = normalizeScannerSkuInput(event.currentTarget.value);
                if (event.currentTarget.value !== normalizedValue) {
                  event.currentTarget.value = normalizedValue;
                  setProductQuery(normalizedValue);
                }
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addScannedVariant();
              }}
              placeholder="Buscar por nombre, slug o SKU"
              style={fieldStyle}
            />

            <div style={productsTableShellStyle}>
              <div style={productsTableHeaderStyle}>
                <span>Producto</span>
                <span>Slug</span>
                <span>Precio base</span>
                <span>Variante</span>
                <span>Stock</span>
                <span>Accion</span>
              </div>

              <div
                style={productsTableScrollStyle}
                className="manual-products-scroll"
              >
                <div style={productsTableHorizontalLayerStyle} className="theme-horizontal-scroll">
                {filteredProducts.length === 0 ? (
                  <StateCard label="No encontramos productos con esa busqueda." />
                ) : (
                  filteredProducts.map((product) => (
                  <div key={product.id} style={productTableRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={tablePrimaryTextStyle}>{product.title}</strong>
                  </div>
                  <span style={tableMutedTextStyle}>/{product.slug}</span>
                  <span style={tablePrimaryTextStyle}>
                    {getProductBasePrice(product) > 0
                      ? money(getProductBasePrice(product))
                      : "Consultar"}
                  </span>
                  <ThemeSelect
                    value={selectedVariantByProduct[product.id] ?? ""}
                    onChange={(nextValue) => handleVariantSelectionChange(product.id, nextValue)}
                    placeholder="Seleccionar variante"
                    options={(product.variants ?? []).map((variant) => {
                      const available = getAvailableStock(variant.inventories);
                      const variantLabel =
                        [variant.Size, variant.Color].filter(Boolean).join(" · ") ||
                        "Variante principal";

                      return {
                        value: String(variant.id),
                        label: `${variantLabel}${variant.sku ? ` · ${variant.sku}` : ""}`,
                        disabled: available <= 0,
                      };
                    })}
                  />
                  <span style={tablePrimaryTextStyle}>
                    {(() => {
                      const selected = (product.variants ?? []).find(
                        (variant) =>
                          String(variant.id) === (selectedVariantByProduct[product.id] ?? ""),
                      );
                      return selected ? getAvailableStock(selected.inventories) : "--";
                    })()}
                  </span>
                  {(() => {
                    const selectedVariantId = selectedVariantByProduct[product.id] ?? "";
                    const isAdded = selectedVariantId
                      ? lines.some((line) => String(line.variantId) === selectedVariantId)
                      : false;

                    return (
                      <button
                        type="button"
                        onClick={() => addSelectedVariant(product)}
                        style={{
                          ...softButtonStyle,
                          ...(isAdded ? addedButtonStyle : null),
                        }}
                      >
                        {isAdded ? "Agregado" : "Agregar"}
                      </button>
                    );
                  })()}
                  </div>
                  ))
                )}
                </div>
              </div>
            </div>
          </section>

          <div style={manualSalesLayoutStyle}>
            <section style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Mostrador</p>
                  <h3 style={title3Style}>Venta en mostrador</h3>
                  <p style={copyStyle}>
                    Arma el ticket con los productos elegidos y ajusta cantidades o precios por
                    linea antes de cerrar la venta.
                  </p>
                </div>
              </div>

              <div
                className={lines.length > 3 ? "theme-vertical-scroll" : undefined}
                style={{
                  ...manualLinesListStyle,
                  ...(lines.length > 3 ? manualLinesListScrollableStyle : null),
                }}
              >
                {lines.length === 0 ? (
                  <StateCard label="Todavia no agregaste productos al ticket." />
                ) : (
                  lines.map((line) => (
                    <div key={line.variantId} style={itemStyle}>
                      <div style={betweenStyle}>
                        <div>
                          <strong style={{ display: "block", color: "var(--text-strong)" }}>
                            {line.title}
                          </strong>
                          <span style={metaStyle}>
                            {line.variantLabel}
                            {line.sku ? ` · ${line.sku}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.variantId)}
                          style={ghostButtonStyle}
                        >
                          Quitar
                        </button>
                      </div>

                      <div style={manualLineGridStyle}>
                        <div>
                          <span style={fieldLabelStyle}>Cantidad</span>
                          <div style={quantityControlStyle}>
                            <button
                              type="button"
                              onClick={() =>
                                updateLine(line.variantId, {
                                  quantity: Math.max(1, Number(line.quantity || 1) - 1),
                                })
                              }
                              style={quantityButtonStyle}
                            >
                              -
                            </button>
                            <div style={quantityValueStyle}>{line.quantity}</div>
                            <button
                              type="button"
                              onClick={() =>
                                updateLine(line.variantId, {
                                  quantity: Math.min(
                                    line.available,
                                    Number(line.quantity || 1) + 1,
                                  ),
                                })
                              }
                              style={quantityButtonStyle}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <span style={fieldLabelStyle}>Precio manual</span>
                          <input
                            inputMode="decimal"
                            value={line.price}
                            onChange={(event) =>
                              updateLine(line.variantId, { price: event.target.value })
                            }
                            style={fieldStyle}
                          />
                        </div>
                        <div>
                          <span style={fieldLabelStyle}>Total linea</span>
                          <div style={summaryValueStyle}>
                            {money(Number(line.price || 0) * Number(line.quantity || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Cierre</p>
                  <h3 style={title3Style}>Cobro y cierre</h3>
                  <p style={copyStyle}>
                    Elegi el medio de pago informativo y cerra la venta del mostrador.
                  </p>
                </div>
              </div>

              <div style={summaryCardStyle}>
                <div style={betweenStyle}>
                  <span style={copyStyle}>Subtotal</span>
                  <strong style={{ color: "var(--text-strong)" }}>{money(subtotal)}</strong>
                </div>
                <div style={betweenStyle}>
                  <span style={copyStyle}>
                    Descuento {discountType === "percentage" ? `(${safeDiscountValue}%)` : "(importe)"}
                  </span>
                  <strong style={{ color: "var(--text-strong)" }}>- {money(discountAmount)}</strong>
                </div>
                <div style={betweenStyle}>
                  <span style={copyStyle}>Total</span>
                  <strong style={{ color: "var(--text-strong)", fontSize: 24 }}>
                    {money(total)}
                  </strong>
                </div>
              </div>

              <div style={formGridStyle}>
                <div>
                  <span style={fieldLabelStyle}>Nombre del cliente</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Ej. Juan Perez"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <span style={fieldLabelStyle}>Metodo de pago</span>
                  <ThemeSelect
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={[
                      { value: "Efectivo", label: "Efectivo" },
                      { value: "Tarjeta", label: "Tarjeta" },
                      { value: "Transferencia", label: "Transferencia" },
                    ]}
                  />
                </div>
                <div>
                  <span style={fieldLabelStyle}>Tipo de descuento</span>
                  <ThemeSelect
                    value={discountType}
                    onChange={(value) =>
                      setDiscountType(value === "fixed" ? "fixed" : "percentage")
                    }
                    options={[
                      { value: "percentage", label: "Porcentaje" },
                      { value: "fixed", label: "Importe" },
                    ]}
                  />
                </div>
                <div>
                  <span style={fieldLabelStyle}>
                    {discountType === "percentage" ? "Descuento (%)" : "Descuento ($)"}
                  </span>
                  <input
                    inputMode="decimal"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                    style={fieldStyle}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <span style={fieldLabelStyle}>Notas internas</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  style={{ ...fieldStyle, minHeight: 110, resize: "vertical" }}
                />
              </div>

              <div style={rowWrapStyle}>
                <button type="button" onClick={resetForm} style={ghostButtonStyle}>
                  Limpiar ticket
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateSale()}
                  style={primaryButtonStyle}
                  disabled={saving}
                >
                  {saving ? "Registrando..." : "Registrar venta"}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {saleSummary ? (
        <div style={modalOverlayStyle} onClick={() => setSaleSummary(null)}>
          <div style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Venta exitosa</p>
                <h3 style={title3Style}>Se ha confirmado la venta</h3>
              </div>
            </div>

            <div style={summaryCardStyle}>
              {saleSummary.customerName ? (
                <div style={betweenStyle}>
                  <span style={copyStyle}>Cliente</span>
                  <strong style={{ color: "var(--text-strong)" }}>
                    {saleSummary.customerName}
                  </strong>
                </div>
              ) : null}
              <div style={betweenStyle}>
                <span style={copyStyle}>Operacion</span>
                <strong style={{ color: "var(--text-strong)" }}>#{saleSummary.id}</strong>
              </div>
              <div style={betweenStyle}>
                <span style={copyStyle}>Pago</span>
                <strong style={{ color: "var(--text-strong)" }}>{saleSummary.paymentMethod}</strong>
              </div>
              <div style={betweenStyle}>
                <span style={copyStyle}>
                  Descuento{" "}
                  {saleSummary.discountType === "percentage"
                    ? `(${saleSummary.discountValue}%)`
                    : "(importe)"}
                </span>
                <strong style={{ color: "var(--text-strong)" }}>
                  - {money(saleSummary.discountAmount)}
                </strong>
              </div>
              <div style={betweenStyle}>
                <span style={copyStyle}>Estado</span>
                <strong style={{ color: "var(--text-strong)" }}>{saleSummary.status}</strong>
              </div>
              <div style={betweenStyle}>
                <span style={copyStyle}>Total</span>
                <strong style={{ color: "var(--text-strong)", fontSize: 24 }}>
                  {money(saleSummary.total)}
                </strong>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {saleSummary.items.map((item, index) => (
                <div key={`${item.title}-${item.variantLabel}-${index}`} style={itemStyle}>
                  <div style={betweenStyle}>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-strong)" }}>
                        {item.title}
                      </strong>
                      <span style={metaStyle}>{item.variantLabel}</span>
                    </div>
                    <strong style={{ color: "var(--text-strong)" }}>x{item.quantity}</strong>
                  </div>
                  <div style={betweenStyle}>
                    <span style={copyStyle}>Total linea</span>
                    <strong style={{ color: "var(--text-strong)" }}>{money(item.lineTotal)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={modalFooterStyle}>
              <button type="button" onClick={() => setSaleSummary(null)} style={primaryButtonStyle}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .manual-products-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .manual-products-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `}</style>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  borderRadius: 32,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: 28,
  display: "grid",
  gap: 22,
};

const manualSalesLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.75fr)",
  gap: 18,
  alignItems: "start",
};

const productsTableShellStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  minWidth: 0,
};

const productsTableScrollStyle: React.CSSProperties = {
  minWidth: 0,
  maxHeight: "min(62vh, 680px)",
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehavior: "contain",
};

const productsTableHorizontalLayerStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  minWidth: 0,
  overflowX: "auto",
  overflowY: "visible",
  paddingRight: 10,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 22,
  display: "grid",
  gap: 18,
};

const productsTableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(180px, 1.2fr) minmax(150px, 1fr) minmax(120px, 0.8fr) minmax(230px, 1.2fr) 90px 120px",
  gap: 12,
  padding: "0 16px",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 11,
};

const productTableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(180px, 1.2fr) minmax(150px, 1fr) minmax(120px, 0.8fr) minmax(230px, 1.2fr) 90px 120px",
  gap: 12,
  alignItems: "center",
  padding: 16,
  borderRadius: 22,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  overflow: "visible",
};

const tablePrimaryTextStyle: React.CSSProperties = {
  color: "var(--text-strong)",
  fontSize: 14,
  lineHeight: 1.4,
};

const tableMutedTextStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 13,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 11,
};

const title3Style: React.CSSProperties = {
  margin: "8px 0 0",
  color: "var(--text-strong)",
  fontSize: 28,
};

const itemStyle: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: 16,
  display: "grid",
  gap: 12,
};

const summaryCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: 18,
  display: "grid",
  gap: 12,
};

const betweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const rowWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  lineHeight: 1.7,
};

const metaStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 13,
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 11,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  background: "var(--muted-field-bg)",
  color: "var(--muted-field-color)",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const manualLineGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const manualLinesListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const manualLinesListScrollableStyle: React.CSSProperties = {
  maxHeight: 660,
  overflowY: "auto",
  paddingRight: 8,
};

const summaryValueStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  background: "var(--muted-field-bg)",
  color: "var(--text-strong)",
  display: "flex",
  alignItems: "center",
};

const quantityControlStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "46px minmax(0, 1fr) 46px",
  alignItems: "center",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  background: "var(--muted-field-bg)",
  overflow: "hidden",
};

const quantityButtonStyle: React.CSSProperties = {
  minHeight: 46,
  border: "none",
  background: "transparent",
  color: "var(--text-strong)",
  cursor: "pointer",
  fontSize: 22,
  lineHeight: 1,
};

const quantityValueStyle: React.CSSProperties = {
  minHeight: 46,
  display: "grid",
  placeItems: "center",
  color: "var(--text-strong)",
  fontWeight: 700,
  borderLeft: "1px solid var(--border-soft)",
  borderRight: "1px solid var(--border-soft)",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: 700,
};

const ghostButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "transparent",
  color: "var(--text-strong)",
  padding: "10px 14px",
  cursor: "pointer",
};

const softButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  color: "var(--text-strong)",
  padding: "12px 14px",
};

const addedButtonStyle: React.CSSProperties = {
  background: "var(--ghost-chip-active-bg)",
  border: "1px solid var(--border-strong)",
  color: "var(--text-strong)",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--accent-strong)",
};

const successStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--accent)",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background: "rgba(0, 0, 0, 0.52)",
  display: "grid",
  placeItems: "center",
  padding: 24,
};

const modalCardStyle: React.CSSProperties = {
  width: "min(720px, 100%)",
  maxHeight: "min(88vh, 900px)",
  overflowY: "auto",
  borderRadius: 28,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 24,
  display: "grid",
  gap: 18,
};

const modalHeaderStyle: React.CSSProperties = {
  display: "grid",
  justifyItems: "center",
  textAlign: "center",
  gap: 8,
};

const modalFooterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

function Header({ title, copy }: { title: string; copy: string }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={eyebrowStyle}>Administracion</p>
      <h2 style={{ margin: 0, color: "var(--text-strong)", fontSize: 36 }}>{title}</h2>
      <p style={copyStyle}>{copy}</p>
    </div>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={{ ...itemStyle, color: "var(--text-muted)" }}>{label}</div>;
}
