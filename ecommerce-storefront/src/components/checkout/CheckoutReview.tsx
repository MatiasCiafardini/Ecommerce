"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { CustomerOrder, money, openReceipt } from "@/components/account/order-utils";
import MercadoPagoCardPayment from "@/components/checkout/MercadoPagoCardPayment";
import { roundCurrency } from "@/lib/currency";
import { getClientStoreContext } from "@/lib/tenant/store-context";

type ShippingOption = {
  quoteId?: string;
  provider: string;
  method: string;
  price: number;
  estimatedDays: number;
  carrierId?: string;
  carrierName?: string;
  serviceCode?: string;
  modalityCode?: string;
  dispatchType?: string;
  branchId?: string | null;
  sellerCost?: number | null;
};

const getCheckoutShippingLabel = (option: ShippingOption | null) => {
  if (!option) return "Envio a confirmar";

  const provider = option.provider?.trim().toLowerCase() ?? "";
  const method = option.method?.trim().toLowerCase() ?? "";

  if (method.includes("retiro") || method.includes("pickup")) {
    return option.method;
  }

  if (provider === "manual" || provider === "store") {
    return option.method;
  }

  return [option.provider, option.method].filter(Boolean).join(" · ");
};

const getCheckoutShippingEta = (option: ShippingOption | null) => {
  if (!option) return "La fecha de entrega se confirmara despues de la compra.";

  const provider = option.provider?.trim().toLowerCase() ?? "";
  const method = option.method?.trim().toLowerCase() ?? "";

  if (method.includes("retiro") || method.includes("pickup")) {
    return "Te avisaremos cuando tu pedido este listo para retirar.";
  }

  if (method.includes("coordinar")) {
    return "Coordinaremos la fecha de entrega despues de la compra.";
  }

  if (provider === "manual" || provider === "store" || option.estimatedDays <= 0) {
    return "La fecha estimada se actualizara una vez despachado el pedido.";
  }

  return `Entrega estimada en ${option.estimatedDays} dia${option.estimatedDays === 1 ? "" : "s"}.`;
};

type CheckoutCartItem = {
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
};

type CheckoutAddressSnapshot = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
};

type CheckoutErrorState = {
  title: string;
  message: string;
};

type DiscountPreview = {
  source: "coupon" | "automatic";
  discountId: number | null;
  couponId?: number;
  code: string | null;
  amount: number;
  baseAmount?: number;
  freeShipping: boolean;
  paymentMethodDiscountAmount?: number;
  paymentMethodDiscountPercentage?: number;
} | {
  source: "payment_method";
  discountId: null;
  code: null;
  amount: number;
  baseAmount?: number;
  freeShipping: false;
  paymentMethodDiscountAmount?: number;
  paymentMethodDiscountPercentage?: number;
} | null;

const CHECKOUT_UPLOAD_TIMEOUT_MS = 60_000;
const CHECKOUT_ORDER_LOAD_TIMEOUT_MS = 15_000;
const MAX_TRANSFER_PROOF_UPLOAD_BYTES = 850 * 1024;
const MAX_TRANSFER_PROOF_DIMENSION = 1600;
const TRANSFER_PROOF_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42];

const buildXhrErrorMessage = (status: number, statusText: string, responseText: string) => {
  const fallback = `API request failed with status ${status} ${statusText}`.trim();

  if (!responseText.trim()) {
    return `${fallback}. Response body: <empty>`;
  }

  try {
    const errorData = JSON.parse(responseText) as { message?: string | string[] };

    if (Array.isArray(errorData.message)) {
      return `${fallback}. Response body: ${errorData.message.join(", ")}`;
    }

    if (typeof errorData.message === "string" && errorData.message.trim()) {
      return `${fallback}. Response body: ${errorData.message}`;
    }
  } catch {
    // Fall back to the raw body below.
  }

  return `${fallback}. Response body: ${responseText}`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.trim()) {
        resolve(reader.result);
        return;
      }

      reject(new Error("No pudimos leer el comprobante seleccionado."));
    };
    reader.onerror = () => {
      reject(new Error("No pudimos leer el comprobante seleccionado."));
    };
    reader.readAsDataURL(file);
  });

const renameFileExtension = (name: string, ext: string) =>
  name.replace(/\.[^.]+$/u, "") + ext;

const loadImageElement = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error(`No se pudo procesar la imagen ${file.name}.`));
      element.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  quality: number,
  mimeType = "image/jpeg",
) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });

