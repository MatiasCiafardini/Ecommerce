"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import {
  calculateManualSaleDiscountAmount,
  roundToNearestHundred,
  resolveManualSaleUnitPrice,
  resolveStorePricingPolicy,
} from "@/lib/pricing-policy";
import { getClientStoreId } from "@/lib/tenant/store-context";
import { resolveAssetUrl } from "@/lib/asset-url";
import {
  ADMIN_PAYMENT_METHODS,
  isDiscountedAdministrativePaymentMethod,
} from "@/lib/manual-payment-methods";
import { money } from "./order-utils";
import type { GiftCardForSale } from "./GiftCardsPanel";

type ManualSaleProduct = {
  id: number;
  title: string;
  slug: string;
  type?: "STANDARD" | "GIFT_CARD";
  trackInventory?: boolean;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  images?: Array<{ url?: string | null }>;
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
  lineId: string;
  variantId: number;
  productId: number;
  title: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  price: string;
  catalogPrice: number;
  available: number;
  imageUrl?: string | null;
  isGiftCard?: boolean;
  giftCardPurchaserName?: string;
  giftCardRecipientName?: string;
};

export type TrialSaleItem = {
  id: number;
  variantId: number;
  productId: number;
  title: string;
  variantLabel: string;
  sku: string;
  price: number;
  imageUrl?: string | null;
};

type AppliedGiftCard = {
  id: number;
  code: string;
  codeLastFour: string;
  recipientName: string;
  balance: string | number;
  amount: string;
};

type ManualSalePaymentLine = {
  method: string;
  amount: string;
};

type ManualPriceMode = "cash" | "card";

type NormalizedManualSaleLine = ManualSaleLine & {
  quantity: number;
  unitPrice: number;
  price: string;
  lineTotal: number;
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
  imageUrl?: string | null;
};

type CreatedOrder = {
  id: number;
  total: string | number;
  status: string;
  items?: Array<{ issuedGiftCard?: { code: string; balance: string | number; recipientName: string } | null }>;
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
  id?: number;
  customerId: number;
  balance: string | number;
  globalBalance?: string | number;
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

const paymentDiscountPercentageCache = new Map<string, number>();
const paymentConfigRequests = new Map<string, Promise<number>>();

const paymentOptions = [...ADMIN_PAYMENT_METHODS];
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
      available: product.type === "GIFT_CARD" || product.trackInventory === false
        ? Number.MAX_SAFE_INTEGER
        : getAvailableStock(variant.inventories),
      imageUrl: getProductImageUrl(product),
    })),
  );

