"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import {
  money,
  type CustomerOrder,
} from "./order-utils";
import AdminProductsSection, {
  scopeCategoriesToActiveStore,
  type Category,
  type Product,
} from "./admin-products/AdminProductsSection";
import AdminCustomersSection, { type Customer } from "./admin-customers/AdminCustomersSection";
import AdminCurrentAccountsSection, { CurrentAccountCreateModal, type CurrentAccountCreateForm } from "./AdminCurrentAccountsSection";
import AdminCashRegisterSection, { SalesHistoryModal } from "./AdminCashRegisterSection";
import AdminManualSalesSection, { type ManualSaleCustomer } from "./AdminManualSalesSection";
import ManualReturnsPanel, { type ManualReturnDraft } from "@/components/manual-sales/ManualReturnsPanel";
import AdminAccountingSection from "./admin-accounting/AdminAccountingSection";
import AdminOrdersPanelSection from "./admin-orders/AdminOrdersPanelSection";
import AdminShipmentsSection from "./AdminShipmentsSection";
import AdminReturnsSection from "./AdminReturnsSection";
import AdminPromotionsSection from "./AdminPromotionsSection";
import AdminLabelsGenerator from "./AdminLabelsGenerator";
import AdminStockSection from "./AdminStockSection";
import DeveloperModePanel from "./DeveloperModePanel";
import type { AdminReturn, AdminSection, AdminShipment } from "./admin-types";

type Props = {
  section: AdminSection;
  user: {
    id: number;
    email: string;
    storeId?: number;
    role?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    name?: string | null;
  };
  onSectionChange: (section: AdminSection) => void;
};


const operationalPendingStatuses = new Set([
  "pending",
  "paid",
  "processing",
  "packed",
]);

type ManualSalesTab = "dashboard" | "sale" | "current-accounts" | "returns" | "cash-register";

type ManualCashSummary = {
  openingAmount: number;
  receivedTotal: number;
  expectedAmount: number;
  movementCount: number;
  accountAssignedTotal?: number;
  accountAssignedCount?: number;
};

type ManualCashPayload = {
  mode: "automatic" | "manual";
  session: { id: number; openedAt: string; closedAt?: string | null } | null;
  summary: ManualCashSummary | null;
};

type ManualDashboardSale = {
  id: number;
  status: string;
  createdAt: string;
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
  payments?: Array<{ method?: string | null; provider?: string | null; status: string }>;
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

type ManualDashboardReturn = {
  id: number;
  customerName?: string | null;
  createdAt: string;
  totalReturned: string | number;
  totalExchange: string | number;
  items?: Array<{
    id: number;
    kind: "returned" | "exchange" | string;
    quantity: number;
    price: string | number;
    variant?: {
      sku?: string | null;
      Size?: string | null;
      Color?: string | null;
      product?: { title: string } | null;
    } | null;
  }>;
};

type ManualDashboardCurrentAccount = {
  id: number;
  customerId: number;
  balance: string | number;
  createdAt?: string | null;
  lastMovementAt?: string | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
  } | null;
  movements?: Array<{
    id: number;
    type: string;
    amount: string | number;
    paymentMethod?: string | null;
    description?: string | null;
    createdAt: string;
    balanceAfter: string | number;
  }>;
};

type ManualDashboardComment = {
  id: string;
  createdAt: string;
  text: string;
  tone: "sale" | "return" | "exchange" | "account";
};

export default function AdminWorkspace({
  section,
  user,
  onSectionChange,
}: Props) {
  if (section === "admin-developer")
    return (
      <AdminDeveloperSection
        user={user}
        onBack={() => onSectionChange("admin-overview")}
      />
    );
  if (section === "admin-accounting") return <AdminAccountingSection />;
  if (section === "admin-manual-sales") return <AdminManualSalesWorkspace />;
  if (section === "admin-products") return <AdminProductsSection userRole={user.role} />;
  if (section === "admin-stock") return <AdminStockSection userRole={user.role} />;
  if (section === "admin-labels") return <AdminLabelsSection />;
  if (section === "admin-categories")
    return <AdminProductsSection initialTab="categories" userRole={user.role} />;
  if (section === "admin-orders") return <AdminOrdersPanelSection />;
  if (section === "admin-customers") return <AdminCustomersSection />;
  if (section === "admin-current-accounts") return <AdminManualSalesWorkspace initialTab="current-accounts" />;
  if (section === "admin-shipments") return <AdminShipmentsSection />;
  if (section === "admin-returns") return <AdminReturnsSection />;
  if (section === "admin-promotions") return <AdminPromotionsSection />;
  if (section === "admin-settings") return <AdminSettingsSection />;
  return (
    <AdminOverviewSection
      onOpenDeveloper={() => onSectionChange("admin-developer")}
    />
  );
}

