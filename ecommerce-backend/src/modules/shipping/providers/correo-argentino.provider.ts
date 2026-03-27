import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

import {
  ProviderShipment,
  ProviderTrackingEvent,
  ResolvedShippingProviderConfig,
  ShipmentCancellation,
  ShippingProvider,
  ShippingProviderContext,
  ShippingRate,
  ShippingRateRequest,
  ShipmentProvisionRequest,
  ShipmentTrackingSnapshot,
} from './shipping-provider.interface';

type CorreoArgentinoRuntimeConfig = {
  mode: 'MICORREO' | 'PAQAR_API';
  apiBaseUrl: string;
  apiUsername: string;
  apiPassword: string;
  customerEmail: string;
  customerPassword: string;
  customerId: string;
  agreement: string;
  originBranch: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  companyName: string;
  defaultAgency: string;
  productType: string;
  weightUnit: 'g' | 'kg';
  metadata: Record<string, unknown>;
};

type MiCorreoTokenResponse = {
  token: string;
  expires?: string;
};

type MiCorreoValidateUserResponse = {
  customerId?: string;
  id?: string;
  email?: string;
};

type MiCorreoRate = {
  deliveredType?: string;
  deliveryType?: string;
  productType?: string;
  productName?: string;
  price?: number | string;
  deliveryTimeMin?: number | string;
  deliveryTimeMax?: number | string;
};

type MiCorreoTrackingResponse =
  | {
      id?: string | null;
      productId?: string | null;
      trackingNumber?: string | null;
      events?: Array<{
        event?: string | null;
        date?: string | null;
        branch?: string | null;
        status?: string | null;
        sign?: string | null;
      }>;
      error?: string | null;
      code?: string | number | null;
    }
  | Array<{
      id?: string | null;
      productId?: string | null;
      trackingNumber?: string | null;
      events?: Array<{
        event?: string | null;
        date?: string | null;
        branch?: string | null;
        status?: string | null;
        sign?: string | null;
      }>;
    }>;

@Injectable()
export class CorreoArgentinoProvider implements ShippingProvider {
  readonly providerCode = 'correo-argentino';
  private readonly tokenCache = new Map<
    string,
    { token: string; expiresAt: number }
  >();
  private readonly customerIdCache = new Map<string, string>();