const getProductImageUrl = (product: ManualSaleProduct) => {
  const raw = product.thumbnailUrl || product.imageUrl || product.images?.[0]?.url || "";
  return raw ? resolveAssetUrl(raw) ?? raw : "";
};

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
  storeLocationId,
  onSaleRegistered,
  initialCustomer,
  initialCurrentAccount,
  initialPaymentMethod,
  initialTrialItems,
  initialGiftCard,
  initialGiftCardAmount,
  initialGiftCardRequestKey,
  onOpenGiftCards,
  onInitialGiftCardHandled,
  onGiftCardRequestHandled,
  lockCustomer = false,
}: {
  storeLocationId?: number | null;
  onSaleRegistered?: () => Promise<void> | void;
  initialCustomer?: ManualSaleCustomer | null;
  initialCurrentAccount?: CurrentAccountLookup | null;
  initialPaymentMethod?: string;
  initialTrialItems?: TrialSaleItem[];
  initialGiftCard?: GiftCardForSale | null;
  initialGiftCardAmount?: number | null;
  initialGiftCardRequestKey?: number;
  onOpenGiftCards?: () => void;
  onInitialGiftCardHandled?: () => void;
  onGiftCardRequestHandled?: () => void;
  lockCustomer?: boolean;
}) {
  const [products, setProducts] = useState<ManualSaleProduct[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<ManualSaleCustomer | null>(null);
  const [selectedCurrentAccount, setSelectedCurrentAccount] = useState<CurrentAccountLookup | null>(null);
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccountLookup[]>([]);
  const [inlineAccountRows, setInlineAccountRows] = useState<CurrentAccountLookup[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerModalError, setCustomerModalError] = useState("");
  const [useCurrentAccountCredit, setUseCurrentAccountCredit] = useState(false);
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
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [splitPayments, setSplitPayments] = useState<ManualSalePaymentLine[]>([
    { method: "Efectivo", amount: "" },
  ]);
  const [applyPaymentDiscount, setApplyPaymentDiscount] = useState(true);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [bankTransferDiscountPercentage, setBankTransferDiscountPercentage] = useState(0);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ManualSaleLine[]>([]);
  const [appliedGiftCards, setAppliedGiftCards] = useState<AppliedGiftCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false);
  const [manualPriceMode, setManualPriceMode] = useState<ManualPriceMode | null>(null);
  const [loading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCatalogVariantId, setSelectedCatalogVariantId] = useState<number | null>(null);
  const [openPaymentMenuIndex, setOpenPaymentMenuIndex] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const handledGiftCardRequestKeyRef = useRef<number | null>(null);

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
    setSelectedCurrentAccount(initialCurrentAccount ?? null);
    setUseCurrentAccountCredit(false);
    setCustomerName(getCustomerName(initialCustomer));
    setPaymentMethod(initialPaymentMethod || "Cuenta corriente");
    setSplitPaymentEnabled(false);
    setSplitPayments([{ method: initialPaymentMethod || "Cuenta corriente", amount: "" }]);
    setCustomerModalOpen(false);
    setShowNewCustomerForm(false);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [initialCustomer, initialCurrentAccount, initialPaymentMethod]);

  useEffect(() => {
    if (!initialTrialItems?.length) return;
    const grouped = new Map<number, ManualSaleLine>();
    for (const item of initialTrialItems) {
      const existing = grouped.get(item.variantId);
      if (existing) {
        existing.quantity += 1;
        continue;
      }
      grouped.set(item.variantId, {
        lineId: `trial-${item.variantId}`,
        variantId: item.variantId,
        productId: item.productId,
        title: item.title,
        variantLabel: item.variantLabel,
        sku: item.sku,
        quantity: 1,
        price: String(item.price),
        catalogPrice: item.price,
        available: 1,
        imageUrl: item.imageUrl,
      });
    }
    setLines([...grouped.values()].map((line) => ({
      ...line,
      available: line.quantity,
    })));
  }, [initialTrialItems]);

  useEffect(() => {
    if (!initialGiftCard) return;
    setAppliedGiftCards((current) => current.some((card) => card.id === initialGiftCard.id)
      ? current
      : [...current, { ...initialGiftCard, amount: String(Number(initialGiftCard.balance)) }]);
    onInitialGiftCardHandled?.();
    // The parent clears the selection after this explicit handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGiftCard]);

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
        const percentage = await getPaymentDiscountPercentage();
        if (!active) return;

        setBankTransferDiscountPercentage(percentage);
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
    setSplitPayments((current) => {
      const [firstPayment] = current;
      return [{ method, amount: firstPayment?.amount ?? "" }];
    });

    if (method === "Cuenta corriente" && !selectedCurrentAccount) {
      setCustomerModalOpen(true);
    } else {
      setCustomerModalOpen(false);
    }
  };

  const applySplitPaymentMethod = (index: number, method: string) => {
    setOpenPaymentMenuIndex(null);
    setSplitPayments((current) => {
      const currentMethod = current[index]?.method || paymentMethod;
      const duplicateIndex = current.findIndex(
        (payment, paymentIndex) => paymentIndex !== index && payment.method === method,
      );
      const nextPayments = current.map((payment, paymentIndex) => {
        if (paymentIndex === index) return { ...payment, method };
        if (paymentIndex === duplicateIndex) return { ...payment, method: currentMethod };
        return payment;
      });

      return balanceSplitPayments(nextPayments, index);
    });
    if (index === 0) {
      setPaymentMethod(method);
    }

    if (method === "Cuenta corriente" && !selectedCurrentAccount) {
      setCustomerModalOpen(true);
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
  const normalizedSaleLines = useMemo<NormalizedManualSaleLine[]>(
    () =>
      lines.map((line) => {
        const unitPrice = parseManualSalePriceInput(line.price);
        const quantity = Number(line.quantity || 0);

        return {
          ...line,
          quantity,
          unitPrice,
          price: String(unitPrice),
          lineTotal: unitPrice * quantity,
        };
      }),
    [lines],
  );
  const manualPriceChanges = useMemo(
    () =>
      normalizedSaleLines
        .filter((line) => hasManualLinePriceChange(line))
        .map((line) => ({
          variantId: line.variantId,
          title: line.title,
          variantLabel: line.variantLabel,
          quantity: line.quantity,
          catalogPrice: Number(line.catalogPrice ?? 0),
          enteredPrice: line.unitPrice,
        })),
    [normalizedSaleLines],
  );
  const hasManualPriceChanges = manualPriceChanges.length > 0;
  const selectedPaymentMethods = splitPayments.map((payment) => payment.method);
  const currentAccountSelected = selectedPaymentMethods.includes("Cuenta corriente");
  const requiresManualPriceMode = currentAccountSelected && hasManualPriceChanges;
  const submissionSaleLines = useMemo(
    () =>
      normalizedSaleLines.map((line) =>
        requiresManualPriceMode && manualPriceMode === "cash"
          ? convertCashManualLineToCardLine(
              line,
              bankTransferDiscountPercentage,
              pricingPolicy,
            )
          : line,
      ),
    [
      bankTransferDiscountPercentage,
      manualPriceMode,
      normalizedSaleLines,
      pricingPolicy,
      requiresManualPriceMode,
    ],
  );
  const subtotal = normalizedSaleLines.reduce(
    (total, line) => total + line.lineTotal,
    0,
  );
  const discountableSaleLines = normalizedSaleLines.filter((line) => !line.isGiftCard);
  const discountableSubtotal = discountableSaleLines.reduce(
    (total, line) => total + line.lineTotal,
    0,
  );
  const normalizedDiscountValue = Number(discountValue || 0);
  const safeDiscountValue = Number.isFinite(normalizedDiscountValue)
    ? Math.max(normalizedDiscountValue, 0)
    : 0;
  const manualDiscountAmountBeforePayment =
    discountType === "percentage"
      ? calculateDiscountOnRemainingBase(
          discountableSubtotal,
          safeDiscountValue,
          pricingPolicy,
        )
      : Math.min(safeDiscountValue, discountableSubtotal);
  const splitPaymentBaseTarget = Math.max(subtotal - manualDiscountAmountBeforePayment, 0);
  const normalizedSplitPayments = splitPayments.map((payment) => ({
    method: payment.method,
    amount: roundCurrency(parseCurrencyInput(payment.amount)),
  }));
  const paymentMethodDiscountEligible = isDiscountedAdministrativePaymentMethod;
  const paymentDiscountActive =
    applyPaymentDiscount && bankTransferDiscountPercentage > 0;
  const effectivePaymentDiscountPercentage = paymentDiscountActive
    ? bankTransferDiscountPercentage
    : 0;
  const showPaymentDiscountToggle =
    bankTransferDiscountPercentage > 0 &&
    selectedPaymentMethods.some((method) => paymentMethodDiscountEligible(method));
  const splitPaymentTotal = roundCurrency(
    normalizedSplitPayments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const splitPaymentBaseCovered = roundCurrency(
    normalizedSplitPayments
      .reduce(
        (sum, payment) =>
          sum +
          calculatePaymentBaseCovered(
            payment.amount,
            payment.method,
            effectivePaymentDiscountPercentage,
          ),
        0,
      ),
  );
  const splitPaymentBaseDifference = roundCurrency(splitPaymentBaseTarget - splitPaymentBaseCovered);
  const splitPaymentBaseComplete = splitPaymentBaseDifference <= 0.01;
  const partialSplitPaymentDiscountAmount = roundCurrency(
    normalizedSplitPayments
      .filter((payment) => paymentMethodDiscountEligible(payment.method))
      .reduce(
        (sum, payment) =>
          sum +
          Math.max(
            calculatePaymentBaseCovered(
              payment.amount,
              payment.method,
              effectivePaymentDiscountPercentage,
            ) - payment.amount,
            0,
          ),
        0,
      ),
  );
  const paymentMethodDiscountRatio = splitPaymentEnabled
    ? splitPaymentBaseCovered > 0
      ? 1
      : 0
    : paymentMethodDiscountEligible(splitPayments[0]?.method || paymentMethod)
      ? 1
      : 0;
  const paymentMethodDiscountPercentage =
    paymentDiscountActive && paymentMethodDiscountRatio > 0
      ? effectivePaymentDiscountPercentage
      : 0;
  const fullPaymentMethodDiscountAmount =
    paymentMethodDiscountPercentage > 0
      ? calculateManualSaleDiscountAmount(
          discountableSaleLines,
          discountableSubtotal,
          paymentMethodDiscountPercentage,
          pricingPolicy,
        )
      : 0;
  const paymentMethodDiscountAmount =
    paymentMethodDiscountPercentage > 0
      ? splitPaymentEnabled
        ? Math.min(
            splitPaymentBaseComplete
              ? Math.max(splitPaymentBaseTarget - splitPaymentTotal, 0)
              : partialSplitPaymentDiscountAmount,
            fullPaymentMethodDiscountAmount,
          )
        : roundCurrency(fullPaymentMethodDiscountAmount * paymentMethodDiscountRatio)
      : 0;
  const manualDiscountBase = splitPaymentEnabled
    ? discountableSubtotal
    : Math.max(discountableSubtotal - paymentMethodDiscountAmount, 0);
  const manualDiscountAmount = splitPaymentEnabled
    ? manualDiscountAmountBeforePayment
    : discountType === "percentage"
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
  const selectedAccountBalance = Number(selectedCurrentAccount?.balance ?? 0);
  const availableCurrentAccountCredit = Math.max(-selectedAccountBalance, 0);
  const appliedCurrentAccountCreditAmount =
    useCurrentAccountCredit && selectedCurrentAccount
      ? Math.min(availableCurrentAccountCredit, total)
      : 0;
  let giftCardRemainingTotal = Math.max(total - appliedCurrentAccountCreditAmount, 0);
  const normalizedGiftCardApplications = appliedGiftCards.map((card) => {
    const amount = roundCurrency(
      Math.min(
        Math.max(parseCurrencyInput(card.amount), 0),
        Number(card.balance),
        giftCardRemainingTotal,
      ),
    );
    giftCardRemainingTotal = roundCurrency(Math.max(giftCardRemainingTotal - amount, 0));
    return { ...card, appliedAmount: amount };
  });
  const appliedGiftCardAmount = roundCurrency(
    normalizedGiftCardApplications.reduce((sum, card) => sum + card.appliedAmount, 0),
  );
  const amountToCollect = Math.max(
    total - appliedCurrentAccountCreditAmount - appliedGiftCardAmount,
    0,
  );
  const effectiveManualPayments = splitPaymentEnabled
    ? normalizedSplitPayments
    : [
        {
          method: splitPayments[0]?.method || paymentMethod.trim() || "Efectivo",
          amount: amountToCollect,
        },
      ];
  const splitPaymentDifference = roundCurrency(amountToCollect - splitPaymentTotal);
  const submissionAmounts = useMemo(
    () =>
      calculateManualSaleSubmissionAmounts({
        lines: submissionSaleLines,
        discountType,
        safeDiscountValue,
        pricingPolicy,
        splitPaymentEnabled,
        splitPayments,
        paymentMethod,
        applyPaymentDiscount,
        bankTransferDiscountPercentage,
        selectedAccountBalance,
        useCurrentAccountCredit: Boolean(
          useCurrentAccountCredit && selectedCurrentAccount,
        ),
      }),
    [
      applyPaymentDiscount,
      bankTransferDiscountPercentage,
      discountType,
      paymentMethod,
      pricingPolicy,
      safeDiscountValue,
      selectedAccountBalance,
      selectedCurrentAccount,
      splitPaymentEnabled,
      splitPayments,
      submissionSaleLines,
      useCurrentAccountCredit,
    ],
  );
  const confirmationAmountToCollect =
    requiresManualPriceMode && manualPriceMode
      ? submissionAmounts.amountToCollect
      : amountToCollect;
  const confirmationPayments =
    requiresManualPriceMode && manualPriceMode
      ? submissionAmounts.effectiveManualPayments
      : effectiveManualPayments;
  const confirmationSplitPaymentDifference =
    requiresManualPriceMode && manualPriceMode
      ? submissionAmounts.splitPaymentDifference
      : splitPaymentDifference;
  const splitPaymentMethodKeys = normalizedSplitPayments.map((payment) =>
    payment.method.trim().toLowerCase(),
  );
  const splitPaymentHasDuplicateMethod =
    new Set(splitPaymentMethodKeys).size !== splitPaymentMethodKeys.length;
  const hasPaymentMethodDiscount = paymentMethodDiscountAmount > 0;
  const hasManualDiscount = manualDiscountAmount > 0;
  const hasDiscount = discountAmount > 0;
  const paymentSummaryTone =
    amountToCollect <= 0 && splitPaymentTotal <= 0
      ? "empty"
      : Math.abs(splitPaymentDifference) <= 0.01
      ? "complete"
      : splitPaymentDifference > 0
        ? "missing"
        : "exceeded";
  const paymentSummaryStatus =
    paymentSummaryTone === "empty"
      ? "Agrega productos para calcular pagos"
      : paymentSummaryTone === "complete"
      ? "Pagos completos"
      : paymentSummaryTone === "missing"
        ? `Falta pagar ${money(Math.abs(splitPaymentDifference))}`
        : `Excede por ${money(Math.abs(splitPaymentDifference))}`;
  const manualPriceConfirmationMissing = requiresManualPriceMode && !manualPriceMode;
  const confirmationPaymentMismatch =
    splitPaymentEnabled &&
    requiresManualPriceMode &&
    Boolean(manualPriceMode) &&
    Math.abs(confirmationSplitPaymentDifference) > 0.01;
  const manualPriceComparisonRows = useMemo(
    () =>
      manualPriceChanges.map((change) => ({
        ...change,
        cardEquivalent:
          manualPriceMode === "cash"
            ? resolveManualCardEquivalent(
                change.enteredPrice,
                bankTransferDiscountPercentage,
                pricingPolicy,
              )
            : change.enteredPrice,
        cashEquivalent:
          manualPriceMode === "card"
            ? resolveManualCashEquivalent(
                change.enteredPrice,
                bankTransferDiscountPercentage,
                pricingPolicy,
              )
            : change.enteredPrice,
      })),
    [
      bankTransferDiscountPercentage,
      manualPriceChanges,
      manualPriceMode,
      pricingPolicy,
    ],
  );

  useEffect(() => {
    if (splitPaymentEnabled) return;
    const amount = formatAmountInput(amountToCollect);
    setSplitPayments((current) => {
      const firstPayment = current[0] ?? { method: paymentMethod, amount: "" };
      if (current.length === 1 && firstPayment.amount === amount) return current;
      return [{ method: firstPayment.method || paymentMethod, amount }];
    });
  }, [amountToCollect, paymentMethod, splitPaymentEnabled]);

  useEffect(() => {
    if (!requiresManualPriceMode && manualPriceMode) {
      setManualPriceMode(null);
    }
  }, [manualPriceMode, requiresManualPriceMode]);
  const filteredCurrentAccounts = useMemo(() => {
    const normalized = customerQuery.trim().toLowerCase();
    if (!normalized) return currentAccounts.slice(0, 40);

    return currentAccounts.filter((account) =>
      [
        account.customer.firstName,
        account.customer.lastName,
        account.customer.email,
        account.customer.document,
        account.customer.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [customerQuery, currentAccounts]);

  const loadCustomers = async () => {
    setCustomerLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "all");
      appendStoreLocationParam(params, storeLocationId);
      const data = (await api(`/current-accounts?${params.toString()}`)) as CurrentAccountLookup[];
      setCurrentAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar clientes.");
    } finally {
      setCustomerLoading(false);
    }
  };

  const searchInlineAccounts = async (query: string) => {
    if (lockCustomer) {
      setInlineAccountRows([]);
      return;
    }

    const normalized = query.trim();
    if (normalized.length < 2 || selectedCurrentAccount) {
      setInlineAccountRows([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("status", "all");
      params.set("search", normalized);
      appendStoreLocationParam(params, storeLocationId);
      const data = (await api(`/current-accounts?${params.toString()}`)) as CurrentAccountLookup[];
      setInlineAccountRows(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch {
      setInlineAccountRows([]);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void searchInlineAccounts(customerName);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [customerName, lockCustomer, selectedCurrentAccount, storeLocationId]);

  useEffect(() => {
    if (customerModalOpen) {
      setShowNewCustomerForm(false);
      void loadCustomers();
      window.requestAnimationFrame(() => customerSearchInputRef.current?.focus());
    }
  }, [customerModalOpen]);

  const addVariant = (product: ManualSaleProduct, variant: ManualSaleVariant) => {
    const isGiftCard = product.type === "GIFT_CARD" || product.trackInventory === false;
    const available = isGiftCard ? Number.MAX_SAFE_INTEGER : getAvailableStock(variant.inventories);
    if (available <= 0) {
      setError("Esa variante no tiene stock disponible.");
      return false;
    }

    setError("");
    setSuccess("");
    setLines((current) => {
      const existing = isGiftCard ? undefined : current.find((line) => line.variantId === variant.id);
      if (existing) {
        return current.map((line) =>
          line.variantId === variant.id
            ? { ...line, quantity: Math.min(line.quantity + 1, line.available) }
            : line,
        );
      }

      const catalogPrice = resolveManualSaleUnitPrice(variant.price, pricingPolicy);

      return [
        ...current,
        {
          lineId: `${variant.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          variantId: variant.id,
          productId: product.id,
          title: product.title,
          variantLabel: getVariantLabel(variant),
          sku: String(variant.sku ?? ""),
          quantity: 1,
          price: String(catalogPrice),
          catalogPrice,
          available,
          isGiftCard,
          imageUrl: getProductImageUrl(product),
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

  const addCurrentCatalogSelection = async (queryOverride?: string) => {
    const rawQuery = queryOverride ?? productQuery;
    const normalizedQuery = normalizeScannerSkuInput(rawQuery).trim().toLowerCase();
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
      candidateRows.find((row) => row.available > 0) ??
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

  const updateLine = (lineId: string, patch: Partial<ManualSaleLine>) => {
    setLines((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line)),
    );
  };

  const addQuickGiftCard = async (amount?: number | null) => {
    setError("");
    try {
      const results = await searchProducts("Gift Card");
      const product = results.find((entry) => entry.type === "GIFT_CARD") ?? results[0];
      const variant = (amount
        ? product?.variants?.find((entry) => Number(entry.price) === amount)
        : undefined) ?? product?.variants?.[0];
      if (!product || !variant) {
        setError("No encontramos el producto Gift Card. Crealo o ejecuta el seed de Trojani.");
        return;
      }
      addVariant(
        { ...product, type: "GIFT_CARD", trackInventory: false },
        { ...variant, price: amount ?? variant.price },
      );
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo agregar la gift card."));
    }
  };

  useEffect(() => {
    if (!initialGiftCardRequestKey) return;
    if (handledGiftCardRequestKeyRef.current === initialGiftCardRequestKey) return;
    handledGiftCardRequestKeyRef.current = initialGiftCardRequestKey;
    void addQuickGiftCard(initialGiftCardAmount);
    onGiftCardRequestHandled?.();
    // The parent changes this value only for an explicit dashboard quick action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGiftCardAmount, initialGiftCardRequestKey]);

  const removeLine = (lineId: string) => {
    setLines((current) => current.filter((line) => line.lineId !== lineId));
  };

  const resetForm = () => {
    const lockedPaymentMethod = initialPaymentMethod || "Cuenta corriente";
    const resetPaymentMethod = lockCustomer ? lockedPaymentMethod : "Efectivo";

    setCustomerName(lockCustomer && initialCustomer ? getCustomerName(initialCustomer) : "");
    setSelectedCustomer(lockCustomer ? initialCustomer ?? null : null);
    setSelectedCurrentAccount(lockCustomer ? initialCurrentAccount ?? null : null);
    setUseCurrentAccountCredit(false);
    setApplyPaymentDiscount(true);
    applyPaymentMethod(resetPaymentMethod);
    setSplitPaymentEnabled(false);
    setSplitPayments([
      { method: resetPaymentMethod, amount: "" },
    ]);
    setDiscountType("percentage");
    setDiscountValue("");
    setNotes("");
    setProductQuery("");
    setLines([]);
    setAppliedGiftCards([]);
    setManualPriceMode(null);
    setSelectedCatalogVariantId(null);
    setOpenPaymentMenuIndex(null);
    focusSearchInput();
  };

  const balanceSplitPayments = useCallback((
    payments: ManualSalePaymentLine[],
    editedIndex: number,
  ) => {
    if (payments.length < 2 || subtotal <= 0) return payments;

    const targetIndex = editedIndex === payments.length - 1 ? 0 : payments.length - 1;
    const coveredBase = payments.reduce((sum, payment, index) => {
      if (index === targetIndex) return sum;
      return (
        sum +
        calculatePaymentBaseCovered(
          parseCurrencyInput(payment.amount),
          payment.method,
          effectivePaymentDiscountPercentage,
        )
      );
    }, 0);
    const adjustedSplitTarget = Math.max(
      splitPaymentBaseTarget - appliedGiftCardAmount - appliedCurrentAccountCreditAmount,
      0,
    );
    const remainingBase = Math.max(roundCurrency(adjustedSplitTarget - coveredBase), 0);
    const targetAmount = calculatePaymentAmountForBase(
      remainingBase,
      payments[targetIndex]?.method || "Efectivo",
      effectivePaymentDiscountPercentage,
    );

    return payments.map((payment, index) =>
      index === targetIndex
        ? { ...payment, amount: formatAmountInput(targetAmount) }
        : payment,
    );
  }, [appliedCurrentAccountCreditAmount, appliedGiftCardAmount, effectivePaymentDiscountPercentage, splitPaymentBaseTarget, subtotal]);

  useEffect(() => {
    if (!splitPaymentEnabled) return;

    setSplitPayments((current) => {
      if (current.length < 2) return current;
      const nextPayments = balanceSplitPayments(current, 0);
      return arePaymentLinesEqual(current, nextPayments) ? current : nextPayments;
    });
  }, [balanceSplitPayments, discountType, discountValue, splitPaymentBaseTarget, splitPaymentEnabled]);

  const toggleSplitPayment = (enabled: boolean) => {
    setSplitPaymentEnabled(enabled);

    if (enabled) {
      const firstPayment = splitPayments[0] ?? { method: paymentMethod, amount: "" };
      const firstMethod = firstPayment.method || paymentMethod;
      const secondMethod = paymentOptions.find((option) => option !== firstMethod) ?? "Tarjeta";
      const firstBase = roundCurrency(amountToCollect / 2);
      const firstAmount = calculatePaymentAmountForBase(
        firstBase,
        firstMethod,
        effectivePaymentDiscountPercentage,
      );
      setSplitPayments(balanceSplitPayments([
        { method: firstMethod, amount: formatAmountInput(firstAmount) },
        { method: secondMethod, amount: "" },
      ], 0));
      return;
    }

    applyPaymentMethod(splitPayments[0]?.method || paymentMethod);
  };

  const updatePaymentAmount = (index: number, amount: string) => {
    setSplitPayments((current) =>
      balanceSplitPayments(current.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, amount: sanitizeCurrencyInput(amount) } : payment,
      ), index),
    );
  };

  const formatPaymentAmount = (index: number) => {
    setSplitPayments((current) =>
      balanceSplitPayments(current.map((payment, paymentIndex) =>
        paymentIndex === index
          ? { ...payment, amount: formatAmountInput(parseCurrencyInput(payment.amount)) }
          : payment,
      ), index),
    );
  };

  const removePayment = (index: number) => {
    setSplitPayments((current) => {
      if (current.length <= 1) return current;
      const nextPayments = current.filter((_, paymentIndex) => paymentIndex !== index);
      if (index === 0) {
        setPaymentMethod(nextPayments[0]?.method || "Efectivo");
      }
      return nextPayments;
    });
    setOpenPaymentMenuIndex(null);
  };

  const addPayment = () => {
    const usedMethods = new Set(splitPayments.map((payment) => payment.method));
    const nextMethod = paymentOptions.find((option) => !usedMethods.has(option)) ?? "Efectivo";
    setSplitPayments((current) => [...current, { method: nextMethod, amount: "" }]);
    setSplitPaymentEnabled(true);
    setOpenPaymentMenuIndex(null);
  };

  const getPaymentValidationMessage = () => {
    if (lines.some((line) => line.isGiftCard && !line.giftCardRecipientName?.trim())) {
      return "Indica el destinatario de cada gift card.";
    }

    if (normalizedGiftCardApplications.some((card) => card.appliedAmount <= 0)) {
      return "El importe aplicado de cada gift card debe ser mayor a cero.";
    }
    if (currentAccountSelected && !selectedCurrentAccount) {
      return "Para vender en cuenta corriente, selecciona o registra un cliente.";
    }

    if (splitPaymentEnabled && splitPaymentHasDuplicateMethod) {
      return "No se puede seleccionar el mismo metodo de pago en mas de un pago.";
    }

    if (splitPaymentEnabled && normalizedSplitPayments.some((payment) => payment.amount <= 0)) {
      return "Cada pago tiene que tener un importe mayor a cero.";
    }

    if (
      splitPaymentEnabled &&
      !requiresManualPriceMode &&
      Math.abs(splitPaymentDifference) > 0.01
    ) {
      return "La suma de los pagos tiene que coincidir con el total a cobrar.";
    }

    return "";
  };

  const openSaleConfirmation = () => {
    if (lines.length === 0) {
      setError("Agrega al menos una variante a la venta.");
      return;
    }

    const paymentValidationMessage = getPaymentValidationMessage();
    if (paymentValidationMessage) {
      setError(paymentValidationMessage);
      if (currentAccountSelected && !selectedCurrentAccount) {
        setCustomerModalOpen(true);
      }
      return;
    }

    if (currentAccountSelected && !selectedCurrentAccount) {
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

    const paymentValidationMessage = getPaymentValidationMessage();
    if (paymentValidationMessage) {
      setError(paymentValidationMessage);
      if (currentAccountSelected && !selectedCurrentAccount) {
        setCustomerModalOpen(true);
      }
      setConfirmSaleOpen(false);
      return;
    }

    if (currentAccountSelected && !selectedCurrentAccount) {
      setError("Para vender en cuenta corriente, seleccioná o registrá un cliente.");
      setCustomerModalOpen(true);
      setConfirmSaleOpen(false);
      return;
    }

    if (manualPriceConfirmationMissing) {
      setError("Indica si los precios modificados fueron cargados como efectivo o tarjeta.");
      setConfirmSaleOpen(true);
      return;
    }

    if (confirmationPaymentMismatch) {
      setError("Los importes de pago no coinciden con el total recalculado. Ajustalos antes de confirmar.");
      setConfirmSaleOpen(true);
      return;
    }

    try {
      setSaving(true);
      setConfirmSaleOpen(false);
      setError("");
      setSuccess("");

      const saleAmounts = requiresManualPriceMode
        ? submissionAmounts
        : {
            discountAmount,
            effectiveManualPayments,
            appliedCurrentAccountCreditAmount,
          };
      const changedVariantIds = new Set(
        manualPriceChanges.map((change) => change.variantId),
      );
      const payload = {
        trialItemIds: initialTrialItems?.map((item) => item.id),
        customerId: selectedCustomer?.id,
        customerFirstName: selectedCustomer
          ? selectedCustomer.firstName || getCustomerName(selectedCustomer)
          : customerName.trim() || undefined,
        customerLastName: selectedCustomer?.lastName ?? undefined,
        customerEmail: selectedCustomer?.email,
        customerPhone: selectedCustomer?.phone ?? undefined,
        shippingMethod: undefined,
        shippingCost: 0,
        paymentMethod:
          saleAmounts.effectiveManualPayments[0]?.method ||
          paymentMethod.trim() ||
          undefined,
        payments: splitPaymentEnabled
          ? saleAmounts.effectiveManualPayments.map((payment) => ({
              method: payment.method,
              amount: payment.amount,
            }))
          : undefined,
        giftCardApplications: normalizedGiftCardApplications.length
          ? normalizedGiftCardApplications.map((card) => ({
              giftCardId: card.id,
              amount: card.appliedAmount,
            }))
          : undefined,
        discountType: "fixed" as const,
        discountValue: saleAmounts.discountAmount,
        appliedCurrentAccountCreditAmount:
          saleAmounts.appliedCurrentAccountCreditAmount || undefined,
        paymentStatus: "approved" as const,
        manualPriceMode: requiresManualPriceMode ? manualPriceMode : undefined,
        notes: notes.trim() || undefined,
        storeLocationId: storeLocationId ?? undefined,
        items: normalizedSaleLines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          price: line.unitPrice,
          enteredPrice: changedVariantIds.has(line.variantId)
            ? line.unitPrice
            : undefined,
          catalogPrice: changedVariantIds.has(line.variantId)
            ? line.catalogPrice
            : undefined,
          giftCardPurchaserName: line.isGiftCard
            ? line.giftCardPurchaserName?.trim() || customerName.trim() || undefined
            : undefined,
          giftCardRecipientName: line.isGiftCard
            ? line.giftCardRecipientName?.trim() || undefined
            : undefined,
        })),
      };

      const created = (await api("/orders/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as CreatedOrder;

      const issuedCodes = (created.items ?? [])
        .map((item) => item.issuedGiftCard)
        .filter(Boolean)
        .map((card) => `${card!.recipientName}: ${card!.code}`);
      setSuccess(
        `Venta #${created.id} registrada por ${money(created.total)}.${issuedCodes.length ? ` Gift cards: ${issuedCodes.join(" · ")}` : ""}`,
      );
      resetForm();
      await onSaleRegistered?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message.includes("Manual sales module is disabled for this store")
          ? "La venta manual esta deshabilitada para esta tienda. Activala desde la configuracion de la tienda."
          : message.includes("Para vender en cuenta corriente")
            ? "Para vender en cuenta corriente, seleccioná o registrá un cliente."
            : message.includes("precios modificados manualmente")
              ? "Indica si los precios modificados fueron cargados como efectivo o tarjeta."
              : message || "No se pudo registrar la venta manual.",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectCustomer = (customer: ManualSaleCustomer, account?: CurrentAccountLookup | null) => {
    const selectedAccount = account ?? null;
    setSelectedCustomer(customer);
    setSelectedCurrentAccount(selectedAccount);
    setUseCurrentAccountCredit(false);
    setCustomerName(getCustomerName(customer));
    setCustomerQuery("");
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
      setCustomerModalError("Carga el nombre o apellido del cliente.");
      return;
    }

    setCustomerLoading(true);
    setCustomerModalError("");
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
      setCustomerModalError(getErrorMessage(err, "No pudimos registrar el cliente."));
    } finally {
      setCustomerLoading(false);
    }
  };

  const createCustomerFromPayload = async (customerPayload: NewCustomerPayload) => {
    const createdAccount = (await api("/current-accounts", {
      method: "POST",
      body: JSON.stringify({
        ...customerPayload,
        storeLocationId: storeLocationId ?? undefined,
      }),
    })) as CurrentAccountLookup;
    clearNewCustomerFields();
    selectCustomer(createdAccount.customer, createdAccount);
    await loadCustomers();
  };

  const copyGiftCardPurchaser = (source: ManualSaleLine) => {
    setLines((current) => current.map((line) => line.isGiftCard ? {
      ...line,
      giftCardPurchaserName: source.giftCardPurchaserName,
    } : line));
  };

  const reactivateInactiveAccount = async () => {
    if (!inactiveAccountPrompt || !pendingCustomerPayload) return;

    setCustomerLoading(true);
    setCustomerModalError("");
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
          storeLocationId: storeLocationId ?? undefined,
          address: pendingCustomerPayload.address,
        }),
      })) as CurrentAccountLookup;

      setInactiveAccountPrompt(null);
      setPendingCustomerPayload(null);
      clearNewCustomerFields();
      selectCustomer(reactivated.customer, reactivated);
      await loadCustomers();
    } catch (err) {
      setCustomerModalError(getErrorMessage(err, "No pudimos reactivar la cuenta corriente."));
    } finally {
      setCustomerLoading(false);
    }
  };

  const createCustomerIgnoringInactiveAccount = async () => {
    if (!pendingCustomerPayload) return;

    setCustomerLoading(true);
    setCustomerModalError("");
    try {
      const payload = pendingCustomerPayload;
      setInactiveAccountPrompt(null);
      setPendingCustomerPayload(null);
      await createCustomerFromPayload(payload);
    } catch (err) {
      setCustomerModalError(getErrorMessage(err, "No pudimos registrar el cliente."));
    } finally {
      setCustomerLoading(false);
    }
  };

  const findInactiveCurrentAccountByPhone = async (phone: string) => {
    try {
      return (await api(`/current-accounts/inactive/by-phone?phone=${encodeURIComponent(phone)}`)) as CurrentAccountLookup;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("404") ||
        /Inactive current account not found/i.test(message) ||
        /No encontramos una cuenta corriente dada de baja/i.test(message)
      ) {
        return null;
      }
      throw err;
    }
  };

  return (
    <section className="manual-sale-panel" data-account-panel>
      <header className="manual-sale-header">
        <div>
          <h2>Venta manual</h2>
          <p>
            Busca productos, arma el ticket y cerra la venta en el mismo flujo.
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
              <div className="manual-sale-search-titlebar">
                <h3>Buscar productos</h3>
                <button
                  type="button"
                  onClick={() => void addCurrentCatalogSelection()}
                  className="manual-sale-button manual-sale-add-manual"
                >
                  <span aria-hidden="true">+</span>
                  Agregar manual
                </button>
              </div>

              <div className="manual-sale-search-row">
                <label className="manual-sale-search-box">
                  <span aria-hidden="true">⌕</span>
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
                      void addCurrentCatalogSelection(event.currentTarget.value);
                    }}
                    placeholder="Buscar por nombre, SKU o codigo de barras..."
                  />
                </label>
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
                <CatalogEmptyState
                  loading={searchLoading}
                  hasQuery={normalizedSearchLength > 0}
                />
              ) : (
                <div className="manual-sale-variant-table">
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
                          <span className="manual-sale-product-thumb">
                            {row.imageUrl ? <img src={row.imageUrl} alt="" /> : <span>{row.productTitle.slice(0, 2)}</span>}
                          </span>
                          <span className="manual-sale-variant-product">
                            <strong>{row.productTitle}</strong>
                            <small>{row.sku || "Sin SKU"}</small>
                          </span>
                          <span className="manual-sale-variant-label">Variante: {row.variantLabel}</span>
                          <strong className="manual-sale-variant-price">{money(resolveManualSaleUnitPrice(row.price, pricingPolicy))}</strong>
                          <span
                            className={
                              row.available > 0
                                ? "manual-sale-stock"
                                : "manual-sale-stock is-empty"
                            }
                          >
                            {row.available > 0 ? "Disponible" : "Sin stock"}
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
                  {lines.map((line) => {
                    return (
                      <article key={line.lineId} className="manual-sale-line">
                        <div className="manual-sale-line-top">
                          <span className="manual-sale-line-thumb">
                            {line.imageUrl ? <img src={line.imageUrl} alt="" /> : <span>{line.title.slice(0, 2)}</span>}
                          </span>
                          <div>
                            <strong>{line.title}</strong>
                            <span>
                              {line.variantLabel}
                              {line.sku ? ` - ${line.sku}` : ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(line.lineId)}
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
                              disabled={line.isGiftCard}
                              onClick={() =>
                                updateLine(line.lineId, {
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
                              disabled={line.isGiftCard}
                              onClick={() =>
                                updateLine(line.lineId, {
                                  quantity: Math.min(line.available, Number(line.quantity || 1) + 1),
                                })
                              }
                              aria-label="Sumar cantidad"
                            >
                              +
                            </button>
                          </div>
                          <label className="manual-sale-line-price">
                            <span>{line.isGiftCard ? "Importe de la gift card" : "Importe de la prenda"}</span>
                            <input
                              inputMode="decimal"
                              value={line.price}
                              onChange={(event) =>
                                updateLine(line.lineId, {
                                  price: sanitizeManualSalePriceInput(event.target.value),
                                })
                              }
                              className="manual-sale-field"
                              aria-label={`Importe de la prenda ${line.title}`}
                            />
                          </label>
                        </div>
                        {line.isGiftCard ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                            <button type="button" className="manual-sale-button manual-sale-button-soft" style={{ gridColumn: "1 / -1" }} onClick={() => copyGiftCardPurchaser(line)}>Copiar comprador a todas las gift cards</button>
                            <label className="manual-sale-line-price"><span>Nombre comprador</span><input className="manual-sale-field" value={line.giftCardPurchaserName ?? ""} onChange={(event) => updateLine(line.lineId, { giftCardPurchaserName: event.target.value })} /></label>
                            <label className="manual-sale-line-price"><span>Nombre destinatario *</span><input className="manual-sale-field" value={line.giftCardRecipientName ?? ""} onChange={(event) => updateLine(line.lineId, { giftCardRecipientName: event.target.value })} /></label>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}

              <div className="manual-sale-totals">
                <div className="manual-sale-grand-total">
                  <span>Total a cobrar</span>
                  <strong>{money(amountToCollect)}</strong>
                </div>
                {(hasDiscount || appliedCurrentAccountCreditAmount > 0 || appliedGiftCardAmount > 0) ? (
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
                    {appliedCurrentAccountCreditAmount > 0 ? (
                      <SummaryRow
                        label="Saldo a favor utilizado"
                        value={`- ${money(appliedCurrentAccountCreditAmount)}`}
                      />
                    ) : null}
                    {appliedGiftCardAmount > 0 ? (
                      <SummaryRow label="Gift cards aplicadas" value={`- ${money(appliedGiftCardAmount)}`} />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="manual-sale-checkout-form">
                <label className="manual-sale-customer-box">
                  <span>Cliente</span>
                  <span className="manual-sale-customer-field">
                    <input
                      value={customerName}
                      onChange={(event) => {
                        if (lockCustomer) return;
                        setCustomerName(event.target.value);
                        setSelectedCustomer(null);
                        setSelectedCurrentAccount(null);
                        setUseCurrentAccountCredit(false);
                        setCustomerQuery(event.target.value);
                      }}
                      placeholder="Buscar o cargar cliente"
                      readOnly={lockCustomer}
                    />
                    <button
                      type="button"
                      className={`manual-sale-customer-search-button${lockCustomer ? " is-hidden" : ""}`}
                      onClick={() => {
                        if (lockCustomer) return;
                        setCustomerQuery(customerName);
                        setCustomerModalOpen(true);
                      }}
                      aria-label="Buscar cliente"
                    >
                      <span aria-hidden="true">⌕</span>
                    </button>
                  </span>
                  {!lockCustomer && !selectedCurrentAccount && inlineAccountRows.length > 0 ? (
                    <div className="manual-sale-account-list">
                      {inlineAccountRows.map((account) => (
                        <button
                          key={account.id ?? account.customerId}
                          type="button"
                          onClick={() => {
                            selectCustomer(account.customer, account);
                            setInlineAccountRows([]);
                          }}
                          className="manual-sale-account-button"
                        >
                          <span>{getCustomerName(account.customer)}</span>
                          <small>{accountBalanceLabel(Number(account.balance))}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
                {selectedCustomer && false ? (
                  <div className="manual-sale-customer-current-account">
                    {selectedCustomer ? (
                      <span>
                        Cuenta corriente para <strong>{getCustomerName(selectedCustomer as ManualSaleCustomer)}</strong>
                      </span>
                    ) : (
                      <span>Para vender en cuenta corriente, seleccioná o registrá un cliente.</span>
                    )}
                  </div>
                ) : null}
                <div className="manual-sale-customer-current-account">
                  {selectedCurrentAccount ? (
                    <>
                      <span>
                        Cuenta corriente seleccionada: <strong>{getCustomerName(selectedCurrentAccount.customer)}</strong>
                      </span>
                      <span>
                        <strong>{accountBalanceLabel(selectedAccountBalance)}</strong>
                      </span>
                    </>
                  ) : (
                    <span>Si no seleccionas una cuenta corriente, se guarda como nombre de cliente.</span>
                  )}
                  {selectedCurrentAccount && availableCurrentAccountCredit > 0 ? (
                    <label className="manual-sale-credit-check">
                      <input
                        type="checkbox"
                        checked={useCurrentAccountCredit}
                        onChange={(event) => setUseCurrentAccountCredit(event.target.checked)}
                      />
                      <span>Utilizar saldo a favor</span>
                    </label>
                  ) : null}
                </div>

                <div className="manual-sale-field-group">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span>Gift Card</span>
                    {normalizedGiftCardApplications.length ? (
                      <button type="button" className="manual-sale-button-ghost" onClick={() => setAppliedGiftCards([])}>Limpiar gift card</button>
                    ) : null}
                  </div>
                  {!normalizedGiftCardApplications.length ? (
                    <div style={{ border: "1px solid var(--theme-colors-border)", borderRadius: 10, padding: 12 }}>
                      <p style={{ margin: "0 0 10px", color: "var(--theme-colors-text-muted)" }}>No hay una gift card aplicada.</p>
                      {onOpenGiftCards ? <button type="button" className="manual-sale-button manual-sale-button-soft" onClick={onOpenGiftCards}>Buscar en Gift Cards</button> : null}
                    </div>
                  ) : null}
                  {normalizedGiftCardApplications.map((card) => (
                    <article key={card.id} style={{ border: "1px solid var(--theme-colors-border)", borderRadius: 10, padding: 10, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>•••• {card.codeLastFour} · {card.recipientName}</strong>
                      </div>
                      <small>Saldo disponible: {money(Number(card.balance))}</small>
                      <label className="manual-sale-line-price" style={{ marginTop: 8 }}><span>Importe a utilizar</span><input className="manual-sale-field" inputMode="decimal" value={appliedGiftCards.find((entry) => entry.id === card.id)?.amount ?? ""} onChange={(event) => setAppliedGiftCards((current) => current.map((entry) => entry.id === card.id ? { ...entry, amount: sanitizeCurrencyInput(event.target.value) } : entry))} /></label>
                      <small>Saldo luego de la venta: {money(Math.max(Number(card.balance) - card.appliedAmount, 0))}</small>
                    </article>
                  ))}
                </div>

                <div className="manual-sale-field-group">
                  <div className="manual-sale-payment-heading">
                    <span>Medio de pago</span>
                    <label className="manual-sale-split-toggle">
                      <input
                        type="checkbox"
                        checked={splitPaymentEnabled}
                        onChange={(event) => toggleSplitPayment(event.target.checked)}
                      />
                      <span>Pago dividido</span>
                    </label>
                  </div>

                  <div className="manual-sale-payment-cards">
                    {splitPayments.map((payment, index) => (
                      <article key={index} className="manual-sale-payment-card">
                        <div className="manual-sale-payment-card-header">
                          <strong>{splitPaymentEnabled ? `Pago ${index + 1}` : "Pago"}</strong>
                          {splitPayments.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removePayment(index)}
                              className="manual-sale-payment-remove"
                            >
                              Eliminar
                            </button>
                          ) : null}
                        </div>

                        <div className={splitPaymentEnabled ? "manual-sale-payment-card-grid" : "manual-sale-payment-card-grid is-single"}>
                          <label className="manual-sale-select-label">
                            <span>Medio de pago</span>
                            <div className="manual-sale-select-wrap">
                              <button
                                type="button"
                                className={`manual-sale-select-trigger${openPaymentMenuIndex === index ? " is-open" : ""}`}
                                onClick={() =>
                                  setOpenPaymentMenuIndex((current) =>
                                    current === index ? null : index,
                                  )
                                }
                                aria-haspopup="listbox"
                                aria-expanded={openPaymentMenuIndex === index}
                              >
                                <span>{payment.method}</span>
                                <span aria-hidden="true" className="manual-sale-select-arrow" />
                              </button>
                              {openPaymentMenuIndex === index ? (
                                <div className="manual-sale-select-menu" role="listbox">
                                  {paymentOptions.map((option) => {
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        role="option"
                                        aria-selected={payment.method === option}
                                        className={payment.method === option ? "is-selected" : ""}
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          applySplitPaymentMethod(index, option);
                                        }}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          </label>

                          {splitPaymentEnabled ? (
                            <label className="manual-sale-split-amount">
                              <span>Monto</span>
                              <input
                                inputMode="decimal"
                                value={payment.amount}
                                onChange={(event) => updatePaymentAmount(index, event.target.value)}
                                onFocus={(event) => event.currentTarget.select()}
                                onBlur={() => formatPaymentAmount(index)}
                                placeholder="$ 0,00"
                                className="manual-sale-field"
                              />
                            </label>
                          ) : null}
                        </div>
                      </article>
                    ))}

                    {splitPaymentEnabled ? (
                      <button
                        type="button"
                        onClick={addPayment}
                        className="manual-sale-add-payment-button"
                        disabled={splitPayments.length >= paymentOptions.length}
                      >
                        + Agregar otro pago
                      </button>
                    ) : null}

                    {showPaymentDiscountToggle ? (
                      <label className="manual-sale-payment-discount-check">
                        <input
                          type="checkbox"
                          checked={applyPaymentDiscount}
                          onChange={(event) => setApplyPaymentDiscount(event.target.checked)}
                        />
                        <span>
                          Utilizar descuento efectivo/débito/transferencia ({bankTransferDiscountPercentage}%)
                        </span>
                      </label>
                    ) : null}

                    {splitPaymentEnabled ? (
                      <div className={`manual-sale-payment-summary is-${paymentSummaryTone}`}>
                        <SummaryRow label="Total venta" value={money(amountToCollect)} />
                        <SummaryRow label="Total pagado" value={money(splitPaymentTotal)} />
                        <SummaryRow label="Restante" value={money(Math.max(splitPaymentDifference, 0))} />
                        <div className="manual-sale-payment-summary-status">
                          <span>Estado</span>
                          <strong>{paymentSummaryStatus}</strong>
                        </div>
                      </div>
                    ) : null}
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
                  placeholder="Agrega una nota interna..."
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
                  {saving ? "Registrando..." : "Cobrar ->"}
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
                <span>{currentAccountSelected ? "Pendiente" : "Total a cobrar"}</span>
                <strong>{money(confirmationAmountToCollect)}</strong>
              </div>
            </div>

            <div className="manual-sale-confirm-summary">
              {(selectedCustomer || customerName.trim()) ? (
                <SummaryRow label="Cliente" value={selectedCustomer ? getCustomerName(selectedCustomer) : customerName.trim()} />
              ) : null}
              <SummaryRow
                label="Pago"
                value={
                  confirmationPayments
                    .map((payment) => `${payment.method}: ${money(payment.amount)}`)
                    .join(" + ")
                }
              />
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
              {appliedCurrentAccountCreditAmount > 0 ? (
                <SummaryRow
                  label="Saldo a favor utilizado"
                  value={`- ${money(appliedCurrentAccountCreditAmount)}`}
                />
              ) : null}
              <SummaryRow
                label="Estado"
                value={
                  currentAccountSelected && confirmationAmountToCollect > 0
                    ? "Pendiente de pago"
                    : "Pagado"
                }
              />
            </div>

            {requiresManualPriceMode ? (
              <section className="manual-sale-manual-price-review">
                <div className="manual-sale-manual-price-heading">
                  <div>
                    <p className="manual-sale-eyebrow">Precios modificados</p>
                    <strong>Como se cargaron estos importes?</strong>
                  </div>
                  <div className="manual-sale-manual-price-mode">
                    <button
                      type="button"
                      onClick={() => setManualPriceMode("cash")}
                      className={manualPriceMode === "cash" ? "is-active" : ""}
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualPriceMode("card")}
                      className={manualPriceMode === "card" ? "is-active" : ""}
                    >
                      Tarjeta
                    </button>
                  </div>
                </div>

                <div className="manual-sale-manual-price-lines">
                  {manualPriceComparisonRows.map((change) => (
                    <article key={change.variantId}>
                      <div>
                        <strong>{change.title}</strong>
                        <span>
                          {change.variantLabel} x{change.quantity}
                        </span>
                      </div>
                      <div>
                        <span>Catalogo</span>
                        <strong>{money(change.catalogPrice)}</strong>
                      </div>
                      <div>
                        <span>
                          {manualPriceMode
                            ? `Manual ${manualPriceMode === "card" ? "tarjeta" : "efectivo"}`
                            : "Manual ingresado"}
                        </span>
                        <strong>{money(change.enteredPrice)}</strong>
                      </div>
                      {manualPriceMode ? (
                        <div>
                          <span>
                            {manualPriceMode === "cash"
                              ? "Tarjeta calculada"
                              : "Efectivo equivalente"}
                          </span>
                          <strong>
                            {money(
                              manualPriceMode === "cash"
                                ? change.cardEquivalent
                                : change.cashEquivalent,
                            )}
                          </strong>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                {manualPriceConfirmationMissing ? (
                  <p className="manual-sale-alert manual-sale-alert-error">
                    Elegi si esos precios modificados son valores en efectivo o en tarjeta antes de confirmar.
                  </p>
                ) : null}
                {confirmationPaymentMismatch ? (
                  <p className="manual-sale-alert manual-sale-alert-error">
                    El total recalculado es {money(confirmationAmountToCollect)} y los pagos cargados suman {money(splitPaymentTotal)}.
                  </p>
                ) : null}
              </section>
            ) : null}

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
                disabled={
                  saving ||
                  manualPriceConfirmationMissing ||
                  confirmationPaymentMismatch
                }
                className="manual-sale-button manual-sale-button-primary"
              >
                {saving ? "Registrando..." : "Confirmar venta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {customerModalOpen ? (
        <div className="manual-sale-modal-overlay" onClick={() => { setCustomerModalOpen(false); setCustomerModalError(""); }}>
          <div className="manual-sale-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-sale-modal-header">
              <div>
                <p className="manual-sale-eyebrow">Cuenta corriente</p>
                <h3>Seleccionar cliente</h3>
              </div>
              <button type="button" className="manual-sale-button-ghost" onClick={() => { setCustomerModalOpen(false); setCustomerModalError(""); }}>
                Cerrar
              </button>
            </div>
            {customerModalError ? <p className="manual-sale-alert manual-sale-alert-error">{customerModalError}</p> : null}
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
                  ) : filteredCurrentAccounts.length === 0 ? (
                    <StateCard label="No encontramos clientes con ese filtro." />
                  ) : (
                    filteredCurrentAccounts.map((account) => (
                      <button
                        key={account.id ?? account.customerId}
                        type="button"
                        onClick={() => selectCustomer(account.customer, account)}
                        className="manual-sale-customer-option"
                      >
                        <strong>{getCustomerName(account.customer)}</strong>
                        <span>
                          {account.customer.phone || "Sin telefono"}
                          {account.customer.email ? ` · ${account.customer.email}` : ""}
                          {account.customer.document ? ` · Doc. ${account.customer.document}` : ""}
                        </span>
                        <span className={Number(account.balance) < 0 ? "manual-sale-account-credit" : ""}>
                          {accountBalanceLabel(Number(account.balance))}
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
                    setCustomerModalError("");
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
                      setCustomerModalError("");
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
          setCustomerModalError("");
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
                  setCustomerModalError("");
                }}
              >
                Cerrar
              </button>
            </div>
            {customerModalError ? <p className="manual-sale-alert manual-sale-alert-error">{customerModalError}</p> : null}

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
          max-height: none;
          overflow: visible;
          padding-right: 0;
        }

        .manual-sale-line {
          display: grid;
          gap: 8px;
          background: var(--page-panel-bg);
          padding: 10px 12px;
        }

        .manual-sale-line-controls {
          display: grid;
          grid-template-columns: 124px minmax(0, 1fr);
          gap: 8px;
          align-items: end;
        }

        .manual-sale-line-price {
          display: grid;
          min-width: 0;
        }

        .manual-sale-line-price > span {
          color: var(--text-muted);
          white-space: nowrap;
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

        .manual-sale-payment-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .manual-sale-payment-heading > span {
          display: block;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .manual-sale-split-toggle,
        .manual-sale-credit-check,
        .manual-sale-payment-discount-check {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0;
          color: var(--sale-primary);
          font-size: 13px;
          font-weight: 800;
          text-transform: none;
          letter-spacing: 0;
        }

        .manual-sale-split-toggle > span,
        .manual-sale-credit-check > span,
        .manual-sale-payment-discount-check > span {
          margin: 0;
          color: inherit;
          font-size: inherit;
          font-weight: inherit;
          letter-spacing: 0;
          text-transform: none;
        }

        .manual-sale-split-toggle input,
        .manual-sale-credit-check input,
        .manual-sale-payment-discount-check input {
          width: 18px;
          height: 18px;
          accent-color: var(--sale-primary);
        }

        .manual-sale-payment-cards {
          display: grid;
          gap: 10px;
        }

        .manual-sale-payment-card {
          display: grid;
          gap: 10px;
          border: 1px solid var(--sale-border);
          border-radius: 16px;
          background: #FFFFFF;
          padding: 12px;
          box-shadow: 0 10px 24px rgba(31, 41, 55, 0.04);
        }

        .manual-sale-payment-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .manual-sale-payment-card-header strong {
          color: var(--sale-text);
          font-size: 14px;
        }

        .manual-sale-payment-remove {
          border: 0;
          background: transparent;
          color: #B42318;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
        }

        .manual-sale-payment-card-grid {
          display: grid;
          grid-template-columns: minmax(150px, 0.88fr) minmax(116px, 0.32fr);
          gap: 10px;
          align-items: end;
        }

        .manual-sale-payment-card-grid.is-single {
          grid-template-columns: 1fr;
        }

        .manual-sale-select-label,
        .manual-sale-split-amount {
          display: grid;
          gap: 6px;
        }

        .manual-sale-select-label > span,
        .manual-sale-split-amount > span {
          display: block;
          color: var(--sale-text);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 900;
        }

        .manual-sale-select-wrap {
          position: relative;
          min-width: 0;
        }

        .manual-sale-select-trigger {
          width: 100%;
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid var(--sale-border);
          background: #FFFFFF;
          color: var(--sale-text);
          padding: 0 12px 0 13px;
          outline: none;
          font: inherit;
          font-size: 15px;
          font-weight: 750;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .manual-sale-select-trigger:hover,
        .manual-sale-select-trigger.is-open {
          border-color: rgba(31, 111, 91, 0.38);
          box-shadow: 0 0 0 4px rgba(125, 185, 170, 0.12);
        }

        .manual-sale-select-trigger > span:first-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .manual-sale-select-arrow {
          width: 8px;
          height: 8px;
          border-right: 2px solid var(--sale-primary);
          border-bottom: 2px solid var(--sale-primary);
          transform: translateY(-2px) rotate(45deg);
          flex: 0 0 auto;
        }

        .manual-sale-select-trigger.is-open .manual-sale-select-arrow {
          transform: translateY(2px) rotate(225deg);
        }

        .manual-sale-select-menu {
          position: absolute;
          z-index: 60;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          display: grid;
          gap: 4px;
          border: 1px solid rgba(31, 111, 91, 0.16);
          border-radius: 14px;
          background: #FFFFFF;
          padding: 6px;
          box-shadow: 0 18px 38px rgba(31, 41, 55, 0.14);
        }

        .manual-sale-select-menu button {
          min-height: 36px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: var(--sale-text);
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 750;
          text-align: left;
          padding: 0 10px;
        }

        .manual-sale-select-menu button:hover:not(:disabled),
        .manual-sale-select-menu button.is-selected {
          background: rgba(125, 185, 170, 0.16);
          color: var(--sale-primary);
        }

        .manual-sale-select-menu button:disabled {
          cursor: not-allowed;
          color: rgba(107, 114, 128, 0.48);
          text-decoration: line-through;
        }

        .manual-sale-select-trigger:focus,
        .manual-sale-field:focus {
          border-color: rgba(31, 111, 91, 0.38);
          box-shadow: 0 0 0 4px rgba(125, 185, 170, 0.14);
        }

        .manual-sale-add-payment-button {
          min-height: 42px;
          border-radius: 14px;
          border: 1px dashed rgba(31, 111, 91, 0.28);
          background: rgba(125, 185, 170, 0.1);
          color: var(--sale-primary);
          cursor: pointer;
          font: inherit;
          font-weight: 850;
        }

        .manual-sale-add-payment-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .manual-sale-payment-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px 12px;
          border-radius: 14px;
          border: 1px solid var(--sale-border);
          background: #F8FAF8;
          padding: 12px;
          font-size: 13px;
        }

        .manual-sale-payment-summary.is-complete {
          border-color: rgba(31, 111, 91, 0.2);
          background: rgba(221, 244, 232, 0.72);
        }

        .manual-sale-payment-summary.is-empty {
          border-color: rgba(107, 114, 128, 0.16);
          background: #F8FAF8;
        }

        .manual-sale-payment-summary.is-missing {
          border-color: rgba(217, 119, 6, 0.24);
          background: rgba(254, 243, 199, 0.78);
        }

        .manual-sale-payment-summary.is-exceeded {
          border-color: rgba(180, 35, 24, 0.22);
          background: rgba(253, 232, 232, 0.72);
        }

        .manual-sale-payment-summary .manual-sale-summary-row {
          min-height: 0;
          padding: 0;
        }

        .manual-sale-payment-summary-status {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid rgba(31, 41, 55, 0.08);
          padding-top: 8px;
        }

        .manual-sale-payment-summary-status span {
          color: var(--sale-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 11px;
          font-weight: 900;
        }

        .manual-sale-payment-summary-status strong {
          color: var(--sale-text);
          text-align: right;
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
          border: 1px solid rgba(125, 185, 170, 0.26);
          background: rgba(125, 185, 170, 0.08);
          color: var(--sale-text);
          font-size: 13px;
        }

        .manual-sale-customer-current-account:has(> span:only-child) {
          display: none;
        }

        .manual-sale-customer-box {
          position: relative;
          display: grid;
          gap: 8px;
        }

        .manual-sale-customer-box .manual-sale-customer-field {
          display: block;
          min-height: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0;
          box-shadow: none;
        }

        .manual-sale-customer-box .manual-sale-customer-field:focus-within {
          border-color: transparent;
          box-shadow: none;
        }

        .manual-sale-customer-box .manual-sale-customer-icon,
        .manual-sale-customer-box .manual-sale-customer-search-button {
          display: none;
        }

        .manual-sale-customer-box .manual-sale-customer-field input {
          min-height: 42px;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: var(--sale-text);
          padding: 0;
        }

        .manual-sale-account-list {
          position: absolute;
          z-index: 30;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          display: grid;
          gap: 6px;
          border: 1px solid var(--sale-border);
          border-radius: 14px;
          background: var(--sale-surface);
          padding: 8px;
          box-shadow: 0 16px 40px rgba(31, 41, 55, 0.14);
        }

        .manual-sale-account-button {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid var(--sale-border);
          border-radius: 10px;
          background: transparent;
          color: var(--sale-text);
          padding: 9px;
          cursor: pointer;
          text-align: left;
          font: inherit;
        }

        .manual-sale-account-button small {
          color: var(--sale-muted);
          white-space: nowrap;
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

        .manual-sale-customer-option .manual-sale-account-credit {
          color: var(--sale-primary);
          font-weight: 850;
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

        .manual-sale-manual-price-review {
          display: grid;
          gap: 12px;
          border-radius: 18px;
          border: 1px solid rgba(31, 111, 91, 0.16);
          background: rgba(221, 244, 232, 0.34);
          padding: 14px;
        }

        .manual-sale-manual-price-heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .manual-sale-manual-price-heading .manual-sale-eyebrow {
          margin: 0 0 5px;
        }

        .manual-sale-manual-price-heading strong {
          color: var(--sale-text);
          font-size: 15px;
        }

        .manual-sale-manual-price-mode {
          display: inline-grid;
          grid-template-columns: repeat(2, minmax(92px, 1fr));
          gap: 6px;
        }

        .manual-sale-manual-price-mode button {
          min-height: 38px;
          border-radius: 12px;
          border: 1px solid var(--sale-border);
          background: #FFFFFF;
          color: var(--sale-text);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
        }

        .manual-sale-manual-price-mode button.is-active {
          border-color: var(--sale-primary);
          background: var(--sale-primary);
          color: #FFFFFF;
        }

        .manual-sale-manual-price-lines {
          display: grid;
          gap: 8px;
        }

        .manual-sale-manual-price-lines article {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) repeat(3, minmax(96px, 0.55fr));
          gap: 10px;
          align-items: start;
          border-radius: 14px;
          border: 1px solid var(--sale-border);
          background: #FFFFFF;
          padding: 11px 12px;
        }

        .manual-sale-manual-price-lines article > div {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .manual-sale-manual-price-lines span {
          color: var(--sale-muted);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .manual-sale-manual-price-lines strong {
          color: var(--sale-text);
          overflow-wrap: anywhere;
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

          .manual-sale-manual-price-heading,
          .manual-sale-manual-price-lines article {
            grid-template-columns: 1fr;
          }

          .manual-sale-manual-price-mode {
            width: 100%;
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

        .manual-sale-panel {
          --sale-primary: #1F6F5B;
          --sale-secondary: #7DB9AA;
          --sale-bg: #FAF7F1;
          --sale-surface: #FFFFFF;
          --sale-text: #1F2937;
          --sale-muted: #6B7280;
          --sale-border: rgba(31, 41, 55, 0.1);
          --sale-shadow: 0 18px 46px rgba(31, 41, 55, 0.06);
          border: 0;
          border-radius: 0;
          background: var(--sale-bg);
          padding: 0;
          gap: 18px;
        }

        .manual-sale-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          padding: 18px 6px 4px;
        }

        .manual-sale-header h2 {
          color: var(--sale-text);
          font-size: clamp(2rem, 3vw, 2.85rem);
          letter-spacing: 0;
        }

        .manual-sale-header p {
          color: var(--sale-muted);
          font-size: 15px;
        }

        .manual-sale-workspace {
          grid-template-columns: minmax(0, 1.9fr) minmax(340px, 0.95fr);
          gap: 18px;
        }

        .manual-sale-card,
        .manual-sale-state,
        .manual-sale-line,
        .manual-sale-modal {
          border: 1px solid var(--sale-border);
          background: var(--sale-surface);
          box-shadow: var(--sale-shadow);
        }

        .manual-sale-card {
          border-radius: 22px;
          padding: 20px;
        }

        .manual-sale-card h3 {
          color: var(--sale-text);
          font-size: 1.25rem;
        }

        .manual-sale-search-card {
          gap: 20px;
          margin-bottom: 0;
        }

        .manual-sale-search-titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .manual-sale-search-row {
          grid-template-columns: 1fr;
          gap: 0;
        }

        .manual-sale-search-box {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          min-height: 68px;
          border: 1px solid rgba(31, 111, 91, 0.18);
          border-radius: 18px;
          background: #FFFFFF;
          padding: 0 22px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72), 0 16px 34px rgba(31, 41, 55, 0.045);
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .manual-sale-search-box:focus-within {
          border-color: rgba(31, 111, 91, 0.46);
          box-shadow: 0 0 0 4px rgba(125, 185, 170, 0.16), 0 18px 38px rgba(31, 111, 91, 0.08);
        }

        .manual-sale-search-box > span {
          color: var(--sale-muted);
          font-size: 30px;
          line-height: 1;
          transform: translateY(-1px);
        }

        .manual-sale-search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--sale-text);
          font: inherit;
          font-size: 16px;
          font-weight: 650;
        }

        .manual-sale-search-box input::placeholder,
        .manual-sale-field::placeholder {
          color: rgba(107, 114, 128, 0.72);
        }

        .manual-sale-add-manual {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          border-radius: 14px;
          border-color: rgba(31, 111, 91, 0.16);
          background: #FFFFFF;
          color: var(--sale-primary);
          box-shadow: 0 12px 28px rgba(31, 41, 55, 0.045);
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .manual-sale-add-manual:hover {
          transform: translateY(-1px);
          border-color: rgba(31, 111, 91, 0.36);
          background: rgba(221, 244, 232, 0.62);
          box-shadow: 0 18px 34px rgba(31, 111, 91, 0.1);
        }

        .manual-sale-add-manual span {
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: rgba(31, 111, 91, 0.1);
        }

        .manual-sale-search-meta {
          color: var(--sale-muted);
          font-size: 14px;
        }

        .manual-sale-variant-table-shell {
          margin-top: 0;
          overflow: visible;
        }

        .manual-sale-variant-table {
          min-width: 0;
        }

        .manual-sale-variant-table-body {
          gap: 10px;
          max-height: calc(100vh - 360px);
          min-height: 280px;
          padding: 2px 4px 2px 0;
        }

        .manual-sale-variant-row {
          display: grid;
          grid-template-columns: 58px minmax(180px, 1.3fr) minmax(100px, 0.65fr) minmax(116px, 0.65fr) minmax(112px, 0.55fr) auto;
          gap: 14px;
          border-radius: 18px;
          border-color: var(--sale-border);
          background: #FFFFFF;
          padding: 12px;
          box-shadow: 0 10px 28px rgba(31, 41, 55, 0.035);
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .manual-sale-variant-row:hover,
        .manual-sale-variant-row.is-selected {
          border-color: rgba(31, 111, 91, 0.28);
          background: #FFFFFF;
          transform: translateY(-1px);
          box-shadow: 0 18px 36px rgba(31, 111, 91, 0.1);
        }

        .manual-sale-variant-row.is-selected {
          box-shadow: inset 4px 0 0 var(--sale-primary), 0 18px 36px rgba(31, 111, 91, 0.1);
        }

        .manual-sale-product-thumb,
        .manual-sale-line-thumb {
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 14px;
          background: #F3F1EC;
          color: var(--sale-primary);
          font-weight: 900;
          text-transform: uppercase;
        }

        .manual-sale-product-thumb {
          width: 58px;
          height: 58px;
        }

        .manual-sale-product-thumb img,
        .manual-sale-line-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .manual-sale-variant-product {
          gap: 6px;
        }

        .manual-sale-variant-product strong,
        .manual-sale-variant-price,
        .manual-sale-line strong {
          color: var(--sale-text);
        }

        .manual-sale-variant-product small,
        .manual-sale-variant-label,
        .manual-sale-line span {
          color: var(--sale-muted);
        }

        .manual-sale-variant-label {
          font-weight: 700;
        }

        .manual-sale-variant-price {
          font-size: 15px;
        }

        .manual-sale-stock {
          background: #DDF4E8;
          color: #1F6F5B;
          font-weight: 900;
          padding: 8px 12px;
        }

        .manual-sale-stock.is-empty {
          background: #FDE8E8;
          color: #B42318;
        }

        .manual-sale-button-soft {
          border-radius: 14px;
          border-color: var(--sale-border);
          background: #FFFFFF;
          color: var(--sale-text);
        }

        .manual-sale-button-soft:hover {
          border-color: rgba(31, 111, 91, 0.28);
          background: rgba(125, 185, 170, 0.12);
          color: var(--sale-primary);
        }

        .manual-sale-checkout {
          position: sticky;
          top: 14px;
          max-height: none;
          overflow: visible;
        }

        .manual-sale-total-card {
          border-radius: 22px;
          padding: 22px;
          gap: 18px;
        }

        .manual-sale-lines {
          max-height: none;
          gap: 12px;
        }

        .manual-sale-line {
          border-radius: 18px;
          padding: 12px;
          box-shadow: none;
        }

        .manual-sale-line-top {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr) auto;
          align-items: start;
          gap: 12px;
        }

        .manual-sale-line-thumb {
          width: 52px;
          height: 58px;
        }

        .manual-sale-icon-button {
          border-color: var(--sale-border);
          background: #F6F7F5;
          color: var(--sale-muted);
        }

        .manual-sale-line-controls {
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 10px;
          padding-left: 64px;
        }

        .manual-sale-qty {
          border-radius: 14px;
          background: #FFFFFF;
          border-color: var(--sale-border);
        }

        .manual-sale-field {
          min-height: 48px;
          border-radius: 14px;
          border-color: var(--sale-border);
          background: #FFFFFF;
          color: var(--sale-text);
          padding: 12px 14px;
        }

        textarea.manual-sale-field {
          min-height: 104px;
        }

        .manual-sale-grand-total {
          border: 1px solid rgba(31, 111, 91, 0.12);
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(221, 244, 232, 0.72), rgba(255, 255, 255, 0.95));
          padding: 24px 22px;
          min-height: 128px;
          align-content: center;
        }

        .manual-sale-grand-total span {
          color: var(--sale-muted);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .manual-sale-grand-total strong {
          color: var(--sale-primary);
          font-size: clamp(2.6rem, 5vw, 3.25rem);
          font-weight: 950;
        }

        .manual-sale-discount-summary {
          border-top-color: var(--sale-border);
          gap: 6px;
          padding-top: 12px;
        }

        label > span,
        .manual-sale-field-group > span {
          color: var(--sale-text);
          font-size: 11px;
          font-weight: 900;
        }

        .manual-sale-search-box > span {
          display: grid;
          place-items: center;
          margin: 0;
          color: var(--sale-muted);
          font-size: 26px;
          font-weight: 400;
          letter-spacing: 0;
          text-transform: none;
        }

        .manual-sale-checkout-form {
          border-top-color: var(--sale-border);
          gap: 14px;
          padding-top: 14px;
        }

        .manual-sale-customer-field {
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          min-height: 54px;
          border: 1px solid var(--sale-border);
          border-radius: 15px;
          background: #FFFFFF;
          padding: 0 15px;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .manual-sale-customer-box .manual-sale-customer-field {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          border: 1px solid var(--sale-border);
          border-radius: 15px;
          background: #FFFFFF;
          padding: 0 8px 0 14px;
          box-shadow: none;
        }

        .manual-sale-customer-field:focus-within {
          border-color: rgba(31, 111, 91, 0.38);
          box-shadow: 0 0 0 4px rgba(125, 185, 170, 0.14);
        }

        .manual-sale-customer-box .manual-sale-customer-field:focus-within {
          border-color: rgba(31, 111, 91, 0.38);
          box-shadow: 0 0 0 4px rgba(125, 185, 170, 0.14);
        }

        .manual-sale-customer-icon {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(31, 111, 91, 0.52);
          border-radius: 999px;
          position: relative;
        }

        .manual-sale-customer-icon::after {
          content: "";
          position: absolute;
          width: 7px;
          height: 2px;
          right: -6px;
          bottom: -2px;
          border-radius: 999px;
          background: rgba(31, 111, 91, 0.52);
          transform: rotate(45deg);
        }

        .manual-sale-customer-field > span:not(.manual-sale-customer-icon) {
          display: grid;
          place-items: center;
          margin: 0;
          color: var(--sale-muted);
          font-size: 19px;
          font-weight: 500;
          letter-spacing: 0;
          text-transform: none;
        }

        .manual-sale-customer-field input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--sale-text);
          font: inherit;
        }

        .manual-sale-customer-search-button {
          position: relative;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          min-height: 38px;
          border: 1px solid rgba(31, 111, 91, 0.2);
          border-radius: 999px;
          background: rgba(125, 185, 170, 0.12);
          color: var(--sale-primary);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          padding: 0;
          transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
        }

        .manual-sale-customer-box .manual-sale-customer-search-button {
          display: grid;
        }

        .manual-sale-customer-box .manual-sale-customer-search-button.is-hidden,
        .manual-sale-customer-search-button.is-hidden {
          display: none;
        }

        .manual-sale-customer-search-button span {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .manual-sale-customer-search-button::before {
          content: "";
          width: 13px;
          height: 13px;
          border: 2px solid currentColor;
          border-radius: 999px;
          transform: translate(-1px, -1px);
        }

        .manual-sale-customer-search-button::after {
          content: "";
          position: absolute;
          width: 8px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transform: translate(6px, 7px) rotate(45deg);
        }

        .manual-sale-customer-search-button:hover {
          transform: translateY(-1px);
          border-color: rgba(31, 111, 91, 0.3);
          background: rgba(125, 185, 170, 0.22);
        }

        .manual-sale-segmented {
          gap: 8px;
          border: 0;
          background: transparent;
          padding: 0;
        }

        .manual-sale-segmented button {
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid var(--sale-border);
          background: #FFFFFF;
          color: var(--sale-text);
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .manual-sale-segmented button:hover {
          transform: translateY(-1px);
          border-color: rgba(31, 111, 91, 0.28);
          box-shadow: 0 12px 24px rgba(31, 41, 55, 0.055);
        }

        .manual-sale-segmented button:disabled {
          cursor: not-allowed;
          opacity: 0.42;
          transform: none;
          box-shadow: none;
        }

        .manual-sale-segmented button.is-active {
          border-color: var(--sale-primary);
          background: var(--sale-primary);
          color: #FFFFFF;
          box-shadow: 0 12px 24px rgba(31, 111, 91, 0.16);
        }

        .manual-sale-discount-row {
          grid-template-columns: minmax(150px, 0.45fr) minmax(0, 1fr);
          gap: 12px;
        }

        .manual-sale-actions {
          display: grid;
          grid-template-columns: 0.42fr 1fr;
          gap: 12px;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
        }

        .manual-sale-actions .manual-sale-button-primary {
          width: 100%;
          min-height: 64px;
          border-radius: 16px;
          border-color: var(--sale-primary);
          background: linear-gradient(135deg, var(--sale-primary), #18785f);
          color: #FFFFFF;
          font-size: 17px;
          box-shadow: 0 22px 40px rgba(31, 111, 91, 0.26);
          transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        }

        .manual-sale-actions .manual-sale-button-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: saturate(1.08);
          box-shadow: 0 28px 48px rgba(31, 111, 91, 0.32);
        }

        .manual-sale-button-ghost {
          min-height: 58px;
          border-radius: 16px;
          border-color: var(--sale-border);
          background: #FFFFFF;
          color: var(--sale-text);
        }

        .manual-sale-state {
          border-radius: 18px;
          color: var(--sale-muted);
          padding: 22px;
        }

        .manual-sale-empty-state {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 10px;
          min-height: 260px;
          border: 1px dashed rgba(31, 111, 91, 0.2);
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(221, 244, 232, 0.26));
          color: var(--sale-muted);
          text-align: center;
          padding: 32px 20px;
        }

        .manual-sale-empty-icon {
          position: relative;
          width: 58px;
          height: 58px;
          border-radius: 20px;
          background: rgba(221, 244, 232, 0.86);
          box-shadow: inset 0 0 0 1px rgba(31, 111, 91, 0.12);
        }

        .manual-sale-empty-icon::before {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          left: 17px;
          top: 16px;
          border: 2px solid var(--sale-primary);
          border-radius: 999px;
        }

        .manual-sale-empty-icon::after {
          content: "";
          position: absolute;
          width: 13px;
          height: 2px;
          left: 34px;
          top: 36px;
          border-radius: 999px;
          background: var(--sale-primary);
          transform: rotate(45deg);
        }

        .manual-sale-empty-state strong {
          color: var(--sale-text);
          font-size: 18px;
        }

        .manual-sale-empty-state p {
          max-width: 360px;
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 1180px) {
          .manual-sale-workspace {
            grid-template-columns: 1fr;
          }

          .manual-sale-checkout {
            position: static;
            max-height: none;
            overflow: visible;
          }
        }

        @media (max-width: 760px) {
          .manual-sale-header {
            display: grid;
            align-items: start;
          }

          .manual-sale-search-row,
          .manual-sale-discount-row,
          .manual-sale-payment-card-grid,
          .manual-sale-payment-summary,
          .manual-sale-actions {
            grid-template-columns: 1fr;
          }

          .manual-sale-variant-row {
            grid-template-columns: 54px minmax(0, 1fr);
          }

          .manual-sale-variant-label,
          .manual-sale-variant-price,
          .manual-sale-stock,
          .manual-sale-row-action {
            grid-column: 2;
            justify-self: start;
          }

          .manual-sale-row-action,
          .manual-sale-row-action .manual-sale-button {
            width: 100%;
          }

          .manual-sale-line-controls {
            grid-template-columns: 112px minmax(0, 1fr);
            padding-left: 0;
          }

          .manual-sale-line-total {
            grid-column: 1 / -1;
            justify-self: start;
            text-align: left;
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

function CatalogEmptyState({ loading, hasQuery }: { loading: boolean; hasQuery: boolean }) {
  return (
    <div className="manual-sale-empty-state">
      <div className="manual-sale-empty-icon" aria-hidden="true">
        <span />
      </div>
      <strong>
        {loading ? "Buscando variantes..." : hasQuery ? "No encontramos productos" : "Busca un producto para comenzar"}
      </strong>
      <p>
        {loading
          ? "Estamos revisando el catalogo del local."
          : hasQuery
            ? "Proba con otro nombre, SKU, talle o codigo de barras."
            : "Escanea un codigo de barras o escribi nombre, SKU o variante."}
      </p>
    </div>
  );
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

function calculateManualSaleSubmissionAmounts({
  lines,
  discountType,
  safeDiscountValue,
  pricingPolicy,
  splitPaymentEnabled,
  splitPayments,
  paymentMethod,
  applyPaymentDiscount,
  bankTransferDiscountPercentage,
  selectedAccountBalance,
  useCurrentAccountCredit,
}: {
  lines: NormalizedManualSaleLine[];
  discountType: "percentage" | "fixed";
  safeDiscountValue: number;
  pricingPolicy: { manualSaleDiscountRounding: boolean };
  splitPaymentEnabled: boolean;
  splitPayments: ManualSalePaymentLine[];
  paymentMethod: string;
  applyPaymentDiscount: boolean;
  bankTransferDiscountPercentage: number;
  selectedAccountBalance: number;
  useCurrentAccountCredit: boolean;
}) {
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  const discountableLines = lines.filter((line) => !line.isGiftCard);
  const discountableSubtotal = discountableLines.reduce(
    (total, line) => total + line.lineTotal,
    0,
  );
  const manualDiscountAmountBeforePayment =
    discountType === "percentage"
      ? calculateDiscountOnRemainingBase(
          discountableSubtotal,
          safeDiscountValue,
          pricingPolicy,
        )
      : Math.min(safeDiscountValue, discountableSubtotal);
  const splitPaymentBaseTarget = Math.max(subtotal - manualDiscountAmountBeforePayment, 0);
  const normalizedSplitPayments = splitPayments.map((payment) => ({
    method: payment.method,
    amount: roundCurrency(parseCurrencyInput(payment.amount)),
  }));
  const paymentDiscountActive =
    applyPaymentDiscount && bankTransferDiscountPercentage > 0;
  const effectivePaymentDiscountPercentage = paymentDiscountActive
    ? bankTransferDiscountPercentage
    : 0;
  const splitPaymentTotal = roundCurrency(
    normalizedSplitPayments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const splitPaymentBaseCovered = roundCurrency(
    normalizedSplitPayments.reduce(
      (sum, payment) =>
        sum +
        calculatePaymentBaseCovered(
          payment.amount,
          payment.method,
          effectivePaymentDiscountPercentage,
        ),
      0,
    ),
  );
  const splitPaymentBaseDifference = roundCurrency(
    splitPaymentBaseTarget - splitPaymentBaseCovered,
  );
  const splitPaymentBaseComplete = splitPaymentBaseDifference <= 0.01;
  const partialSplitPaymentDiscountAmount = roundCurrency(
    normalizedSplitPayments
      .filter((payment) => isDiscountedPaymentMethod(payment.method))
      .reduce(
        (sum, payment) =>
          sum +
          Math.max(
            calculatePaymentBaseCovered(
              payment.amount,
              payment.method,
              effectivePaymentDiscountPercentage,
            ) - payment.amount,
            0,
          ),
        0,
      ),
  );
  const paymentMethodDiscountRatio = splitPaymentEnabled
    ? splitPaymentBaseCovered > 0
      ? 1
      : 0
    : isDiscountedPaymentMethod(splitPayments[0]?.method || paymentMethod)
      ? 1
      : 0;
  const paymentMethodDiscountPercentage =
    paymentDiscountActive && paymentMethodDiscountRatio > 0
      ? effectivePaymentDiscountPercentage
      : 0;
  const fullPaymentMethodDiscountAmount =
    paymentMethodDiscountPercentage > 0
      ? calculateManualSaleDiscountAmount(
          discountableLines,
          discountableSubtotal,
          paymentMethodDiscountPercentage,
          pricingPolicy,
        )
      : 0;
  const paymentMethodDiscountAmount =
    paymentMethodDiscountPercentage > 0
      ? splitPaymentEnabled
        ? Math.min(
            splitPaymentBaseComplete
              ? Math.max(splitPaymentBaseTarget - splitPaymentTotal, 0)
              : partialSplitPaymentDiscountAmount,
            fullPaymentMethodDiscountAmount,
          )
        : roundCurrency(fullPaymentMethodDiscountAmount * paymentMethodDiscountRatio)
      : 0;
  const manualDiscountBase = splitPaymentEnabled
    ? discountableSubtotal
    : Math.max(discountableSubtotal - paymentMethodDiscountAmount, 0);
  const manualDiscountAmount = splitPaymentEnabled
    ? manualDiscountAmountBeforePayment
    : discountType === "percentage"
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
  const availableCurrentAccountCredit = Math.max(-selectedAccountBalance, 0);
  const appliedCurrentAccountCreditAmount = useCurrentAccountCredit
    ? Math.min(availableCurrentAccountCredit, total)
    : 0;
  const amountToCollect = Math.max(total - appliedCurrentAccountCreditAmount, 0);
  const effectiveManualPayments = splitPaymentEnabled
    ? normalizedSplitPayments
    : [
        {
          method: splitPayments[0]?.method || paymentMethod.trim() || "Efectivo",
          amount: amountToCollect,
        },
      ];
  const effectiveSplitPaymentTotal = splitPaymentEnabled
    ? splitPaymentTotal
    : amountToCollect;

  return {
    subtotal,
    discountAmount,
    appliedCurrentAccountCreditAmount,
    amountToCollect,
    effectiveManualPayments,
    splitPaymentDifference: roundCurrency(amountToCollect - effectiveSplitPaymentTotal),
  };
}

function getCustomerName(customer: ManualSaleCustomer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email || customer.phone || `Cliente #${customer.id}`;
}

function accountBalanceLabel(balance: number) {
  if (balance < 0) return `Saldo a favor: ${money(Math.abs(balance))}`;
  if (balance > 0) return `Debe: ${money(balance)}`;
  return "Sin saldo";
}

async function getPaymentDiscountPercentage() {
  const storeId = String(getClientStoreId() || "default");
  const cachedPercentage = paymentDiscountPercentageCache.get(storeId);
  if (cachedPercentage !== undefined) return cachedPercentage;

  const existingRequest = paymentConfigRequests.get(storeId);
  if (existingRequest) return existingRequest;

  const request = api("/store/payment-config")
    .then((config) => {
      const paymentConfig = config as StorePaymentConfig;
      const enabled = paymentConfig?.bankTransfer?.enabled !== false;
      const percentage = Number(paymentConfig?.bankTransfer?.discountPercentage ?? 0);
      const normalizedPercentage =
        enabled && Number.isFinite(percentage)
          ? Math.max(0, Math.min(percentage, 100))
          : 0;

      paymentDiscountPercentageCache.set(storeId, normalizedPercentage);
      paymentConfigRequests.delete(storeId);
      return normalizedPercentage;
    })
    .catch((error) => {
      paymentConfigRequests.delete(storeId);
      throw error;
    });

  paymentConfigRequests.set(storeId, request);
  return request;
}

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function roundCurrencyUpToHundred(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  if (safeValue <= 0) return 0;
  return Math.ceil(safeValue / 100) * 100;
}

function isDiscountedPaymentMethod(method: string) {
  return isDiscountedAdministrativePaymentMethod(method);
}

function getPaymentDiscountMultiplier(discountPercentage: number) {
  const safePercentage = Number.isFinite(discountPercentage)
    ? Math.min(Math.max(discountPercentage, 0), 100)
    : 0;
  return Math.max(1 - safePercentage / 100, 0);
}

function hasManualLinePriceChange(line: Pick<NormalizedManualSaleLine, "unitPrice" | "catalogPrice">) {
  return Math.abs(line.unitPrice - Number(line.catalogPrice ?? 0)) > 0.01;
}

function resolveManualCardEquivalent(
  cashPrice: number,
  discountPercentage: number,
  policy: { manualSaleDiscountRounding: boolean },
) {
  const multiplier = getPaymentDiscountMultiplier(discountPercentage);
  if (multiplier <= 0 || multiplier >= 1) return roundCurrency(cashPrice);

  const cardPrice = cashPrice / multiplier;
  return policy.manualSaleDiscountRounding
    ? roundToNearestHundred(cardPrice)
    : roundCurrency(cardPrice);
}

function resolveManualCashEquivalent(
  cardPrice: number,
  discountPercentage: number,
  policy: { manualSaleDiscountRounding: boolean },
) {
  const multiplier = getPaymentDiscountMultiplier(discountPercentage);
  if (multiplier <= 0 || multiplier >= 1) return roundCurrency(cardPrice);

  const cashPrice = cardPrice * multiplier;
  return policy.manualSaleDiscountRounding
    ? roundToNearestHundred(cashPrice)
    : roundCurrency(cashPrice);
}

function convertCashManualLineToCardLine(
  line: NormalizedManualSaleLine,
  discountPercentage: number,
  policy: { manualSaleDiscountRounding: boolean },
) {
  if (!hasManualLinePriceChange(line)) return line;

  const unitPrice = resolveManualCardEquivalent(
    line.unitPrice,
    discountPercentage,
    policy,
  );

  return {
    ...line,
    unitPrice,
    price: String(unitPrice),
    lineTotal: unitPrice * line.quantity,
  };
}

function calculatePaymentBaseCovered(
  amount: number,
  method: string,
  discountPercentage: number,
) {
  const safeAmount = roundCurrency(amount);
  const multiplier = getPaymentDiscountMultiplier(discountPercentage);

  if (!isDiscountedPaymentMethod(method) || multiplier <= 0) return safeAmount;
  return roundCurrency(safeAmount / multiplier);
}

function calculatePaymentAmountForBase(
  baseAmount: number,
  method: string,
  discountPercentage: number,
) {
  const safeBase = roundCurrency(baseAmount);
  if (safeBase <= 0) return 0;

  if (!isDiscountedPaymentMethod(method)) {
    return roundCurrencyUpToHundred(safeBase);
  }

  return roundCurrencyUpToHundred(
    safeBase * getPaymentDiscountMultiplier(discountPercentage),
  );
}

function arePaymentLinesEqual(
  current: ManualSalePaymentLine[],
  next: ManualSalePaymentLine[],
) {
  if (current.length !== next.length) return false;
  return current.every(
    (payment, index) =>
      payment.method === next[index]?.method &&
      payment.amount === next[index]?.amount,
  );
}

function formatAmountInput(value: number) {
  const rounded = roundCurrency(value);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

function parseCurrencyInput(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeCurrencyInput(value: string) {
  return value.replace(/[^\d,.$\s-]/g, "");
}

function sanitizeManualSalePriceInput(value: string) {
  const normalized = value
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  if (!normalized) return "";

  const [rawIntegerPart, ...decimalParts] = normalized.split(".");
  const integerPart = (rawIntegerPart || "0").replace(/^0+(?=\d)/, "");

  if (decimalParts.length === 0) {
    return integerPart || "0";
  }

  const decimalPart = decimalParts.join("").slice(0, 2);
  return `${integerPart || "0"}.${decimalPart}`;
}

function parseManualSalePriceInput(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatAccountDate(value?: string | null) {
  if (!value) return "Sin movimientos";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function appendStoreLocationParam(params: URLSearchParams, storeLocationId?: number | null) {
  if (storeLocationId) {
    params.set("storeLocationId", String(storeLocationId));
  }
}

function getVariantLabel(variant: Pick<ManualSaleVariant, "Size" | "Color">) {
  return [variant.Size, variant.Color].filter(Boolean).join(" - ") || "Variante principal";
}