function AdminManualSalesWorkspace({
  initialTab = "dashboard",
}: {
  initialTab?: ManualSalesTab;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ManualSalesTab>(initialTab);
  const [initialSaleCustomer, setInitialSaleCustomer] = useState<ManualSaleCustomer | null>(null);
  const [initialReturnDraft, setInitialReturnDraft] = useState<ManualReturnDraft | null>(null);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(user?.storeLocationId ?? null);
  const canSelectLocation = user?.role === "ADMIN" || user?.role === "OWNER" || user?.role === "SUPER_ADMIN";
  useEffect(() => {
    let mounted = true;

    const loadLocations = async () => {
      try {
        const payload = await api("/store-locations") as StoreLocationsPayload;
        if (!mounted) return;
        const activeLocations = (payload.locations ?? []).filter((location) => location.active);
        setLocations(activeLocations);
        setSelectedLocationId((current) => current ?? user?.storeLocationId ?? activeLocations[0]?.id ?? null);
      } catch {
        if (mounted) {
          setLocations([]);
        }
      }
    };

    if (canSelectLocation) {
      void loadLocations();
    } else {
      const nextLocationId = user?.storeLocationId ?? null;
      queueMicrotask(() => {
        if (mounted) {
          setSelectedLocationId(nextLocationId);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [canSelectLocation, user?.storeLocationId]);

  const startCurrentAccountSale = (customer: ManualSaleCustomer) => {
    setInitialSaleCustomer({ ...customer, source: "current_account" });
    setActiveTab("sale");
  };

  const startManualReturn = (draft: ManualReturnDraft) => {
    setInitialReturnDraft(draft);
    setActiveTab("returns");
  };

  return (
    <section style={manualSalesBoutiqueShellStyle} data-account-panel>
      <style>
        {`
          .manual-sales-top-tab {
            border-radius: 0 !important;
            transition: color 160ms ease, box-shadow 160ms ease;
          }

          .manual-sales-top-tab:hover {
            background: transparent !important;
            color: #1F6F5B !important;
            box-shadow: inset 0 -2px 0 rgba(94, 156, 141, 0.36) !important;
          }

          .manual-sales-top-tab[aria-selected="true"] {
            background: transparent !important;
            box-shadow: inset 0 -3px 0 #5E9C8D !important;
          }
        `}
      </style>
      <div style={manualSalesTopbarStyle}>
        <div style={manualSalesTopbarCenterStyle}>
          <div style={manualSalesNavStyle} role="tablist" aria-label="Venta manual">
            {[
              ["dashboard", "Inicio"],
              ["sale", "Venta manual"],
              ["current-accounts", "Cuentas corrientes"],
              ["cash-register", "Caja"],
              ["returns", "Devoluciones"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                className="manual-sales-top-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                style={workspaceTabStyle(activeTab === tab)}
                onClick={() => setActiveTab(tab as ManualSalesTab)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={manualSalesTopbarActionsStyle}>
          {canSelectLocation && locations.length > 0 ? (
            <label style={manualSalesLocationStyle}>
              <span>Local</span>
              <select
                value={selectedLocationId ?? ""}
                onChange={(event) => setSelectedLocationId(Number(event.target.value) || null)}
                style={manualSalesLocationSelectStyle}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div role="tabpanel">
        {activeTab === "dashboard" ? (
          <ManualSalesDashboard
            storeLocationId={selectedLocationId}
            onOpenSale={() => setActiveTab("sale")}
            onOpenCash={() => setActiveTab("cash-register")}
            onOpenReturns={() => setActiveTab("returns")}
            onOpenAccounts={() => setActiveTab("current-accounts")}
            onGenerateReturn={startManualReturn}
          />
        ) : null}
        {activeTab === "sale" ? (
          <AdminManualSalesSection
            storeLocationId={selectedLocationId}
            initialCustomer={initialSaleCustomer}
            initialPaymentMethod={initialSaleCustomer ? "Cuenta corriente" : undefined}
          />
        ) : null}
        {activeTab === "current-accounts" ? (
          <AdminCurrentAccountsSection storeLocationId={selectedLocationId} onRegisterSale={startCurrentAccountSale} />
        ) : null}
        {activeTab === "returns" ? (
          <ManualReturnsPanel storeLocationId={selectedLocationId} initialDraft={initialReturnDraft} />
        ) : null}
        {activeTab === "cash-register" ? (
          <AdminCashRegisterSection storeLocationId={selectedLocationId} onGenerateReturn={startManualReturn} />
        ) : null}
      </div>
    </section>
  );
}

function ManualSalesDashboard({
  storeLocationId,
  onOpenSale,
  onOpenCash,
  onOpenReturns,
  onOpenAccounts,
  onGenerateReturn,
}: {
  storeLocationId?: number | null;
  onOpenSale: () => void;
  onOpenCash: () => void;
  onOpenReturns: () => void;
  onOpenAccounts: () => void;
  onGenerateReturn?: (draft: ManualReturnDraft) => void;
}) {
  const [cash, setCash] = useState<ManualCashPayload | null>(null);
  const [sales, setSales] = useState<ManualDashboardSale[]>([]);
  const [returns, setReturns] = useState<ManualDashboardReturn[]>([]);
  const [currentAccounts, setCurrentAccounts] = useState<ManualDashboardCurrentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [salesHistoryOpen, setSalesHistoryOpen] = useState(false);
  const [salesHistorySearch, setSalesHistorySearch] = useState("");
  const [salesHistoryLoading, setSalesHistoryLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState<CurrentAccountCreateForm>({
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

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const [cashPayload, salesPayload, returnsPayload, currentAccountsPayload] = await Promise.all([
          api(manualStoreLocationPath("/cash-register/current", storeLocationId)),
          api(manualStoreLocationPath("/orders/manual/list", storeLocationId)),
          api(manualStoreLocationPath("/returns/manual", storeLocationId)),
          api(manualStoreLocationPath("/current-accounts", storeLocationId)),
        ]);

        if (!mounted) return;
        setCash(cashPayload as ManualCashPayload);
        setSales(Array.isArray(salesPayload) ? (salesPayload as ManualDashboardSale[]) : []);
        setReturns(Array.isArray(returnsPayload) ? (returnsPayload as ManualDashboardReturn[]) : []);
        setCurrentAccounts(Array.isArray(currentAccountsPayload) ? (currentAccountsPayload as ManualDashboardCurrentAccount[]) : []);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el resumen del mostrador.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [storeLocationId]);

  const todaySales = useMemo(() => sales.filter((sale) => sale.status !== "cancelled" && isToday(sale.createdAt)), [sales]);
  const todayReturns = useMemo(() => returns.filter((entry) => isToday(entry.createdAt)), [returns]);
  const comments = useMemo(() => buildManualDashboardComments(todaySales, todayReturns, currentAccounts), [currentAccounts, todaySales, todayReturns]);
  const accountSalesCount = todaySales.filter((sale) => salePaymentMethod(sale) === "Cuenta corriente").length;
  const cashSummary = cash?.summary ?? null;
  const salesTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
  const isManualCash = cash?.mode === "manual";

  const openCreateAccount = () => {
    setAccountForm({ firstName: "", lastName: "", email: "", phone: "", document: "", address1: "", city: "", zip: "", notes: "" });
    setCreateAccountError("");
    setCreateAccountOpen(true);
  };

  const loadSalesHistory = async () => {
    setSalesHistoryLoading(true);
    setError("");
    try {
      const salesPayload = await api(manualStoreLocationPath("/orders/manual/list", storeLocationId));
      setSales(Array.isArray(salesPayload) ? (salesPayload as ManualDashboardSale[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial de ventas.");
    } finally {
      setSalesHistoryLoading(false);
    }
  };

  const openSalesHistory = () => {
    setSalesHistoryOpen(true);
    void loadSalesHistory();
  };

  const createCurrentAccount = async () => {
    if (!accountForm.firstName.trim() && !accountForm.lastName.trim()) {
      setCreateAccountError("Carga el nombre o apellido del cliente.");
      return;
    }

    setSavingAccount(true);
    setCreateAccountError("");
    try {
      const hasAddress = [accountForm.address1, accountForm.city, accountForm.zip].some((value) => value.trim());
      await api("/current-accounts", {
        method: "POST",
        body: JSON.stringify({
          firstName: accountForm.firstName.trim() || undefined,
          lastName: accountForm.lastName.trim() || undefined,
          email: accountForm.email.trim() || undefined,
          phone: accountForm.phone.trim() || undefined,
          document: accountForm.document.trim() || undefined,
          notes: accountForm.notes.trim() || undefined,
          storeLocationId: storeLocationId ?? undefined,
          address: hasAddress
            ? {
                address1: accountForm.address1.trim() || undefined,
                city: accountForm.city.trim() || undefined,
                zip: accountForm.zip.trim() || undefined,
              }
            : undefined,
        }),
      });
      setCreateAccountOpen(false);
      setAccountForm({ firstName: "", lastName: "", email: "", phone: "", document: "", address1: "", city: "", zip: "", notes: "" });
    } catch (err) {
      setCreateAccountError(getErrorMessage(err, "No se pudo crear la cuenta corriente."));
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <section style={dashboardShellStyle}>
      {error ? <p style={errorStyle}>{error}</p> : null}
      {loading ? <StateCard label="Cargando resumen del mostrador..." /> : null}

      {!loading ? (
        <>
          <div style={dashboardStatsStyle}>
            <DashboardStat tone="cash" icon={<WalletIcon />} label="Recibido en caja" value={money(cashSummary?.receivedTotal ?? 0)} detail={`${cashSummary?.movementCount ?? 0} movimientos`} />
            <DashboardStat tone="sale" icon={<CartIcon />} label="Ventas del dia" value={money(salesTotal)} detail={`${todaySales.length} operaciones`} />
            <DashboardStat tone="account" icon={<PeopleIcon />} label="Cuenta corriente" value={money(cashSummary?.accountAssignedTotal ?? 0)} detail={`${accountSalesCount} ventas a cuenta`} />
            <DashboardStat tone="return" icon={<ReturnIcon />} label="Devoluciones / cambios" value={String(todayReturns.length)} detail={money(todayReturns.reduce((sum, entry) => sum + Math.abs(Number(entry.totalReturned ?? 0) - Number(entry.totalExchange ?? 0)), 0))} />
          </div>

          <section style={dashboardCardStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={manualSalesSectionKickerStyle}>Atajos diarios</p>
                <h3 style={dashboardSectionTitleStyle}>Trabajo rapido</h3>
              </div>
              {isManualCash ? (
                <button type="button" style={secondaryButtonStyle} onClick={onOpenCash}>Abrir caja</button>
              ) : null}
            </div>
            <div style={dashboardQuickActionsStyle}>
              <QuickActionButton icon={<TagIcon />} title="Registrar venta" description="Nueva venta rapida" onClick={onOpenSale} />
              <QuickActionButton icon={<PersonAddIcon />} title="Crear cuenta corriente" description="Nuevo cliente" onClick={openCreateAccount} />
              <QuickActionButton icon={<ClockIcon />} title="Historial de ventas" description="Ver ventas realizadas" onClick={openSalesHistory} />
            </div>
          </section>

          <section style={dashboardCardStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={manualSalesSectionKickerStyle}>Ultimos movimientos registrados</p>
                <h3 style={dashboardSectionTitleStyle}>Actividad reciente</h3>
              </div>
              <button type="button" style={manualSalesViewAllButtonStyle} onClick={openSalesHistory}>
                <ListIcon />
                Ver todos
              </button>
            </div>
            <div style={dashboardCommentsStyle}>
              {comments.map((comment) => (
                <article key={comment.id} style={dashboardCommentStyle}>
                  <span style={dashboardToneDotStyle(comment.tone)} />
                  <p style={dashboardCommentTextStyle}>{comment.text}</p>
                  <time style={dashboardCommentTimeStyle}>{formatDashboardTime(comment.createdAt)}</time>
                </article>
              ))}
              {!comments.length ? <StateCard label="Todavia no hay ventas, cambios o devoluciones en el dia." /> : null}
            </div>
          </section>

          {createAccountOpen ? (
            <CurrentAccountCreateModal
              form={accountForm}
              error={createAccountError}
              saving={savingAccount}
              onFormChange={setAccountForm}
              onSubmit={() => void createCurrentAccount()}
              onClose={() => { setCreateAccountOpen(false); setCreateAccountError(""); }}
            />
          ) : null}

          {salesHistoryOpen ? (
            <SalesHistoryModal
              salesHistory={sales}
              salesSearch={salesHistorySearch}
              salesLoading={salesHistoryLoading}
              onSearchChange={setSalesHistorySearch}
              onRefresh={loadSalesHistory}
              onClose={() => setSalesHistoryOpen(false)}
              onGenerateReturn={onGenerateReturn}
              onError={setError}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function DashboardStat({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "cash" | "sale" | "account" | "return";
}) {
  return (
    <div style={dashboardStatStyle}>
      <span style={dashboardStatIconStyle(tone)}>{icon}</span>
      <div>
        <span style={dashboardStatLabelStyle}>{label}</span>
        <strong style={dashboardStatValueStyle}>{value}</strong>
        <small style={dashboardStatDetailStyle}>{detail}</small>
      </div>
      <span style={dashboardMiniLineStyle(tone)} />
    </div>
  );
}

function QuickActionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" style={dashboardActionButtonStyle} onClick={onClick}>
      <span style={dashboardActionIconStyle}>{icon}</span>
      <span style={dashboardActionTextStyle}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRightIcon />
    </button>
  );
}

function BoutiqueIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function WalletIcon() {
  return <BoutiqueIcon><path d="M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4z" /><path d="M4 7V5a2 2 0 0 1 2-2h10" /><path d="M17 13h.01" /></BoutiqueIcon>;
}

function CartIcon() {
  return <BoutiqueIcon><path d="M6 6h15l-2 8H8L6 6Z" /><path d="M6 6 5 3H3" /><path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /><path d="M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></BoutiqueIcon>;
}

function PeopleIcon() {
  return <BoutiqueIcon><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M20 21v-2a3 3 0 0 0-2-2.8" /></BoutiqueIcon>;
}

function ReturnIcon() {
  return <BoutiqueIcon><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 1 1 0 12h-1" /></BoutiqueIcon>;
}

function TagIcon() {
  return <BoutiqueIcon><path d="M20 10 12 2H4v8l8 8 8-8Z" /><path d="M7.5 5.5h.01" /></BoutiqueIcon>;
}

function PersonAddIcon() {
  return <BoutiqueIcon><path d="M15 21v-2a4 4 0 0 0-8 0v2" /><path d="M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M19 8v6" /><path d="M16 11h6" /></BoutiqueIcon>;
}

function ClockIcon() {
  return <BoutiqueIcon><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></BoutiqueIcon>;
}

function ArrowRightIcon() {
  return <BoutiqueIcon><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></BoutiqueIcon>;
}

function ListIcon() {
  return <BoutiqueIcon><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></BoutiqueIcon>;
}

function buildManualDashboardComments(
  sales: ManualDashboardSale[],
  returns: ManualDashboardReturn[],
  currentAccounts: ManualDashboardCurrentAccount[],
) {
  const saleComments: ManualDashboardComment[] = sales.map((sale) => {
    const customer = saleCustomerName(sale);
    const hasCustomer = hasSaleCustomer(sale);
    const product = saleProductSummary(sale.items);
    const method = salePaymentMethod(sale);

    return {
      id: `sale-${sale.id}`,
      createdAt: sale.createdAt,
      tone: method === "Cuenta corriente" ? "account" : "sale",
      text: method === "Cuenta corriente"
        ? hasCustomer
          ? `Se realizo la venta en cuenta corriente de ${customer}: ${product}`
          : `Se realizo una venta en cuenta corriente de ${product}`
        : hasCustomer
          ? `${customer} compro ${product} a ${money(Number(sale.total ?? 0))}`
          : `Se realizo la venta de ${product} a ${money(Number(sale.total ?? 0))}`,
    };
  });

  const returnComments: ManualDashboardComment[] = returns.map((entry) => {
    const returned = returnProductSummary(entry.items, "returned");
    const exchange = returnProductSummary(entry.items, "exchange");
    const hasExchange = Number(entry.totalExchange ?? 0) > 0 || exchange !== "sin producto de cambio";
    const customer = entry.customerName?.trim() || "cliente sin nombre";

    return {
      id: `return-${entry.id}`,
      createdAt: entry.createdAt,
      tone: hasExchange ? "exchange" : "return",
      text: hasExchange
        ? `Se realizo un cambio de ${returned} por ${exchange} para ${customer}`
        : `Se realizo una devolucion de ${returned}`,
    };
  });

  const currentAccountComments = buildCurrentAccountDashboardComments(currentAccounts, returns);

  return [...saleComments, ...returnComments, ...currentAccountComments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
}

function buildCurrentAccountDashboardComments(
  accounts: ManualDashboardCurrentAccount[],
  returns: ManualDashboardReturn[],
) {
  const returnById = new Map(returns.map((entry) => [entry.id, entry]));

  return accounts.flatMap((account) => {
    const customer = currentAccountCustomerName(account);
    const createdComment: ManualDashboardComment[] = account.createdAt && isToday(account.createdAt)
      ? [{
          id: `account-created-${account.id}`,
          createdAt: account.createdAt,
          tone: "account",
          text: `Se creo la cuenta corriente de ${customer}`,
        }]
      : [];

    const movementComments = (account.movements ?? [])
      .filter((movement) => isToday(movement.createdAt))
      .map((movement): ManualDashboardComment => {
        const amount = Math.abs(Number(movement.amount ?? 0));
        const type = movement.type?.toUpperCase() ?? "";
        const paymentMethod = movement.paymentMethod?.trim() ?? "";
        const description = movement.description?.trim() ?? "";
        const returnId = extractManualReturnId(description);
        const relatedReturn = returnId ? returnById.get(returnId) : undefined;
        const returned = relatedReturn ? returnProductSummary(relatedReturn.items, "returned") : "producto";

        if (type === "PAYMENT") {
          return {
            id: `account-payment-${account.id}-${movement.id}`,
            createdAt: movement.createdAt,
            tone: "account",
            text: `Se registro un pago de ${money(amount)} en cuenta corriente de ${customer}`,
          };
        }

        if (type === "CREDIT_NOTE" || /saldo a favor/i.test(paymentMethod)) {
          return {
            id: `account-credit-${account.id}-${movement.id}`,
            createdAt: movement.createdAt,
            tone: "return",
            text: `Se realizo una devolucion con saldo a favor de ${money(amount)} por el producto ${returned} en la cuenta corriente de ${customer}`,
          };
        }

        if (type === "SALE") {
          return {
            id: `account-sale-${account.id}-${movement.id}`,
            createdAt: movement.createdAt,
            tone: "account",
            text: `Se realizo una venta en cuenta corriente de ${customer}`,
          };
        }

        return {
          id: `account-movement-${account.id}-${movement.id}`,
          createdAt: movement.createdAt,
          tone: "account",
          text: `Se actualizo la cuenta corriente de ${customer}`,
        };
      });

    return [...createdComment, ...movementComments];
  });
}

function manualStoreLocationPath(path: string, storeLocationId?: number | null) {
  if (!storeLocationId) return path;
  const params = new URLSearchParams();
  params.set("storeLocationId", String(storeLocationId));
  return `${path}?${params.toString()}`;
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function saleCustomerName(sale: ManualDashboardSale) {
  return (
    resolveSaleCustomerName(sale) ||
    "Venta"
  );
}

function hasSaleCustomer(sale: ManualDashboardSale) {
  return Boolean(resolveSaleCustomerName(sale));
}

function resolveSaleCustomerName(sale: ManualDashboardSale) {
  const nameCandidates = [
    [sale.customerFirstNameSnapshot, sale.customerLastNameSnapshot].filter(Boolean).join(" ").trim(),
    [sale.customer?.firstName, sale.customer?.lastName].filter(Boolean).join(" ").trim(),
  ];
  const validName = nameCandidates.find((value) => isRealSaleCustomerLabel(value));

  if (validName) return validName;

  return (
    cleanSaleCustomerContact(sale.customerEmailSnapshot) ||
    cleanSaleCustomerContact(sale.customerPhoneSnapshot) ||
    cleanSaleCustomerContact(sale.customer?.email) ||
    cleanSaleCustomerContact(sale.customer?.phone) ||
    ""
  );
}

function cleanSaleCustomerContact(value?: string | null) {
  const clean = value?.trim() ?? "";
  return clean && isRealSaleCustomerLabel(clean) ? clean : "";
}

function isRealSaleCustomerLabel(value?: string | null) {
  const clean = value?.trim();
  if (!clean) return false;

  const normalized = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized.startsWith("manual-sale@") ||
    normalized.includes("@store-") ||
    normalized.includes("@manual-sale") ||
    normalized.endsWith(".local")
  ) {
    return false;
  }

  return ![
    "venta",
    "cliente",
    "cliente sin nombre",
    "sin cliente",
    "consumidor final",
    "mostrador",
    "venta mostrador",
  ].includes(normalized);
}

function currentAccountCustomerName(account: ManualDashboardCurrentAccount) {
  const customer = account.customer;
  return (
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim() ||
    cleanSaleCustomerContact(customer?.email) ||
    cleanSaleCustomerContact(customer?.phone) ||
    cleanSaleCustomerContact(customer?.document) ||
    `Cliente #${account.customerId}`
  );
}

function extractManualReturnId(value?: string | null) {
  const match = value?.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

function salePaymentMethod(sale: ManualDashboardSale) {
  const payment = sale.payments?.find((entry) => entry.status === "approved" || entry.status === "paid") ?? sale.payments?.[0];
  return payment?.method?.trim() || payment?.provider || "Sin metodo";
}

function saleProductSummary(items?: ManualDashboardSale["items"]) {
  const labels = (items ?? []).slice(0, 2).map((item) => {
    const title = item.variant?.product?.title || "producto";
    return item.quantity > 1 ? `${title} x${item.quantity}` : title;
  });

  if (!labels.length) return "productos sin detalle";
  const rest = Math.max((items?.length ?? 0) - labels.length, 0);
  return `${labels.join(", ")}${rest > 0 ? ` y ${rest} mas` : ""}`;
}

function returnProductSummary(items: ManualDashboardReturn["items"], kind: "returned" | "exchange") {
  const filtered = (items ?? []).filter((item) => item.kind === kind);
  const labels = filtered.slice(0, 2).map((item) => {
    const title = item.variant?.product?.title || "producto";
    return item.quantity > 1 ? `${title} x${item.quantity}` : title;
  });

  if (!labels.length) return kind === "returned" ? "producto sin detalle" : "sin producto de cambio";
  const rest = Math.max(filtered.length - labels.length, 0);
  return `${labels.join(", ")}${rest > 0 ? ` y ${rest} mas` : ""}`;
}

function formatDashboardTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

type AdminPaymentConfig = {
  bankTransfer?: {
    alias?: string | null;
    discountPercentage?: number | null;
  } | null;
};

type PriceMode = "normal" | "transfer" | "both" | "none";
type LabelOptions = {
  showPrice: boolean;
  priceMode: PriceMode;
  showStoreName: boolean;
  showProductName: boolean;
  showVariantName: boolean;
  showSku: boolean;
  showLogo: boolean;
};
type LabelTemplate = {
  key: string;
  name: string;
  continuous?: boolean;
  fields?: string[];
  priceOptions?: PriceMode[];
  label: { widthMm: number; heightMm: number };
};
type LabelTemplatesPayload = {
  templates: LabelTemplate[];
  priceSettings: {
    hasTransferPrice: boolean;
    bankTransferDiscountPercentage: number;
  };
};
type DefaultLabelPayload = {
  defaultLabel: {
    template: string;
    options: LabelOptions;
    templateOptions?: Record<string, LabelOptions>;
    quantityMode?: "one" | "stock";
  };
};
type StoreLocation = {
  id: number;
  name: string;
  address?: string | null;
  active: boolean;
  _count?: {
    users?: number;
    cashRegisterSessions?: number;
    orders?: number;
    currentAccounts?: number;
  };
};
type StoreLocationUser = {
  id: number;
  email: string;
  name?: string | null;
  role: "OWNER" | "ADMIN" | "STAFF";
  storeLocationId?: number | null;
  storeLocation?: { id: number; name: string; active: boolean } | null;
};
type StoreLocationsPayload = {
  locations: StoreLocation[];
  users: StoreLocationUser[];
};

const defaultLabelOptions: LabelOptions = {
  showPrice: true,
  priceMode: "both",
  showStoreName: false,
  showProductName: true,
  showVariantName: true,
  showSku: true,
  showLogo: false,
};
const labelOptionLabels: Record<Exclude<keyof LabelOptions, "priceMode" | "showPrice">, string> = {
  showStoreName: "Mostrar tienda",
  showProductName: "Mostrar producto",
  showVariantName: "Mostrar variante",
  showSku: "Mostrar SKU",
  showLogo: "Mostrar logo",
};

function normalizeTemplateOptions(input?: Record<string, LabelOptions>): Record<string, LabelOptions> {
  if (!input || typeof input !== "object") return {};

  return Object.fromEntries(
    Object.entries(input).map(([key, options]) => [
      key,
      { ...defaultLabelOptions, ...options },
    ]),
  );
}

function resolveTemplateOptions(
  template: string,
  templateOptions: Record<string, LabelOptions>,
  fallback?: LabelOptions,
) {
  return { ...defaultLabelOptions, ...(fallback ?? {}), ...(templateOptions[template] ?? {}) };
}

function AdminSettingsSection() {
  const { user } = useAuth();
  const [settingsTab, setSettingsTab] = useState<"transfer" | "labels" | "cash" | "locations">("transfer");
  const [alias, setAlias] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [cashRegisterMode, setCashRegisterMode] = useState<"automatic" | "manual">("automatic");
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [users, setUsers] = useState<StoreLocationUser[]>([]);
  const [locationForm, setLocationForm] = useState({ name: "", address: "" });
  const [userForm, setUserForm] = useState<{ email: string; password: string; name: string; role: "ADMIN" | "STAFF"; storeLocationId: string }>({
    email: "",
    password: "",
    name: "",
    role: "ADMIN",
    storeLocationId: "",
  });
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>([]);
  const [labelPriceSettings, setLabelPriceSettings] = useState<LabelTemplatesPayload["priceSettings"]>({
    hasTransferPrice: false,
    bankTransferDiscountPercentage: 0,
  });
  const [labelTemplate, setLabelTemplate] = useState("BROTHER_QL570_29X90");
  const [labelOptions, setLabelOptions] = useState<LabelOptions>(defaultLabelOptions);
  const [labelTemplateOptions, setLabelTemplateOptions] = useState<Record<string, LabelOptions>>({});
  const [labelQuantityMode, setLabelQuantityMode] = useState<"one" | "stock">("stock");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLabels, setSavingLabels] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageLocations = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user?.role ?? "");

  const selectedLabelTemplate = useMemo(
    () => labelTemplates.find((template) => template.key === labelTemplate) ?? labelTemplates[0] ?? null,
    [labelTemplate, labelTemplates],
  );
  const locationSummary = useMemo(() => {
    const activeLocations = locations.filter((location) => location.active);
    const unassignedUsers = users.filter((entry) => !entry.storeLocationId && entry.role !== "OWNER");

    return {
      activeLocations: activeLocations.length,
      totalUsers: users.length,
      assignedUsers: users.filter((entry) => Boolean(entry.storeLocationId)).length,
      unassignedUsers: unassignedUsers.length,
      totalSales: locations.reduce((sum, location) => sum + Number(location._count?.orders ?? 0), 0),
    };
  }, [locations, users]);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      api("/store/admin/integrations") as Promise<AdminPaymentConfig>,
      api("/admin/labels/templates") as Promise<LabelTemplatesPayload>,
      api("/admin/labels/default") as Promise<DefaultLabelPayload>,
      api("/cash-register/config") as Promise<{ mode: "automatic" | "manual" }>,
      api("/store-locations") as Promise<StoreLocationsPayload>,
    ])
      .then(([config, templatesPayload, defaultLabelPayload, cashConfig, locationsPayload]) => {
        if (!mounted) return;
        setAlias(config?.bankTransfer?.alias?.trim() ?? "");
        setDiscountPercentage(String(Number(config?.bankTransfer?.discountPercentage ?? 0)));
        setCashRegisterMode(cashConfig.mode === "manual" ? "manual" : "automatic");
        setLocations(locationsPayload.locations ?? []);
        setUsers(locationsPayload.users ?? []);
        setLabelTemplates(templatesPayload.templates ?? []);
        setLabelPriceSettings(templatesPayload.priceSettings);
        const allowedTemplates = templatesPayload.templates ?? [];
        const nextTemplate = allowedTemplates.some((template) => template.key === defaultLabelPayload.defaultLabel.template)
          ? defaultLabelPayload.defaultLabel.template
          : allowedTemplates[0]?.key ?? defaultLabelPayload.defaultLabel.template;
        const nextTemplateOptions = normalizeTemplateOptions(defaultLabelPayload.defaultLabel.templateOptions);
        setLabelTemplateOptions(nextTemplateOptions);
        setLabelTemplate(nextTemplate);
        setLabelOptions(resolveTemplateOptions(nextTemplate, nextTemplateOptions, defaultLabelPayload.defaultLabel.options));
        setLabelQuantityMode(defaultLabelPayload.defaultLabel.quantityMode === "one" ? "one" : "stock");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function onSaveTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api("/store/admin/integrations/bank-transfer", {
        method: "PUT",
        body: JSON.stringify({
          alias,
          discountPercentage: Number(discountPercentage || 0),
        }),
      });
      const bankTransfer = (response as AdminPaymentConfig).bankTransfer;
      setAlias(bankTransfer?.alias?.trim() ?? "");
      setDiscountPercentage(String(Number(bankTransfer?.discountPercentage ?? 0)));
      setMessage("Configuracion de transferencia guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la transferencia.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveDefaultLabel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingLabels(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api("/admin/labels/default", {
        method: "PUT",
        body: JSON.stringify({
          template: labelTemplate,
          options: labelOptions,
          quantityMode: labelQuantityMode,
        }),
      }) as DefaultLabelPayload;
      setLabelTemplate(response.defaultLabel.template);
      const nextTemplateOptions = normalizeTemplateOptions(response.defaultLabel.templateOptions);
      setLabelTemplateOptions(nextTemplateOptions);
      setLabelOptions(resolveTemplateOptions(response.defaultLabel.template, nextTemplateOptions, response.defaultLabel.options));
      setLabelQuantityMode(response.defaultLabel.quantityMode === "one" ? "one" : "stock");
      setMessage("Etiqueta predeterminada guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la etiqueta predeterminada.");
    } finally {
      setSavingLabels(false);
    }
  }

  async function onSaveCashRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api("/cash-register/config", {
        method: "PUT",
        body: JSON.stringify({ mode: cashRegisterMode }),
      }) as { mode: "automatic" | "manual" };
      setCashRegisterMode(response.mode === "manual" ? "manual" : "automatic");
      setMessage("Configuracion de caja guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuracion de caja.");
    } finally {
      setSaving(false);
    }
  }

  async function reloadLocations() {
    const payload = await api("/store-locations") as StoreLocationsPayload;
    setLocations(payload.locations ?? []);
    setUsers(payload.users ?? []);
  }

  async function onCreateLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageLocations) return;
    setSavingLocation(true);
    setMessage(null);
    setError(null);

    try {
      await api("/store-locations", {
        method: "POST",
        body: JSON.stringify({
          name: locationForm.name,
          address: locationForm.address || undefined,
        }),
      });
      setLocationForm({ name: "", address: "" });
      await reloadLocations();
      setMessage("Local creado.");
      setLocationModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el local.");
    } finally {
      setSavingLocation(false);
    }
  }

  async function updateLocation(locationId: number, patch: Partial<Pick<StoreLocation, "name" | "address" | "active">>) {
    if (!canManageLocations) return;
    setSavingLocation(true);
    setMessage(null);
    setError(null);

    try {
      await api(`/store-locations/${locationId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await reloadLocations();
      setMessage("Local actualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el local.");
    } finally {
      setSavingLocation(false);
    }
  }

  async function onCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageLocations) return;
    setSavingUser(true);
    setMessage(null);
    setError(null);

    try {
      await api("/store-locations/users", {
        method: "POST",
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password,
          name: userForm.name || undefined,
          role: userForm.role,
          storeLocationId: userForm.storeLocationId ? Number(userForm.storeLocationId) : undefined,
        }),
      });
      resetUserForm();
      await reloadLocations();
      setMessage("Usuario creado.");
      setUserModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setSavingUser(false);
    }
  }

  async function updateUser(userId: number, patch: { storeLocationId?: number | null; role?: "ADMIN" | "STAFF" }) {
    if (!canManageLocations) return;
    setSavingUser(true);
    setMessage(null);
    setError(null);

    try {
      await api(`/store-locations/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await reloadLocations();
      setMessage("Usuario actualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario.");
    } finally {
      setSavingUser(false);
    }
  }

  function resetUserForm() {
    setUserForm({ email: "", password: "", name: "", role: "ADMIN", storeLocationId: "" });
  }

  function nextPriceMode(current: PriceMode, target: "normal" | "transfer", checked: boolean): PriceMode {
    const normalChecked = target === "normal" ? checked : current === "normal" || current === "both";
    const transferChecked = target === "transfer" ? checked : current === "transfer" || current === "both";

    if (normalChecked && transferChecked) return "both";
    if (normalChecked) return "normal";
    if (transferChecked) return "transfer";
    return "none";
  }

  function updateLabelOptions(nextOptions: LabelOptions) {
    setLabelOptions(nextOptions);
    setLabelTemplateOptions((current) => ({
      ...current,
      [labelTemplate]: nextOptions,
    }));
  }

  return (
    <section style={panelStyle}>
      <div style={tabRailStyle}>
        <button
          type="button"
          style={workspaceTabStyle(settingsTab === "transfer")}
          onClick={() => setSettingsTab("transfer")}
        >
          Transferencia
        </button>
        <button
          type="button"
          style={workspaceTabStyle(settingsTab === "labels")}
          onClick={() => setSettingsTab("labels")}
        >
          Etiqueta predeterminada
        </button>
        <button
          type="button"
          style={workspaceTabStyle(settingsTab === "cash")}
          onClick={() => setSettingsTab("cash")}
        >
          Caja
        </button>
        <button
          type="button"
          style={workspaceTabStyle(settingsTab === "locations")}
          onClick={() => setSettingsTab("locations")}
        >
          Locales fisicos
        </button>
      </div>

      {settingsTab === "transfer" ? (
        <form style={blockStyle} onSubmit={onSaveTransfer}>
          <div>
            <p style={eyebrowStyle}>Pagos</p>
            <h3 style={title3Style}>Transferencia bancaria</h3>
            <p style={copyStyle}>Este alias aparece para los clientes antes de subir el comprobante.</p>
          </div>

          {loading ? <p style={copyStyle}>Cargando configuracion...</p> : null}
          {error ? <p style={{ ...copyStyle, color: "#ffb7b7" }}>{error}</p> : null}
          {message ? <p style={{ ...copyStyle, color: "var(--admin-tone-success-color)" }}>{message}</p> : null}

          <div style={optionGridStyle}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={metaStyle}>Alias de transferencia</span>
              <input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                maxLength={80}
                placeholder="ej: mi.tienda.mp"
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={metaStyle}>Descuento por transferencia (%)</span>
              <input
                value={discountPercentage}
                onChange={(event) => setDiscountPercentage(event.target.value)}
                type="number"
                min={0}
                max={100}
                step="0.01"
                style={fieldStyle}
              />
            </label>
          </div>

          <div style={itemStyle}>
            <span style={metaStyle}>Vista cliente</span>
            <strong>{alias.trim() || "Alias pendiente"}</strong>
            <small style={copyStyle}>
              {Number(discountPercentage || 0) > 0
                ? `${Number(discountPercentage || 0)}% de descuento por transferencia`
                : "Sin descuento adicional configurado"}
            </small>
          </div>

          <button type="submit" disabled={saving || loading} style={primaryButtonStyle}>
            {saving ? "Guardando..." : "Guardar transferencia"}
          </button>
        </form>
      ) : null}

      {settingsTab === "labels" ? (
        <form style={blockStyle} onSubmit={onSaveDefaultLabel}>
          <div>
            <p style={eyebrowStyle}>Impresion rapida</p>
            <h3 style={title3Style}>Etiqueta predeterminada</h3>
            <p style={copyStyle}>Esta plantilla se usa al guardar un producto y elegir imprimir etiquetas.</p>
          </div>

          {loading ? <p style={copyStyle}>Cargando configuracion...</p> : null}
          {error ? <p style={{ ...copyStyle, color: "#ffb7b7" }}>{error}</p> : null}
          {message ? <p style={{ ...copyStyle, color: "var(--admin-tone-success-color)" }}>{message}</p> : null}

          <div style={optionGridStyle}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={metaStyle}>Plantilla</span>
              <select
                value={labelTemplate}
                onChange={(event) => {
                  const nextTemplate = labelTemplates.find((template) => template.key === event.target.value);
                  const nextTemplateKey = event.target.value;
                  const savedOptions = labelTemplateOptions[nextTemplateKey];
                  const baseOptions = savedOptions ?? defaultLabelOptions;
                  const nextMode = nextTemplate?.priceOptions?.includes(baseOptions.priceMode)
                    ? baseOptions.priceMode
                    : nextTemplate?.priceOptions?.[0] ?? "normal";
                  const nextOptions = { ...baseOptions, priceMode: nextMode, showPrice: nextMode !== "none" };
                  setLabelTemplate(nextTemplateKey);
                  setLabelOptions(nextOptions);
                }}
                style={fieldStyle}
              >
                {labelTemplates.map((template) => (
                  <option key={template.key} value={template.key}>{template.name}</option>
                ))}
              </select>
            </label>
            <div style={itemStyle}>
              <span style={metaStyle}>Medidas</span>
              <strong>
                {selectedLabelTemplate
                  ? `${selectedLabelTemplate.label.widthMm} mm x ${selectedLabelTemplate.continuous ? "continuo" : `${selectedLabelTemplate.label.heightMm} mm`}`
                  : "Sin plantilla"}
              </strong>
              <small style={copyStyle}>{selectedLabelTemplate?.fields?.join(", ") ?? "Campos de etiqueta"}</small>
            </div>
          </div>

          <div style={itemStyle}>
            <span style={metaStyle}>Cantidad de etiquetas</span>
            <div style={chipRowStyle}>
              <button
                type="button"
                onClick={() => setLabelQuantityMode("stock")}
                style={productChipStyle(labelQuantityMode === "stock")}
              >
                Segun stock
              </button>
              <button
                type="button"
                onClick={() => setLabelQuantityMode("one")}
                style={productChipStyle(labelQuantityMode === "one")}
              >
                Siempre 1
              </button>
            </div>
            <small style={copyStyle}>
              {labelQuantityMode === "stock"
                ? "Imprime una etiqueta por cada unidad cargada en stock de cada variante."
                : "Imprime una sola etiqueta por variante con stock."}
            </small>
          </div>

          <div style={chipRowStyle}>
            <label style={productChipStyle(labelOptions.priceMode === "normal" || labelOptions.priceMode === "both")}>
              <input
                type="checkbox"
                checked={labelOptions.priceMode === "normal" || labelOptions.priceMode === "both"}
                disabled={selectedLabelTemplate?.priceOptions?.includes("normal") === false}
                onChange={(event) => {
                  const priceMode = nextPriceMode(labelOptions.priceMode, "normal", event.target.checked);
                  updateLabelOptions({ ...labelOptions, priceMode, showPrice: priceMode !== "none" });
                }}
              />
              Precio normal
            </label>
            <label style={productChipStyle(labelOptions.priceMode === "transfer" || labelOptions.priceMode === "both")}>
              <input
                type="checkbox"
                checked={labelOptions.priceMode === "transfer" || labelOptions.priceMode === "both"}
                disabled={!labelPriceSettings.hasTransferPrice || selectedLabelTemplate?.priceOptions?.includes("transfer") === false}
                onChange={(event) => {
                  const priceMode = nextPriceMode(labelOptions.priceMode, "transfer", event.target.checked);
                  updateLabelOptions({ ...labelOptions, priceMode, showPrice: priceMode !== "none" });
                }}
              />
              Precio transferencia
            </label>
            {(Object.keys(labelOptionLabels) as Array<keyof typeof labelOptionLabels>).map((key) => (
              <label key={key} style={productChipStyle(Boolean(labelOptions[key]))}>
                <input
                  type="checkbox"
                  checked={Boolean(labelOptions[key])}
                  onChange={(event) => updateLabelOptions({ ...labelOptions, [key]: event.target.checked })}
                />
                {labelOptionLabels[key]}
              </label>
            ))}
          </div>

          <small style={copyStyle}>
            {labelPriceSettings.hasTransferPrice
              ? `Transferencia: ${labelPriceSettings.bankTransferDiscountPercentage}% de descuento.`
              : "La tienda no tiene descuento por transferencia configurado."}
          </small>

          <button type="submit" disabled={savingLabels || loading || !labelTemplate} style={primaryButtonStyle}>
            {savingLabels ? "Guardando..." : "Guardar etiqueta predeterminada"}
          </button>
        </form>
      ) : null}

      {settingsTab === "cash" ? (
        <form style={blockStyle} onSubmit={onSaveCashRegister}>
          <div>
            <p style={eyebrowStyle}>Mostrador</p>
            <h3 style={title3Style}>Modo de caja</h3>
            <p style={copyStyle}>Define si la caja se organiza automaticamente por dia o si el vendedor la abre y cierra manualmente.</p>
          </div>

          {loading ? <p style={copyStyle}>Cargando configuracion...</p> : null}
          {error ? <p style={{ ...copyStyle, color: "#ffb7b7" }}>{error}</p> : null}
          {message ? <p style={{ ...copyStyle, color: "var(--admin-tone-success-color)" }}>{message}</p> : null}

          <div style={chipRowStyle}>
            <button
              type="button"
              onClick={() => setCashRegisterMode("automatic")}
              style={productChipStyle(cashRegisterMode === "automatic")}
            >
              Automatica por dia
            </button>
            <button
              type="button"
              onClick={() => setCashRegisterMode("manual")}
              style={productChipStyle(cashRegisterMode === "manual")}
            >
              Abrir y cerrar manual
            </button>
          </div>

          <div style={itemStyle}>
            <span style={metaStyle}>Comportamiento</span>
            <strong>{cashRegisterMode === "automatic" ? "Caja diaria automatica" : "Caja manual"}</strong>
            <small style={copyStyle}>
              {cashRegisterMode === "automatic"
                ? "Cada dia queda separado por fecha y se puede imprimir el cierre en cualquier momento."
                : "El vendedor debe abrir caja con importe inicial y cerrarla al terminar."}
            </small>
          </div>

          <button type="submit" disabled={saving || loading} style={primaryButtonStyle}>
            {saving ? "Guardando..." : "Guardar caja"}
          </button>
        </form>
      ) : null}

      {settingsTab === "locations" ? (
        <div style={blockStyle}>
          <div>
            <p style={eyebrowStyle}>Operacion fisica</p>
            <h3 style={title3Style}>Locales y usuarios</h3>
            <p style={copyStyle}>Organiza cada punto de venta y asigna usuarios para que caja, ventas y cuentas corrientes queden separadas por local.</p>
          </div>

          {loading ? <p style={copyStyle}>Cargando locales...</p> : null}
          {error ? <p style={{ ...copyStyle, color: "#ffb7b7" }}>{error}</p> : null}
          {message ? <p style={{ ...copyStyle, color: "var(--admin-tone-success-color)" }}>{message}</p> : null}
          {!canManageLocations ? (
            <p style={helperTextStyle}>Tu usuario vendedor esta fijado a su local asignado. Esta seccion queda en modo lectura.</p>
          ) : null}

          <div style={locationStatsGridStyle}>
            <Stat label="Locales activos" value={String(locationSummary.activeLocations)} />
            <Stat label="Usuarios asignados" value={`${locationSummary.assignedUsers}/${locationSummary.totalUsers}`} />
            <Stat label="Sin local" value={String(locationSummary.unassignedUsers)} />
            <Stat label="Ventas registradas" value={String(locationSummary.totalSales)} />
          </div>

          <div style={locationActionsStyle}>
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              disabled={!canManageLocations}
              style={primaryButtonStyle}
            >
              Crear local
            </button>
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              disabled={!canManageLocations}
              style={secondaryButtonStyle}
            >
              Crear usuario
            </button>
          </div>

          <section style={compactPanelStyle}>
            <div style={betweenStyle}>
              <div>
                <span style={metaStyle}>Locales existentes</span>
                <h4 style={subheadingStyle}>Editar locales</h4>
              </div>
              <small style={copyStyle}>Los cambios en nombre o direccion se guardan al salir del campo.</small>
            </div>
            <div style={locationCardsGridStyle}>
              {locations.map((location) => (
                <article key={location.id} style={locationCardStyle(location.active)}>
                  <div style={betweenStyle}>
                    <span style={locationStatusStyle(location.active)}>{location.active ? "Activo" : "Inactivo"}</span>
                    <button
                      type="button"
                      onClick={() => void updateLocation(location.id, { active: !location.active })}
                      disabled={savingLocation || !canManageLocations}
                      style={secondaryButtonStyle}
                    >
                      {location.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                  <label style={fieldGroupStyle}>
                    <span>Nombre</span>
                    <input
                      defaultValue={location.name}
                      readOnly={!canManageLocations}
                      onBlur={(event) => {
                        if (!canManageLocations) return;
                        const nextName = event.target.value.trim();
                        if (nextName && nextName !== location.name) {
                          void updateLocation(location.id, { name: nextName });
                        }
                      }}
                      style={fieldStyle}
                    />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span>Direccion</span>
                    <input
                      defaultValue={location.address ?? ""}
                      readOnly={!canManageLocations}
                      onBlur={(event) => {
                        if (!canManageLocations) return;
                        const nextAddress = event.target.value.trim();
                        if (nextAddress !== (location.address ?? "")) {
                          void updateLocation(location.id, { address: nextAddress });
                        }
                      }}
                      placeholder="Sin direccion"
                      style={fieldStyle}
                    />
                  </label>
                  <div style={locationMetricsStyle}>
                    <span>{location._count?.users ?? 0} usuarios</span>
                    <span>{location._count?.orders ?? 0} ventas</span>
                    <span>{location._count?.currentAccounts ?? 0} cuentas</span>
                  </div>
                </article>
              ))}
              {!locations.length ? <p style={copyStyle}>Todavia no hay locales cargados.</p> : null}
            </div>
          </section>

          <section style={compactPanelStyle}>
            <div style={betweenStyle}>
              <div>
                <span style={metaStyle}>Usuarios existentes</span>
                <h4 style={subheadingStyle}>Asignar local de trabajo</h4>
              </div>
              <small style={copyStyle}>Los duenios no se asignan desde aca.</small>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {users.map((entry) => (
                <div key={entry.id} style={locationUserRowStyle}>
                  <div>
                    <strong>{entry.name || entry.email}</strong>
                    <small style={copyStyle}>{entry.email}</small>
                  </div>
                  <select
                    value={entry.storeLocationId ?? ""}
                    onChange={(event) => void updateUser(entry.id, { storeLocationId: event.target.value ? Number(event.target.value) : null })}
                    disabled={savingUser || entry.role === "OWNER" || !canManageLocations}
                    style={fieldStyle}
                    aria-label={`Local de trabajo de ${entry.name || entry.email}`}
                  >
                    <option value="">Sin local</option>
                    {locations.filter((location) => location.active || location.id === entry.storeLocationId).map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                  {entry.role === "OWNER" ? (
                    <span style={roleBadgeStyle(entry.role)}>
                      {formatStoreUserRole(entry.role)}
                    </span>
                  ) : (
                    <select
                      value={entry.role}
                      onChange={(event) => void updateUser(entry.id, { role: event.target.value as "ADMIN" | "STAFF" })}
                      disabled={savingUser || !canManageLocations}
                      style={roleSelectStyle}
                      aria-label={`Rol de ${entry.name || entry.email}`}
                    >
                      <option value="ADMIN">Encargado</option>
                      <option value="STAFF">Vendedor</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </section>

          {locationModalOpen ? (
            <div
              style={modalOverlayStyle}
              role="presentation"
              onClick={() => {
                if (savingLocation) return;
                setLocationModalOpen(false);
                setLocationForm({ name: "", address: "" });
              }}
            >
              <form style={modalCardStyle} onSubmit={onCreateLocation} onClick={(event) => event.stopPropagation()}>
                <div>
                  <p style={eyebrowStyle}>Nuevo local</p>
                  <h3 style={title3Style}>Crear punto de venta</h3>
                </div>
                <label style={fieldGroupStyle}>
                  <span>Nombre</span>
                  <input
                    value={locationForm.name}
                    onChange={(event) => setLocationForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ej. Local Centro"
                    style={fieldStyle}
                    autoFocus
                  />
                </label>
                <label style={fieldGroupStyle}>
                  <span>Direccion</span>
                  <input
                    value={locationForm.address}
                    onChange={(event) => setLocationForm((current) => ({ ...current, address: event.target.value }))}
                    placeholder="Direccion opcional"
                    style={fieldStyle}
                  />
                </label>
                <div style={modalActionsStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationModalOpen(false);
                      setLocationForm({ name: "", address: "" });
                    }}
                    disabled={savingLocation}
                    style={secondaryButtonStyle}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={savingLocation || !locationForm.name.trim()} style={primaryButtonStyle}>
                    {savingLocation ? "Guardando..." : "Crear local"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {userModalOpen ? (
            <div
              style={modalOverlayStyle}
              role="presentation"
              onClick={() => {
                if (savingUser) return;
                setUserModalOpen(false);
                resetUserForm();
              }}
            >
              <form style={{ ...modalCardStyle, width: "min(100%, 760px)" }} onSubmit={onCreateUser} onClick={(event) => event.stopPropagation()}>
                <div>
                  <p style={eyebrowStyle}>Nuevo usuario</p>
                  <h3 style={title3Style}>Crear acceso de trabajo</h3>
                </div>
                <div style={compactFormGridStyle}>
                  <label style={fieldGroupStyle}>
                    <span>Email</span>
                    <input
                      value={userForm.email}
                      onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="email@tienda.com"
                      style={fieldStyle}
                      autoFocus
                    />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span>Contrasena inicial</span>
                    <input
                      value={userForm.password}
                      onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Minimo 8 caracteres"
                      type="password"
                      style={fieldStyle}
                    />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span>Nombre</span>
                    <input
                      value={userForm.name}
                      onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Nombre opcional"
                      style={fieldStyle}
                    />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span>Rol</span>
                    <select
                      value={userForm.role}
                      onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as "ADMIN" | "STAFF" }))}
                      style={fieldStyle}
                    >
                      <option value="ADMIN">Encargado</option>
                      <option value="STAFF">Vendedor</option>
                    </select>
                  </label>
                  <label style={fieldGroupStyle}>
                    <span>Local de trabajo</span>
                    <select
                      value={userForm.storeLocationId}
                      onChange={(event) => setUserForm((current) => ({ ...current, storeLocationId: event.target.value }))}
                      style={fieldStyle}
                    >
                      <option value="">Sin local</option>
                      {locations.filter((location) => location.active).map((location) => (
                        <option key={location.id} value={location.id}>{location.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={modalActionsStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      setUserModalOpen(false);
                      resetUserForm();
                    }}
                    disabled={savingUser}
                    style={secondaryButtonStyle}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={savingUser || !userForm.email.trim() || userForm.password.length < 8} style={primaryButtonStyle}>
                    {savingUser ? "Creando..." : "Crear usuario"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function AdminOverviewSection({
  onOpenDeveloper,
}: {
  onOpenDeveloper: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c, o, u, s, r] = await Promise.all([
          api("/products"),
          api("/categories"),
          api("/orders"),
          api("/customers"),
          api("/admin/shipments"),
          api("/returns"),
        ]);
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? scopeCategoriesToActiveStore(c as Category[]) : []);
        setOrders(Array.isArray(o) ? o : []);
        setCustomers(Array.isArray(u) ? u : []);
        setShipments(Array.isArray(s) ? (s as AdminShipment[]) : []);
        setReturns(Array.isArray(r) ? (r as AdminReturn[]) : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section style={panelStyle}>
      <Header
        title="Panel general"
        copy="Resumen general de la tienda."
        actions={
          <button
            type="button"
            onClick={onOpenDeveloper}
            style={primaryButtonStyle}
          >
            Modo desarrollador
          </button>
        }
      />
      {loading ? (
        <StateCard label="Cargando resumen..." />
      ) : (
        <div style={statsGridStyle}>
          <Stat label="Productos" value={String(products.length)} />
          <Stat label="Categorias" value={String(categories.length)} />
          <Stat label="Clientes" value={String(customers.length)} />
          <Stat
            label="Pedidos pendientes"
            value={String(
              orders.filter((item) =>
                operationalPendingStatuses.has(item.status),
              ).length,
            )}
          />
          <Stat
            label="Envios activos"
            value={String(
              shipments.filter(
                (item) =>
                  !["delivered", "returned", "failed"].includes(item.status),
              ).length,
            )}
          />
          <Stat
            label="Devoluciones abiertas"
            value={String(
              returns.filter((item) => item.status === "requested").length,
            )}
          />
          <Stat
            label="Facturacion"
            value={money(
              orders.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
            )}
          />
        </div>
      )}
    </section>
  );
}

function AdminLabelsSection() {
  return <AdminLabelsGenerator />;
}

function AdminDeveloperSection({
  user,
  onBack,
}: {
  user: Props["user"];
  onBack: () => void;
}) {
  return (
    <section style={panelStyle}>
      <Header
        title="Modo desarrollador"
        copy="Edita bloques, fondos, textos y productos destacados de la home."
        actions={
          <button type="button" onClick={onBack} style={secondaryButtonStyle}>
            Volver al panel general
          </button>
        }
      />
      <DeveloperModePanel user={user} forceExpanded />
    </section>
  );
}

function Header({
  actions,
}: {
  title?: string;
  copy?: string;
  actions?: React.ReactNode;
}) {
  if (!actions) return null;

  return (
    <div style={{ ...betweenStyle, minWidth: 0, width: "100%" }}>
      <div
        style={{
          display: "grid",
          justifyItems: "end",
          gap: 10,
          minWidth: 0,
          flex: "1 1 320px",
          maxWidth: "min(100%, 520px)",
          marginLeft: "auto",
        }}
      >
        {actions}
      </div>
    </div>
  );
}

function Step({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...blockStyle, height: "100%" }}>
      <div>
        <p style={eyebrowStyle}>Carga</p>
        <h3 style={title3Style}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article style={statStyle}>
      <span style={metaStyle}>{label}</span>
      <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
        {value}
      </strong>
    </article>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

function formatStoreUserRole(role: StoreLocationUser["role"]) {
  if (role === "OWNER") return "Duenio";
  if (role === "STAFF") return "Vendedor";
  return "Encargado";
}

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};
const shellStyle: React.CSSProperties = { display: "grid", gap: 18 };
const topGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 18,
  alignItems: "stretch",
};
const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
};
const ordersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))",
  gap: 16,
};
const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px,0.38fr) minmax(0,1fr)",
  gap: 20,
  alignItems: "start",
};
const optionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 12,
};
const optionValuesAreaStyle: React.CSSProperties = {
  minHeight: 124,
  alignContent: "start",
};
const optionActionsStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "end",
  marginTop: "auto",
  alignSelf: "end",
};
const selectedValuesBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};
const variantGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: 12,
};
const chipRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
const productChipStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${active ? "var(--brand-accent)" : "var(--checkout-border)"}`,
  background: active ? "rgba(116, 184, 168, 0.18)" : "var(--page-panel-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
});
const chipIconButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  lineHeight: 1,
};
const chipInputStyle: React.CSSProperties = {
  width: 120,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--account-text-strong)",
};
const colorSwatchStyle = (color: string): React.CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: 999,
  border: "1px solid var(--checkout-border-strong)",
  background: color,
  flex: "0 0 auto",
});
const colorPickerStyle: React.CSSProperties = {
  width: 52,
  minHeight: 48,
  padding: 6,
  border: "1px solid var(--checkout-border)",
  borderRadius: 14,
  background: "var(--muted-field-bg)",
  cursor: "pointer",
};
const rowWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
const betweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap",
};
const tabRailStyle: React.CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  justifyContent: "start",
  alignItems: "center",
  gap: 10,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  paddingBottom: 4,
  scrollbarWidth: "thin",
};
const boutiquePalette = {
  bg: "#FAF7F1",
  surface: "#FFFFFF",
  softSurface: "#F6EFE6",
  green: "#5E9C8D",
  greenDark: "#1F6F5B",
  text: "#17202A",
  muted: "#6B7280",
  line: "rgba(31, 111, 91, 0.13)",
  shadow: "0 18px 45px rgba(31, 111, 91, 0.08)",
};
const manualSalesBoutiqueShellStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: "2px 0 24px",
  background: boutiquePalette.bg,
  color: boutiquePalette.text,
};
const manualSalesTopbarStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  padding: "14px 18px",
  border: `1px solid ${boutiquePalette.line}`,
  borderRadius: 28,
  background: "rgba(255, 255, 255, 0.92)",
  boxShadow: "0 14px 36px rgba(23, 32, 42, 0.06)",
  backdropFilter: "blur(14px)",
};
const manualSalesTopbarCenterStyle: React.CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowX: "auto",
  scrollbarWidth: "thin",
};
const manualSalesNavStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 22,
  minWidth: 0,
  width: "max-content",
};
const manualSalesHeaderStyle: React.CSSProperties = {
  padding: "0 0 10px",
  borderBottom: "1px solid var(--checkout-border)",
};
const manualSalesHeaderControlsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};
const manualSalesLocationStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: boutiquePalette.muted,
  fontSize: 12,
  fontWeight: 800,
  flex: "0 0 auto",
};
const manualSalesTopbarActionsStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 10,
  minWidth: 0,
};
const dashboardShellStyle: React.CSSProperties = {
  display: "grid",
  gap: 22,
};
const dashboardStatsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 16,
};
const dashboardStatStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "58px minmax(0, 1fr)",
  gap: 16,
  alignItems: "center",
  minHeight: 132,
  padding: 22,
  borderRadius: 28,
  border: `1px solid ${boutiquePalette.line}`,
  background: boutiquePalette.surface,
  boxShadow: boutiquePalette.shadow,
};
const dashboardStatIconStyle = (tone: "cash" | "sale" | "account" | "return"): React.CSSProperties => ({
  display: "grid",
  placeItems: "center",
  width: 58,
  height: 58,
  borderRadius: 20,
  color:
    tone === "sale"
      ? "#C97705"
      : tone === "account"
        ? "#6D5BD0"
        : tone === "return"
          ? "#D9533F"
          : boutiquePalette.greenDark,
  background:
    tone === "sale"
      ? "#FFF3D8"
      : tone === "account"
        ? "#EDE8FF"
        : tone === "return"
          ? "#FFE8E2"
          : "#E8F4EE",
});
const dashboardStatLabelStyle: React.CSSProperties = {
  display: "block",
  color: boutiquePalette.muted,
  fontSize: 14,
  fontWeight: 700,
};
const dashboardStatValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: 7,
  color: boutiquePalette.text,
  fontSize: 24,
  lineHeight: 1.1,
};
const dashboardStatDetailStyle: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  color: boutiquePalette.muted,
  fontSize: 13,
};
const dashboardMiniLineStyle = (tone: "cash" | "sale" | "account" | "return"): React.CSSProperties => ({
  position: "absolute",
  right: 22,
  bottom: 20,
  width: 96,
  height: 24,
  borderBottom: `3px solid ${
    tone === "sale"
      ? "#E6A01A"
      : tone === "account"
        ? "#7C6DE0"
        : tone === "return"
          ? "#E45E4A"
          : boutiquePalette.greenDark
  }`,
  borderRadius: "0 0 55% 45%",
  opacity: 0.7,
  transform: "skewX(-18deg)",
});
const dashboardCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 22,
  padding: 26,
  borderRadius: 30,
  border: `1px solid ${boutiquePalette.line}`,
  background: "rgba(255, 255, 255, 0.9)",
  boxShadow: boutiquePalette.shadow,
};
const dashboardSectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 23,
  color: boutiquePalette.text,
  letterSpacing: 0,
};
const manualSalesSectionKickerStyle: React.CSSProperties = {
  margin: "0 0 5px",
  color: boutiquePalette.muted,
  fontSize: 13,
};
const dashboardQuickActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 14,
};
const dashboardActionButtonStyle: React.CSSProperties = {
  minHeight: 82,
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 14,
  border: `1px solid ${boutiquePalette.line}`,
  background: "#FFFFFF",
  color: boutiquePalette.text,
  padding: "16px 18px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  borderRadius: 24,
  boxShadow: "0 10px 26px rgba(23, 32, 42, 0.045)",
};
const dashboardActionIconStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 48,
  height: 48,
  borderRadius: 18,
  background: "#E8F4EE",
  color: boutiquePalette.greenDark,
};
const dashboardActionTextStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  color: boutiquePalette.text,
};
const manualSalesViewAllButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: 16,
  border: `1px solid ${boutiquePalette.line}`,
  background: "#FFFFFF",
  color: boutiquePalette.text,
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 22px rgba(23, 32, 42, 0.04)",
};
const errorBoxStyle: React.CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 12,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
};
const dashboardCommentsStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};
const dashboardCommentStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "12px minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "center",
  padding: "15px 16px",
  border: `1px solid ${boutiquePalette.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
  boxShadow: "0 8px 20px rgba(23, 32, 42, 0.035)",
};
const dashboardCommentTextStyle: React.CSSProperties = {
  margin: 0,
  color: boutiquePalette.text,
  minWidth: 0,
};
const dashboardCommentTimeStyle: React.CSSProperties = {
  color: boutiquePalette.muted,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
const dashboardToneDotStyle = (tone: ManualDashboardComment["tone"]): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: 999,
  background:
    tone === "return"
      ? "var(--admin-danger-color)"
      : tone === "exchange"
        ? "var(--brand-accent)"
        : tone === "account"
          ? "var(--notification-badge-bg, #ef4444)"
          : "var(--accent-strong)",
});
const manualSalesLocationSelectStyle: React.CSSProperties = {
  minHeight: 40,
  minWidth: 172,
  borderRadius: 999,
  border: `1px solid ${boutiquePalette.line}`,
  background: "#FFFFFF",
  color: boutiquePalette.text,
  padding: "8px 13px",
  fontWeight: 800,
};
const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  boxSizing: "border-box",
};
const categoryCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 220,
};
const categoryThumbStyle: React.CSSProperties = {
  width: 52,
  height: 38,
  borderRadius: 10,
  objectFit: "cover",
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  flex: "0 0 auto",
};
const categoryThumbPlaceholderStyle: React.CSSProperties = {
  ...categoryThumbStyle,
  display: "inline-block",
};
const categoryPreviewImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 240,
  objectFit: "cover",
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
};
const categoryImageEmptyStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: 150,
  borderRadius: 18,
  border: "1px dashed var(--checkout-border-strong)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-soft)",
};
const attributeProductsTableWrapStyle: React.CSSProperties = {
  ...tableWrapStyle,
  maxHeight: 360,
  overflowY: "auto",
  borderBottom: "1px solid var(--checkout-border)",
};
const selectableRowStyle: React.CSSProperties = {
  cursor: "pointer",
};
const fieldStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  padding: "14px 16px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 16,
  outline: "none",
  boxSizing: "border-box",
};
const smallFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  padding: "12px 14px",
};
const searchFieldStyle: React.CSSProperties = {
  ...smallFieldStyle,
  width: "100%",
  minWidth: 280,
  maxWidth: 420,
};
const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  width: "100%",
  maxWidth: 260,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  appearance: "auto",
};
const largeFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  minHeight: 58,
  fontSize: 18,
};
const modernWorkspaceStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  width: "100%",
  minWidth: 0,
};
const wizardStepperStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};
const wizardStepButtonStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 52,
  borderRadius: 14,
  border: active ? "1px solid var(--accent-strong)" : "1px solid var(--checkout-border)",
  background: active ? "var(--accent-strong)" : "var(--page-panel-strong-bg)",
  color: active ? "var(--accent-contrast)" : "var(--account-text-strong)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 700,
});
const wizardPanelStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 20,
  display: "grid",
  gap: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  minHeight: 460,
  alignContent: "start",
};
const wizardTwoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
  gap: 16,
  alignItems: "start",
};
const wizardSubpanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minWidth: 0,
};
const publicationGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};
const publicationChoiceStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 120,
  borderRadius: 18,
  border: active ? "2px solid var(--accent-strong)" : "1px solid var(--checkout-border)",
  background: active ? "rgba(115, 181, 165, 0.72)" : "rgba(115, 181, 165, 0.22)",
  color: "var(--account-text-strong)",
  fontWeight: 800,
  cursor: "pointer",
});
const catalogToolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};
const iconActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};
const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-strong-bg)",
  color: "var(--account-text-strong)",
  display: "inline-grid",
  placeItems: "center",
  cursor: "pointer",
  fontWeight: 800,
};
const productThumbStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  objectFit: "cover",
  border: "1px solid var(--checkout-border)",
};
const productThumbEmptyStyle: React.CSSProperties = {
  display: "inline-block",
  width: 48,
  height: 48,
  borderRadius: 10,
  background: "var(--muted-field-bg)",
  border: "1px solid var(--checkout-border)",
};
const suggestionFieldWrapStyle: React.CSSProperties = { position: "relative" };
const suggestionDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 50,
  borderRadius: 18,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  boxShadow: "0 18px 42px rgba(79, 151, 191, 0.12)",
  padding: 8,
  display: "grid",
  gap: 6,
  maxHeight: 240,
  overflowY: "auto",
};
const suggestionItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid transparent",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  textAlign: "left",
  cursor: "pointer",
};
const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};
const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border-strong)",
  borderRadius: 999,
  cursor: "pointer",
};
const fullWidthSecondaryButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  width: "fit-content",
};
const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 999,
  cursor: "pointer",
};
const blockStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 20,
  display: "grid",
  gap: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};