  async getRates(
    data: ShippingRateRequest,
    context?: ShippingProviderContext,
  ): Promise<ShippingRate[]> {
    const config = this.getConfig(context?.config);

    if (config.mode !== 'MICORREO') {
      throw new NotImplementedException(
        `Correo Argentino ${config.mode} is not implemented yet. This provider currently supports MICORREO only.`,
      );
    }

    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const originPostalCode = this.getOriginPostalCode(config);
    const dimensions = this.buildDimensions(data.weight, config.weightUnit);

    try {
      const response = await axios.post(
        this.buildUrl(config.apiBaseUrl, '/rates'),
        {
          customerId,
          postalCodeOrigin: originPostalCode,
          postalCodeDestination: data.postalCode,
          dimensions,
        },
        this.buildJsonHeaders(token),
      );

      const rates = Array.isArray(response.data?.rates)
        ? response.data.rates
        : [];

      return rates.map((rate: MiCorreoRate) => {
        const deliveryType = this.normalizeDeliveryType(
          rate.deliveredType || rate.deliveryType,
        );
        const productType = this.pickString(rate.productType) || config.productType;
        const productName =
          this.pickString(rate.productName) || 'Correo Argentino';
        const estimatedDays = this.computeEstimatedDays(
          rate.deliveryTimeMin,
          rate.deliveryTimeMax,
        );

        return {
          provider: this.providerCode,
          method: `${productName} · ${deliveryType === 'S' ? 'Sucursal' : 'Domicilio'}`,
          price: Number(rate.price ?? 0),
          estimatedDays,
          carrierId: this.providerCode,
          carrierName: 'Correo Argentino',
          serviceCode: productType,
          modalityCode: deliveryType,
          dispatchType: deliveryType,
          branchId:
            deliveryType === 'S'
              ? this.pickString(config.defaultAgency) || null
              : null,
        };
      });
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error fetching shipping rates from Correo Argentino MiCorreo',
      );
    }
  }

  async createShipment(
    data: ShipmentProvisionRequest,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);

    if (config.mode !== 'MICORREO') {
      throw new NotImplementedException(
        `Correo Argentino ${config.mode} is not implemented yet. This provider currently supports MICORREO only.`,
      );
    }

    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const shipping = this.buildShippingPayload(data, config);
    const payload = {
      customerId,
      extOrderId: this.buildExternalOrderId(data),
      orderNumber: String(data.orderId),
      sender: this.buildSenderPayload(config),
      recipient: this.buildRecipientPayload(data),
      shipping,
    };

    try {
      const response = await axios.post(
        this.buildUrl(config.apiBaseUrl, '/shipping/import'),
        payload,
        this.buildJsonHeaders(token),
      );

      return {
        provider: this.providerCode,
        method: data.method,
        carrier: data.carrierName || 'Correo Argentino',
        externalShipmentId: payload.extOrderId,
        trackingNumber: payload.extOrderId,
        trackingUrl: this.buildTrackingUrl(payload.extOrderId, config),
        labelUrl: null,
        labelFormat: null,
        status: 'created',
        cost: data.value,
        payload: {
          importRequest: payload,
          importResponse: response.data,
        },
        events: [
          {
            status: 'created',
            description:
              'Envio importado correctamente en Correo Argentino MiCorreo.',
          },
        ],
      };
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error importing shipment into Correo Argentino MiCorreo',
      );
    }
  }

  async getTracking(
    data: ShipmentTrackingSnapshot,
    context?: ShippingProviderContext,
  ): Promise<ProviderTrackingEvent[]> {
    const detail = await this.getShipmentDetailFromSnapshot(data, context);

    return detail.events ?? [];
  }

  async getShipmentDetail(
    shipmentId: string,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment> {
    return this.getShipmentDetailFromSnapshot(
      {
        externalShipmentId: shipmentId,
      },
      context,
    );
  }

  async cancelShipment(
    shipmentId: string,
    context?: ShippingProviderContext,
  ): Promise<ShipmentCancellation> {
    const config = this.getConfig(context?.config);

    throw new NotImplementedException(
      `Correo Argentino ${config.mode} shipment cancellation is not implemented because MiCorreo public documentation does not expose a cancellation endpoint for this integration.`,
    );
  }

  async testConnection(context?: ShippingProviderContext) {
    const config = this.getConfig(context?.config);

    if (config.mode !== 'MICORREO') {
      throw new NotImplementedException(
        `Correo Argentino ${config.mode} is not implemented yet. This provider currently supports MICORREO only.`,
      );
    }

    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);

    return {
      ok: true,
      message: 'Correo Argentino MiCorreo credentials are valid',
      details: {
        customerId,
        mode: config.mode,
        apiBaseUrl: config.apiBaseUrl,
      },
    };
  }

  private async getShipmentDetailFromSnapshot(
    data: ShipmentTrackingSnapshot,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);

    if (config.mode !== 'MICORREO') {
      throw new NotImplementedException(
        `Correo Argentino ${config.mode} is not implemented yet. This provider currently supports MICORREO only.`,
      );
    }

    const shippingId =
      data.externalShipmentId?.trim() || data.trackingNumber?.trim() || '';

    if (!shippingId) {
      return {
        provider: this.providerCode,
        method: 'Correo Argentino',
        carrier: 'Correo Argentino',
        events: [],
      };
    }

    const token = await this.getAccessToken(config);

    try {
      const response = await axios.get(
        this.buildUrl(config.apiBaseUrl, '/shipping/tracking'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          data: {
            shippingId,
          },
        },
      );

      const trackingEntry = this.extractTrackingEntry(response.data);
      const trackingNumber = this.pickString(trackingEntry.trackingNumber) || shippingId;
      const events = Array.isArray(trackingEntry.events)
        ? trackingEntry.events.map((event) => ({
            status: this.normalizeTrackingStatus(event.event, event.status),
            description: this.buildTrackingDescription(event),
            location: this.pickString(event.branch) || undefined,
            occurredAt: this.parseTrackingDate(event.date),
          }))
        : [];
      const latestEvent = events.at(-1);

      return {
        provider: this.providerCode,
        method: 'Correo Argentino',
        carrier: 'Correo Argentino',
        externalShipmentId: shippingId,
        trackingNumber,
        trackingUrl: this.buildTrackingUrl(shippingId, config),
        labelUrl: null,
        labelFormat: null,
        status: latestEvent?.status || 'created',
        conditionCode: this.pickString(
          Array.isArray(trackingEntry.events) && trackingEntry.events.length
            ? trackingEntry.events.at(-1)?.event
            : '',
        ) || null,
        payload: response.data,
        events,
      };
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error fetching tracking from Correo Argentino MiCorreo',
      );
    }
  }

  private getConfig(
    storeConfig?: ResolvedShippingProviderConfig | null,
  ): CorreoArgentinoRuntimeConfig {
    const metadata = (storeConfig?.metadata ?? {}) as Record<string, unknown>;
    const envMetadata = this.parseJsonObject(
      process.env.CORREO_ARGENTINO_METADATA_JSON,
    );
    const mergedMetadata = {
      ...envMetadata,
      ...metadata,
    };
    const mode =
      (storeConfig?.mode?.trim().toUpperCase() as
        | 'MICORREO'
        | 'PAQAR_API'
        | undefined) ||
      (typeof mergedMetadata.mode === 'string'
        ? (mergedMetadata.mode.toUpperCase() as 'MICORREO' | 'PAQAR_API')
        : undefined) ||
      ((process.env.CORREO_ARGENTINO_MODE || 'MICORREO').trim().toUpperCase() as
        | 'MICORREO'
        | 'PAQAR_API');
    const testingEnabled =
      this.readBoolean(mergedMetadata.testing) ??
      this.readBoolean(process.env.CORREO_ARGENTINO_TESTING) ??
      true;
    const defaultBaseUrl = testingEnabled
      ? 'https://apitest.correoargentino.com.ar/micorreo/v1'
      : 'https://api.correoargentino.com.ar/micorreo/v1';

    return {
      mode,
      apiBaseUrl:
        this.pickString(mergedMetadata.apiBaseUrl) ||
        process.env.CORREO_ARGENTINO_API_BASE_URL?.trim() ||
        defaultBaseUrl,
      apiUsername:
        this.pickString(mergedMetadata.apiUsername) ||
        storeConfig?.apiKey?.trim() ||
        process.env.CORREO_ARGENTINO_API_USERNAME?.trim() ||
        process.env.CORREO_ARGENTINO_API_KEY?.trim() ||
        '',
      apiPassword:
        this.pickString(mergedMetadata.apiPassword) ||
        storeConfig?.secretKey?.trim() ||
        process.env.CORREO_ARGENTINO_API_PASSWORD?.trim() ||
        process.env.CORREO_ARGENTINO_SECRET_KEY?.trim() ||
        '',
      customerEmail:
        storeConfig?.email?.trim() ||
        this.pickString(mergedMetadata.customerEmail) ||
        this.pickString(mergedMetadata.email) ||
        process.env.CORREO_ARGENTINO_EMAIL?.trim() ||
        '',
      customerPassword:
        storeConfig?.password?.trim() ||
        this.pickString(mergedMetadata.customerPassword) ||
        this.pickString(mergedMetadata.password) ||
        process.env.CORREO_ARGENTINO_PASSWORD?.trim() ||
        '',
      customerId:
        this.pickString(mergedMetadata.customerId) ||
        process.env.CORREO_ARGENTINO_CUSTOMER_ID?.trim() ||
        '',
      agreement:
        storeConfig?.agreement?.trim() ||
        this.pickString(mergedMetadata.agreement) ||
        process.env.CORREO_ARGENTINO_AGREEMENT?.trim() ||
        '',
      originBranch:
        storeConfig?.originBranch?.trim() ||
        this.pickString(mergedMetadata.originBranch) ||
        process.env.CORREO_ARGENTINO_ORIGIN_BRANCH?.trim() ||
        '',
      senderName:
        storeConfig?.senderName?.trim() ||
        this.pickString(mergedMetadata.senderName) ||
        this.pickString(mergedMetadata.businessName) ||
        process.env.CORREO_ARGENTINO_SENDER_NAME?.trim() ||
        '',
      senderPhone:
        storeConfig?.senderPhone?.trim() ||
        this.pickString(mergedMetadata.senderPhone) ||
        process.env.CORREO_ARGENTINO_SENDER_PHONE?.trim() ||
        '',
      senderEmail:
        storeConfig?.senderEmail?.trim() ||
        this.pickString(mergedMetadata.senderEmail) ||
        process.env.CORREO_ARGENTINO_SENDER_EMAIL?.trim() ||
        '',
      companyName:
        storeConfig?.companyName?.trim() ||
        this.pickString(mergedMetadata.companyName) ||
        process.env.CORREO_ARGENTINO_COMPANY_NAME?.trim() ||
        '',
      defaultAgency:
        this.pickString(mergedMetadata.defaultAgency) ||
        this.pickString(mergedMetadata.destinationAgency) ||
        '',
      productType:
        this.pickString(mergedMetadata.productType) ||
        process.env.CORREO_ARGENTINO_PRODUCT_TYPE?.trim() ||
        'CP',
      weightUnit:
        this.pickString(mergedMetadata.weightUnit).toLowerCase() === 'g'
          ? 'g'
          : 'kg',
      metadata: mergedMetadata,
    };
  }

  private async getAccessToken(config: CorreoArgentinoRuntimeConfig) {
    this.ensureMiCorreoCredentials(config);

    const cacheKey = `${config.apiBaseUrl}|${config.apiUsername}|${config.apiPassword}`;
    const cached = this.tokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    try {
      const response = await axios.post<MiCorreoTokenResponse>(
        this.buildUrl(config.apiBaseUrl, '/token'),
        undefined,
        {
          auth: {
            username: config.apiUsername,
            password: config.apiPassword,
          },
        },
      );
      const token = this.pickString(response.data?.token);

      if (!token) {
        throw new ServiceUnavailableException(
          'Correo Argentino MiCorreo token response did not include a token',
        );
      }

      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: this.parseExpiration(response.data?.expires),
      });

      return token;
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error authenticating against Correo Argentino MiCorreo',
      );
    }
  }

  private async getCustomerId(
    config: CorreoArgentinoRuntimeConfig,
    token: string,
  ) {
    if (config.customerId) {
      return config.customerId;
    }

    const cacheKey = `${config.apiBaseUrl}|${config.customerEmail}|${config.customerPassword}`;
    const cached = this.customerIdCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    if (!config.customerEmail || !config.customerPassword) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo requires customer email and password, or a preconfigured customerId',
      );
    }

    try {
      const response = await axios.post<MiCorreoValidateUserResponse>(
        this.buildUrl(config.apiBaseUrl, '/users/validate'),
        {
          email: config.customerEmail,
          password: config.customerPassword,
        },
        this.buildJsonHeaders(token),
      );
      const customerId =
        this.pickString(response.data?.customerId) ||
        this.pickString(response.data?.id);

      if (!customerId) {
        throw new ServiceUnavailableException(
          'Correo Argentino MiCorreo user validation did not return customerId',
        );
      }

      this.customerIdCache.set(cacheKey, customerId);

      return customerId;
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error validating Correo Argentino MiCorreo user',
      );
    }
  }

  private getOriginPostalCode(config: CorreoArgentinoRuntimeConfig) {
    const originAddress = this.getOriginAddress(config);
    const postalCode = this.pickString(originAddress.postalCode);

    if (!postalCode) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo requires originAddress.postalCode in store metadata to quote shipments',
      );
    }

    return postalCode;
  }

  private getOriginAddress(config: CorreoArgentinoRuntimeConfig) {
    const raw = config.metadata.originAddress;

    return raw && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};
  }

  private buildSenderPayload(config: CorreoArgentinoRuntimeConfig) {
    const originAddress = this.getOriginAddress(config);

    return {
      name: config.senderName || config.companyName || null,
      phone: this.onlyDigits(config.senderPhone) || null,
      cellPhone: this.onlyDigits(config.senderPhone) || null,
      email: config.senderEmail || null,
      originAddress: {
        streetName: this.pickString(originAddress.streetName) || null,
        streetNumber: this.pickString(originAddress.streetNumber) || null,
        floor: this.truncate(this.pickString(originAddress.floor), 3) || null,
        apartment:
          this.truncate(this.pickString(originAddress.apartment), 3) || null,
        city: this.pickString(originAddress.city) || null,
        provinceCode:
          this.normalizeProvinceCode(this.pickString(originAddress.provinceCode)) ||
          this.normalizeProvinceCode(this.pickString(originAddress.state)) ||
          null,
        postalCode: this.pickString(originAddress.postalCode) || null,
      },
    };
  }

  private buildRecipientPayload(data: ShipmentProvisionRequest) {
    const fullName = `${data.recipient.firstName} ${data.recipient.lastName}`.trim();

    return {
      name: fullName || 'Cliente',
      phone: this.onlyDigits(data.recipient.phone) || '',
      cellPhone: this.onlyDigits(data.recipient.phone) || '',
      email: data.recipient.email || 'no-reply@example.com',
    };
  }

  private buildShippingPayload(
    data: ShipmentProvisionRequest,
    config: CorreoArgentinoRuntimeConfig,
  ) {
    const deliveryType = this.normalizeDeliveryType(
      data.modalityCode || data.dispatchType || this.extractDeliveryType(data.method),
    );
    const shippingAddress = this.splitStreetAddress(data.address.address1);
    const provinceCode = this.normalizeProvinceCode(data.address.state);
    const agency =
      deliveryType === 'S'
        ? this.pickString(data.branchId) ||
          this.pickString(config.defaultAgency) ||
          this.pickString(config.metadata.destinationAgency)
        : null;

    if (deliveryType === 'S' && !agency) {
      throw new BadRequestException(
        'Correo Argentino branch shipments require branchId/defaultAgency',
      );
    }

    if (deliveryType === 'D' && !provinceCode) {
      throw new BadRequestException(
        'Correo Argentino home delivery requires shipping state/province',
      );
    }

    return {
      deliveryType,
      agency,
      address: {
        streetName: shippingAddress.streetName,
        streetNumber: shippingAddress.streetNumber,
        floor: this.truncate(shippingAddress.floor, 3),
        apartment: this.truncate(shippingAddress.apartment, 3),
        city: data.address.city,
        provinceCode: provinceCode || 'C',
        postalCode: data.address.postalCode,
      },
      productType:
        this.pickString(data.serviceCode) || this.pickString(config.productType) || 'CP',
      weight: this.normalizeWeightToGrams(data.weight, config.weightUnit),
      declaredValue: Number(data.value.toFixed ? data.value.toFixed(2) : data.value),
      height: this.normalizeDimension(data.package.height),
      length: this.normalizeDimension(data.package.length),
      width: this.normalizeDimension(data.package.width),
    };
  }

  private buildExternalOrderId(data: ShipmentProvisionRequest) {
    const base = data.reference || `store-${data.storeId}-order-${data.orderId}`;

    return base.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60);
  }

  private buildDimensions(weight: number, unit: 'g' | 'kg') {
    return {
      weight: this.normalizeWeightToGrams(weight, unit),
      height: 10,
      width: 10,
      length: 10,
    };
  }

  private normalizeWeightToGrams(
    weight?: number,
    unitHint: 'g' | 'kg' = 'kg',
  ) {
    const safeWeight = Math.max(Number(weight || 0), 0.001);

    if (unitHint === 'g') {
      return Math.max(Math.round(safeWeight), 1);
    }

    if (safeWeight > 25) {
      return Math.max(Math.round(safeWeight), 1);
    }

    return Math.max(Math.round(safeWeight * 1000), 1);
  }

  private normalizeDimension(value?: number) {
    const safeValue = Math.max(Math.round(value ?? 10), 1);

    return Math.min(safeValue, 255);
  }

  private normalizeDeliveryType(value?: string | null) {
    const normalized = value?.trim().toUpperCase();

    return normalized === 'S' ? 'S' : 'D';
  }

  private extractDeliveryType(method: string) {
    const normalized = method.trim().toLowerCase();

    if (normalized.includes('sucursal')) {
      return 'S';
    }

    return 'D';
  }

  private computeEstimatedDays(
    min?: string | number,
    max?: string | number,
  ) {
    const parsedMax = Number(max);
    const parsedMin = Number(min);

    if (Number.isFinite(parsedMax) && parsedMax > 0) {
      return parsedMax;
    }

    if (Number.isFinite(parsedMin) && parsedMin > 0) {
      return parsedMin;
    }

    return 3;
  }

  private extractTrackingEntry(response: MiCorreoTrackingResponse) {
    if (Array.isArray(response)) {
      return response[0] || {};
    }

    return response || {};
  }

  private normalizeTrackingStatus(event?: string | null, status?: string | null) {
    const normalized = `${event || ''} ${status || ''}`.trim().toLowerCase();

    if (
      normalized.includes('entregado') ||
      normalized.includes('entrega efectuada')
    ) {
      return 'delivered';
    }

    if (
      normalized.includes('distribucion') ||
      normalized.includes('salio a reparto') ||
      normalized.includes('visita')
    ) {
      return 'out_for_delivery';
    }

    if (
      normalized.includes('transito') ||
      normalized.includes('clasificacion') ||
      normalized.includes('encaminado') ||
      normalized.includes('procesamiento')
    ) {
      return 'in_transit';
    }

    if (
      normalized.includes('imposicion') ||
      normalized.includes('admitido') ||
      normalized.includes('recepcionado')
    ) {
      return 'picked_up';
    }

    if (
      normalized.includes('devol') ||
      normalized.includes('retorno') ||
      normalized.includes('devuelto')
    ) {
      return 'returned';
    }

    if (
      normalized.includes('caduca') ||
      normalized.includes('cancel') ||
      normalized.includes('rechaz') ||
      normalized.includes('no existe')
    ) {
      return 'failed';
    }

    if (normalized.includes('preimposicion')) {
      return 'created';
    }

    return 'created';
  }

  private buildTrackingDescription(event: {
    event?: string | null;
    status?: string | null;
    sign?: string | null;
  }) {
    const parts = [event.event, event.status, event.sign]
      .map((value) => this.pickString(value))
      .filter(Boolean);

    return parts.length ? parts.join(' - ') : 'Tracking update';
  }

  private parseTrackingDate(value?: string | null) {
    const text = this.pickString(value);

    if (!text) {
      return undefined;
    }

    const [datePart, timePart = '00:00'] = text.split(' ');
    const [day, month, year] = datePart.split('-');

    if (!day || !month || !year) {
      return text;
    }

    return new Date(`${year}-${month}-${day}T${timePart}:00-03:00`);
  }

  private buildTrackingUrl(
    shippingId: string,
    config: CorreoArgentinoRuntimeConfig,
  ) {
    const publicUrl =
      this.pickString(config.metadata.publicTrackingBaseUrl) ||
      this.pickString(process.env.CORREO_ARGENTINO_PUBLIC_TRACKING_BASE_URL) ||
      '';

    if (!publicUrl) {
      return null;
    }

    return `${publicUrl.replace(/\/$/, '')}/${encodeURIComponent(shippingId)}`;
  }

  private splitStreetAddress(address1: string) {
    const clean = address1.trim();
    const match = clean.match(/^(.*?)(\d{1,6})(?:\s+(.*))?$/);

    if (!match) {
      return {
        streetName: clean || 'Sin calle',
        streetNumber: '0',
        floor: '',
        apartment: '',
      };
    }

    return {
      streetName: match[1].trim() || 'Sin calle',
      streetNumber: match[2],
      floor: '',
      apartment: this.pickString(match[3]),
    };
  }

  private normalizeProvinceCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase();

    if (!normalized) return null;

    const map: Record<string, string> = {
      C: 'C',
      CABA: 'C',
      'CIUDAD AUTONOMA DE BUENOS AIRES': 'C',
      'CIUDAD AUTÓNOMA DE BUENOS AIRES': 'C',
      'CAPITAL FEDERAL': 'C',
      'BUENOS AIRES': 'B',
      B: 'B',
      CATAMARCA: 'K',
      K: 'K',
      CHACO: 'H',
      H: 'H',
      CHUBUT: 'U',
      U: 'U',
      CORDOBA: 'X',
      'CÓRDOBA': 'X',
      X: 'X',
      CORRIENTES: 'W',
      W: 'W',
      'ENTRE RIOS': 'E',
      'ENTRE RÍOS': 'E',
      ENTRE_RIOS: 'E',
      E: 'E',
      FORMOSA: 'P',
      P: 'P',
      JUJUY: 'Y',
      Y: 'Y',
      'LA PAMPA': 'L',
      LA_PAMPA: 'L',
      L: 'L',
      'LA RIOJA': 'F',
      LA_RIOJA: 'F',
      F: 'F',
      MENDOZA: 'M',
      M: 'M',
      MISIONES: 'N',
      N: 'N',
      NEUQUEN: 'Q',
      'NEUQUÉN': 'Q',
      Q: 'Q',
      'RIO NEGRO': 'R',
      RIO_NEGRO: 'R',
      R: 'R',
      SALTA: 'A',
      A: 'A',
      'SAN JUAN': 'J',
      SAN_JUAN: 'J',
      J: 'J',
      'SAN LUIS': 'D',
      SAN_LUIS: 'D',
      D: 'D',
      'SANTA CRUZ': 'Z',
      SANTA_CRUZ: 'Z',
      Z: 'Z',
      'SANTA FE': 'S',
      SANTA_FE: 'S',
      S: 'S',
      'SANTIAGO DEL ESTERO': 'G',
      SANTIAGO_DEL_ESTERO: 'G',
      G: 'G',
      'TIERRA DEL FUEGO': 'V',
      TIERRA_DEL_FUEGO: 'V',
      V: 'V',
      TUCUMAN: 'T',
      'TUCUMÁN': 'T',
      T: 'T',
    };

    return map[normalized] || normalized;
  }

  private buildUrl(baseUrl: string, path: string) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private buildJsonHeaders(token: string) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  private ensureMiCorreoCredentials(config: CorreoArgentinoRuntimeConfig) {
    if (!config.apiUsername || !config.apiPassword) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo requires apiUsername/apiPassword. Use metadata.apiUsername/apiPassword or apiKey/secretKey fields in the store config.',
      );
    }
  }

  private parseExpiration(value?: string) {
    if (!value?.trim()) {
      return Date.now() + 4 * 60 * 60 * 1000;
    }

    const normalized = value.trim().replace(' ', 'T');
    const parsed = Date.parse(`${normalized}-03:00`);

    if (Number.isNaN(parsed)) {
      return Date.now() + 4 * 60 * 60 * 1000;
    }

    return parsed;
  }

  private parseJsonObject(value: string | undefined) {
    if (!value?.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private readBoolean(value: unknown) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value.trim().toLowerCase() === 'true') return true;
      if (value.trim().toLowerCase() === 'false') return false;
    }

    return undefined;
  }

  private onlyDigits(value?: string | null) {
    const digits = (value || '').replace(/\D+/g, '');

    return digits || '';
  }

  private truncate(value: string, length: number) {
    return value ? value.slice(0, length) : '';
  }

  private pickString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private rethrowProviderError(error: unknown, fallbackMessage: string): never {
    if (axios.isAxiosError(error)) {
      const providerMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.code ||
        error.message;

      throw new InternalServerErrorException(providerMessage || fallbackMessage);
    }

    if (error instanceof Error) {
      throw new InternalServerErrorException(error.message || fallbackMessage);
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
