import type { CustomerOrder } from "./order-utils";

export type AdminShipmentTrackingEvent = {
  id: string;
  status: string;
  description?: string | null;
  location?: string | null;
  createdAt: string;
};

export type AdminShipment = {
  id: string;
  orderId: number;
  provider: string;
  method: string;
  carrier?: string | null;
  externalShipmentId?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  labelFormat?: string | null;
  internalNotes?: string | null;
  status: string;
  weight?: number | null;
  shippingAddress: string;
  postalCode: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: number;
    shippingMethod?: string | null;
    shippingFirstNameSnapshot?: string | null;
    shippingLastNameSnapshot?: string | null;
    shippingPhoneSnapshot?: string | null;
    shippingAddress1Snapshot?: string | null;
    shippingAddress2Snapshot?: string | null;
    shippingCitySnapshot?: string | null;
    shippingStateSnapshot?: string | null;
    shippingPostalCodeSnapshot?: string | null;
    shippingCountrySnapshot?: string | null;
  };
  trackingEvents?: AdminShipmentTrackingEvent[];
};

export type AdminStoreShippingMethod = {
  id: string;
  storeId: number;
  name: string;
  type: "pickup" | "manual" | "free" | "coordinar";
  price: number;
  description?: string | null;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminReturnItem = {
  id: number;
  orderItemId: number;
  quantity: number;
};

export type AdminRefund = {
  id: number;
  amount: string | number;
  createdAt: string;
};

export type AdminReturn = {
  id: number;
  orderId: number;
  reason?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: AdminReturnItem[];
  refund?: AdminRefund | null;
};

export type AdminCancellationRequest = {
  id: number;
  orderId: number;
  customerId: number;
  reason?: string | null;
  status: "requested" | "approved" | "rejected" | "refunded";
  refundAmount?: string | number | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  customer?: {
    id: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  order?: {
    id: number;
    status: string;
    total: string | number;
    createdAt: string;
    shippingProvider?: string | null;
    shippingMethod?: string | null;
  };
};

export type AdminSection =
  | "admin-overview"
  | "admin-products"
  | "admin-categories"
  | "admin-orders"
  | "admin-customers"
  | "admin-shipments"
  | "admin-returns"
  | "admin-promotions";

export type AdminPromotion = {
  id: number;
  name: string;
  scope: "order" | "product" | "category" | "variant" | "option" | "option_value";
  type: "percentage" | "fixed_amount" | "free_shipping";
  value?: number | null;
  minimumAmount?: number | null;
  automatic: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  coupons?: Array<{
    id: number;
    code: string;
    usageLimit?: number | null;
    usedCount: number;
  }>;
  productTargets?: Array<{
    productId: number;
    product: { id: number; title: string; slug: string };
  }>;
  categoryTargets?: Array<{
    categoryId: number;
    category: { id: number; name: string; slug: string };
  }>;
  variantTargets?: Array<{
    variantId: number;
    variant: {
      id: number;
      sku: string;
      Size?: string | null;
      Color?: string | null;
      product: { id: number; title: string };
    };
  }>;
  optionTargets?: Array<{
    productOptionId: number;
    productOption: { id: number; name: string };
  }>;
  optionValueTargets?: Array<{
    productOptionId: number;
    value: string;
    productOption: { id: number; name: string };
  }>;
};

export type OrderLookup = Map<number, CustomerOrder>;