const optimizeTransferProofForUpload = async (file: File) => {
  if (!/^image\//i.test(file.type)) {
    if (file.size > MAX_TRANSFER_PROOF_UPLOAD_BYTES) {
      throw new Error(
        "El comprobante PDF es demasiado pesado para el servidor. Prueba con un PDF mas liviano o una captura JPG/PNG.",
      );
    }

    return file;
  }

  if (
    file.size <= MAX_TRANSFER_PROOF_UPLOAD_BYTES &&
    /image\/(jpe?g|png|webp)/i.test(file.type)
  ) {
    return file;
  }

  const image = await loadImageElement(file);
  const longestSide = Math.max(image.width, image.height);
  const scale =
    longestSide > MAX_TRANSFER_PROOF_DIMENSION
      ? MAX_TRANSFER_PROOF_DIMENSION / longestSide
      : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar el comprobante para subir.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const outputMime = "image/jpeg";
  const outputExt = ".jpg";

  const firstJpegBlob = await canvasToBlob(canvas, 0.82, outputMime);
  if (firstJpegBlob && firstJpegBlob.size <= MAX_TRANSFER_PROOF_UPLOAD_BYTES) {
    return new File([firstJpegBlob], renameFileExtension(file.name, outputExt), {
      type: outputMime,
      lastModified: Date.now(),
    });
  }

  for (const quality of TRANSFER_PROOF_QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality, outputMime);
    if (!blob) {
      continue;
    }

    if (
      blob.size <= MAX_TRANSFER_PROOF_UPLOAD_BYTES ||
      quality === TRANSFER_PROOF_QUALITY_STEPS.at(-1)
    ) {
      if (blob.size > MAX_TRANSFER_PROOF_UPLOAD_BYTES) {
        throw new Error(
          "No pudimos reducir lo suficiente el peso del comprobante. Prueba con una imagen mas liviana.",
        );
      }

      return new File([blob], renameFileExtension(file.name, outputExt), {
        type: outputMime,
        lastModified: Date.now(),
      });
    }
  }

  throw new Error(`No se pudo reducir el peso de ${file.name}.`);
};