const editingBannerStyle: React.CSSProperties = {
  ...blockStyle,
  gridTemplateColumns: "minmax(0,1fr) auto",
  alignItems: "center",
  gap: 12,
};
const itemStyle: React.CSSProperties = { ...blockStyle, gap: 10 };
const compactPanelStyle: React.CSSProperties = {
  ...blockStyle,
  borderRadius: 18,
  gap: 14,
};
const subheadingStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "var(--account-text-strong)",
  fontSize: 18,
};
const fieldGroupStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  color: "var(--account-text-muted)",
  fontWeight: 700,
};
const locationStatsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};
const locationActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};
const compactFormGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};
const locationCardsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
  gap: 12,
};
const locationMetricsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  color: "var(--account-text-muted)",
  fontSize: 13,
};
const locationCardStyle = (active: boolean): React.CSSProperties => ({
  display: "grid",
  gap: 12,
  border: `1px solid ${active ? "var(--checkout-border-strong)" : "var(--checkout-border)"}`,
  borderRadius: 14,
  padding: 14,
  background: active ? "var(--page-panel-bg)" : "var(--muted-field-bg)",
  opacity: active ? 1 : 0.72,
});
const locationStatusStyle = (active: boolean): React.CSSProperties => ({
  ...metaStyle,
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: active ? "rgba(116, 184, 168, 0.18)" : "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
});
const roleBadgeStyle = (role: StoreLocationUser["role"]): React.CSSProperties => ({
  ...metaStyle,
  justifySelf: "end",
  width: "fit-content",
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: role === "OWNER" ? "var(--muted-field-bg)" : "rgba(116, 184, 168, 0.16)",
  color: "var(--account-text-strong)",
  textAlign: "center",
});
const roleSelectStyle: React.CSSProperties = {
  ...fieldStyle,
  minWidth: 150,
  width: "100%",
  maxWidth: 180,
  justifySelf: "end",
};
const locationUserRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) minmax(190px, 260px) minmax(110px, auto)",
  gap: 12,
  alignItems: "center",
  border: "1px solid var(--account-item-border)",
  borderRadius: 12,
  padding: 12,
};
const newOrderItemStyle: React.CSSProperties = {
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--admin-tone-warning-bg, var(--page-panel-bg)) 78%, var(--page-panel-bg) 22%), var(--page-panel-bg))",
  boxShadow:
    "0 0 0 3px color-mix(in srgb, var(--admin-tone-warning-color, var(--account-text-strong)) 10%, transparent)",
};
const groupPanelStyle: React.CSSProperties = { ...blockStyle, gap: 18 };
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: "var(--admin-overlay-bg)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};
const modalCardStyle: React.CSSProperties = {
  width: "min(100%, 560px)",
  maxHeight: "min(88vh, 720px)",
  overflowY: "auto",
  borderRadius: 28,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  boxShadow: "var(--admin-modal-shadow)",
  padding: 24,
  display: "grid",
  gap: 20,
};
const attributeModalStyle: React.CSSProperties = {
  ...modalCardStyle,
  width: "min(100%, 980px)",
  maxHeight: "min(92vh, 900px)",
};
const categoryModalStyle: React.CSSProperties = {
  ...attributeModalStyle,
  width: "min(100%, 1040px)",
};
const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};
const optionCardStyle: React.CSSProperties = {
  ...blockStyle,
  padding: 16,
  alignContent: "stretch",
  minHeight: 360,
  gridTemplateRows: "auto minmax(0, 1fr) auto",
};
const tableSectionStyle: React.CSSProperties = { ...blockStyle, gap: 16 };
const statStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--admin-stat-bg)",
  padding: 22,
  display: "grid",
  gap: 8,
};
const stateStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  padding: 24,
  color: "var(--account-text-muted)",
};
const metaStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
};
const helperTextStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
  lineHeight: 1.4,
};
const checkboxLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
  maxWidth: 720,
};
const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};
const title3Style: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 22,
  color: "var(--account-text-strong)",
};
const catalogTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-strong)",
  fontSize: 26,
  fontWeight: 800,
};
const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
const toastStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 1200,
  maxWidth: "min(360px, calc(100vw - 32px))",
  padding: "14px 18px",
  borderRadius: 18,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  color: "var(--account-text-strong)",
  boxShadow: "0 18px 44px rgba(0, 0, 0, 0.18)",
  fontWeight: 800,
  animation: "productToastIn 180ms ease-out",
};
const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0 0 12px",
  borderBottom: "1px solid var(--checkout-border)",
  color: "var(--account-text-soft)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};
