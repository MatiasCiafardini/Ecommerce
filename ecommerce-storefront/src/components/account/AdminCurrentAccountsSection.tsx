"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, apiBlob, getErrorMessage } from "@/lib/api";
import { downloadBlobFile } from "@/lib/download";
import {
  resolveStorePricingPolicy,
  roundToNearestHundred,
} from "@/lib/pricing-policy";
import { getClientStoreId } from "@/lib/tenant/store-context";
import { useAuth } from "@/context/auth-context";
import AdminManualSalesSection, {
  type ManualSaleCustomer,
} from "./AdminManualSalesSection";
import { money } from "./order-utils";
import {
  CURRENT_ACCOUNT_PAYMENT_METHODS,
  isDiscountedAdministrativePaymentMethod,
} from "@/lib/manual-payment-methods";

type Customer = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
};

type Movement = {
  id: number;
  type: string;
  amount: string | number;
  paymentMethod?: string | null;
  description?: string | null;
  createdAt: string;
  balanceAfter: string | number;
  cancelledAt?: string | null;
  cancelledByUserId?: number | null;
  cancellationReason?: string | null;
  cancellationMovementId?: number | null;
  order?: {
    id: number;
    total: string | number;
    status: string;
    createdAt: string;
    items?: Array<{
      id: number;
      quantity: number;
      price: string | number;
      variant?: {
        sku?: string | null;
        Size?: string | null;
        Color?: string | null;
        product?: { title: string };
      } | null;
    }>;
  } | null;
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

export type CurrentAccountCreateForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  document: string;
  address1: string;
  city: string;
  zip: string;
  notes: string;
};

type FilterStatus = "debt" | "credit" | "paid" | "all";
type DetailMode = "history" | "sale" | "payment";
type MovementFilter = "all" | "sales" | "payments" | "corrections" | "cancellations";
type MovementVariant = NonNullable<
  NonNullable<Movement["order"]>["items"]
>[number]["variant"];

const paymentMethods: string[] = [...CURRENT_ACCOUNT_PAYMENT_METHODS];
const movementFilterOptions: Array<{ value: MovementFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "sales", label: "Ventas" },
  { value: "payments", label: "Pagos" },
  { value: "corrections", label: "Correcciones" },
  { value: "cancellations", label: "Anulaciones" },
];

