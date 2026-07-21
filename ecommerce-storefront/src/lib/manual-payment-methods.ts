export const ADMIN_PAYMENT_METHODS = [
  "Efectivo",
  "Débito",
  "Tarjeta",
  "Transferencia",
  "Cuenta corriente",
] as const;

export const CURRENT_ACCOUNT_PAYMENT_METHODS = [
  "Efectivo",
  "Débito",
  "Tarjeta",
  "Transferencia",
  "Mercado Pago",
] as const;

export function normalizePaymentMethod(method?: string | null) {
  return (method ?? "")
    .trim()
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isDiscountedAdministrativePaymentMethod(method?: string | null) {
  return ["efectivo", "debito", "transferencia"].includes(
    normalizePaymentMethod(method),
  );
}