export default function CheckoutReview({
  cart,
  cartId,
  address,
  paymentMethod,
  paymentLabel,
  shippingOption,
}: {
  cart: CheckoutCartItem[];
  cartId: number;
  address: CheckoutAddressSnapshot;
  paymentMethod: string | null;
  paymentLabel: string | null;
  shippingOption: ShippingOption | null;
}) {
  const { clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CustomerOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState<CheckoutErrorState | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [completedPaymentStatus, setCompletedPaymentStatus] = useState<string | null>(null);
  const [transferProofFile, setTransferProofFile] = useState<File | null>(null);
  const [transferReference, setTransferReference] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [rightColumnHeight, setRightColumnHeight] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview>(null);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const DESKTOP_REVIEW_THREE_PRODUCTS_HEIGHT = 700;
  const DESKTOP_REVIEW_FALLBACK_MIN_HEIGHT = 580;

  const subtotal = roundCurrency(cart.reduce((acc, item) => acc + item.price * item.quantity, 0));
  const baseDiscountAmount = roundCurrency(discountPreview?.baseAmount ?? discountPreview?.amount ?? 0);
  const paymentMethodDiscountAmount = roundCurrency(discountPreview?.paymentMethodDiscountAmount ?? 0);
  const discountAmount = roundCurrency(baseDiscountAmount + paymentMethodDiscountAmount);
  const baseShippingCost = roundCurrency(shippingOption?.price ?? 0);
  const shippingCost = roundCurrency(discountPreview?.freeShipping ? 0 : baseShippingCost);
  const total = roundCurrency(Math.max(subtotal - discountAmount + shippingCost, 0));
  const isBankTransfer = paymentMethod === "bank_transfer";
  const isCashPayment = paymentMethod === "cash";
  const useDarkCompletionPopup = user?.storeId === 1 || user?.storeId === 3;
  const paymentDisplayLabel =
    paymentLabel ??
    (paymentMethod === "mercadopago"
      ? "Mercado Pago"
      : paymentMethod === "bank_transfer"
        ? "Transferencia bancaria"
        : paymentMethod === "cash"
          ? "Efectivo al retirar"
        : "A confirmar");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHeight = () => {
      if (window.innerWidth <= 1024) {
        setRightColumnHeight(null);
        return;
      }

      const viewportLimitedHeight = Math.min(
        DESKTOP_REVIEW_THREE_PRODUCTS_HEIGHT,
        window.innerHeight - 140,
      );

      setRightColumnHeight(
        Math.max(viewportLimitedHeight, DESKTOP_REVIEW_FALLBACK_MIN_HEIGHT),
      );
    };

    syncHeight();

    window.addEventListener("resize", syncHeight);

    return () => {
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  const previewDiscount = useCallback(async (code?: string) => {
    setDiscountLoading(true);

    try {
      const response = await api("/discounts/preview", {
        method: "POST",
        body: JSON.stringify({
          subtotal,
          code: code?.trim() || undefined,
          paymentMethod: paymentMethod ?? undefined,
        }),
      });

      setDiscountPreview(response);
      setDiscountError(null);

      if (!response) {
        setDiscountMessage(null);
        return;
      }

      if (response.source === "coupon") {
        setDiscountMessage(
          response.freeShipping
            ? `Cupon ${response.code} aplicado. El envio quedo bonificado.`
            : `Cupon ${response.code} aplicado correctamente.`,
        );
        return;
      }

      setDiscountMessage(
        response.freeShipping
          ? "Se aplico una promocion automatica con envio gratis."
          : "Se aplico una promocion automatica a tu compra.",
      );
    } catch (error) {
      if (code?.trim()) {
        try {
          const fallbackResponse = await api("/discounts/preview", {
            method: "POST",
            body: JSON.stringify({ subtotal, paymentMethod: paymentMethod ?? undefined }),
          });

          setDiscountPreview(fallbackResponse);
          setDiscountMessage(
            fallbackResponse
              ? fallbackResponse.freeShipping
                ? "Se mantuvo la promocion automatica con envio gratis."
                : "Se mantuvo la promocion automatica disponible para tu compra."
              : null,
          );
        } catch {
          setDiscountPreview(null);
          setDiscountMessage(null);
        }
      } else {
        setDiscountPreview(null);
        setDiscountMessage(null);
      }

      setDiscountError(
        error instanceof Error ? error.message : "No pudimos validar el descuento.",
      );
      throw error;
    } finally {
      setDiscountLoading(false);
    }
  }, [paymentMethod, subtotal]);

  useEffect(() => {
    void previewDiscount();
  }, [previewDiscount]);

  const goToOrderDetail = (orderId: number) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("checkoutRedirectingOrderId", String(orderId));
    }

    router.push(`/account/orders/${orderId}`);

    window.setTimeout(() => {
      clearCart();
    }, 120);
  };

  const goToCart = () => {
    router.push("/cart?stockIssue=1");
  };

  const createOrderFromCheckout = async () => {
    const order = await api(`/store/checkout/${cartId}`, {
      method: "POST",
      body: JSON.stringify({
        shippingQuoteId: shippingOption?.quoteId,
        shippingProvider: shippingOption?.provider,
        shippingMethod: shippingOption?.method,
        shippingCost: shippingOption?.price,
        shippingSelection: {
          carrierId: shippingOption?.carrierId,
          carrierName: shippingOption?.carrierName,
          serviceCode: shippingOption?.serviceCode,
          modalityCode: shippingOption?.modalityCode,
          dispatchType: shippingOption?.dispatchType,
          branchId: shippingOption?.branchId ?? undefined,
        },
        shippingAddress: {
          firstName: address.firstName,
          lastName: address.lastName,
          phone: address.phone ?? user?.phone ?? undefined,
          address1: address.address1,
          address2: address.address2 ?? undefined,
          city: address.city,
          state: address.state ?? undefined,
          zip: address.zip,
          country: address.country,
        },
        couponCode:
          discountPreview?.source === "coupon" ? discountPreview.code ?? undefined : undefined,
        paymentMethod: paymentMethod ?? undefined,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    setCreatedOrderId(order.id);
    return order as { id: number };
  };

  const ensureOrderForPayment = async () => {
    if (createdOrderId) {
      return { id: createdOrderId };
    }

    return createOrderFromCheckout();
  };

  const loadCompletedOrder = async (orderId: number) => {
    const completed = await api(`/customers/me/orders/${orderId}`);
    setCompletedOrder(completed);
  };

  const uploadBankTransferProof = (orderId: number, formData: FormData) =>
    new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("El upload del comprobante solo puede ejecutarse en el navegador."));
        return;
      }

      const { host, storeId } = getClientStoreContext();
      const request = new XMLHttpRequest();
      request.open("POST", `/api/proxy/store/payments/${orderId}/bank-transfer`);
      request.withCredentials = true;
      request.timeout = CHECKOUT_UPLOAD_TIMEOUT_MS;
      request.setRequestHeader("x-store-id", String(storeId));
      request.setRequestHeader("x-store-host", host);

      request.onload = () => {
        const responseText = request.responseText ?? "";

        if (request.status >= 200 && request.status < 300) {
          resolve();
          return;
        }

        reject(
          new Error(
            buildXhrErrorMessage(
              request.status,
              request.statusText,
              responseText,
            ),
          ),
        );
      };

      request.onerror = () => {
        reject(
          new Error(
            "No pudimos subir el comprobante de transferencia. Revisa tu conexion e intentalo nuevamente.",
          ),
        );
      };

      request.ontimeout = () => {
        reject(
          new Error(
            "La carga del comprobante demoro demasiado. Si la orden ya se creo, la veras en tu cuenta; si no, vuelve a intentar con un archivo mas liviano.",
          ),
        );
      };

      request.send(formData);
    });

  const uploadBankTransferProofFallback = async (
    orderId: number,
    file: File,
    reference: string,
    notes: string,
    idempotencyKey: string,
  ) => {
    const proofDataUrl = await readFileAsDataUrl(file);

    await api(`/store/payments/${orderId}/bank-transfer`, {
      method: "POST",
      body: JSON.stringify({
        provider: "bank_transfer",
        method: "bank_transfer",
        reference,
        notes,
        idempotencyKey,
        proofBase64: proofDataUrl,
        proofFilename: file.name,
        proofMimeType: file.type || undefined,
      }),
    });
  };

  const loadCompletedOrderWithFallback = async (orderId: number) => {
    try {
      await Promise.race([
        loadCompletedOrder(orderId),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () =>
              reject(
                new Error(
                  "La compra se registro, pero tardamos demasiado en abrir el resumen final.",
                ),
              ),
            CHECKOUT_ORDER_LOAD_TIMEOUT_MS,
          ),
        ),
      ]);

      return true;
    } catch {
      setLoading(false);
      goToOrderDetail(orderId);
      return false;
    }
  };

  const resolveCheckoutError = (error: unknown): CheckoutErrorState => {
    const fallback = {
      title: "No pudimos cerrar la compra",
      message: "Revisa tu carrito y vuelve a intentarlo en unos instantes.",
    };

    if (!(error instanceof Error)) {
      return fallback;
    }

    const message = error.message.trim();
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("stock") ||
      normalizedMessage.includes("inventario") ||
      normalizedMessage.includes("sin suficiente")
    ) {
      return {
        title: "Una o mas unidades ya no estan disponibles",
        message:
          "Mientras cerrabas la compra, otro pedido consumio ese stock. Vuelve al carrito para revisar cantidades y disponibilidad actual.",
      };
    }

    return {
      title: "No pudimos cerrar la compra",
      message: message || fallback.message,
    };
  };

  const handleMercadoPagoPayment = async ({
    token,
    paymentMethodId,
    issuerId,
    installments,
  }: {
    token: string;
    paymentMethodId?: string;
    issuerId?: string;
    installments?: number;
  }) => {
    if (!user || !paymentMethod || !shippingOption) {
      return;
    }

    try {
      setLoading(true);
      setCheckoutError(null);

      const order = await ensureOrderForPayment();
      const payment = await api(`/store/payments/${order.id}`, {
        method: "POST",
        body: JSON.stringify({
          provider: "mercadopago",
          method: paymentMethodId || "credit_card",
          token,
          paymentMethodId,
          installments: installments ?? 1,
          issuerId,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const paymentStatus = String(payment?.status ?? "").trim().toLowerCase();
      setCompletedPaymentStatus(paymentStatus || null);

      if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
        throw new Error(
          "Mercado Pago rechazo la tarjeta. Puedes revisar los datos e intentarlo nuevamente.",
        );
      }

      await loadCompletedOrder(order.id);
    } catch (error) {
      setCheckoutError(resolveCheckoutError(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!user || !paymentMethod || !shippingOption) return;

    if (isBankTransfer && !transferProofFile) {
      setCheckoutError({
        title: "Falta el comprobante de transferencia",
        message:
          "Sube el comprobante antes de confirmar para que el comercio pueda validar el pago.",
      });
      return;
    }

    try {
      setLoading(true);
      setCheckoutError(null);
      const order = await ensureOrderForPayment();
      const paymentIdempotencyKey = `bank-transfer:${order.id}`;

      if (isBankTransfer && transferProofFile) {
        const optimizedTransferProof =
          await optimizeTransferProofForUpload(transferProofFile);
        const formData = new FormData();
        formData.append("file", optimizedTransferProof);
        formData.append("provider", "bank_transfer");
        formData.append("method", "bank_transfer");
        formData.append("reference", transferReference);
        formData.append("notes", transferNotes);
        formData.append("idempotencyKey", paymentIdempotencyKey);

        try {
          await uploadBankTransferProof(order.id, formData);
        } catch (error) {
          const message = error instanceof Error ? error.message.toLowerCase() : "";
          const shouldTryJsonFallback =
            message.includes("demoro demasiado") ||
            message.includes("conexion") ||
            message.includes("network") ||
            message.includes("failed to fetch") ||
            message.includes("status 413") ||
            message.includes("status 502") ||
            message.includes("status 503") ||
            message.includes("status 504");

          if (!shouldTryJsonFallback) {
            throw error;
          }

          await uploadBankTransferProofFallback(
            order.id,
            optimizedTransferProof,
            transferReference,
            transferNotes,
            paymentIdempotencyKey,
          );
        }
      }

      if (isCashPayment) {
        await api(`/store/payments/${order.id}`, {
          method: "POST",
          body: JSON.stringify({
            provider: "cash",
            method: "cash",
            idempotencyKey: crypto.randomUUID(),
          }),
        });
      }

      setCompletedPaymentStatus("pending");
      const loadedOrder = await loadCompletedOrderWithFallback(order.id);

      if (!loadedOrder) {
        return;
      }
    } catch (error) {
      setCheckoutError(resolveCheckoutError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section
        className="layout-two-col"
        style={{
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
          alignItems: "start",
          opacity: completedOrder ? 0.34 : 1,
          pointerEvents: completedOrder ? "none" : "auto",
          transition: "opacity 180ms ease",
        }}
      >
        <div
          className="checkout-review-primary"
          style={{
            ...checkoutPanelStyle,
            padding: 28,
            display: "grid",
            gap: 18,
            alignContent: "start",
            minHeight: rightColumnHeight ?? undefined,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                fontSize: 12,
                color: "var(--checkout-text-muted)",
              }}
            >
              Revision final
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontSize: "clamp(2rem, 3vw, 3rem)",
                color: "var(--checkout-text-strong)",
              }}
            >
              Todo listo para salir
            </h2>
          </div>

          {checkoutError ? (
            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(180, 64, 64, 0.24)",
                background: "rgba(120,18,18,0.18)",
                padding: 20,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ color: "#fff", fontSize: 18 }}>{checkoutError.title}</strong>
                <p style={{ margin: 0, color: "var(--paper)", lineHeight: 1.7 }}>
                  {checkoutError.message}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={goToCart}
                  style={primaryActionStyle}
                >
                  Volver al carrito
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutError(null)}
                  style={secondaryActionStyle}
                >
                  Seguir revisando
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 14 }}>
            {cart.map((item, index) => (
              <article
                key={item.variantId}
                className="layout-review-item"
                style={{
                  borderRadius: 24,
                  border: "1px solid var(--checkout-border)",
                  background: "var(--checkout-card-bg)",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    width: 88,
                    aspectRatio: "4 / 5",
                    borderRadius: 18,
                    overflow: "hidden",
                    background: "#ffffff",
                    border: "1px solid color-mix(in srgb, var(--accent-strong) 10%, transparent)",
                  }}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={88}
                      height={110}
                      unoptimized
                      style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center center", padding: 8 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        color: "color-mix(in srgb, var(--accent-strong) 56%, transparent)",
                        fontSize: 11,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                      }}
                    >
                      Fit {String(index + 1).padStart(2, "0")}
                    </div>
                  )}
                </div>
                <div>
                    <strong style={{ display: "block", fontSize: 22 }}>{item.name}</strong>
                    
                  <span
                    style={{
                      display: "block",
                      marginTop: 8,
                      color: "var(--checkout-text-muted)",
                    }}
                  >
                    {item.quantity} unidad{item.quantity === 1 ? "" : "es"}
                  </span>
                </div>
                <strong style={{ fontSize: 22 }}>{money(item.price * item.quantity)}</strong>
              </article>
            ))}
          </div>
        </div>

        <aside
          className="checkout-review-sidebar"
          style={{
            ...checkoutPanelStyle,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minHeight: 0,
            maxHeight: rightColumnHeight ?? undefined,
            height: rightColumnHeight ?? undefined,
          }}
        >
          <div className="checkout-review-sidebar-scroll" style={{ display: "grid", gap: 18, minHeight: 0 }}>
            {isBankTransfer ? (
              <div style={summaryCardStyle}>
                <strong style={{ fontSize: 18 }}>Transferencia bancaria</strong>
                <p style={{ margin: 0, color: "var(--checkout-text-muted)", lineHeight: 1.7 }}>
                  Alias: asphalt.tienda
                  <br />
                  Banco: Banco Galicia
                  <br />
                  Titular: Asphalt Store
                </p>
                <input
                  value={transferReference}
                  onChange={(event) => setTransferReference(event.target.value)}
                  placeholder="Referencia o numero de operacion"
                  style={transferFieldStyle}
                />
                <textarea
                  value={transferNotes}
                  onChange={(event) => setTransferNotes(event.target.value)}
                  placeholder="Notas para el comercio (opcional)"
                  rows={3}
                  style={{ ...transferFieldStyle, resize: "vertical", minHeight: 92 }}
                />
                <label style={uploadFieldStyle}>
                  <span style={{ color: "var(--checkout-text-strong)", fontWeight: 700 }}>
                    {transferProofFile ? transferProofFile.name : "Subir comprobante"}
                  </span>
                  <span style={{ color: "var(--checkout-text-muted)" }}>
                    JPG, PNG o PDF del comprobante de transferencia
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(event) => setTransferProofFile(event.target.files?.[0] ?? null)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            ) : isCashPayment ? (
              <div style={summaryCardStyle}>
                <strong style={{ fontSize: 18 }}>Pago en efectivo</strong>
                <p style={{ margin: 0, color: "var(--checkout-text-muted)", lineHeight: 1.7 }}>
                  El pedido quedara reservado para que puedas abonarlo en efectivo
                  al momento del retiro en el local.
                </p>
              </div>
            ) : null}

            <div
              style={{
                ...summaryCardStyle,
                border: useDarkCompletionPopup
                  ? "1px solid rgba(255,255,255,0.1)"
                  : summaryCardStyle.border,
                background: useDarkCompletionPopup ? "rgba(255,255,255,0.06)" : summaryCardStyle.background,
              }}
            >
              <strong style={{ fontSize: 18 }}>Promociones</strong>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setDiscountError(null);
                    }}
                    placeholder="Ingresa tu cupon"
                    style={{ ...transferFieldStyle, flex: "1 1 220px" }}
                  />
                  <button
                    type="button"
                    onClick={() => void previewDiscount(couponCode)}
                    disabled={discountLoading || !couponCode.trim()}
                    style={primaryActionStyle}
                  >
                    {discountLoading ? "Aplicando..." : "Aplicar"}
                  </button>
                  {discountPreview?.source === "coupon" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCouponCode("");
                        setDiscountError(null);
                        void previewDiscount();
                      }}
                      style={secondaryActionStyle}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>

                {discountMessage ? (
                  <p style={{ margin: 0, color: "var(--checkout-text-muted)", lineHeight: 1.7 }}>
                    {discountMessage}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "var(--checkout-text-muted)", lineHeight: 1.7 }}>
                    Si tienes un cupon, aplicalo aca. Las promociones automaticas se calculan solas.
                  </p>
                )}

                {discountError ? (
                  <p style={{ margin: 0, color: "#ffb7b7", lineHeight: 1.6 }}>
                    {discountError}
                  </p>
                ) : null}
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--checkout-text-muted)" }}>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              {baseDiscountAmount > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "var(--checkout-text-muted)" }}>
                    {discountPreview?.source === "coupon"
                      ? `Descuento (${discountPreview.code})`
                      : "Descuento automatico"}
                  </span>
                  <strong>-{money(baseDiscountAmount)}</strong>
                </div>
              ) : null}
              {paymentMethodDiscountAmount > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "var(--checkout-text-muted)" }}>
                    Descuento por transferencia
                    {discountPreview?.paymentMethodDiscountPercentage
                      ? ` (${discountPreview.paymentMethodDiscountPercentage}%)`
                      : ""}
                  </span>
                  <strong>-{money(paymentMethodDiscountAmount)}</strong>
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--checkout-text-muted)" }}>Envio</span>
                <strong>
                  {discountPreview?.freeShipping && baseShippingCost > 0
                    ? "Gratis"
                    : money(shippingCost)}
                </strong>
              </div>
              <div style={{ height: 1, background: "var(--checkout-border)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span>Total</span>
                <strong style={{ fontSize: 28 }}>{money(total)}</strong>
              </div>
            </div>

            {paymentMethod === "mercadopago" ? (
              <div style={summaryCardStyle}>
                <MercadoPagoCardPayment
                  amount={total}
                  payerEmail={user?.email}
                  disabled={loading}
                  onProcessingChange={setLoading}
                  onError={(message) =>
                    setCheckoutError({
                      title: "No pudimos procesar el pago con tarjeta",
                      message,
                    })
                  }
                  onSubmit={handleMercadoPagoPayment}
                />
              </div>
            ) : null}
          </div>

          {paymentMethod === "mercadopago" ? null : (
            <div style={{ paddingTop: 4 }}>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{ ...primaryActionStyle, width: "100%" }}
              >
                {loading ? "Procesando compra..." : "Confirmar compra"}
              </button>
            </div>
          )}
        </aside>
      </section>

      <section
          style={{
            marginTop: 22,
            ...checkoutPanelStyle,
            padding: 28,
            display: "grid",
            gap: 18,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              fontSize: 12,
              color: "var(--checkout-text-muted)",
            }}
          >
            Confirmacion de entrega y pago
          </p>
          <h3
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(1.6rem, 2.4vw, 2.2rem)",
              color: "var(--checkout-text-strong)",
            }}
          >
            Todo el contexto importante, en una sola lectura
          </h3>
        </div>

        <div
          className="layout-two-col"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={summaryCardStyle}>
            <strong style={{ fontSize: 18 }}>Direccion de entrega</strong>
            <p style={{ margin: 0, color: "var(--checkout-text-muted)", lineHeight: 1.8 }}>
              {address.firstName} {address.lastName}
              {address.phone ? (
                <>
                  <br />
                  {address.phone}
                </>
              ) : null}
              <br />
              {address.address1}
              {address.address2 ? (
                <>
                  <br />
                  {address.address2}
                </>
              ) : null}
              <br />
              {address.city}
              {address.state ? `, ${address.state}` : ""}, {address.country}
              <br />
              CP {address.zip}
            </p>
          </div>

          <div style={summaryCardStyle}>
            <strong style={{ fontSize: 18 }}>Envio y metodo de pago</strong>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <span style={{ display: "block", color: "var(--checkout-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 6 }}>
                  Envio
                </span>
                <p style={{ margin: 0, color: "var(--checkout-text-muted)", lineHeight: 1.8 }}>
                  {getCheckoutShippingLabel(shippingOption)}
                  <br />
                  {getCheckoutShippingEta(shippingOption)}
                </p>
              </div>
              <div style={{ height: 1, background: "var(--checkout-border)" }} />
              <div>
                <span style={{ display: "block", color: "var(--checkout-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 6 }}>
                  Pago
                </span>
                <p style={{ margin: 0, color: "var(--checkout-text-muted)", lineHeight: 1.8 }}>
                  {paymentDisplayLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {completedOrder ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(4,4,4,0.62)",
            backdropFilter: "blur(10px)",
          }}
        >
          <article
            style={{
              width: "min(100%, 640px)",
              borderRadius: 32,
              border: useDarkCompletionPopup
                ? "1px solid rgba(255,255,255,0.12)"
                : "1px solid color-mix(in srgb, var(--accent-strong) 14%, transparent)",
              background: useDarkCompletionPopup ? "#121212" : "var(--paper)",
              padding: "32px clamp(22px, 5vw, 36px)",
              display: "grid",
              gap: 18,
              boxShadow: "0 36px 90px rgba(0,0,0,0.45)",
              color: useDarkCompletionPopup ? "#f5efe7" : "var(--accent-strong)",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.24em",
                  fontSize: 12,
                  color: useDarkCompletionPopup
                    ? "rgba(245,239,231,0.62)"
                    : "color-mix(in srgb, var(--accent-strong) 68%, transparent)",
                }}
              >
                Compra confirmada
              </p>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  color: useDarkCompletionPopup ? "#f5efe7" : "var(--accent-strong)",
                }}
              >
                {isBankTransfer
                  ? "Pedido creado y comprobante enviado"
                  : completedPaymentStatus === "pending" || completedPaymentStatus === "in_process"
                    ? "Tu pago quedo en revision"
                    : "Felicidades por tu compra"}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: useDarkCompletionPopup
                    ? "rgba(245,239,231,0.78)"
                    : "color-mix(in srgb, var(--accent-strong) 72%, transparent)",
                  lineHeight: 1.8,
                }}
              >
                {isBankTransfer
                  ? `Tu pedido #${completedOrder.id} ya quedo registrado. El comercio recibio tu comprobante y ahora puede validar la transferencia.`
                  : isCashPayment
                    ? `Tu pedido #${completedOrder.id} ya quedo registrado para retiro en local. El pago quedo marcado como pendiente para abonarlo en efectivo al retirar.`
                  : completedPaymentStatus === "pending" || completedPaymentStatus === "in_process"
                    ? `Tu pedido #${completedOrder.id} ya quedo registrado. Mercado Pago indico que el pago sigue pendiente de confirmacion, asi que vas a poder seguir su estado desde el detalle del pedido.`
                    : `Tu pedido #${completedOrder.id} ya quedo registrado y el pago figura como confirmado. Desde aca puedes abrir el detalle para revisar productos, direccion, comprobante y seguimiento.`}
              </p>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <span style={{ color: useDarkCompletionPopup ? "rgba(245,239,231,0.66)" : "rgba(247,241,232,0.66)" }}>Total</span>
                <strong>{money(completedOrder.total)}</strong>
              </div>
              {Number(completedOrder.discountAmount ?? 0) > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ color: useDarkCompletionPopup ? "rgba(245,239,231,0.66)" : "rgba(247,241,232,0.66)" }}>
                    {completedOrder.discountCode
                      ? `Descuento (${completedOrder.discountCode})`
                      : "Descuento aplicado"}
                  </span>
                  <strong>-{money(completedOrder.discountAmount)}</strong>
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <span style={{ color: useDarkCompletionPopup ? "rgba(245,239,231,0.66)" : "rgba(247,241,232,0.66)" }}>Entrega</span>
                <strong>{[completedOrder.shippingProvider, completedOrder.shippingMethod].filter(Boolean).join(" · ")}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <span style={{ color: useDarkCompletionPopup ? "rgba(245,239,231,0.66)" : "rgba(247,241,232,0.66)" }}>Pago</span>
                <strong>{paymentDisplayLabel}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void openReceipt(completedOrder.id)}
                style={
                  useDarkCompletionPopup
                    ? {
                        ...primaryActionStyle,
                        background: "#f5efe7",
                        color: "#121212",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }
                    : primaryActionStyle
                }
              >
                Descargar comprobante
              </button>
              <button
                type="button"
                onClick={() => goToOrderDetail(completedOrder.id)}
                style={
                  useDarkCompletionPopup
                    ? {
                        ...secondaryActionStyle,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#f5efe7",
                      }
                    : secondaryActionStyle
                }
              >
                Ver pedido ahora
              </button>
            </div>

            <button
              type="button"
              onClick={() => goToOrderDetail(completedOrder.id)}
              style={{
                width: "fit-content",
                padding: 0,
                border: "none",
                background: "transparent",
                color: useDarkCompletionPopup
                  ? "rgba(245,239,231,0.62)"
                  : "color-mix(in srgb, var(--accent-strong) 62%, transparent)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cerrar popup
            </button>
          </article>
        </div>
      ) : null}
    </>
  );
}

const summaryCardStyle: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid var(--checkout-border)",
  background: "var(--checkout-card-bg)",
  padding: 20,
  display: "grid",
  gap: 12,
};

const transferFieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--checkout-border)",
  background: "var(--checkout-field-bg)",
  color: "var(--checkout-field-color)",
  outline: "none",
};

const uploadFieldStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px dashed var(--checkout-border-strong)",
  background: "var(--checkout-card-alt-bg)",
  padding: 16,
  display: "grid",
  gap: 6,
  cursor: "pointer",
};

const primaryActionStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  background: "var(--checkout-primary-bg)",
  color: "var(--checkout-primary-color)",
  padding: "14px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryActionStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--checkout-secondary-bg)",
  color: "var(--checkout-secondary-color)",
  padding: "14px 18px",
  cursor: "pointer",
};

const checkoutPanelStyle: React.CSSProperties = {
  borderRadius: 32,
  border: "1px solid var(--checkout-border)",
  background: "var(--checkout-panel-bg)",
  color: "var(--checkout-text-strong)",
};