export default function AdminCurrentAccountsSection({
  storeLocationId,
}: {
  storeLocationId?: number | null;
  onRegisterSale?: (customer: Customer) => void;
}) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<CurrentAccount[]>([]);
  const [selected, setSelected] = useState<CurrentAccount | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>("history");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const [movementSearch, setMovementSearch] = useState("");
  const [paymentCustomer, setPaymentCustomer] = useState<CurrentAccount | null>(
    null,
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<CurrentAccount[]>([]);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [applyCashDiscount, setApplyCashDiscount] = useState(true);
  const [cashDiscountPercentage, setCashDiscountPercentage] = useState(0);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [paymentDescription, setPaymentDescription] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [editAccount, setEditAccount] = useState<CurrentAccount | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    document: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [balanceAccount, setBalanceAccount] = useState<CurrentAccount | null>(
    null,
  );
  const [balanceValue, setBalanceValue] = useState("");
  const [balanceDescription, setBalanceDescription] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);
  const balanceInputRef = useRef<HTMLInputElement | null>(null);
  const [editPaymentMovement, setEditPaymentMovement] =
    useState<Movement | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Efectivo");
  const [editPaymentDescription, setEditPaymentDescription] = useState("");
  const [editPaymentReason, setEditPaymentReason] = useState("");
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false);
  const [cancelPaymentMovement, setCancelPaymentMovement] =
    useState<Movement | null>(null);
  const [cancelPaymentReason, setCancelPaymentReason] = useState("");
  const [savingPaymentCancel, setSavingPaymentCancel] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<
    number | null
  >(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CurrentAccountCreateForm>({
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
  const [savingCreate, setSavingCreate] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      if (query.trim()) params.set("search", query.trim());
      appendStoreLocationParam(params, storeLocationId);
      const data = await api(`/current-accounts?${params.toString()}`);
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las cuentas corrientes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAccounts(), 220);
    return () => window.clearTimeout(timeoutId);
  }, [query, status, storeLocationId]);

  useEffect(() => {
    if (!selected) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

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
        const config = (await api("/store/payment-config")) as {
          bankTransfer?: {
            discountPercentage?: number | null;
            enabled?: boolean | null;
          } | null;
        };
        if (!active) return;
        const enabled = config?.bankTransfer?.enabled !== false;
        const percentage = Number(config?.bankTransfer?.discountPercentage ?? 0);
        setCashDiscountPercentage(
          enabled && Number.isFinite(percentage)
            ? Math.max(0, Math.min(percentage, 100))
            : 0,
        );
      } catch {
        if (active) setCashDiscountPercentage(0);
      }
    };

    void loadPaymentConfig();

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const debtAccounts = accounts.filter(
      (account) => Number(account.balance) > 0,
    );
    const creditAccounts = accounts.filter(
      (account) => Number(account.balance) < 0,
    );
    return {
      debtAccounts: debtAccounts.length,
      totalDebt: debtAccounts.reduce(
        (sum, account) => sum + Number(account.balance),
        0,
      ),
      creditAccounts: creditAccounts.length,
      totalCredit: creditAccounts.reduce(
        (sum, account) => sum + Math.abs(Number(account.balance)),
        0,
      ),
    };
  }, [accounts]);
  const paymentBalance = Number(paymentCustomer?.balance ?? 0);
  const paymentAmountNumber = parsePaymentAmount(paymentAmount);
  const pricingPolicy = useMemo(
    () => resolveStorePricingPolicy({ storeId }),
    [storeId],
  );
  const showCashDiscountToggle =
    cashDiscountPercentage > 0 &&
    isDiscountedCurrentAccountPayment(paymentMethod);
  const paymentDiscountPercentage =
    showCashDiscountToggle && applyCashDiscount ? cashDiscountPercentage : 0;
  const cashBalanceDiscountPercentage = applyCashDiscount
    ? cashDiscountPercentage
    : 0;
  const paymentApplication = calculatePaymentApplication(
    paymentAmountNumber,
    paymentBalance,
    paymentMethod,
    paymentDiscountPercentage,
    pricingPolicy.manualSaleDiscountRounding,
    paymentCustomer?.movements,
  );
  const cashBalanceApplication = calculatePaymentApplication(
    paymentBalance,
    paymentBalance,
    "Efectivo",
    cashBalanceDiscountPercentage,
    pricingPolicy.manualSaleDiscountRounding,
    paymentCustomer?.movements,
  );
  const paymentCashBalance = paymentCustomer
    ? cashBalanceApplication.cashToSettle
    : paymentBalance;
  const paymentRemainingAmount = paymentCustomer
    ? paymentApplication.remainingBalance
    : paymentBalance;

  useEffect(() => {
    if (!paymentCustomer) return;
    const parsedAmount = roundCurrency(parsePaymentAmount(paymentAmount));
    const rawBalance = roundCurrency(Number(paymentCustomer.balance));
    const wasSaldarTotalAmount =
      Math.abs(parsedAmount - rawBalance) <= 0.01 ||
      Math.abs(parsedAmount - paymentApplication.cashToSettle) <= 0.01;

    if (!wasSaldarTotalAmount) return;

    setPaymentAmount(String(paymentApplication.cashToSettle));
  }, [
    paymentAmount,
    paymentApplication.cashToSettle,
    paymentCustomer,
    paymentMethod,
    applyCashDiscount,
  ]);
  const canCorrectPayments = ["ADMIN", "OWNER", "SUPER_ADMIN"].includes(
    user?.role ?? "",
  );
  const cancelledPaymentIds = useMemo(
    () => getCancelledPaymentIds(selected?.movements ?? []),
    [selected?.movements],
  );
  const visibleMovements = useMemo(
    () =>
      filterMovements(
        selected?.movements ?? [],
        movementFilter,
        movementSearch,
        selected?.customer,
        cashDiscountPercentage,
        pricingPolicy.manualSaleDiscountRounding,
      ),
    [
      cashDiscountPercentage,
      movementFilter,
      movementSearch,
      pricingPolicy.manualSaleDiscountRounding,
      selected?.customer,
      selected?.movements,
    ],
  );
  const selectedSaleCustomer = useMemo(
    () =>
      selected
        ? ({
            ...selected.customer,
            source: "current_account",
          } as ManualSaleCustomer)
        : null,
    [selected],
  );

  useEffect(() => {
    if (!balanceAccount) return;
    window.requestAnimationFrame(() => {
      balanceInputRef.current?.focus();
      balanceInputRef.current?.select();
    });
  }, [balanceAccount]);

  const openDetail = async (
    account: CurrentAccount,
    mode: DetailMode = "history",
  ) => {
    setSelected(account);
    setDetailMode(mode);
    setDetailLoading(true);
    try {
      const detail = await api(
        currentAccountCustomerPath(account.customerId, storeLocationId),
      );
      setSelected(detail as CurrentAccount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el detalle.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (account: CurrentAccount) => {
    setEditAccount(account);
    setModalError("");
    setEditForm({
      firstName: account.customer.firstName ?? "",
      lastName: account.customer.lastName ?? "",
      email: account.customer.email ?? "",
      phone: account.customer.phone ?? "",
      document: account.customer.document ?? "",
      notes: account.customer.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editAccount) return;

    setSavingEdit(true);
    setModalError("");
    try {
      await api(`/current-accounts/customers/${editAccount.customerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...editForm,
          storeLocationId: storeLocationId ?? undefined,
        }),
      });
      setEditAccount(null);
      await loadAccounts();
      if (selected?.customerId === editAccount.customerId) {
        const detail = await api(
          currentAccountCustomerPath(editAccount.customerId, storeLocationId),
        );
        setSelected(detail as CurrentAccount);
      }
    } catch (err) {
      setModalError(
        getErrorMessage(err, "No se pudo actualizar la cuenta corriente."),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const openBalance = (account: CurrentAccount) => {
    setBalanceAccount(account);
    setBalanceValue(String(Number(account.balance)));
    setBalanceDescription("");
    setModalError("");
  };

  const saveBalance = async () => {
    if (!balanceAccount) return;
    const balance = Number(balanceValue);

    if (!Number.isFinite(balance)) {
      setModalError(
        "El saldo debe ser un numero valido. Usa negativo para saldo a favor.",
      );
      return;
    }

    setSavingBalance(true);
    setModalError("");
    try {
      await api(
        `/current-accounts/customers/${balanceAccount.customerId}/balance`,
        {
          method: "PATCH",
          body: JSON.stringify({
            balance,
            description: balanceDescription.trim() || undefined,
            storeLocationId: storeLocationId ?? undefined,
          }),
        },
      );
      setBalanceAccount(null);
      await loadAccounts();
      if (selected?.customerId === balanceAccount.customerId) {
        const detail = await api(
          currentAccountCustomerPath(
            balanceAccount.customerId,
            storeLocationId,
          ),
        );
        setSelected(detail as CurrentAccount);
      }
    } catch (err) {
      setModalError(getErrorMessage(err, "No se pudo ajustar el saldo."));
    } finally {
      setSavingBalance(false);
    }
  };

  const deactivateAccount = async (account: CurrentAccount) => {
    const confirmed = window.confirm(
      `Dar de baja la cuenta corriente de ${customerName(account.customer)}? El historial de movimientos se conserva.`,
    );
    if (!confirmed) return;

    setDeactivatingId(account.id);
    setError("");
    try {
      const params = new URLSearchParams();
      appendStoreLocationParam(params, storeLocationId);
      await api(
        `/current-accounts/customers/${account.customerId}${params.toString() ? `?${params.toString()}` : ""}`,
        { method: "DELETE" },
      );
      if (selected?.customerId === account.customerId) setSelected(null);
      await loadAccounts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo dar de baja la cuenta corriente.",
      );
    } finally {
      setDeactivatingId(null);
    }
  };

  const openGlobalPayment = async () => {
    setPaymentModalOpen(true);
    setPaymentCustomer(null);
    setPaymentAmount("");
    setPaymentMethod("Efectivo");
    setApplyCashDiscount(true);
    setPaymentDescription("");
    setPaymentSearch("");
    setModalError("");
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("status", "debt");
      appendStoreLocationParam(params, storeLocationId);
      const data = await api(`/current-accounts?${params.toString()}`);
      setPaymentAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setModalError(
        getErrorMessage(err, "No se pudieron cargar clientes con deuda."),
      );
      setPaymentAccounts([]);
    }
  };

  const selectPaymentCustomer = async (account: CurrentAccount) => {
    let detailedAccount = account;
    try {
      detailedAccount = (await api(
        currentAccountCustomerPath(account.customerId, storeLocationId),
      )) as CurrentAccount;
    } catch {
      detailedAccount = account;
    }
    setPaymentCustomer(detailedAccount);
    setApplyCashDiscount(true);
    const application = calculatePaymentApplication(
      Number(detailedAccount.balance),
      Number(detailedAccount.balance),
      "Efectivo",
      cashDiscountPercentage,
      pricingPolicy.manualSaleDiscountRounding,
      detailedAccount.movements,
    );
    setPaymentAmount(String(application.cashToSettle));
    setPaymentDescription("");
  };

  const registerPayment = async () => {
    if (!paymentCustomer) return;
    const amount = roundCurrency(parsePaymentAmount(paymentAmount));
    const balance = roundCurrency(Number(paymentCustomer.balance));

    if (!Number.isFinite(amount) || amount <= 0) {
      setModalError("El monto debe ser mayor a 0.");
      return;
    }

    const application = calculatePaymentApplication(
      amount,
      balance,
      paymentMethod,
      paymentDiscountPercentage,
      pricingPolicy.manualSaleDiscountRounding,
      paymentCustomer.movements,
    );

    if (amount > application.cashToSettle) {
      setModalError("El pago no puede superar el saldo actual.");
      return;
    }

    setSavingPayment(true);
    setModalError("");
    try {
      const result = (await api(
        `/current-accounts/customers/${paymentCustomer.customerId}/payments`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            paymentMethod,
            applyCashDiscount: paymentDiscountPercentage > 0,
            description: paymentDescription.trim() || undefined,
            storeLocationId: storeLocationId ?? undefined,
          }),
        },
      )) as { movement?: Movement };
      setPaymentModalOpen(false);
      setPaymentCustomer(null);
      setDetailMode("history");
      await loadAccounts();
      if (selected?.customerId === paymentCustomer.customerId) {
        await openDetail(paymentCustomer);
      }
      if (result.movement?.id) {
        await downloadPaymentReceipt(result.movement.id);
      }
    } catch (err) {
      setModalError(getErrorMessage(err, "No se pudo registrar el pago."));
    } finally {
      setSavingPayment(false);
    }
  };

  const downloadPaymentReceipt = async (movementId: number) => {
    setDownloadingReceiptId(movementId);
    setError("");
    try {
      const blob = await apiBlob(
        `/current-accounts/payments/${movementId}/receipt.pdf`,
      );
      downloadBlobFile(blob, `recibo-pago-cuenta-${movementId}.pdf`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar el recibo de pago.",
      );
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const openEditPayment = (movement: Movement) => {
    setEditPaymentMovement(movement);
    setEditPaymentAmount(String(Math.abs(Number(movement.amount))));
    setEditPaymentMethod(movement.paymentMethod || "Efectivo");
    setEditPaymentDescription(movement.description || "");
    setEditPaymentReason("");
    setModalError("");
  };

  const savePaymentEdit = async () => {
    if (!editPaymentMovement || !selected) return;
    const amount = roundCurrency(parsePaymentAmount(editPaymentAmount));

    if (!Number.isFinite(amount) || amount <= 0) {
      setModalError("El monto debe ser mayor a 0.");
      return;
    }

    setSavingPaymentEdit(true);
    setModalError("");
    try {
      await api(`/current-accounts/payments/${editPaymentMovement.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount,
          paymentMethod: editPaymentMethod,
          description: editPaymentDescription.trim() || undefined,
          reason: editPaymentReason.trim() || undefined,
        }),
      });
      setEditPaymentMovement(null);
      await refreshSelectedAccount();
    } catch (err) {
      setModalError(getErrorMessage(err, "No se pudo corregir el pago."));
    } finally {
      setSavingPaymentEdit(false);
    }
  };

  const openCancelPayment = (movement: Movement) => {
    setCancelPaymentMovement(movement);
    setCancelPaymentReason("");
    setModalError("");
  };

  const confirmCancelPayment = async () => {
    if (!cancelPaymentMovement || !selected) return;

    setSavingPaymentCancel(true);
    setModalError("");
    try {
      await api(`/current-accounts/payments/${cancelPaymentMovement.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          reason: cancelPaymentReason.trim() || undefined,
        }),
      });
      setCancelPaymentMovement(null);
      await refreshSelectedAccount();
    } catch (err) {
      setModalError(getErrorMessage(err, "No se pudo anular el pago."));
    } finally {
      setSavingPaymentCancel(false);
    }
  };

  const openCreateAccount = () => {
    setCreateForm({
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
    setCreateModalOpen(true);
    setModalError("");
    setError("");
  };

  const createAccount = async () => {
    if (!createForm.firstName.trim() && !createForm.lastName.trim()) {
      setModalError("Carga el nombre o apellido del cliente.");
      return;
    }

    const hasAddress = [
      createForm.address1,
      createForm.city,
      createForm.zip,
    ].some((value) => value.trim());
    const payload = {
      firstName: createForm.firstName.trim() || undefined,
      lastName: createForm.lastName.trim() || undefined,
      email: createForm.email.trim() || undefined,
      phone: createForm.phone.trim() || undefined,
      document: createForm.document.trim() || undefined,
      notes: createForm.notes.trim() || undefined,
      storeLocationId: storeLocationId ?? undefined,
      address: hasAddress
        ? {
            address1: createForm.address1.trim() || undefined,
            city: createForm.city.trim() || undefined,
            zip: createForm.zip.trim() || undefined,
          }
        : undefined,
    };

    setSavingCreate(true);
    setModalError("");
    try {
      const created = (await api("/current-accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as CurrentAccount;
      setCreateModalOpen(false);
      await loadAccounts();
      setSelected(created);
    } catch (err) {
      setModalError(
        getErrorMessage(err, "No se pudo crear la cuenta corriente."),
      );
    } finally {
      setSavingCreate(false);
    }
  };

  const openSaleInAccount = async (account: CurrentAccount) => {
    await openDetail(account, "sale");
  };

  const openPaymentInAccount = async (account: CurrentAccount) => {
    await openDetail(account, "payment");
    setPaymentCustomer(account);
    setPaymentAmount(
      String(
        calculatePaymentApplication(
          Number(account.balance),
          Number(account.balance),
          "Efectivo",
          cashDiscountPercentage,
          pricingPolicy.manualSaleDiscountRounding,
          account.movements,
        ).cashToSettle,
      ),
    );
    setPaymentMethod("Efectivo");
    setApplyCashDiscount(true);
    setPaymentDescription("");
    setModalError("");
  };

  const refreshSelectedAccount = async () => {
    if (!selected) return;
    const detail = (await api(
      currentAccountCustomerPath(selected.customerId, storeLocationId),
    )) as CurrentAccount;
    setSelected(detail);
    await loadAccounts();
  };

  return (
    <section data-account-panel style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Administracion</p>
          <h2 style={titleStyle}>Cuentas corrientes</h2>
          <p style={copyStyle}>
            Clientes con deuda, saldo a favor, movimientos y cobros parciales o
            totales.
          </p>
        </div>
        <div style={statsStyle}>
          <button
            type="button"
            onClick={openCreateAccount}
            style={softButtonStyle}
          >
            Agregar cuenta
          </button>
          <Stat label="Con deuda" value={String(totals.debtAccounts)} />
          <Stat label="Deuda total" value={money(totals.totalDebt)} />
          <Stat label="A favor" value={money(totals.totalCredit)} />
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
            ["all", "Todos"],
            ["debt", "Con deuda"],
            ["credit", "Saldo a favor"],
            ["paid", "Saldados"],
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
        <State label={emptyAccountsLabel(status)} />
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
                    <span style={mutedBlockStyle}>
                      Cliente #{account.customerId}
                    </span>
                  </Td>
                  <Td>{account.customer.phone || "Sin telefono"}</Td>
                  <Td>
                    {account.customer.email ||
                      account.customer.document ||
                      "Sin email"}
                  </Td>
                  <Td>
                    <BalanceAmount value={Number(account.balance)} />
                  </Td>
                  <Td>{formatDate(account.lastMovementAt)}</Td>
                  <Td>
                    <div style={rowActionsStyle}>
                      <button
                        type="button"
                        onClick={() => void openDetail(account)}
                        style={softButtonStyle}
                      >
                        Abrir ficha
                      </button>
                      <button
                        type="button"
                        onClick={() => void openSaleInAccount(account)}
                        style={primaryButtonStyle}
                      >
                        Registrar venta
                      </button>
                      <button
                        type="button"
                        onClick={() => void openPaymentInAccount(account)}
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
          <div
            style={detailModalStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar detalle"
              style={modalCloseButtonStyle}
            >
              ×
            </button>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Cuenta corriente</p>
                <h3 style={modalTitleStyle}>
                  {customerName(selected.customer)}
                </h3>
                <p style={copyStyle}>
                  {selected.customer.phone || "Sin telefono"}
                  {selected.customer.email
                    ? ` · ${selected.customer.email}`
                    : ""}
                  {selected.customer.document
                    ? ` · Doc. ${selected.customer.document}`
                    : ""}
                </p>
              </div>
              <div style={balanceStyle}>
                <BalanceAmount value={Number(selected.balance)} />
              </div>
            </header>
            <div style={detailModeRailStyle}>
              <button
                type="button"
                onClick={() => setDetailMode("history")}
                style={detailModeButtonStyle(detailMode === "history")}
              >
                Historial
              </button>
              <button
                type="button"
                onClick={() => setDetailMode("sale")}
                style={detailModeButtonStyle(detailMode === "sale")}
              >
                Registrar venta
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentCustomer(selected);
                  setPaymentAmount(
                    String(
                      calculatePaymentApplication(
                        Number(selected.balance),
                        Number(selected.balance),
                        "Efectivo",
                        cashDiscountPercentage,
                        pricingPolicy.manualSaleDiscountRounding,
                        selected.movements,
                      ).cashToSettle,
                    ),
                  );
                  setPaymentMethod("Efectivo");
                  setApplyCashDiscount(true);
                  setPaymentDescription("");
                  setModalError("");
                  setDetailMode("payment");
                }}
                disabled={Number(selected.balance) <= 0}
                style={detailModeButtonStyle(detailMode === "payment")}
              >
                Registrar pago
              </button>
              <button
                type="button"
                onClick={() => openEdit(selected)}
                style={softButtonStyle}
              >
                Editar datos
              </button>
              <button
                type="button"
                onClick={() => openBalance(selected)}
                style={softButtonStyle}
              >
                Ajustar saldo
              </button>
              <button
                type="button"
                onClick={() => void deactivateAccount(selected)}
                style={dangerButtonStyle}
              >
                Dar de baja
              </button>
            </div>
            {detailMode === "sale" ? (
              <div style={embeddedSaleStyle}>
                <AdminManualSalesSection
                  storeLocationId={storeLocationId}
                  initialCustomer={selectedSaleCustomer}
                  initialCurrentAccount={selected}
                  initialPaymentMethod="Cuenta corriente"
                  lockCustomer
                  onSaleRegistered={async () => {
                    await refreshSelectedAccount();
                    setDetailMode("history");
                  }}
                />
              </div>
            ) : detailMode === "payment" ? (
              <div style={inlinePaymentStyle}>
                {modalError ? <p style={errorStyle}>{modalError}</p> : null}
                <div style={paymentSummaryStyle}>
                  <div>
                    <span style={mutedBlockStyle}>Saldo actual tarjeta</span>
                    <strong>{money(Number(selected.balance))}</strong>
                  </div>
                  <div>
                    <span style={mutedBlockStyle}>Saldo actual efectivo</span>
                    <strong>{money(paymentCashBalance)}</strong>
                  </div>
                  <div>
                    <span style={mutedBlockStyle}>Pago</span>
                    <strong>
                      {Number.isFinite(paymentAmountNumber)
                        ? money(Math.max(paymentAmountNumber, 0))
                        : money(0)}
                    </strong>
                  </div>
                  {paymentApplication.discountAmount > 0 ? (
                    <>
                      <div>
                        <span style={mutedBlockStyle}>
                          Descuento aplicado
                        </span>
                        <strong>{money(paymentApplication.discountAmount)}</strong>
                      </div>
                      <div>
                        <span style={mutedBlockStyle}>Deuda cancelada</span>
                        <strong>{money(paymentApplication.debtCancelled)}</strong>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <span style={mutedBlockStyle}>Saldo luego del pago</span>
                    <strong>{balanceLabel(paymentRemainingAmount)}</strong>
                  </div>
                </div>
                <label style={fieldGroupStyle}>
                  Monto entregado
                  <div style={amountRowStyle}>
                    <div style={moneyInputWrapStyle}>
                      <span style={moneyPrefixStyle}>$</span>
                      <input
                        value={paymentAmount}
                        onChange={(event) =>
                          setPaymentAmount(event.target.value)
                        }
                        style={{ ...inputStyle, paddingLeft: 28 }}
                        inputMode="decimal"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(String(paymentApplication.cashToSettle))
                      }
                      style={softButtonStyle}
                    >
                      Total
                    </button>
                  </div>
                </label>
                <label style={fieldGroupStyle}>
                  Medio de pago
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    style={inputStyle}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>
                {showCashDiscountToggle ? (
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={applyCashDiscount}
                      onChange={(event) =>
                        setApplyCashDiscount(event.target.checked)
                      }
                    />
                    <span>Aplicar descuento por efectivo/transferencia</span>
                  </label>
                ) : null}
                <label style={fieldGroupStyle}>
                  Nota del pago
                  <textarea
                    value={paymentDescription}
                    onChange={(event) =>
                      setPaymentDescription(event.target.value)
                    }
                    style={{ ...inputStyle, minHeight: 84 }}
                    placeholder="Ej: Entrega parcial en mostrador"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void registerPayment()}
                  disabled={savingPayment}
                  style={primaryButtonStyle}
                >
                  {savingPayment ? "Registrando..." : "Registrar pago en ficha"}
                </button>
              </div>
            ) : detailLoading ? (
              <State label="Cargando movimientos..." />
            ) : (
              <div style={movementHistoryStyle}>
                <div style={movementToolbarStyle}>
                  <div style={movementFilterGroupStyle}>
                    {movementFilterOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMovementFilter(option.value)}
                        style={filterChipStyle(movementFilter === option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={movementSearch}
                    onChange={(event) => setMovementSearch(event.target.value)}
                    placeholder="Buscar por venta, pago, producto o importe"
                    style={movementSearchStyle}
                  />
                </div>
                <div style={movementListStyle}>
                  <table style={movementTableStyle}>
                    <thead>
                      <tr>
                        <th style={movementThStyle}>Fecha</th>
                        <th style={movementThStyle}>Cliente</th>
                        <th style={movementThStyle}>Movimiento</th>
                        <th style={movementThStyle}>Pago</th>
                        <th style={movementThStyle}>Detalle de venta</th>
                        <th style={movementThRightStyle}>Efectivo</th>
                        <th style={movementThRightStyle}>Tarjeta</th>
                        <th style={movementThRightStyle}>Saldo</th>
                        <th style={movementThRightStyle}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                    {visibleMovements.map((movement) => {
                      const paymentCancelled = cancelledPaymentIds.has(movement.id);
                      const amountBreakdown = movementAmountBreakdown(
                        movement,
                        selected.movements ?? [],
                        cashDiscountPercentage,
                        pricingPolicy.manualSaleDiscountRounding,
                      );
                      const manualPriceComment = movementManualPriceComment(movement);

                      return (
                        <tr key={movement.id} style={movementTrStyle}>
                          <td style={movementTdStyle}>
                            <span>{formatDate(movement.createdAt)}</span>
                            <small style={mutedBlockStyle}>
                              {movement.createdByUser?.name ||
                                movement.createdByUser?.email ||
                                "-"}
                            </small>
                          </td>
                          <td style={movementTdStyle}>{customerName(selected.customer)}</td>
                          <td style={movementTdStyle}>
                            <strong>{movementLabel(movement, paymentCancelled)}</strong>
                            <small style={mutedBlockStyle}>
                              {movementShortDescription(movement)}
                            </small>
                          </td>
                          <td style={movementTdStyle}>
                            {movementPaymentLabel(movement)}
                          </td>
                          <td style={movementDetailTdStyle}>
                            {movement.order ? <strong>Venta #{movement.order.id}</strong> : "-"}
                            {movement.order?.items?.length ? (
                              <div style={movementItemsStyle}>
                                {movement.order.items.map((item) => (
                                  <span key={item.id}>
                                    {item.variant?.product?.title || "Producto"}{" "}
                                    {variantLabel(item.variant)} x{item.quantity} -{" "}
                                    {money(Number(item.price) * item.quantity)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {manualPriceComment ? (
                              <small style={manualPriceNoteStyle}>
                                {manualPriceComment}
                              </small>
                            ) : null}
                          </td>
                          <td style={movementTdRightStyle}>
                            <strong>{amountBreakdown.cash}</strong>
                          </td>
                          <td style={movementTdRightStyle}>
                            <strong>{amountBreakdown.card}</strong>
                          </td>
                          <td style={movementTdRightStyle}>
                            {balanceLabel(Number(movement.balanceAfter))}
                          </td>
                          <td style={movementActionsTdStyle}>
                            {movement.type === "PAYMENT" ? (
                              paymentCancelled ? (
                                <span style={cancelledBadgeStyle}>Anulado</span>
                              ) : (
                                <div style={movementActionsStyle}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void downloadPaymentReceipt(movement.id)
                                    }
                                    disabled={downloadingReceiptId === movement.id}
                                    title="Descargar recibo"
                                    aria-label="Descargar recibo"
                                    style={compactIconButtonStyle}
                                  >
                                    {downloadingReceiptId === movement.id
                                      ? "..."
                                      : <ReceiptIcon />}
                                  </button>
                                  {canCorrectPayments ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openEditPayment(movement)}
                                        title="Editar pago"
                                        aria-label="Editar pago"
                                        style={compactIconButtonStyle}
                                      >
                                        <EditIcon />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openCancelPayment(movement)}
                                        title="Anular pago"
                                        aria-label="Anular pago"
                                        style={compactDangerIconButtonStyle}
                                      >
                                        <CancelIcon />
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              )
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                  {visibleMovements.length === 0 ? (
                    <div style={emptyMovementsStyle}>No hay movimientos para ese filtro.</div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {editPaymentMovement ? (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            setEditPaymentMovement(null);
            setModalError("");
          }}
        >
          <div
            style={modalStyle}
            onClick={(event) => event.stopPropagation()}
            onKeyDownCapture={(event) => event.stopPropagation()}
          >
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Corregir pago</p>
                <h3 style={modalTitleStyle}>Pago #{editPaymentMovement.id}</h3>
              </div>
            </header>
            {modalError ? <p style={errorStyle}>{modalError}</p> : null}
            <label style={fieldGroupStyle}>
              <span>Monto</span>
              <div style={moneyInputWrapStyle}>
                <span style={moneyPrefixStyle}>$</span>
                <input
                  value={editPaymentAmount}
                  onChange={(event) => setEditPaymentAmount(event.target.value)}
                  inputMode="decimal"
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>
            </label>
            <label style={fieldGroupStyle}>
              <span>Metodo de pago</span>
              <select
                value={editPaymentMethod}
                onChange={(event) => setEditPaymentMethod(event.target.value)}
                style={inputStyle}
              >
                {paymentMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <label style={fieldGroupStyle}>
              <span>Nota visible</span>
              <textarea
                value={editPaymentDescription}
                onChange={(event) =>
                  setEditPaymentDescription(event.target.value)
                }
                style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
              />
            </label>
            <label style={fieldGroupStyle}>
              <span>Motivo interno (opcional)</span>
              <textarea
                value={editPaymentReason}
                onChange={(event) => setEditPaymentReason(event.target.value)}
                placeholder="Ej: se cargo mal el importe"
                style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
              />
            </label>
            <div style={rowActionsStyle}>
              <button
                type="button"
                onClick={() => void savePaymentEdit()}
                disabled={savingPaymentEdit}
                style={primaryButtonStyle}
              >
                {savingPaymentEdit ? "Guardando..." : "Guardar correccion"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditPaymentMovement(null);
                  setModalError("");
                }}
                style={softButtonStyle}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelPaymentMovement ? (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            setCancelPaymentMovement(null);
            setModalError("");
          }}
        >
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Anular pago</p>
                <h3 style={modalTitleStyle}>Pago #{cancelPaymentMovement.id}</h3>
              </div>
              <div style={balanceStyle}>
                {money(Math.abs(Number(cancelPaymentMovement.amount)))}
              </div>
            </header>
            {modalError ? <p style={errorStyle}>{modalError}</p> : null}
            <p style={copyStyle}>
              La anulacion restaura la deuda del cliente y agrega un movimiento
              administrativo en el historial.
            </p>
            <label style={fieldGroupStyle}>
              <span>Motivo interno (opcional)</span>
              <textarea
                value={cancelPaymentReason}
                onChange={(event) => setCancelPaymentReason(event.target.value)}
                placeholder="Ej: el pago correspondia a otro cliente"
                style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
              />
            </label>
            <div style={rowActionsStyle}>
              <button
                type="button"
                onClick={() => void confirmCancelPayment()}
                disabled={savingPaymentCancel}
                style={dangerButtonStyle}
              >
                {savingPaymentCancel ? "Anulando..." : "Confirmar anulacion"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelPaymentMovement(null);
                  setModalError("");
                }}
                style={softButtonStyle}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createModalOpen ? (
        <CurrentAccountCreateModal
          form={createForm}
          error={modalError}
          saving={savingCreate}
          onFormChange={setCreateForm}
          onSubmit={() => void createAccount()}
          onClose={() => {
            setCreateModalOpen(false);
            setModalError("");
          }}
        />
      ) : null}

      {paymentModalOpen ? (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            setPaymentModalOpen(false);
            setPaymentCustomer(null);
            setModalError("");
          }}
        >
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Registrar pago</p>
                <h3 style={modalTitleStyle}>
                  {paymentCustomer
                    ? customerName(paymentCustomer.customer)
                    : "Seleccionar cliente"}
                </h3>
              </div>
              {paymentCustomer ? (
                <div style={balanceStyle}>
                  <BalanceAmount value={Number(paymentCustomer.balance)} />
                </div>
              ) : null}
            </header>
            {modalError ? <p style={errorStyle}>{modalError}</p> : null}
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
                      ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()
                        .includes(normalized);
                    })
                    .map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => void selectPaymentCustomer(account)}
                        style={paymentCustomerOptionStyle}
                      >
                        <span>
                          <strong>{customerName(account.customer)}</strong>
                          <small style={mutedBlockStyle}>
                            {account.customer.phone ||
                              account.customer.email ||
                              account.customer.document ||
                              `Cliente #${account.customerId}`}
                          </small>
                        </span>
                        <BalanceAmount value={Number(account.balance)} />
                      </button>
                    ))}
                  {paymentAccounts.length === 0 ? (
                    <State label="No hay clientes con deuda pendiente." />
                  ) : null}
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
                        onChange={(event) =>
                          setPaymentAmount(event.target.value)
                        }
                        inputMode="decimal"
                        style={{ ...inputStyle, paddingLeft: 30 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(
                          String(paymentApplication.cashToSettle),
                        )
                      }
                      style={softButtonStyle}
                    >
                      Saldar total
                    </button>
                  </div>
                </label>
                <div style={paymentSummaryStyle}>
                  <div>
                    <span>Saldo tarjeta</span>
                    <strong>{money(paymentBalance)}</strong>
                  </div>
                  <div>
                    <span>Saldo efectivo</span>
                    <strong>{money(paymentCashBalance)}</strong>
                  </div>
                  <div>
                    <span>Pago</span>
                    <strong>
                      {Number.isFinite(paymentAmountNumber)
                        ? money(Math.max(paymentAmountNumber, 0))
                        : money(0)}
                    </strong>
                  </div>
                  {paymentApplication.discountAmount > 0 ? (
                    <>
                      <div>
                        <span>Descuento</span>
                        <strong>{money(paymentApplication.discountAmount)}</strong>
                      </div>
                      <div>
                        <span>Deuda cancelada</span>
                        <strong>{money(paymentApplication.debtCancelled)}</strong>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <span>Saldo restante</span>
                    <strong>{balanceLabel(paymentRemainingAmount)}</strong>
                  </div>
                </div>
                <label style={fieldGroupStyle}>
                  <span>Metodo de pago</span>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    style={inputStyle}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>
                {showCashDiscountToggle ? (
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={applyCashDiscount}
                      onChange={(event) =>
                        setApplyCashDiscount(event.target.checked)
                      }
                    />
                    <span>Aplicar descuento por efectivo/transferencia</span>
                  </label>
                ) : null}
                <label style={fieldGroupStyle}>
                  <span>Observaciones</span>
                  <textarea
                    value={paymentDescription}
                    onChange={(event) =>
                      setPaymentDescription(event.target.value)
                    }
                    style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                  />
                </label>
                <div style={rowActionsStyle}>
                  <button
                    type="button"
                    onClick={() => setPaymentCustomer(null)}
                    style={softButtonStyle}
                  >
                    Cambiar cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => void registerPayment()}
                    disabled={savingPayment}
                    style={primaryButtonStyle}
                  >
                    {savingPayment ? "Registrando..." : "Confirmar pago"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModalOpen(false);
                      setPaymentCustomer(null);
                      setModalError("");
                    }}
                    style={softButtonStyle}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {editAccount ? (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            setEditAccount(null);
            setModalError("");
          }}
        >
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Editar cuenta</p>
                <h3 style={modalTitleStyle}>
                  {customerName(editAccount.customer)}
                </h3>
              </div>
            </header>
            {modalError ? <p style={errorStyle}>{modalError}</p> : null}
            <div style={twoColumnFormStyle}>
              <Field
                label="Nombre"
                value={editForm.firstName}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, firstName: value }))
                }
              />
              <Field
                label="Apellido"
                value={editForm.lastName}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, lastName: value }))
                }
              />
              <Field
                label="Email"
                value={editForm.email}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, email: value }))
                }
              />
              <Field
                label="Telefono"
                value={editForm.phone}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, phone: value }))
                }
              />
              <Field
                label="Documento"
                value={editForm.document}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, document: value }))
                }
              />
              <label style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                <span>Notas</span>
                <textarea
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                />
              </label>
            </div>
            <div style={rowActionsStyle}>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={savingEdit}
                style={primaryButtonStyle}
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditAccount(null);
                  setModalError("");
                }}
                style={softButtonStyle}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {balanceAccount ? (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            setBalanceAccount(null);
            setModalError("");
          }}
        >
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Ajustar saldo</p>
                <h3 style={modalTitleStyle}>
                  {customerName(balanceAccount.customer)}
                </h3>
              </div>
              <div style={balanceStyle}>
                <BalanceAmount value={Number(balanceAccount.balance)} />
              </div>
            </header>
            {modalError ? <p style={errorStyle}>{modalError}</p> : null}
            <label style={fieldGroupStyle}>
              <span>Nuevo saldo</span>
              <div style={moneyInputWrapStyle}>
                <span style={moneyPrefixStyle}>$</span>
                <input
                  ref={balanceInputRef}
                  value={balanceValue}
                  onChange={(event) => setBalanceValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="-1000 para saldo a favor"
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>
            </label>
            <label style={fieldGroupStyle}>
              <span>Motivo (opcional)</span>
              <textarea
                value={balanceDescription}
                onChange={(event) => setBalanceDescription(event.target.value)}
                style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
              />
            </label>
            <div style={rowActionsStyle}>
              <button
                type="button"
                onClick={() => void saveBalance()}
                disabled={savingBalance}
                style={primaryButtonStyle}
              >
                {savingBalance ? "Guardando..." : "Guardar ajuste"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceAccount(null);
                  setModalError("");
                }}
                style={softButtonStyle}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({
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

export function CurrentAccountCreateModal({
  form,
  error,
  saving,
  onFormChange,
  onSubmit,
  onClose,
}: {
  form: CurrentAccountCreateForm;
  error?: string;
  saving: boolean;
  onFormChange: React.Dispatch<React.SetStateAction<CurrentAccountCreateForm>>;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <header style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Nueva cuenta</p>
            <h3 style={modalTitleStyle}>Agregar cuenta corriente</h3>
          </div>
        </header>
        {error ? <p style={errorStyle}>{error}</p> : null}
        <div style={twoColumnFormStyle}>
          <Field
            label="Nombre"
            value={form.firstName}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, firstName: value }))
            }
          />
          <Field
            label="Apellido"
            value={form.lastName}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, lastName: value }))
            }
          />
          <Field
            label="Email"
            placeholder="Email opcional"
            value={form.email}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, email: value }))
            }
          />
          <Field
            label="Telefono"
            placeholder="Telefono opcional"
            value={form.phone}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, phone: value }))
            }
          />
          <Field
            label="Documento"
            placeholder="Documento opcional"
            value={form.document}
            onChange={(value) =>
              onFormChange((current) => ({ ...current, document: value }))
            }
          />
          <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
            <span>Direccion</span>
            <Field
              label="Calle, numero, piso/depto"
              placeholder="Direccion opcional"
              value={form.address1}
              onChange={(value) =>
                onFormChange((current) => ({ ...current, address1: value }))
              }
            />
            <div style={twoColumnFormStyle}>
              <Field
                label="Localidad"
                placeholder="Localidad opcional"
                value={form.city}
                onChange={(value) =>
                  onFormChange((current) => ({ ...current, city: value }))
                }
              />
              <Field
                label="Codigo postal"
                placeholder="Codigo postal opcional"
                value={form.zip}
                onChange={(value) =>
                  onFormChange((current) => ({ ...current, zip: value }))
                }
              />
            </div>
          </div>
          <label style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
            <span>Notas</span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Notas opcionales"
              style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
            />
          </label>
        </div>
        <div style={rowActionsStyle}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            style={primaryButtonStyle}
          >
            {saving ? "Creando..." : "Crear cuenta"}
          </button>
          <button type="button" onClick={onClose} style={softButtonStyle}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function customerName(customer: Customer) {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    customer.email ||
    customer.phone ||
    `Cliente #${customer.id}`
  );
}

