"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  calculateManualSaleDiscountAmount,
  roundToNearestHundred,
  resolveManualSaleUnitPrice,
  resolveStorePricingPolicy,
} from "@/lib/pricing-policy";
import { getClientStoreId } from "@/lib/tenant/store-context";
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

export type ManualSaleCustomer = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  document?: string | null;
  source?: string | null;
};

type CurrentAccountLookup = {
  customerId: number;
  balance: string | number;
  lastMovementAt?: string | null;
  customer: ManualSaleCustomer;
  movements?: Array<{
    id: number;
    createdAt: string;
    balanceAfter: string | number;
    description?: string | null;
  }>;
};

type NewCustomerPayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  document?: string;
  notes?: string;
  source: "current_account";
  address?: {
    address1?: string;
    city?: string;
    zip?: string;
  };
};

type StorePaymentConfig = {
  bankTransfer?: {
    discountPercentage?: number | null;
    enabled?: boolean | null;
  } | null;
};

const paymentOptions = ["Efectivo", "Tarjeta", "Transferencia", "Cuenta corriente"];
const productSearchLimit = 80;

const getAvailableStock = (inventories: ManualSaleVariant["inventories"]) =>
  (inventories ?? []).reduce(
    (total: number, inventory: NonNullable<ManualSaleVariant["inventories"]>[number]) =>
      total + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0),
    0,
  );

const normalizeScannerSkuInput = (value: string) =>
  value.replace(/[\u0027\u0060\u2019\u2018\u00b4\u02bc\u02b9\u2032\uff07]/g, "-").trimStart();

const toVariantRows = (products: ManualSaleProduct[]): ManualSaleVariantRow[] =>
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
  );

const filterVariantRows = (rows: ManualSaleVariantRow[], query: string) => {
  const searchTerms = normalizeScannerSkuInput(query)
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  if (searchTerms.length === 0) return [];

  return rows.filter((row) => {
    const variantText = normalizeScannerSkuInput(
      [row.sku, row.variantLabel, row.productTitle, row.productSlug].filter(Boolean).join(" "),
    ).toLowerCase();

    return searchTerms.every((term) => variantText.includes(term));
  });
};