const tdStyle: React.CSSProperties = {
  padding: "14px 0",
  borderBottom: "1px solid var(--checkout-border)",
  color: "var(--account-text-strong)",
  verticalAlign: "top",
};
const optionStyle: React.CSSProperties = {
  background: "var(--select-bg)",
  color: "var(--select-color)",
};
const statusStyle = (published: boolean): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: published
    ? "1px solid var(--admin-tone-success-border)"
    : "1px solid var(--admin-status-idle-border)",
  background: published
    ? "var(--admin-tone-success-bg)"
    : "var(--admin-status-idle-bg)",
  color: published
    ? "var(--admin-tone-success-color)"
    : "var(--admin-status-idle-color)",
  fontSize: 12,
});
const productCatalogStatusStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    status === "Publicado"
      ? "1px solid var(--admin-tone-success-border)"
      : status === "Sin stock"
        ? "1px solid var(--admin-danger-border)"
        : "1px solid var(--admin-status-idle-border)",
  background:
    status === "Publicado"
      ? "var(--admin-tone-success-bg)"
      : status === "Sin stock"
        ? "var(--admin-danger-bg)"
        : "var(--admin-status-idle-bg)",
  color:
    status === "Publicado"
      ? "var(--admin-tone-success-color)"
      : status === "Sin stock"
        ? "var(--admin-danger-color)"
        : "var(--admin-status-idle-color)",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
});
const statusChipStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    status === "cancelled"
      ? "1px solid var(--admin-danger-border)"
      : status === "delivered" || status === "picked_up"
        ? "1px solid var(--admin-tone-success-border)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "1px solid var(--admin-tone-info-border)"
          : "1px solid var(--admin-status-idle-border)",
  background:
    status === "cancelled"
      ? "var(--admin-danger-bg)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-bg)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "var(--admin-tone-info-bg)"
          : "var(--admin-status-idle-bg)",
  color:
    status === "cancelled"
      ? "var(--admin-danger-color)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-color)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "var(--admin-tone-info-color)"
          : "var(--admin-status-idle-color)",
  fontSize: 12,
});
const newOrderBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background: "var(--notification-badge-bg, #ff3b30)",
  color: "var(--notification-badge-color, #fff)",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};
const newOrderStatusChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background: "var(--admin-tone-warning-bg, var(--account-item-bg-active))",
  color: "var(--admin-tone-warning-color, var(--account-text-strong))",
  fontSize: 12,
  fontWeight: 700,
};
const softChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};
const workspaceTabStyle = (active: boolean): React.CSSProperties => ({
  position: "relative",
  flex: "0 0 auto",
  minHeight: 42,
  padding: "10px 14px",
  border: 0,
  background: "transparent",
  color: active ? boutiquePalette.greenDark : boutiquePalette.text,
  cursor: "pointer",
  fontWeight: active ? 900 : 750,
  whiteSpace: "nowrap",
  boxShadow: active ? `inset 0 -3px 0 ${boutiquePalette.green}` : "inset 0 -3px 0 transparent",
});
const removeChipStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  cursor: "pointer",
};

