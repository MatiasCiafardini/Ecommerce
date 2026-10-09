"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, roundCurrency } from "@/lib/currency";
import { getClientStoreContext } from "@/lib/tenant/store-context";

type Config = { enabled: boolean; count: number; minimumAmount: number };
const requests = new Map<string, { expires: number; promise: Promise<Config | null> }>();

export default function InstallmentsLabel({ price, detail = false, excluded = false }: { price: number; detail?: boolean; excluded?: boolean }) {
  const [config, setConfig] = useState<Config | null>(null);
  useEffect(() => {
    let active = true;
    const key = JSON.stringify(getClientStoreContext());
    let entry = requests.get(key);
    if (!entry || entry.expires < Date.now()) {
      entry = { expires: Date.now() + 60000, promise: api("/store/payment-config").then(response => response?.mercadopago?.enabled ? response.mercadopago.interestFreeInstallments : null).catch(() => null) };
      requests.set(key, entry);
    }
    entry.promise.then(value => { if (active) setConfig(value); });
    return () => { active = false; };
  }, []);
  if (excluded || !config?.enabled || ![2, 3, 6].includes(config.count) || price <= 0 || price < config.minimumAmount) return null;
  return (
    <div className={detail ? "product-installments-detail" : "product-card-installment-price"} style={{ display: "flex", alignItems: "center", gap: detail ? 12 : 6, padding: detail ? "12px 14px" : "4px 0", borderRadius: 12, background: detail ? "var(--background-soft, #eef6f2)" : undefined, color: "var(--text-strong)", fontSize: detail ? 15 : 11, lineHeight: 1.5 }}>
      <svg aria-hidden="true" width={detail ? 24 : 16} height={detail ? 24 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h4"/></svg>
      <div><span>{config.count} cuotas sin interés de <strong>{formatCurrency(roundCurrency(price / config.count))}</strong></span>{detail ? <small style={{ display: "block", color: "var(--text-muted)", fontSize: 12 }}>Con tarjetas de crédito a través de Mercado Pago · Sujeto a disponibilidad de tu tarjeta.</small> : null}</div>
    </div>
  );
}