export default function AdminManualSalesSection({
  onSaleRegistered,
  initialCustomer,
  initialPaymentMethod,
}: {
  onSaleRegistered?: () => Promise<void> | void;
  initialCustomer?: ManualSaleCustomer | null;
  initialPaymentMethod?: string;
}) {
  const [products, setProducts] = useState<ManualSaleProduct[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<ManualSaleCustomer | null>(null);
  const [customers, setCustomers] = useState<ManualSaleCustomer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [newCustomerFirstName, setNewCustomerFirstName] = useState("");
  const [newCustomerLastName, setNewCustomerLastName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerDocument, setNewCustomerDocument] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerCity, setNewCustomerCity] = useState("");
  const [newCustomerZip, setNewCustomerZip] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [inactiveAccountPrompt, setInactiveAccountPrompt] = useState<CurrentAccountLookup | null>(null);
  const [pendingCustomerPayload, setPendingCustomerPayload] = useState<NewCustomerPayload | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [bankTransferDiscountPercentage, setBankTransferDiscountPercentage] = useState(0);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ManualSaleLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false);
  const [loading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCatalogVariantId, setSelectedCatalogVariantId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      setStoreId(getClientStoreId());
    } catch {
      setStoreId(null);
    }
  }, []);

  useEffect(() => {
    if (!initialCustomer) return;

    setSelectedCustomer(initialCustomer);
    setCustomerName(getCustomerName(initialCustomer));
    setPaymentMethod(initialPaymentMethod || "Cuenta corriente");
    setCustomerModalOpen(false);
    setShowNewCustomerForm(false);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [initialCustomer, initialPaymentMethod]);

  const searchProducts = async (query: string, signal?: AbortSignal) => {
    const normalizedQuery = normalizeScannerSkuInput(query).trim();
    if (!normalizedQuery) return [];

    const productsData = await api(
      `/products?search=${encodeURIComponent(normalizedQuery)}&limit=${productSearchLimit}`,
      signal ? { signal } : undefined,
    );

    return Array.isArray(productsData) ? (productsData as ManualSaleProduct[]) : [];
  };

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
        if (active) {
          setBankTransferDiscountPercentage(0);
        }
      }
    };

    void loadPaymentConfig();

    return () => {
      active = false;
    };
  }, []);

  const applyPaymentMethod = (method: string) => {
    setPaymentMethod(method);

    if (method === "Cuenta corriente") {
      setCustomerModalOpen(true);
    } else {
      setCustomerModalOpen(false);
    }
  };

  useEffect(() => {
    const normalizedQuery = normalizeScannerSkuInput(productQuery).trim();

    if (!normalizedQuery) {
      setProducts([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      const load = async () => {
        setSearchLoading(true);
        try {
          setProducts(await searchProducts(normalizedQuery, controller.signal));
        } catch (err) {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "No pudimos buscar productos.");
        } finally {
          if (!controller.signal.aborted) {
            setSearchLoading(false);
          }
        }
      };

      void load();
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [productQuery]);

  const variantRows = useMemo<ManualSaleVariantRow[]>(
    () => toVariantRows(products),
    [products],
  );

  const filteredVariantRows = useMemo(() => {
    return filterVariantRows(variantRows, productQuery);
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

  const pricingPolicy = useMemo(
    () => resolveStorePricingPolicy({ storeId }),
    [storeId],
  );
  const normalizedSaleLines = useMemo(
    () =>
      lines.map((line) => {
        const unitPrice = resolveManualSaleUnitPrice(line.price, pricingPolicy);
        const quantity = Number(line.quantity || 0);

        return {
          ...line,
          quantity,
          unitPrice,
          price: String(unitPrice),
          lineTotal: unitPrice * quantity,
        };
      }),
    [lines, pricingPolicy],
  );
  const subtotal = normalizedSaleLines.reduce(
    (total, line) => total + line.lineTotal,
    0,
  );
  const normalizedDiscountValue = Number(discountValue || 0);
  const safeDiscountValue = Number.isFinite(normalizedDiscountValue)
    ? Math.max(normalizedDiscountValue, 0)
    : 0;
  const paymentMethodDiscountPercentage =
    (paymentMethod === "Efectivo" || paymentMethod === "Transferencia")
      ? bankTransferDiscountPercentage
      : 0;
  const paymentMethodDiscountAmount =
    paymentMethodDiscountPercentage > 0
      ? calculateManualSaleDiscountAmount(
          normalizedSaleLines,
          subtotal,
          paymentMethodDiscountPercentage,
          pricingPolicy,
        )
      : 0;
  const manualDiscountBase = Math.max(subtotal - paymentMethodDiscountAmount, 0);
  const manualDiscountAmount =
    discountType === "percentage"
      ? calculateDiscountOnRemainingBase(
          manualDiscountBase,
          safeDiscountValue,
          pricingPolicy,
        )
      : Math.min(safeDiscountValue, manualDiscountBase);
  const discountAmount = Math.min(
    paymentMethodDiscountAmount + manualDiscountAmount,
    subtotal,
  );
  const total = Math.max(subtotal - discountAmount, 0);
  const hasPaymentMethodDiscount = paymentMethodDiscountAmount > 0;
  const hasManualDiscount = manualDiscountAmount > 0;
  const hasDiscount = discountAmount > 0;
  const currentAccountSelected = paymentMethod === "Cuenta corriente";
  const filteredCustomers = useMemo(() => {
    const normalized = customerQuery.trim().toLowerCase();
    if (!normalized) return customers.slice(0, 40);

    return customers.filter((customer) =>
      [
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.document,
        customer.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [customerQuery, customers]);

  const loadCustomers = async () => {
    setCustomerLoading(true);
    try {
      const data = (await api("/current-accounts?status=all")) as CurrentAccountLookup[];
      setCustomers(Array.isArray(data) ? data.map((account) => account.customer) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar clientes.");
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    if (customerModalOpen) {
      setShowNewCustomerForm(false);
      void loadCustomers();
      window.requestAnimationFrame(() => customerSearchInputRef.current?.focus());
    }
  }, [customerModalOpen]);

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
          price: String(resolveManualSaleUnitPrice(variant.price, pricingPolicy)),
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

  const addCurrentCatalogSelection = async () => {
    const normalizedQuery = normalizeScannerSkuInput(productQuery).trim().toLowerCase();
    if (!normalizedQuery) {
      setError("Busca por nombre, slug o SKU para agregar una variante.");
      focusSearchInput();
      return;
    }

    let candidateRows = visibleVariantRows;
    let allRows = variantRows;

    if (candidateRows.length === 0 || searchLoading) {
      setSearchLoading(true);
      try {
        const freshProducts = await searchProducts(normalizedQuery);
        setProducts(freshProducts);
        allRows = toVariantRows(freshProducts);
        candidateRows = filterVariantRows(allRows, normalizedQuery).slice(0, 120);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos buscar productos.");
        focusSearchInput();
        return;
      } finally {
        setSearchLoading(false);
      }
    }

    const exactSkuMatch = allRows.find(
      (row) => normalizeScannerSkuInput(row.sku).trim().toLowerCase() === normalizedQuery,
    );

    const selectedRow = selectedCatalogVariantId
      ? candidateRows.find((row) => row.variant.id === selectedCatalogVariantId)
      : null;
    const rowToAdd =
      exactSkuMatch ??
      selectedRow ??
      (candidateRows.length === 1 ? candidateRows[0] : null);

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
    setSelectedCustomer(null);
    applyPaymentMethod("Efectivo");
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

  const openSaleConfirmation = () => {
    if (lines.length === 0) {
      setError("Agrega al menos una variante a la venta.");
      return;
    }

    if (currentAccountSelected && !selectedCustomer) {
      setError("Para vender en cuenta corriente, seleccioná o registrá un cliente.");
      setCustomerModalOpen(true);
      return;
    }

    setError("");
    setConfirmSaleOpen(true);
  };

  const handleCreateSale = async () => {
    if (lines.length === 0) {
      setError("Agrega al menos una variante a la venta.");
      return;
    }

    if (currentAccountSelected && !selectedCustomer) {
      setError("Para vender en cuenta corriente, seleccioná o registrá un cliente.");
      setCustomerModalOpen(true);
      setConfirmSaleOpen(false);
      return;
    }

    try {
      setSaving(true);
      setConfirmSaleOpen(false);
      setError("");
      setSuccess("");

      const payload = {
        customerId: selectedCustomer?.id,
        customerFirstName: selectedCustomer
          ? selectedCustomer.firstName || getCustomerName(selectedCustomer)
          : customerName.trim() || undefined,
        customerLastName: selectedCustomer?.lastName ?? undefined,
        customerEmail: selectedCustomer?.email,
        customerPhone: selectedCustomer?.phone ?? undefined,
        shippingMethod: undefined,
        shippingCost: 0,
        paymentMethod: paymentMethod.trim() || undefined,
        discountType: "fixed" as const,
        discountValue: discountAmount,
        paymentStatus: "approved" as const,
        notes: notes.trim() || undefined,
        items: normalizedSaleLines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          price: line.unitPrice,
        })),
      };

      const created = (await api("/orders/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as CreatedOrder;

      setSuccess(`Venta #${created.id} registrada por ${money(created.total)}.`);
      resetForm();
      await onSaleRegistered?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message.includes("Manual sales module is disabled for this store")
          ? "La venta manual esta deshabilitada para esta tienda. Activala desde la configuracion de la tienda."
          : message.includes("Para vender en cuenta corriente")
            ? "Para vender en cuenta corriente, seleccioná o registrá un cliente."
          : message || "No se pudo registrar la venta manual.",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectCustomer = (customer: ManualSaleCustomer) => {
    setSelectedCustomer(customer);
    setCustomerName(getCustomerName(customer));
    setCustomerModalOpen(false);
    setShowNewCustomerForm(false);
  };

  const clearNewCustomerFields = () => {
    setNewCustomerFirstName("");
    setNewCustomerLastName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setNewCustomerDocument("");
    setNewCustomerAddress("");
    setNewCustomerCity("");
    setNewCustomerZip("");
    setNewCustomerNotes("");
  };

  const createCustomer = async () => {
    const customerPayload: NewCustomerPayload = {
      email: newCustomerEmail.trim() || undefined,
      firstName: newCustomerFirstName.trim() || undefined,
      lastName: newCustomerLastName.trim() || undefined,
      phone: newCustomerPhone.trim() || undefined,
      document: newCustomerDocument.trim() || undefined,
      notes: newCustomerNotes.trim() || undefined,
      source: "current_account",
      address: [
        newCustomerAddress,
        newCustomerCity,
        newCustomerZip,
      ].some((value) => value.trim())
        ? {
            address1: newCustomerAddress.trim() || undefined,
            city: newCustomerCity.trim() || undefined,
            zip: newCustomerZip.trim() || undefined,
          }
        : undefined,
    };

    if (!newCustomerFirstName.trim() && !newCustomerLastName.trim()) {
      setError("Carga el nombre o apellido del cliente.");
      return;
    }

    setCustomerLoading(true);
    setError("");
    try {
      const inactiveAccount = newCustomerPhone.trim()
        ? await findInactiveCurrentAccountByPhone(newCustomerPhone.trim())
        : null;

      if (inactiveAccount) {
        setInactiveAccountPrompt(inactiveAccount);
        setPendingCustomerPayload(customerPayload);
        return;
      }

      await createCustomerFromPayload(customerPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos registrar el cliente.");
    } finally {
      setCustomerLoading(false);
    }
  };

  const createCustomerFromPayload = async (customerPayload: NewCustomerPayload) => {
    const created = (await api("/customers", {
      method: "POST",
      body: JSON.stringify(customerPayload),
    })) as ManualSaleCustomer;
    clearNewCustomerFields();
    selectCustomer(created);
    await loadCustomers();
  };

  const reactivateInactiveAccount = async () => {
    if (!inactiveAccountPrompt || !pendingCustomerPayload) return;

    setCustomerLoading(true);
    setError("");
    try {
      const reactivated = (await api(`/current-accounts/customers/${inactiveAccountPrompt.customerId}/reactivate`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: pendingCustomerPayload.firstName,
          lastName: pendingCustomerPayload.lastName,
          email: pendingCustomerPayload.email,
          phone: pendingCustomerPayload.phone,
          document: pendingCustomerPayload.document,
          notes: pendingCustomerPayload.notes,
          address: pendingCustomerPayload.address,
        }),
      })) as CurrentAccountLookup;

      setInactiveAccountPrompt(null);
      setPendingCustomerPayload(null);
      clearNewCustomerFields();
      selectCustomer(reactivated.customer);
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos reactivar la cuenta corriente.");
    } finally {
      setCustomerLoading(false);
    }
  };

  const createCustomerIgnoringInactiveAccount = async () => {
    if (!pendingCustomerPayload) return;

    setCustomerLoading(true);
    setError("");
    try {
      const payload = pendingCustomerPayload;
      setInactiveAccountPrompt(null);
      setPendingCustomerPayload(null);
      await createCustomerFromPayload(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos registrar el cliente.");
    } finally {
      setCustomerLoading(false);
    }
  };

  const findInactiveCurrentAccountByPhone = async (phone: string) => {
    try {
      return (await api(`/current-accounts/inactive/by-phone?phone=${encodeURIComponent(phone)}`)) as CurrentAccountLookup;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("404")) return null;
      throw err;
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
                <h3>Buscar productos</h3>
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
                    void addCurrentCatalogSelection();
                  }}
                  placeholder="Buscar por nombre, slug o SKU"
                  className="manual-sale-field"
                />
                <button
                  type="button"
                  onClick={() => void addCurrentCatalogSelection()}
                  className="manual-sale-button"
                >
                  Agregar
                </button>
              </div>

              {searchLoading || normalizedSearchLength > 0 || filteredVariantRows.length > visibleVariantRows.length ? (
                <div className="manual-sale-search-meta">
                  <span>
                    {searchLoading
                      ? "Buscando..."
                      : normalizedSearchLength > 0
                        ? `${filteredVariantRows.length} variantes`
                        : ""}
                  </span>
                  {filteredVariantRows.length > visibleVariantRows.length ? (
                    <span>Mostrando las primeras {visibleVariantRows.length}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="manual-sale-variant-table-shell">
              {visibleVariantRows.length === 0 ? (
                <StateCard
                  label={
                    searchLoading
                      ? "Buscando variantes..."
                      : normalizedSearchLength === 0
                      ? "Escribi o escanea un codigo para ver variantes."
                      : "No encontramos variantes con esa busqueda."
                  }
                />
              ) : (
                <div className="manual-sale-variant-table">
                  <div className="manual-sale-variant-table-head" aria-hidden="true">
                    <span>Producto</span>
                    <span>Variante</span>
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
                            <small>{row.sku || "Sin SKU"}</small>
                          </span>
                          <span>{row.variantLabel}</span>
                          <strong>{money(resolveManualSaleUnitPrice(row.price, pricingPolicy))}</strong>
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
            <section className="manual-sale-card manual-sale-total-card">
              {lines.length > 0 ? (
                <div className="manual-sale-lines">
                  {normalizedSaleLines.map((line) => (
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
                          x
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
                          {money(line.lineTotal)}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              <div className="manual-sale-totals">
                <div className="manual-sale-grand-total">
                  <span>Total</span>
                  <strong>{money(total)}</strong>
                </div>
                {hasDiscount ? (
                  <div className="manual-sale-discount-summary">
                    <SummaryRow label="Subtotal" value={money(subtotal)} />
                    {hasPaymentMethodDiscount ? (
                      <SummaryRow
                        label={`Descuento por pago (${paymentMethodDiscountPercentage}%)`}
                        value={`- ${money(paymentMethodDiscountAmount)}`}
                      />
                    ) : null}
                    {hasManualDiscount ? (
                      <SummaryRow
                        label={
                          discountType === "percentage"
                            ? `Descuento manual (${safeDiscountValue}%)`
                            : "Descuento manual"
                        }
                        value={`- ${money(manualDiscountAmount)}`}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="manual-sale-checkout-form">
                <label>
                  <span>Cliente</span>
                  <input
                    value={customerName}
                    onChange={(event) => {
                      if (currentAccountSelected) return;
                      setCustomerName(event.target.value);
                      setSelectedCustomer(null);
                    }}
                    onClick={() => {
                      if (currentAccountSelected) {
                        setCustomerModalOpen(true);
                      }
                    }}
                    onFocus={() => {
                      if (currentAccountSelected) {
                        setCustomerModalOpen(true);
                      }
                    }}
                    placeholder={currentAccountSelected ? "Selecciona cliente registrado" : "Ej. Juan Perez"}
                    className="manual-sale-field"
                    readOnly={currentAccountSelected}
                  />
                </label>
                {currentAccountSelected ? (
                  <div className="manual-sale-customer-current-account">
                    {selectedCustomer ? (
                      <span>
                        Cuenta corriente para <strong>{getCustomerName(selectedCustomer)}</strong>
                      </span>
                    ) : (
                      <span>Para vender en cuenta corriente, seleccioná o registrá un cliente.</span>
                    )}
                  </div>
                ) : null}

                <div className="manual-sale-field-group">
                  <span>Medio de pago</span>
                  <div className="manual-sale-segmented">
                    {paymentOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => applyPaymentMethod(option)}
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
                  onClick={openSaleConfirmation}
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

      {confirmSaleOpen ? (
        <div className="manual-sale-modal-overlay" onClick={() => !saving && setConfirmSaleOpen(false)}>
          <div className="manual-sale-modal manual-sale-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-sale-confirm-header">
              <div>
                <p className="manual-sale-eyebrow">Confirmar venta</p>
                <h3>{currentAccountSelected ? "Cuenta corriente" : "Venta manual"}</h3>
                <span>{lines.length} {lines.length === 1 ? "producto" : "productos"}</span>
              </div>
              <div className="manual-sale-confirm-total">
                <span>{currentAccountSelected ? "Pendiente" : "Total"}</span>
                <strong>{money(total)}</strong>
              </div>
            </div>

            <div className="manual-sale-confirm-summary">
              {(selectedCustomer || customerName.trim()) ? (
                <SummaryRow label="Cliente" value={selectedCustomer ? getCustomerName(selectedCustomer) : customerName.trim()} />
              ) : null}
              <SummaryRow label="Pago" value={paymentMethod} />
              {hasPaymentMethodDiscount ? (
                <SummaryRow
                  label={`Descuento por pago (${paymentMethodDiscountPercentage}%)`}
                  value={`- ${money(paymentMethodDiscountAmount)}`}
                />
              ) : null}
              {hasManualDiscount ? (
                <SummaryRow
                  label={
                    discountType === "percentage"
                      ? `Descuento manual (${safeDiscountValue}%)`
                      : "Descuento manual"
                  }
                  value={`- ${money(manualDiscountAmount)}`}
                />
              ) : null}
              <SummaryRow
                label="Estado"
                value={currentAccountSelected ? "Pendiente de pago" : "Pagado"}
              />
            </div>

            <div className="manual-sale-confirm-lines">
              {normalizedSaleLines.map((line) => (
                <article key={line.variantId}>
                  <div>
                    <strong>{line.title}</strong>
                    <span>{line.variantLabel}</span>
                  </div>
                  <div>
                    <span>x{line.quantity}</span>
                    <strong>{money(line.lineTotal)}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="manual-sale-modal-actions">
              <button type="button" onClick={() => setConfirmSaleOpen(false)} disabled={saving} className="manual-sale-button-ghost">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCreateSale()}
                disabled={saving}
                className="manual-sale-button manual-sale-button-primary"
              >
                {saving ? "Registrando..." : "Confirmar venta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {customerModalOpen ? (
        <div className="manual-sale-modal-overlay" onClick={() => setCustomerModalOpen(false)}>
          <div className="manual-sale-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-sale-modal-header">
              <div>
                <p className="manual-sale-eyebrow">Cuenta corriente</p>
                <h3>Seleccionar cliente</h3>
              </div>
              <button type="button" className="manual-sale-button-ghost" onClick={() => setCustomerModalOpen(false)}>
                Cerrar
              </button>
            </div>
            {!showNewCustomerForm ? (
              <>
                <input
                  ref={customerSearchInputRef}
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Buscar por nombre, telefono, email o documento"
                  className="manual-sale-field"
                />
                <div className="manual-sale-customer-list">
                  {customerLoading ? (
                    <StateCard label="Cargando clientes..." />
                  ) : filteredCustomers.length === 0 ? (
                    <StateCard label="No encontramos clientes con ese filtro." />
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="manual-sale-customer-option"
                      >
                        <strong>{getCustomerName(customer)}</strong>
                        <span>
                          {customer.phone || "Sin telefono"}
                          {customer.email ? ` · ${customer.email}` : ""}
                          {customer.document ? ` · Doc. ${customer.document}` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  className="manual-sale-button manual-sale-new-customer-toggle"
                  onClick={() => {
                    clearNewCustomerFields();
                    setShowNewCustomerForm(true);
                  }}
                >
                  Crear nuevo cliente
                </button>
              </>
            ) : (
              <div className="manual-sale-new-customer">
                <div className="manual-sale-new-customer-header">
                  <p className="manual-sale-eyebrow">Registrar nuevo</p>
                </div>
                <div className="manual-sale-discount-row">
                  <input value={newCustomerFirstName} onChange={(event) => setNewCustomerFirstName(event.target.value)} placeholder="Nombre" className="manual-sale-field" />
                  <input value={newCustomerLastName} onChange={(event) => setNewCustomerLastName(event.target.value)} placeholder="Apellido" className="manual-sale-field" />
                </div>
                <div className="manual-sale-discount-row">
                  <input value={newCustomerEmail} onChange={(event) => setNewCustomerEmail(event.target.value)} placeholder="Email opcional" className="manual-sale-field" />
                  <input value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} placeholder="Telefono opcional" className="manual-sale-field" />
                </div>
                <div className="manual-sale-discount-row">
                  <input value={newCustomerDocument} onChange={(event) => setNewCustomerDocument(event.target.value)} placeholder="Documento opcional" className="manual-sale-field" />
                </div>
                <div className="manual-sale-current-account-address">
                  <p className="manual-sale-eyebrow">Direccion</p>
                  <input value={newCustomerAddress} onChange={(event) => setNewCustomerAddress(event.target.value)} placeholder="Calle, numero, piso/depto" className="manual-sale-field" />
                  <div className="manual-sale-discount-row">
                    <input value={newCustomerCity} onChange={(event) => setNewCustomerCity(event.target.value)} placeholder="Localidad" className="manual-sale-field" />
                    <input value={newCustomerZip} onChange={(event) => setNewCustomerZip(event.target.value)} placeholder="Codigo postal" className="manual-sale-field" />
                  </div>
                </div>
                <textarea value={newCustomerNotes} onChange={(event) => setNewCustomerNotes(event.target.value)} placeholder="Notas opcionales" className="manual-sale-field manual-sale-notes-field" />
                <div className="manual-sale-modal-actions">
                  <button
                    type="button"
                    className="manual-sale-button-ghost"
                    onClick={() => {
                      clearNewCustomerFields();
                      setShowNewCustomerForm(false);
                      window.requestAnimationFrame(() => customerSearchInputRef.current?.focus());
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="button" onClick={() => void createCustomer()} disabled={customerLoading} className="manual-sale-button manual-sale-button-primary">
                    Crear y seleccionar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {inactiveAccountPrompt ? (
        <div className="manual-sale-modal-overlay" onClick={() => {
          if (customerLoading) return;
          setInactiveAccountPrompt(null);
          setPendingCustomerPayload(null);
        }}>
          <div className="manual-sale-modal manual-sale-reactivate-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-sale-modal-header">
              <div>
                <p className="manual-sale-eyebrow">Cuenta dada de baja</p>
                <h3>Ya existe una cuenta con ese telefono</h3>
              </div>
              <button
                type="button"
                className="manual-sale-button-ghost"
                disabled={customerLoading}
                onClick={() => {
                  setInactiveAccountPrompt(null);
                  setPendingCustomerPayload(null);
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="manual-sale-inactive-account-card">
              <div>
                <span>Cliente</span>
                <strong>{getCustomerName(inactiveAccountPrompt.customer)}</strong>
              </div>
              <div>
                <span>Telefono</span>
                <strong>{inactiveAccountPrompt.customer.phone || "Sin telefono"}</strong>
              </div>
              <div>
                <span>Saldo anterior</span>
                <strong>{money(Number(inactiveAccountPrompt.balance))}</strong>
              </div>
              <div>
                <span>Ultima actividad</span>
                <strong>{formatAccountDate(inactiveAccountPrompt.lastMovementAt ?? inactiveAccountPrompt.movements?.[0]?.createdAt)}</strong>
              </div>
            </div>

            <p className="manual-sale-reactivate-copy">
              Podes reactivar la cuenta existente y conservar su historial, o crear un cliente nuevo con los datos cargados.
            </p>

            <div className="manual-sale-modal-actions">
              <button
                type="button"
                className="manual-sale-button manual-sale-button-primary"
                disabled={customerLoading}
                onClick={() => void reactivateInactiveAccount()}
              >
                {customerLoading ? "Reactivando..." : "Reactivar"}
              </button>
              <button
                type="button"
                className="manual-sale-button-ghost"
                disabled={customerLoading}
                onClick={() => void createCustomerIgnoringInactiveAccount()}
              >
                Crear cliente nuevo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .manual-sale-panel {
          border-radius: 22px;
          border: 1px solid var(--border-soft);
          background: var(--page-panel-bg);
          padding: clamp(14px, 2vw, 20px);
          display: grid;
          gap: 14px;
        }

        .manual-sale-header,
        .manual-sale-card-title,
        .manual-sale-line-top,
        .manual-sale-actions,
        .manual-sale-search-meta {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .manual-sale-header {
          align-items: start;
        }

        .manual-sale-header h2,
        .manual-sale-card h3,
        .manual-sale-modal h3 {
          margin: 0;
          color: var(--text-strong);
          line-height: 1.05;
        }

        .manual-sale-header h2 {
          font-size: clamp(1.9rem, 3vw, 2.7rem);
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
          margin: 8px 0 0;
          max-width: 680px;
          line-height: 1.45;
        }

        .manual-sale-card,
        .manual-sale-line,
        .manual-sale-state,
        .manual-sale-receipt {
          border: 1px solid var(--border-soft);
          background: var(--page-panel-strong-bg);
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
          gap: 14px;
          align-items: start;
        }

        .manual-sale-catalog,
        .manual-sale-checkout {
          display: grid;
          gap: 10px;
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
          border-radius: 16px;
          padding: 14px;
        }

        .manual-sale-search-card {
          gap: 14px;
          margin-bottom: 12px;
        }

        .manual-sale-search-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .manual-sale-field {
          width: 100%;
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border-soft);
          background: var(--muted-field-bg);
          color: var(--muted-field-color);
          padding: 10px 12px;
          outline: none;
        }

        textarea.manual-sale-field {
          min-height: 78px;
          resize: vertical;
        }

        .manual-sale-variant-table-shell {
          min-width: 0;
          overflow-x: auto;
          margin-top: 8px;
        }

        .manual-sale-variant-table {
          display: grid;
          gap: 6px;
          min-width: 760px;
        }

        .manual-sale-variant-table-head,
        .manual-sale-variant-row {
          display: grid;
          grid-template-columns:
            minmax(220px, 1.5fr)
            minmax(150px, 1fr)
            minmax(110px, 0.65fr)
            minmax(86px, 0.45fr)
            minmax(96px, 0.45fr);
          gap: 10px;
          align-items: center;
        }

        .manual-sale-variant-table-head {
          padding: 0 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 800;
        }

        .manual-sale-variant-table-body {
          display: grid;
          gap: 6px;
          max-height: 54vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .manual-sale-variant-row {
          width: 100%;
          border: 1px solid var(--border-soft);
          border-radius: 14px;
          background: var(--page-panel-strong-bg);
          color: var(--text-strong);
          padding: 10px 12px;
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
          gap: 8px;
          max-height: 30vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .manual-sale-line {
          display: grid;
          gap: 8px;
          background: var(--page-panel-bg);
          padding: 10px 12px;
        }

        .manual-sale-line-controls {
          display: grid;
          grid-template-columns: 124px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
        }

        .manual-sale-qty {
          min-height: 40px;
          border-radius: 12px;
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
          width: 30px;
          height: 30px;
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
          gap: 12px;
          overflow: hidden;
        }

        .manual-sale-totals,
        .manual-sale-checkout-form,
        .manual-sale-notes,
        .manual-sale-field-group {
          display: grid;
          gap: 8px;
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
          gap: 2px;
          border-top: 1px solid var(--border-soft);
          padding-top: 8px;
        }

        .manual-sale-grand-total {
          display: grid;
          gap: 2px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--page-panel-bg) 72%, transparent);
          border: 1px solid var(--border-soft);
          padding: 12px 14px;
        }

        .manual-sale-summary-row span,
        .manual-sale-grand-total span {
          color: var(--text-muted);
        }

        .manual-sale-summary-row {
          min-height: 24px;
          padding-inline: 2px;
        }

        .manual-sale-summary-value {
          margin-left: 8px;
        }

        .manual-sale-grand-total strong {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          line-height: 1;
          text-align: left;
          white-space: nowrap;
        }

        .manual-sale-checkout-form {
          border-top: 1px solid var(--border-soft);
          padding-top: 10px;
        }

        label,
        .manual-sale-field-group {
          min-width: 0;
        }

        label > span,
        .manual-sale-field-group > span {
          display: block;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
        }

        .manual-sale-segmented {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
          gap: 5px;
          border-radius: 14px;
          border: 1px solid var(--border-soft);
          background: var(--muted-field-bg);
          padding: 4px;
        }

        .manual-sale-segmented button {
          min-height: 38px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--muted-field-color);
          cursor: pointer;
          font-weight: 700;
        }

        .manual-sale-discount-row {
          display: grid;
          grid-template-columns: minmax(140px, 0.45fr) minmax(0, 1fr);
          gap: 8px;
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
          min-height: 40px;
          border-radius: 999px;
          padding: 9px 14px;
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

        .manual-sale-customer-current-account {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid var(--admin-tone-warning-border, var(--border-soft));
          background: var(--admin-tone-warning-bg, var(--page-panel-bg));
          color: var(--admin-tone-warning-color, var(--text-strong));
          font-size: 13px;
        }

        .manual-sale-customer-list,
        .manual-sale-new-customer {
          display: grid;
          gap: 10px;
        }

        .manual-sale-new-customer-toggle {
          justify-self: stretch;
          margin-top: 2px;
        }

        .manual-sale-new-customer {
          border-top: 1px solid var(--border-soft);
          padding-top: 12px;
        }

        .manual-sale-new-customer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .manual-sale-new-customer-header .manual-sale-eyebrow {
          margin: 0;
        }

        .manual-sale-current-account-address {
          display: grid;
          gap: 8px;
          border-top: 1px solid var(--border-soft);
          padding-top: 10px;
        }

        .manual-sale-current-account-address .manual-sale-eyebrow {
          margin: 0;
        }

        .manual-sale-notes-field {
          min-height: 84px;
          resize: vertical;
        }

        .manual-sale-modal-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
          gap: 10px;
          margin-top: 2px;
        }

        .manual-sale-customer-list {
          max-height: 260px;
          overflow: auto;
          padding-right: 4px;
        }

        .manual-sale-customer-option {
          width: 100%;
          border: 1px solid var(--border-soft);
          border-radius: 14px;
          background: var(--page-panel-bg);
          color: var(--text-strong);
          padding: 12px 14px;
          display: grid;
          gap: 4px;
          text-align: left;
          cursor: pointer;
        }

        .manual-sale-customer-option span {
          color: var(--text-muted);
          font-size: 13px;
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

        .manual-sale-confirm-modal {
          width: min(100%, 680px);
          gap: 18px;
        }

        .manual-sale-reactivate-modal {
          width: min(100%, 640px);
        }

        .manual-sale-inactive-account-card {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .manual-sale-inactive-account-card > div {
          display: grid;
          gap: 6px;
          min-width: 0;
          border-radius: 14px;
          border: 1px solid var(--border-soft);
          background: var(--page-panel-strong-bg);
          padding: 12px;
        }

        .manual-sale-inactive-account-card span {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .manual-sale-inactive-account-card strong {
          color: var(--text-strong);
          overflow-wrap: anywhere;
        }

        .manual-sale-reactivate-copy {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .manual-sale-confirm-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: start;
          border-bottom: 1px solid var(--border-soft);
          padding-bottom: 16px;
        }

        .manual-sale-confirm-header h3 {
          margin: 0;
          font-size: clamp(1.7rem, 3vw, 2.15rem);
          line-height: 1.05;
        }

        .manual-sale-confirm-header span,
        .manual-sale-confirm-total span {
          color: var(--text-muted);
        }

        .manual-sale-confirm-total {
          display: grid;
          gap: 4px;
          text-align: right;
          justify-items: end;
        }

        .manual-sale-confirm-total strong {
          color: var(--text-strong);
          font-size: clamp(2rem, 4vw, 2.55rem);
          line-height: 1;
          white-space: nowrap;
        }

        .manual-sale-confirm-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .manual-sale-confirm-summary .manual-sale-summary-row {
          min-height: 0;
          border-radius: 14px;
          border: 1px solid var(--border-soft);
          background: var(--page-panel-strong-bg);
          padding: 12px;
          align-items: start;
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .manual-sale-confirm-summary .manual-sale-summary-row span,
        .manual-sale-confirm-summary .manual-sale-summary-row strong {
          display: block;
          overflow-wrap: anywhere;
        }

        .manual-sale-confirm-summary .manual-sale-summary-value {
          margin-left: 0;
        }

        .manual-sale-confirm-summary .manual-sale-summary-row span {
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 11px;
        }

        .manual-sale-confirm-lines {
          display: grid;
          gap: 8px;
          max-height: 260px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .manual-sale-confirm-lines article {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          border-radius: 14px;
          border: 1px solid var(--border-soft);
          background: var(--page-panel-bg);
          padding: 12px 14px;
        }

        .manual-sale-confirm-lines article > div {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .manual-sale-confirm-lines article > div:last-child {
          text-align: right;
          justify-items: end;
        }

        .manual-sale-confirm-lines span {
          color: var(--text-muted);
        }

        .manual-sale-confirm-lines strong {
          color: var(--text-strong);
        }

        .manual-sale-modal-header {
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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

          .manual-sale-modal-actions {
            grid-template-columns: 1fr;
          }

          .manual-sale-confirm-header,
          .manual-sale-confirm-summary {
            grid-template-columns: 1fr;
          }

          .manual-sale-inactive-account-card {
            grid-template-columns: 1fr;
          }

          .manual-sale-confirm-total {
            text-align: left;
            justify-items: start;
          }

          .manual-sale-lines {
            max-height: none;
          }
        }
      `}</style>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="manual-sale-summary-row">
      <span style={{ marginRight: 8 }}>{label}</span>
      <strong className="manual-sale-summary-value" style={{ marginLeft: 8 }}>{value}</strong>
    </div>
  );
}

function StateCard({ label }: { label: string }) {
  return <div className="manual-sale-state">{label}</div>;
}

function calculateDiscountOnRemainingBase(
  base: number,
  discountValue: number,
  policy: { manualSaleDiscountRounding: boolean },
) {
  const safeBase = Number.isFinite(base) ? Math.max(base, 0) : 0;
  const safePercentage = Number.isFinite(discountValue)
    ? Math.min(Math.max(discountValue, 0), 100)
    : 0;

  if (safeBase <= 0 || safePercentage <= 0) return 0;

  if (!policy.manualSaleDiscountRounding) {
    return Number(Math.min(safeBase * (safePercentage / 100), safeBase).toFixed(2));
  }

  const discountedTotal = roundToNearestHundred(
    safeBase * (1 - safePercentage / 100),
  );
  return Number(Math.min(Math.max(safeBase - discountedTotal, 0), safeBase).toFixed(2));
}

function getCustomerName(customer: ManualSaleCustomer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email || customer.phone || `Cliente #${customer.id}`;
}

function formatAccountDate(value?: string | null) {
  if (!value) return "Sin movimientos";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function getVariantLabel(variant: Pick<ManualSaleVariant, "Size" | "Color">) {
  return [variant.Size, variant.Color].filter(Boolean).join(" - ") || "Variante principal";
}
