export interface ShippingRate {
  provider: string;
  method: string;
  price: number;
  estimatedDays: number;
  quoteId?: string;
  description?: string;
  storeShippingMethodId?: string | null;
  methodType?: string | null;
  carrierId?: string;
  carrierName?: string;
  serviceCode?: string;
  modalityCode?: string;
  dispatchType?: string;
  branchId?: string | null;
  sellerCost?: number | null;
  metadata?: Record<string, unknown> | null;
}

export type ShippingRateRequest = {
  postalCode: string;
  weight: number;
  value: number;
  state?: string;
  city?: string;
  country?: string;
};

export type ShippingAgencyLookupRequest = {
  provinceCode?: string | null;
  state?: string | null;
  postalCode?: string | null;
  city?: string | null;
  service?: string | null;
};

export type ShippingAgency = {
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  packageReception?: boolean;
  pickupAvailability?: boolean;
  raw?: Record<string, unknown> | null;
};

export type ResolvedShippingProviderConfig = {
  id?: string | null;
  storeId?: number;
  provider: string;
  enabled?: boolean;
  isDefault?: boolean;
  mode?: string | null;
  email?: string | null;
  password?: string | null;
  agreement?: string | null;
  apiKey?: string | null;
  secretKey?: string | null;
  originBranch?: string | null;
  originAddressId?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
  companyName?: string | null;
  metadata?: Record<string, unknown> | null;
  source: 'store' | 'env';
};

export type ShippingProviderContext = {
  storeId?: number;
  config?: ResolvedShippingProviderConfig | null;
};

export type ShipmentProvisionRequest = {
  orderId: number;
  storeId: number;
  reference: string;
  provider?: string | null;
  carrierId?: string | null;
  carrierName?: string | null;
  method: string;
  serviceCode?: string | null;
  modalityCode?: string | null;
  dispatchType?: string | null;
  branchId?: string | null;
  weight?: number;
  value: number;
  recipient: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
  address: {
    address1: string;
    address2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
  };
  package: {
    width?: number;
    height?: number;
    length?: number;
  };
};

export type ShipmentTrackingSnapshot = {
  externalShipmentId?: string | null;
  trackingNumber?: string | null;
};

export type ProviderTrackingEvent = {
  status: string;
  description?: string | null;
  location?: string | null;
  occurredAt?: string | Date | null;
};

export type ProviderShipment = {
  provider: string;
  method: string;
  carrier?: string | null;
  externalShipmentId?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  labelFormat?: string | null;
  status?: string | null;
  cost?: number | null;
  conditionCode?: string | null;
  payload?: unknown;
  events?: ProviderTrackingEvent[];
};

export type ShipmentCancellation = {
  cancelled: boolean;
  externalShipmentId?: string | null;
  status?: string | null;
  payload?: unknown;
};

export interface ShippingProvider {
  readonly providerCode: string;
  getRates(
    data: ShippingRateRequest,
    context?: ShippingProviderContext,
  ): Promise<ShippingRate[]>;
  getAgencies?(
    data: ShippingAgencyLookupRequest,
    context?: ShippingProviderContext,
  ): Promise<ShippingAgency[]>;
  createShipment?(
    data: ShipmentProvisionRequest,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment>;
  getTracking?(
    data: ShipmentTrackingSnapshot,
    context?: ShippingProviderContext,
  ): Promise<ProviderTrackingEvent[]>;
  getShipmentDetail?(
    shipmentId: string,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment>;
  cancelShipment?(
    shipmentId: string,
    context?: ShippingProviderContext,
  ): Promise<ShipmentCancellation>;
  testConnection?(
    context?: ShippingProviderContext,
  ): Promise<{ ok: boolean; message: string; details?: unknown }>;
}