function variantLabel(variant?: MovementVariant) {
  if (!variant) return "";
  const label = [variant.Size, variant.Color, variant.sku]
    .filter(Boolean)
    .join(" · ");
  return label ? `(${label})` : "";
}

function movementLabel(movement: Movement, paymentCancelled = false) {
  if (paymentCancelled) return "Pago anulado";
  if (isPaymentCorrectionMovement(movement)) return "Correccion de pago";
  if (isPaymentCancellationMovement(movement)) return "Anulacion de pago";
  if (isManualSaleCorrectionMovement(movement)) return "Correccion de venta";
  if (isManualSaleCancellationMovement(movement)) return "Anulacion de venta";
  const labels: Record<string, string> = {
    SALE: "Venta a cuenta corriente",
    PAYMENT: "Pago",
    ADJUSTMENT_POSITIVE: "Ajuste positivo",
    ADJUSTMENT_NEGATIVE: "Ajuste negativo",
    CREDIT_NOTE: "Nota de credito",
  };
  return labels[movement.type] ?? movement.type;
}

function movementShortDescription(movement: Movement) {
  const description = movement.description?.trim();
  if (!description) return "Sin descripcion";

  const paymentCorrection = description.match(/^Correccion de pago #(\d+):/);
  if (paymentCorrection?.[1]) return `Pago #${paymentCorrection[1]}`;

  const paymentCancellation = description.match(/^Anulacion de pago #(\d+):/);
  if (paymentCancellation?.[1]) return `Pago #${paymentCancellation[1]}`;

  const saleCorrection = description.match(/^Correccion de venta manual #(\d+):/);
  if (saleCorrection?.[1]) return `Venta #${saleCorrection[1]}`;

  const saleCancellation = description.match(/^Anulacion de venta manual #(\d+)/);
  if (saleCancellation?.[1]) return `Venta #${saleCancellation[1]}`;

  const manualSale = description.match(/^Venta manual #(\d+)/);
  if (manualSale?.[1]) return `Venta #${manualSale[1]}`;

  const creditNote = description.match(/^Devolucion\/cambio manual #(\d+)/);
  if (creditNote?.[1]) return `Devolucion #${creditNote[1]}`;

  return description.length > 42 ? `${description.slice(0, 39).trim()}...` : description;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function balanceState(value: number): "debt" | "credit" | "paid" {
  if (value > 0) return "debt";
  if (value < 0) return "credit";
  return "paid";
}

function balanceLabel(value: number) {
  const state = balanceState(value);
  if (state === "credit") return `A favor ${money(Math.abs(value))}`;
  if (state === "debt") return `Debe ${money(value)}`;
  return "Saldado";
}

function movementAmountLabel(movement: Movement) {
  if (isPaymentCorrectionMovement(movement)) return "Sin importe";
  const amount = Number(movement.amount);
  return money(movement.type === "PAYMENT" ? Math.abs(amount) : amount);
}

function movementAmountBreakdown(
  movement: Movement,
  movements: Movement[],
  discountPercentage: number,
  roundDiscounts: boolean,
) {
  if (isPaymentCorrectionMovement(movement)) {
    return { cash: "Sin importe", card: "Sin importe" };
  }

  const rawAmount = Number(movement.amount);
  const amount = roundCurrency(Math.abs(rawAmount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { cash: "Sin importe", card: "Sin importe" };
  }

  if (movement.paymentMethod?.startsWith("Descuento ")) {
    return {
      cash: "-",
      card: money(rawAmount),
    };
  }

  if (movement.type === "PAYMENT") {
    const linkedDiscount = linkedPaymentDiscountAmount(movement, movements);
    const cardAmount = roundCurrency(amount + linkedDiscount);
    return {
      cash: money(
        isDiscountedCurrentAccountPayment(movement.paymentMethod)
          ? amount
          : resolveMovementCashDisplayAmount(
              movement,
              cardAmount,
              discountPercentage,
              roundDiscounts,
            ),
      ),
      card: money(cardAmount),
    };
  }

  const sign = rawAmount < 0 ? -1 : 1;
  const cardAmount = amount;
  const cashAmount = resolveMovementCashDisplayAmount(
    movement,
    cardAmount,
    discountPercentage,
    roundDiscounts,
  );
  return {
    cash: money(cashAmount * sign),
    card: money(cardAmount * sign),
  };
}

function movementAmountBreakdownLabel(
  movement: Movement,
  movements: Movement[],
  discountPercentage: number,
  roundDiscounts: boolean,
) {
  const breakdown = movementAmountBreakdown(
    movement,
    movements,
    discountPercentage,
    roundDiscounts,
  );
  return `efectivo ${breakdown.cash} tarjeta ${breakdown.card}`;
}

function linkedPaymentDiscountAmount(payment: Movement, movements: Movement[]) {
  return roundCurrency(
    movements
      .filter((movement) => {
        if (movement.cancelledAt) return false;
        if (!movement.paymentMethod?.startsWith("Descuento ")) return false;
        return movement.description?.includes(`(Pago #${payment.id})`) ?? false;
      })
      .reduce((sum, movement) => sum + Math.abs(Number(movement.amount)), 0),
  );
}

function resolveMovementCashDisplayAmount(
  movement: Movement,
  cardAmount: number,
  discountPercentage: number,
  roundDiscounts: boolean,
) {
  const multiplier = getCurrentAccountDiscountMultiplier(discountPercentage);
  if (multiplier <= 0 || multiplier >= 1) return roundCurrency(cardAmount);

  if (roundDiscounts) {
    return resolveMovementCashEquivalent(movement, cardAmount, multiplier);
  }

  return roundCurrency(cardAmount * multiplier);
}

function getCurrentAccountDiscountMultiplier(discountPercentage: number) {
  const safePercentage = Number.isFinite(discountPercentage)
    ? Math.min(Math.max(discountPercentage, 0), 100)
    : 0;
  return Math.max(1 - safePercentage / 100, 0);
}

function movementManualPriceComment(movement: Movement) {
  const description = movement.description?.trim() ?? "";
  const match = description.match(/Precios manuales cargados como .+$/);
  return match?.[0] ?? "";
}

function movementPaymentLabel(movement: Movement) {
  if (isManualSaleCorrectionMovement(movement)) {
    const methodChange = movement.description?.match(/Metodo:\s*(.+?)\s*->\s*(.+?)\.?$/);
    if (methodChange?.[1] && methodChange[2]) {
      return `${methodChange[1].trim()} -> ${methodChange[2].trim().replace(/\.$/, "")}`;
    }
  }

  return movement.paymentMethod || "-";
}

function filterMovements(
  movements: Movement[],
  filter: MovementFilter,
  search: string,
  customer?: Customer | null,
  discountPercentage = 0,
  roundDiscounts = false,
) {
  const normalizedSearch = normalizeSearch(search);

  return movements.filter((movement) => {
    if (filter !== "all" && movementCategory(movement) !== filter) {
      return false;
    }

    if (!normalizedSearch) return true;

    const haystack = normalizeSearch(
      [
        customer ? customerName(customer) : "",
        movementLabel(movement),
        movementShortDescription(movement),
        movementPaymentLabel(movement),
        movement.paymentMethod,
        movement.description,
        movementManualPriceComment(movement),
        movement.order ? `venta ${movement.order.id}` : "",
        movement.order?.items
          ?.map((item) =>
            [
              item.variant?.product?.title,
              item.variant?.sku,
              item.variant?.Size,
              item.variant?.Color,
              item.quantity,
              item.price,
            ]
              .filter(Boolean)
              .join(" "),
          )
          .join(" "),
        movementAmountLabel(movement),
        movementAmountBreakdownLabel(
          movement,
          movements,
          discountPercentage,
          roundDiscounts,
        ),
        balanceLabel(Number(movement.balanceAfter)),
      ]
        .filter(Boolean)
        .join(" "),
    );

    return haystack.includes(normalizedSearch);
  });
}

function movementCategory(movement: Movement): MovementFilter {
  if (isPaymentCorrectionMovement(movement) || isManualSaleCorrectionMovement(movement)) {
    return "corrections";
  }
  if (isPaymentCancellationMovement(movement) || isManualSaleCancellationMovement(movement)) {
    return "cancellations";
  }
  if (movement.type === "PAYMENT") return "payments";
  if (movement.type === "SALE" || movement.order) return "sales";
  return "all";
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getCancelledPaymentIds(movements: Movement[]) {
  const ids = new Set<number>();
  for (const movement of movements) {
    if (movement.cancelledAt || movement.cancellationMovementId) {
      ids.add(movement.id);
    }
    if (movement.paymentMethod !== "Anulacion de pago") continue;
    const match = movement.description?.match(/^Anulacion de pago #(\d+):/);
    if (match?.[1]) ids.add(Number(match[1]));
  }
  return ids;
}

function isPaymentCorrectionMovement(movement: Movement) {
  return (
    movement.paymentMethod === "Auditoria" &&
    movement.description?.startsWith("Correccion de pago #") &&
    Number(movement.amount) === 0
  );
}

function isPaymentCancellationMovement(movement: Movement) {
  return (
    movement.paymentMethod === "Anulacion de pago" &&
    movement.description?.startsWith("Anulacion de pago #")
  );
}

function isManualSaleCorrectionMovement(movement: Movement) {
  return movement.description?.startsWith("Correccion de venta manual #") ?? false;
}

function isManualSaleCancellationMovement(movement: Movement) {
  return movement.description?.startsWith("Anulacion de venta manual #") ?? false;
}

function parsePaymentAmount(value: string) {
  const raw = value.trim().replace(/\s/g, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized);
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundCurrencyUpToHundred(value: number) {
  return Math.ceil(Math.max(value, 0) / 100) * 100;
}

function calculatePaymentApplication(
  amount: number,
  balance: number,
  paymentMethod: string,
  discountPercentage: number,
  roundDiscounts: boolean,
  movements?: Movement[],
) {
  const safeAmount = roundCurrency(
    Number.isFinite(amount) ? Math.max(amount, 0) : 0,
  );
  const safeBalance = roundCurrency(Math.max(Number(balance || 0), 0));
  const eligibleMethod = isDiscountedAdministrativePaymentMethod(paymentMethod);
  const safePercentage = Number.isFinite(discountPercentage)
    ? Math.min(Math.max(discountPercentage, 0), 100)
    : 0;

  if (!eligibleMethod || safePercentage <= 0 || safePercentage >= 100) {
    const debtCancelled = roundCurrency(Math.min(safeAmount, safeBalance));
    return {
      cashReceived: safeAmount,
      discountAmount: 0,
      debtCancelled,
      remainingBalance: roundCurrency(Math.max(safeBalance - debtCancelled, 0)),
      cashToSettle: safeBalance,
    };
  }

  const multiplier = 1 - safePercentage / 100;
  const buckets =
    roundDiscounts && movements?.length
      ? buildPaymentBuckets(movements, multiplier)
      : [];
  const bucketDebt = roundCurrency(
    buckets.reduce((sum, bucket) => sum + bucket.debt, 0),
  );
  const useBuckets = buckets.length > 0 && Math.abs(bucketDebt - safeBalance) <= 1;
  const cashToSettle = useBuckets
    ? roundCurrency(buckets.reduce((sum, bucket) => sum + bucket.cash, 0))
    : roundDiscounts
      ? roundCurrencyUpToHundred(safeBalance * multiplier)
      : roundCurrency(safeBalance * multiplier);
  const rawDebtCancelled =
    safeAmount >= cashToSettle
      ? safeBalance
      : useBuckets
        ? allocateCashAcrossBuckets(
            buckets.map((bucket) => ({ ...bucket })),
            safeAmount,
          )
        : roundDiscounts
          ? roundToNearestHundred(safeAmount / multiplier)
          : roundCurrency(safeAmount / multiplier);
  const debtCancelled = roundCurrency(
    Math.min(Math.max(rawDebtCancelled, safeAmount), safeBalance),
  );

  return {
    cashReceived: safeAmount,
    discountAmount: roundCurrency(Math.max(debtCancelled - safeAmount, 0)),
    debtCancelled,
    remainingBalance: roundCurrency(Math.max(safeBalance - debtCancelled, 0)),
    cashToSettle,
  };
}

function buildPaymentBuckets(movements: Movement[], multiplier: number) {
  const buckets: Array<{ debt: number; cash: number }> = [];
  const orderedMovements = [...movements].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  for (const movement of orderedMovements) {
    if (movement.cancelledAt) continue;
    const movementAmount = roundCurrency(Number(movement.amount));

    if (movementAmount > 0) {
      buckets.push({
        debt: movementAmount,
        cash: resolveMovementCashEquivalent(movement, movementAmount, multiplier),
      });
      continue;
    }

    if (movement.type === "PAYMENT") {
      if (isDiscountedCurrentAccountPayment(movement.paymentMethod)) {
        allocateCashAcrossBuckets(buckets, Math.abs(movementAmount));
      } else {
        allocateDebtAcrossBuckets(buckets, Math.abs(movementAmount));
      }
      continue;
    }

    if (movement.paymentMethod?.startsWith("Descuento ")) continue;

    allocateDebtAcrossBuckets(buckets, Math.abs(movementAmount));
  }

  return buckets.filter((bucket) => bucket.debt > 0.01 && bucket.cash > 0.01);
}

function resolveMovementCashEquivalent(
  movement: Movement,
  movementAmount: number,
  multiplier: number,
) {
  if (movement.type === "SALE" && movement.order?.items?.length) {
    const orderTotal = roundCurrency(Number(movement.order.total ?? movementAmount));
    const itemCashTotal = movement.order.items.reduce((sum, item) => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.price ?? 0);
      return sum + roundToNearestHundred(unitPrice * multiplier) * quantity;
    }, 0);

    if (orderTotal > 0 && Math.abs(orderTotal - movementAmount) > 0.01) {
      return roundToNearestHundred(itemCashTotal * (movementAmount / orderTotal));
    }

    return roundCurrency(itemCashTotal);
  }

  return roundCurrencyUpToHundred(movementAmount * multiplier);
}

function isDiscountedCurrentAccountPayment(paymentMethod?: string | null) {
  return isDiscountedAdministrativePaymentMethod(paymentMethod);
}

function allocateCashAcrossBuckets(
  buckets: Array<{ debt: number; cash: number }>,
  cashAmount: number,
) {
  let remainingCash = roundCurrency(Math.max(cashAmount, 0));
  let debtCancelled = 0;

  for (const bucket of buckets) {
    if (remainingCash <= 0 || bucket.cash <= 0 || bucket.debt <= 0) continue;
    const cashPart = Math.min(remainingCash, bucket.cash);
    const debtPart =
      cashPart >= bucket.cash
        ? bucket.debt
        : roundToNearestHundred(cashPart * (bucket.debt / bucket.cash));
    const cappedDebtPart = roundCurrency(Math.min(debtPart, bucket.debt));
    bucket.cash = roundCurrency(Math.max(bucket.cash - cashPart, 0));
    bucket.debt = roundCurrency(Math.max(bucket.debt - cappedDebtPart, 0));
    remainingCash = roundCurrency(remainingCash - cashPart);
    debtCancelled = roundCurrency(debtCancelled + cappedDebtPart);
  }

  return debtCancelled;
}

function allocateDebtAcrossBuckets(
  buckets: Array<{ debt: number; cash: number }>,
  debtAmount: number,
) {
  let remainingDebt = roundCurrency(Math.max(debtAmount, 0));

  for (const bucket of buckets) {
    if (remainingDebt <= 0 || bucket.debt <= 0) continue;
    const debtPart = Math.min(remainingDebt, bucket.debt);
    const cashPart =
      debtPart >= bucket.debt
        ? bucket.cash
        : roundToNearestHundred(debtPart * (bucket.cash / bucket.debt));
    bucket.debt = roundCurrency(Math.max(bucket.debt - debtPart, 0));
    bucket.cash = roundCurrency(Math.max(bucket.cash - cashPart, 0));
    remainingDebt = roundCurrency(remainingDebt - debtPart);
  }
}

function appendStoreLocationParam(
  params: URLSearchParams,
  storeLocationId?: number | null,
) {
  if (storeLocationId) {
    params.set("storeLocationId", String(storeLocationId));
  }
}

function currentAccountCustomerPath(
  customerId: number,
  storeLocationId?: number | null,
) {
  const params = new URLSearchParams();
  appendStoreLocationParam(params, storeLocationId);
  const query = params.toString();
  return `/current-accounts/customers/${customerId}${query ? `?${query}` : ""}`;
}

function emptyAccountsLabel(status: FilterStatus) {
  if (status === "debt") return "No hay clientes con deuda pendiente.";
  if (status === "credit") return "No hay clientes con saldo a favor.";
  if (status === "paid") return "No hay cuentas saldadas.";
  return "No hay cuentas para este filtro.";
}

function BalanceAmount({ value }: { value: number }) {
  const state = balanceState(value);
  return <span style={balanceAmountStyle(state)}>{balanceLabel(value)}</span>;
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

function SmallIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <SmallIcon>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </SmallIcon>
  );
}

function EditIcon() {
  return (
    <SmallIcon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
    </SmallIcon>
  );
}

function CancelIcon() {
  return (
    <SmallIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </SmallIcon>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 20 };
const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  alignItems: "flex-start",
};
const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: 11,
  color: "var(--account-text-soft)",
};
const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  color: "var(--account-text-strong)",
};
const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "var(--account-text-strong)",
};
const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-muted)",
  lineHeight: 1.5,
};
const statsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
const statStyle: React.CSSProperties = {
  minWidth: 140,
  padding: 16,
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  display: "grid",
  gap: 6,
};
const balanceAmountStyle = (
  state: "debt" | "credit" | "paid",
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  maxWidth: "100%",
  padding: "7px 10px",
  borderRadius: 999,
  border:
    state === "credit"
      ? "1px solid var(--admin-tone-success-border)"
      : "1px solid var(--account-item-border)",
  background:
    state === "credit"
      ? "var(--admin-tone-success-bg)"
      : state === "debt"
        ? "var(--account-item-bg-active)"
        : "var(--account-sidebar-bg)",
  color:
    state === "credit"
      ? "var(--admin-tone-success-color)"
      : "var(--account-text-strong)",
  fontWeight: 800,
  whiteSpace: "nowrap",
});
const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: 14,
  borderRadius: 14,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
};
const toolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  padding: "10px 12px",
};
const segmentedStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: 4,
  borderRadius: 14,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const segmentButtonStyle = (active: boolean): React.CSSProperties => ({
  border: 0,
  borderRadius: 10,
  padding: "10px 12px",
  background: active ? "var(--account-item-bg-active)" : "transparent",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  fontWeight: 700,
});
const tableShellStyle: React.CSSProperties = {
  overflowX: "auto",
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 860,
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  fontSize: 12,
  color: "var(--account-text-soft)",
  borderBottom: "1px solid var(--account-item-border)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};
const tdStyle: React.CSSProperties = {
  padding: "14px",
  borderBottom: "1px solid var(--account-item-border)",
  color: "var(--account-text-strong)",
  verticalAlign: "top",
};
const mutedBlockStyle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "var(--account-text-muted)",
  fontSize: 12,
};
const rowActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  padding: 12,
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const detailModeRailStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  padding: 8,
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const detailModeButtonStyle = (active: boolean): React.CSSProperties => ({
  border: active
    ? "1px solid var(--account-item-border)"
    : "1px solid transparent",
  borderRadius: 12,
  background: active ? "var(--account-item-bg-active)" : "transparent",
  color: "var(--account-text-strong)",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 40,
});
const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  background: "var(--account-item-bg-active)",
  color: "var(--account-text-strong)",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 42,
};
const softButtonStyle: React.CSSProperties = {
  border: "1px solid var(--account-item-border)",
  borderRadius: 12,
  background: "var(--account-sidebar-bg)",
  color: "var(--account-text-strong)",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: 700,
  minHeight: 42,
};
const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid var(--admin-danger-border)",
  borderRadius: 12,
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  padding: "10px 13px",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 42,
};
const cancelledBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 36,
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-muted)",
  fontWeight: 800,
};
const stateStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-muted)",
};
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 220,
  background: "var(--admin-overlay-bg, rgba(0,0,0,.42))",
  display: "grid",
  placeItems: "center",
  padding: "28px 16px 16px",
};
const modalStyle: React.CSSProperties = {
  position: "relative",
  width: "min(780px, 100%)",
  maxHeight: "min(760px, calc(100vh - 32px))",
  overflow: "auto",
  borderRadius: 22,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-sidebar-bg)",
  padding: "38px 24px 24px",
  display: "grid",
  gap: 16,
  boxShadow: "var(--admin-modal-shadow)",
};
const detailModalStyle: React.CSSProperties = {
  ...modalStyle,
  width: "min(1180px, 100%)",
  maxHeight: "min(880px, calc(100vh - 32px))",
};
const modalCloseButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  fontSize: 22,
  lineHeight: "32px",
  display: "grid",
  placeItems: "center",
};
const modalHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 18,
  alignItems: "stretch",
  padding: 16,
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const balanceStyle: React.CSSProperties = {
  color: "var(--account-text-strong)",
  fontSize: 24,
  minWidth: 150,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-sidebar-bg)",
  display: "grid",
  placeItems: "center end",
  alignSelf: "stretch",
};
const movementListStyle: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid var(--account-item-border)",
  borderRadius: 14,
  background: "var(--account-item-bg)",
};
const movementHistoryStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};
const movementToolbarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
  gap: 10,
  alignItems: "center",
};
const movementFilterGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};
const filterChipStyle = (active: boolean): React.CSSProperties => ({
  border: active
    ? "1px solid var(--account-item-border)"
    : "1px solid transparent",
  borderRadius: 999,
  background: active ? "var(--account-item-bg-active)" : "transparent",
  color: "var(--account-text-strong)",
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 850,
});
const movementSearchStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 36,
  borderRadius: 10,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-sidebar-bg)",
  color: "var(--account-text-strong)",
  padding: "8px 10px",
  fontSize: 12,
  outline: "none",
};
const emptyMovementsStyle: React.CSSProperties = {
  padding: 16,
  color: "var(--account-text-muted)",
  fontSize: 13,
};
const movementTableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 1140,
  borderCollapse: "collapse",
  tableLayout: "fixed",
};
const movementThStyle: React.CSSProperties = {
  padding: "9px 10px",
  borderBottom: "1px solid var(--account-item-border)",
  background: "var(--account-sidebar-bg)",
  color: "var(--account-text-muted)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 0,
  textAlign: "left",
  textTransform: "uppercase",
};
const movementThRightStyle: React.CSSProperties = {
  ...movementThStyle,
  textAlign: "right",
};
const movementTrStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--account-item-border)",
};
const movementTdStyle: React.CSSProperties = {
  padding: "8px 10px",
  color: "var(--account-text-strong)",
  fontSize: 12,
  lineHeight: 1.28,
  verticalAlign: "top",
};
const movementDetailTdStyle: React.CSSProperties = {
  ...movementTdStyle,
  color: "var(--account-text-muted)",
};
const movementTdRightStyle: React.CSSProperties = {
  ...movementTdStyle,
  textAlign: "right",
  whiteSpace: "nowrap",
};
const movementActionsTdStyle: React.CSSProperties = {
  ...movementTdStyle,
  textAlign: "right",
};
const movementActionsStyle: React.CSSProperties = {
  display: "inline-flex",
  justifyContent: "flex-end",
  gap: 6,
  flexWrap: "wrap",
};
const compactIconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  display: "inline-grid",
  placeItems: "center",
  border: "1px solid var(--account-item-border)",
  borderRadius: 9,
  background: "var(--account-sidebar-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
};
const compactDangerIconButtonStyle: React.CSSProperties = {
  ...compactIconButtonStyle,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
};
const compactButtonStyle: React.CSSProperties = {
  border: "1px solid var(--account-item-border)",
  borderRadius: 10,
  background: "var(--account-sidebar-bg)",
  color: "var(--account-text-strong)",
  padding: "7px 9px",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 800,
};
const compactDangerButtonStyle: React.CSSProperties = {
  ...compactButtonStyle,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
};
const movementItemsStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  marginTop: 4,
  color: "var(--account-text-muted)",
  fontSize: 11,
};
const manualPriceNoteStyle: React.CSSProperties = {
  display: "block",
  marginTop: 6,
  color: "var(--account-text-strong)",
  fontSize: 11,
  lineHeight: 1.35,
};
const fieldGroupStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  color: "var(--account-text-muted)",
  fontWeight: 700,
};
const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
  fontWeight: 700,
};
const amountRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
};
const moneyInputWrapStyle: React.CSSProperties = {
  position: "relative",
  minWidth: 0,
};
const moneyPrefixStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--account-text-muted)",
  fontWeight: 800,
  pointerEvents: "none",
};
const paymentSummaryStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  padding: 14,
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-muted)",
};
const paymentCustomerListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  maxHeight: 320,
  overflow: "auto",
};
const paymentCustomerOptionStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  border: "1px solid var(--account-item-border)",
  borderRadius: 14,
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  padding: 14,
  cursor: "pointer",
  textAlign: "left",
};
const inlinePaymentStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const embeddedSaleStyle: React.CSSProperties = {
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const twoColumnFormStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};
