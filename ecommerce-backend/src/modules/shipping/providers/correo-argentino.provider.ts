import { execFile } from 'child_process';
import {
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  ProviderShipment,
  ProviderTrackingEvent,
  ResolvedShippingProviderConfig,
  ShipmentCancellation,
  ShippingAgency,
  ShippingAgencyLookupRequest,
  ShippingProvider,
  ShippingProviderContext,
  ShippingRate,
  ShippingRateRequest,
  ShipmentProvisionRequest,
  ShipmentTrackingSnapshot,
} from './shipping-provider.interface';

type RuntimeConfig = {
  mode: 'MICORREO' | 'PAQAR_API';
  apiBaseUrl: string;
  apiUsername: string;
  apiPassword: string;
  customerEmail: string;
  customerPassword: string;
  customerId: string;
  agreement: string;
  apiKey: string;
  secretKey: string;
  paqarApiBaseUrl: string;
  paqarAgreement: string;
  paqarApiKey: string;
  paqarSellerId: string;
  defaultAgency: string;
  productType: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  companyName: string;
  weightUnit: 'g' | 'kg';
  metadata: Record<string, unknown>;
};

type LabelDocument = NonNullable<ProviderShipment['labelDocument']>;

@Injectable()
export class CorreoArgentinoProvider implements ShippingProvider {
  readonly providerCode = 'correo-argentino';
  private readonly logger = new Logger(CorreoArgentinoProvider.name);
  private readonly tokenCache = new Map<string, { token: string; expiresAt: number }>();
  private readonly customerIdCache = new Map<string, string>();

  async getRates(
    data: ShippingRateRequest,
    context?: ShippingProviderContext,
  ): Promise<ShippingRate[]> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config, 'cotizar envios');
    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const types = this.getQuotedDeliveryTypes(config);
    const postalCodeOrigin = this.getOriginPostalCode(config);

    const responses = await Promise.all(
      types.map(async (deliveryType) => {
        const dimensions = this.buildQuoteDimensions(data, config);
        const payload = {
          customerId,
          postalCodeOrigin,
          postalCodeDestination: data.postalCode,
          deliveredType: deliveryType,
          dimensions,
        };

        this.logRequest('POST', this.url(config.apiBaseUrl, '/rates'), payload);

        try {
          const response = await axios.post(
            this.url(config.apiBaseUrl, '/rates'),
            payload,
            {
              ...this.miCorreoAuth(token),
              timeout: 20_000,
              validateStatus: (status) => status >= 200 && status < 300,
            },
          );

          this.logResponse(
            'POST',
            this.url(config.apiBaseUrl, '/rates'),
            response.status,
            response.data,
          );

          return response;
        } catch (error) {
          this.fail(
            error,
            'Error fetching shipping rates from Correo Argentino MiCorreo (/rates)',
          );
        }
      }),
    );

    const pricing =
      config.metadata.pricing && typeof config.metadata.pricing === 'object'
        ? (config.metadata.pricing as Record<string, unknown>)
        : {};
    const markupType = this.text(pricing.markupType) || 'percentage';
    const markupValue = Number(pricing.markupValue ?? 0);
    const freeShippingThreshold = Number(pricing.freeShippingThreshold ?? 0);
    const isFreeShipping =
      freeShippingThreshold > 0 && data.value >= freeShippingThreshold;

    const seen = new Set<string>();
    return responses.flatMap((response, index) =>
      (Array.isArray(response.data?.rates) ? response.data.rates : []).flatMap(
        (rate: any) => {
          const deliveryType = this.deliveryType(
            rate.deliveredType || rate.deliveryType || types[index],
          );
          const rawPrice = Number(rate.price ?? 0);
          const price = isFreeShipping
            ? 0
            : this.applyMarkup(rawPrice, markupType, markupValue);
          const mapped: ShippingRate = {
            provider: this.providerCode,
            method: `${
              this.text(rate.productName) || 'Correo Argentino'
            } - ${deliveryType === 'S' ? 'Sucursal' : 'Domicilio'}`,
            price,
            estimatedDays: this.days(rate.deliveryTimeMin, rate.deliveryTimeMax),
            carrierId: this.providerCode,
            carrierName: 'Correo Argentino',
            serviceCode: this.text(rate.productType) || config.productType,
            modalityCode: deliveryType,
            dispatchType: deliveryType,
            branchId:
              deliveryType === 'S'
                ? this.text(config.defaultAgency) || null
                : null,
            metadata: {
              deliveryType,
              requiresBranchSelection:
                deliveryType === 'S' && !this.text(config.defaultAgency),
              rawPrice,
              markup:
                markupValue > 0
                  ? { type: markupType, value: markupValue }
                  : null,
              freeShipping: isFreeShipping,
              quotePayload: {
                postalCodeOrigin,
                postalCodeDestination: data.postalCode,
                dimensions: this.buildQuoteDimensions(data, config),
              },
            },
          };
          const key = [
            mapped.method,
            mapped.serviceCode,
            mapped.modalityCode,
            mapped.branchId,
          ].join('|');

          if (seen.has(key)) return [];
          seen.add(key);
          return [mapped];
        },
      ),
    );
  }

  async getAgencies(
    data: ShippingAgencyLookupRequest,
    context?: ShippingProviderContext,
  ): Promise<ShippingAgency[]> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config, 'consultar sucursales');
    const provinceCode = this.provinceCode(data.provinceCode || data.state);
    if (!provinceCode) {
      throw new BadRequestException(
        'Correo Argentino branch lookup requires provinceCode or state',
      );
    }

    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const url = this.url(config.apiBaseUrl, '/agencies');
    const params = {
      customerId,
      provinceCode,
      services: this.text(data.service) || undefined,
    };

    this.logRequest('GET', url, params);

    const response = await axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: 20_000,
      })
      .catch((error) =>
        this.fail(error, 'Error fetching Correo Argentino agencies'),
      );

    this.logResponse('GET', url, response.status, response.data);

    return (Array.isArray(response.data) ? response.data : []).map(
      (agency: any) => ({
        code: this.text(agency.code),
        name: this.text(agency.name) || 'Sucursal Correo Argentino',
        address:
          [
            this.text(agency.location?.address?.streetName),
            this.text(agency.location?.address?.streetNumber),
            this.text(agency.location?.address?.floor),
            this.text(agency.location?.address?.apartment),
          ]
            .filter(Boolean)
            .join(' ') || null,
        city: this.text(agency.location?.city) || null,
        state: this.text(agency.location?.provinceCode) || null,
        postalCode: this.text(agency.location?.address?.postalCode) || null,
        phone: this.text(agency.phone) || null,
        email: this.text(agency.email) || null,
        packageReception: agency.services?.packageReception ?? undefined,
        pickupAvailability: agency.services?.pickupAvailability ?? undefined,
        raw: agency,
      }),
    );
  }

  async createShipment(
    data: ShipmentProvisionRequest,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config, 'crear envios');
    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const extOrderId = this.externalOrderId(data);
    const payload = {
      customerId,
      extOrderId,
      orderNumber: String(data.orderId),
      sender: this.sender(config),
      recipient: this.recipient(data),
      shipping: this.shippingPayload(data, config),
    };
    const url = this.url(config.apiBaseUrl, '/shipping/import');

    this.logRequest('POST', url, payload);

    try {
      const response = await axios.post(url, payload, {
        ...this.miCorreoAuth(token),
        timeout: 30_000,
      });

      this.logResponse('POST', url, response.status, response.data);

      return this.hydrateImportedShipment(
        extOrderId,
        data,
        config,
        context,
        payload,
        response.data,
        false,
      );
    } catch (error) {
      if (this.isDuplicateImportError(error)) {
        this.logger.warn(
          `Correo Argentino shipment ${extOrderId} was already imported; refreshing remote detail`,
        );
        return this.hydrateImportedShipment(
          extOrderId,
          data,
          config,
          context,
          payload,
          null,
          true,
        );
      }

      this.fail(
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
      { externalShipmentId: shipmentId },
      context,
    );
  }

  async cancelShipment(
    _shipmentId: string,
    context?: ShippingProviderContext,
  ): Promise<ShipmentCancellation> {
    const config = this.getConfig(context?.config);
    throw new NotImplementedException(
      `Correo Argentino ${config.mode} shipment cancellation is not implemented.`,
    );
  }

  async testConnection(context?: ShippingProviderContext) {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config, 'probar conexion');

    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const originAddress =
      config.metadata.originAddress &&
      typeof config.metadata.originAddress === 'object'
        ? (config.metadata.originAddress as Record<string, unknown>)
        : {};
    const postalCodeOrigin = this.text(originAddress.postalCode);

    if (!postalCodeOrigin) {
      return {
        ok: true,
        message:
          'Correo Argentino MiCorreo: token y customerId validos. Configura originAddress.postalCode para habilitar el test completo de cotizacion.',
        details: {
          customerId,
          mode: config.mode,
          apiBaseUrl: config.apiBaseUrl,
          originPostalCodeConfigured: false,
          paqArLabelBridgeConfigured: this.canUsePaqArLabels(config),
        },
      };
    }

    const url = this.url(config.apiBaseUrl, '/rates');
    const payload = {
      customerId,
      postalCodeOrigin,
      postalCodeDestination: '1000',
      deliveredType: 'D',
      dimensions: { weight: 1000, height: 10, width: 10, length: 10 },
    };

    this.logRequest('POST', url, payload);

    const ratesResponse = await axios
      .post(url, payload, {
        ...this.miCorreoAuth(token),
        timeout: 20_000,
        validateStatus: (status) => status >= 200 && status < 300,
      })
      .catch((error) =>
        this.fail(
          error,
          'Error en test de cotizacion a Correo Argentino MiCorreo (/rates)',
        ),
      );

    this.logResponse('POST', url, ratesResponse.status, ratesResponse.data);

    const rates = Array.isArray(ratesResponse.data?.rates)
      ? ratesResponse.data.rates
      : [];

    return {
      ok: true,
      message: `Correo Argentino MiCorreo operativo. ${rates.length} tarifa(s) obtenida(s) desde CP ${postalCodeOrigin}.`,
      details: {
        customerId,
        mode: config.mode,
        apiBaseUrl: config.apiBaseUrl,
        originPostalCodeConfigured: true,
        rateCount: rates.length,
        paqArLabelBridgeConfigured: this.canUsePaqArLabels(config),
        sampleRates: rates.slice(0, 3).map((rate: any) => ({
          deliveredType: rate.deliveredType,
          productName: rate.productName,
          price: rate.price,
        })),
      },
    };
  }

  private async hydrateImportedShipment(
    extOrderId: string,
    data: ShipmentProvisionRequest,
    config: RuntimeConfig,
    context: ShippingProviderContext | undefined,
    importRequest: Record<string, unknown>,
    importResponse: unknown,
    duplicateImport: boolean,
  ): Promise<ProviderShipment> {
    let detail: ProviderShipment | null = null;

    try {
      detail = await this.getShipmentDetailFromSnapshot(
        { externalShipmentId: extOrderId },
        context,
      );
    } catch (error) {
      this.logger.warn(
        `Correo Argentino import ${extOrderId} created but detail refresh failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    const labelDocument =
      detail?.labelDocument ??
      this.extractLabelDocument(importResponse) ??
      (detail?.trackingNumber
        ? await this.fetchPaqArLabelDocument(detail.trackingNumber, config)
        : null);
    const trackingNumber = detail?.trackingNumber || null;

    return {
      provider: this.providerCode,
      method: data.method,
      carrier: data.carrierName || 'Correo Argentino',
      externalShipmentId: detail?.externalShipmentId || extOrderId,
      trackingNumber,
      trackingUrl: this.trackingUrl(
        trackingNumber || extOrderId,
        config,
      ),
      labelUrl: labelDocument?.url ?? detail?.labelUrl ?? null,
      labelFormat:
        labelDocument?.format ??
        detail?.labelFormat ??
        (labelDocument ? '10x15' : null),
      labelDocument,
      status: detail?.status || 'created',
      cost: data.value,
      conditionCode: detail?.conditionCode ?? null,
      payload: {
        importRequest,
        importResponse,
        duplicateImport,
        detailPayload: detail?.payload ?? null,
        labelDocument,
      },
      events:
        detail?.events ??
        [
          {
            status: 'created',
            description: duplicateImport
              ? 'Shipment was already imported previously in Correo Argentino MiCorreo.'
              : 'Shipment imported successfully into Correo Argentino MiCorreo.',
          },
        ],
    };
  }

  private async getShipmentDetailFromSnapshot(
    data: ShipmentTrackingSnapshot,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config, 'consultar tracking');
    const shippingId =
      this.text(data.externalShipmentId) || this.text(data.trackingNumber);

    if (!shippingId) {
      return {
        provider: this.providerCode,
        method: 'Correo Argentino',
        carrier: 'Correo Argentino',
        events: [],
      };
    }

    const token = await this.getAccessToken(config);
    const url = this.url(config.apiBaseUrl, '/shipping/tracking');
    const params = { shippingId };
    this.logRequest('GET', url, params);

    const response = await axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params,
        timeout: 20_000,
      })
      .catch((error) =>
        this.fail(
          error,
          'Error fetching tracking from Correo Argentino MiCorreo',
        ),
      );

    this.logResponse('GET', url, response.status, response.data);

    const entry = Array.isArray(response.data)
      ? response.data[0] || {}
      : response.data || {};
    const trackingNumber = this.text(entry.trackingNumber) || shippingId;
    const labelDocument =
      this.extractLabelDocument(entry) ??
      this.extractLabelDocument(response.data) ??
      (trackingNumber
        ? await this.fetchPaqArLabelDocument(trackingNumber, config)
        : null);
    const events = this.mapTrackingEvents(entry);

    return {
      provider: this.providerCode,
      method: 'Correo Argentino',
      carrier: 'Correo Argentino',
      externalShipmentId: this.text(entry.id) || this.text(data.externalShipmentId) || shippingId,
      trackingNumber,
      trackingUrl: this.trackingUrl(trackingNumber, config),
      labelUrl: labelDocument?.url ?? null,
      labelFormat: labelDocument?.format ?? null,
      labelDocument,
      status: events.at(-1)?.status || 'created',
      conditionCode: events.at(-1)?.description || null,
      payload: {
        trackingRequest: params,
        trackingResponse: response.data,
        labelDocument,
      },
      events,
    };
  }

  private getConfig(
    storeConfig?: ResolvedShippingProviderConfig | null,
  ): RuntimeConfig {
    const metadata = (storeConfig?.metadata ?? {}) as Record<string, unknown>;
    const envMetadata = this.json(process.env.CORREO_ARGENTINO_METADATA_JSON);
    const mergedMetadata = { ...envMetadata, ...metadata };
    const testingEnabled =
      this.bool(storeConfig?.metadata && (storeConfig.metadata as any).testing) ??
      this.bool(envMetadata.testing) ??
      this.bool(process.env.CORREO_ARGENTINO_TESTING) ??
      true;
    const requestedMode = this.text(storeConfig?.mode).toUpperCase();
    const envMode =
      typeof envMetadata.mode === 'string'
        ? envMetadata.mode.toUpperCase()
        : '';
    const mode =
      ((requestedMode === 'MICORREO' || requestedMode === 'PAQAR_API'
        ? requestedMode
        : '') as 'MICORREO' | 'PAQAR_API') ||
      ((envMode === 'MICORREO' || envMode === 'PAQAR_API'
        ? envMode
        : '') as 'MICORREO' | 'PAQAR_API') ||
      ((process.env.CORREO_ARGENTINO_MODE || 'MICORREO')
        .trim()
        .toUpperCase() as 'MICORREO' | 'PAQAR_API');

    const paqArMetadata =
      mergedMetadata.paqAr && typeof mergedMetadata.paqAr === 'object'
        ? (mergedMetadata.paqAr as Record<string, unknown>)
        : {};

    return {
      mode,
      apiBaseUrl:
        this.text(storeConfig?.metadata && (storeConfig.metadata as any).apiBaseUrl) ||
        this.text(mergedMetadata.apiBaseUrl) ||
        process.env.CORREO_ARGENTINO_API_BASE_URL?.trim() ||
        (testingEnabled
          ? 'https://apitest.correoargentino.com.ar/micorreo/v1'
          : 'https://api.correoargentino.com.ar/micorreo/v1'),
      apiUsername:
        this.text(mergedMetadata.apiUsername) ||
        process.env.CORREO_ARGENTINO_API_USERNAME?.trim() ||
        '',
      apiPassword:
        this.text(mergedMetadata.apiPassword) ||
        process.env.CORREO_ARGENTINO_API_PASSWORD?.trim() ||
        '',
      customerEmail:
        this.text(storeConfig?.email) ||
        this.text(mergedMetadata.customerEmail) ||
        this.text(mergedMetadata.email) ||
        process.env.CORREO_ARGENTINO_EMAIL?.trim() ||
        '',
      customerPassword:
        this.text(storeConfig?.password) ||
        this.text(mergedMetadata.customerPassword) ||
        this.text(mergedMetadata.password) ||
        process.env.CORREO_ARGENTINO_PASSWORD?.trim() ||
        '',
      customerId:
        this.text(mergedMetadata.customerId) ||
        process.env.CORREO_ARGENTINO_CUSTOMER_ID?.trim() ||
        '',
      agreement:
        this.text(storeConfig?.agreement) ||
        this.text(mergedMetadata.agreement) ||
        process.env.CORREO_ARGENTINO_AGREEMENT?.trim() ||
        '',
      apiKey:
        this.text(storeConfig?.apiKey) ||
        this.text(mergedMetadata.apiKey) ||
        process.env.CORREO_ARGENTINO_API_KEY?.trim() ||
        '',
      secretKey:
        this.text(storeConfig?.secretKey) ||
        this.text(mergedMetadata.secretKey) ||
        process.env.CORREO_ARGENTINO_SECRET_KEY?.trim() ||
        '',
      paqarApiBaseUrl:
        this.text(paqArMetadata.apiBaseUrl) ||
        process.env.CORREO_ARGENTINO_PAQAR_API_BASE_URL?.trim() ||
        (mode === 'PAQAR_API'
          ? this.text(mergedMetadata.apiBaseUrl) ||
            process.env.CORREO_ARGENTINO_API_BASE_URL?.trim() ||
            ''
          : ''),
      paqarAgreement:
        this.text(paqArMetadata.agreement) ||
        this.text(storeConfig?.agreement) ||
        process.env.CORREO_ARGENTINO_PAQAR_AGREEMENT?.trim() ||
        process.env.CORREO_ARGENTINO_AGREEMENT?.trim() ||
        '',
      paqarApiKey:
        this.text(paqArMetadata.apiKey) ||
        this.text(storeConfig?.apiKey) ||
        process.env.CORREO_ARGENTINO_PAQAR_API_KEY?.trim() ||
        process.env.CORREO_ARGENTINO_API_KEY?.trim() ||
        '',
      paqarSellerId:
        this.text(paqArMetadata.sellerId) ||
        this.text(mergedMetadata.sellerId) ||
        '',
      defaultAgency:
        this.text(mergedMetadata.defaultAgency) ||
        this.text(mergedMetadata.destinationAgency) ||
        '',
      productType:
        this.text(mergedMetadata.productType) ||
        process.env.CORREO_ARGENTINO_PRODUCT_TYPE?.trim() ||
        'CP',
      senderName:
        storeConfig?.senderName?.trim() ||
        this.text(mergedMetadata.senderName) ||
        this.text(mergedMetadata.businessName) ||
        process.env.CORREO_ARGENTINO_SENDER_NAME?.trim() ||
        '',
      senderPhone:
        storeConfig?.senderPhone?.trim() ||
        this.text(mergedMetadata.senderPhone) ||
        process.env.CORREO_ARGENTINO_SENDER_PHONE?.trim() ||
        '',
      senderEmail:
        storeConfig?.senderEmail?.trim() ||
        this.text(mergedMetadata.senderEmail) ||
        process.env.CORREO_ARGENTINO_SENDER_EMAIL?.trim() ||
        '',
      companyName:
        storeConfig?.companyName?.trim() ||
        this.text(mergedMetadata.companyName) ||
        process.env.CORREO_ARGENTINO_COMPANY_NAME?.trim() ||
        '',
      weightUnit:
        this.text(mergedMetadata.weightUnit).toLowerCase() === 'g' ? 'g' : 'kg',
      metadata: mergedMetadata,
    };
  }

  private ensureMiCorreoMode(config: RuntimeConfig, operation: string) {
    if (config.mode === 'MICORREO') {
      return;
    }

    throw new NotImplementedException(
      `Correo Argentino ${config.mode} no esta implementado para ${operation}. El proyecto hoy opera alta/cotizacion/tracking con MiCorreo y usa PAQ.AR solamente como puente opcional de rotulos si hay credenciales disponibles.`,
    );
  }

  private async getAccessToken(config: RuntimeConfig) {
    if (!config.apiUsername || !config.apiPassword) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo requires apiUsername/apiPassword.',
      );
    }

    const cacheKey = `${config.apiBaseUrl}|${config.apiUsername}|${config.apiPassword}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const tokenUrl = this.url(config.apiBaseUrl, '/token');
    this.logRequest('POST', tokenUrl, {
      username: this.mask(config.apiUsername),
    });

    const rawResponse = await new Promise<string>((resolve, reject) => {
      execFile(
        'curl',
        [
          '-s',
          '-X',
          'POST',
          tokenUrl,
          '-u',
          `${config.apiUsername}:${config.apiPassword}`,
          '--max-time',
          '15',
          '--connect-timeout',
          '5',
        ],
        { timeout: 18_000 },
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error(
              `Correo Argentino /token curl error: ${error.message}`,
            );
            return reject(
              new ServiceUnavailableException(
                `Correo Argentino /token curl error: ${error.message}`,
              ),
            );
          }
          if (!stdout?.trim()) {
            this.logger.error(
              `Correo Argentino /token empty response. stderr=${stderr || '<empty>'}`,
            );
            return reject(
              new ServiceUnavailableException(
                'Correo Argentino /token returned empty response',
              ),
            );
          }
          resolve(stdout);
        },
      );
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      this.logger.error(
        `Correo Argentino /token returned non-JSON body: ${rawResponse.slice(
          0,
          200,
        )}`,
      );
      throw new ServiceUnavailableException(
        `Correo Argentino /token returned non-JSON: ${rawResponse.slice(
          0,
          200,
        )}`,
      );
    }

    const token = this.text(parsed.token);
    if (!token) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo token response did not include a token',
      );
    }

    this.logResponse('POST', tokenUrl, 200, {
      token: '<redacted>',
      expires: parsed.expires,
    });

    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: this.expiration(parsed.expires as string | undefined),
    });
    return token;
  }

  private async getCustomerId(config: RuntimeConfig, token: string) {
    if (config.customerId) return config.customerId;
    if (!config.customerEmail || !config.customerPassword) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo requires customer email/password or a preconfigured customerId.',
      );
    }

    const cacheKey = `${config.apiBaseUrl}|${config.customerEmail}|${config.customerPassword}`;
    const cached = this.customerIdCache.get(cacheKey);
    if (cached) return cached;

    const url = this.url(config.apiBaseUrl, '/users/validate');
    const payload = {
      email: config.customerEmail,
      password: '<redacted>',
    };
    this.logRequest('POST', url, payload);

    const response = await axios
      .post(
        url,
        {
          email: config.customerEmail,
          password: config.customerPassword,
        },
        {
          ...this.miCorreoAuth(token),
          timeout: 20_000,
        },
      )
      .catch((error) =>
        this.fail(
          error,
          'Error validating Correo Argentino MiCorreo user',
        ),
      );

    this.logResponse('POST', url, response.status, response.data);

    const customerId =
      this.text(response.data?.customerId) || this.text(response.data?.id);
    if (!customerId) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo user validation did not return customerId',
      );
    }

    this.customerIdCache.set(cacheKey, customerId);
    return customerId;
  }

  private getOriginPostalCode(config: RuntimeConfig) {
    const origin =
      config.metadata.originAddress &&
      typeof config.metadata.originAddress === 'object'
        ? (config.metadata.originAddress as Record<string, unknown>)
        : {};
    const postalCode = this.text(origin.postalCode);
    if (!postalCode) {
      throw new ServiceUnavailableException(
        'Correo Argentino MiCorreo requires originAddress.postalCode in store metadata to quote shipments',
      );
    }
    return postalCode;
  }

  private sender(config: RuntimeConfig) {
    const origin =
      config.metadata.originAddress &&
      typeof config.metadata.originAddress === 'object'
        ? (config.metadata.originAddress as Record<string, unknown>)
        : {};

    return {
      name: config.senderName || config.companyName || null,
      phone: this.digits(config.senderPhone) || null,
      cellPhone: this.digits(config.senderPhone) || null,
      email: config.senderEmail || null,
      originAddress: {
        streetName: this.text(origin.streetName) || null,
        streetNumber: this.text(origin.streetNumber) || null,
        floor: this.cut(this.text(origin.floor), 3) || null,
        apartment: this.cut(this.text(origin.apartment), 3) || null,
        city: this.text(origin.city) || null,
        provinceCode:
          this.provinceCode(
            this.text(origin.provinceCode) || this.text(origin.state),
          ) || null,
        postalCode: this.text(origin.postalCode) || null,
      },
    };
  }

  private recipient(data: ShipmentProvisionRequest) {
    const name = `${data.recipient.firstName} ${data.recipient.lastName}`.trim();

    return {
      name: name || 'Cliente',
      phone: this.digits(data.recipient.phone) || '',
      cellPhone: this.digits(data.recipient.phone) || '',
      email: data.recipient.email || 'no-reply@example.com',
    };
  }

  private shippingPayload(
    data: ShipmentProvisionRequest,
    config: RuntimeConfig,
  ) {
    const deliveryType = this.deliveryType(
      data.modalityCode ||
        data.dispatchType ||
        (data.method.toLowerCase().includes('sucursal') ? 'S' : 'D'),
    );
    const address = this.splitStreet(data.address.address1);
    const provinceCode = this.provinceCode(data.address.state);
    const agency =
      deliveryType === 'S'
        ? this.text(data.branchId) ||
          this.text(config.defaultAgency) ||
          this.text(config.metadata.destinationAgency)
        : null;

    if (deliveryType === 'S' && !agency) {
      throw new BadRequestException(
        'Correo Argentino branch shipments require branchId or defaultAgency',
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
        streetName: address.streetName,
        streetNumber: address.streetNumber,
        floor: this.cut(address.floor, 3),
        apartment: this.cut(address.apartment, 3),
        city: data.address.city,
        provinceCode: provinceCode || 'C',
        postalCode: data.address.postalCode,
      },
      productType: this.text(data.serviceCode) || config.productType || 'CP',
      weight: this.weightToGrams(data.weight, config.weightUnit),
      declaredValue: Number(
        data.value.toFixed ? data.value.toFixed(2) : data.value,
      ),
      height: this.dim(data.package.height),
      length: this.dim(data.package.length),
      width: this.dim(data.package.width),
    };
  }

  private buildQuoteDimensions(
    data: ShippingRateRequest,
    config: RuntimeConfig,
  ) {
    const defaults =
      config.metadata.defaultPackageDimensions &&
      typeof config.metadata.defaultPackageDimensions === 'object'
        ? (config.metadata.defaultPackageDimensions as Record<string, unknown>)
        : {};

    return {
      weight: Math.max(
        Math.round(
          Number(data.package?.weightGrams ?? 0) ||
            this.weightToGrams(data.weight, config.weightUnit),
        ),
        1,
      ),
      height: this.dim(Number(data.package?.height ?? defaults.height ?? 10)),
      width: this.dim(Number(data.package?.width ?? defaults.width ?? 10)),
      length: this.dim(Number(data.package?.length ?? defaults.length ?? 10)),
    };
  }

  private mapTrackingEvents(entry: any): ProviderTrackingEvent[] {
    const sourceEvents = Array.isArray(entry.events)
      ? entry.events
      : Array.isArray(entry.event)
      ? entry.event
      : [];

    return sourceEvents.map((event: any) => ({
      status: this.trackStatus(event.event, event.status),
      description:
        [
          this.text(event.event),
          this.text(event.status),
          this.text(event.sign),
        ]
          .filter(Boolean)
          .join(' - ') || 'Tracking update',
      location:
        this.text(event.branch) ||
        this.text(event.facility) ||
        this.text(event.facilityId) ||
        undefined,
      occurredAt: this.trackDate(event.date),
    }));
  }

  private async fetchPaqArLabelDocument(
    trackingNumber: string,
    config: RuntimeConfig,
  ): Promise<LabelDocument | null> {
    if (!this.canUsePaqArLabels(config)) {
      return null;
    }

    const url = this.url(config.paqarApiBaseUrl, '/labels');
    const body = [
      {
        sellerId: config.paqarSellerId || '',
        trackingNumber,
      },
    ];

    this.logRequest('POST', url, {
      labelFormat: '10x15',
      body,
      agreement: this.mask(config.paqarAgreement),
    });

    try {
      const response = await axios.post(url, body, {
        headers: this.paqArHeaders(config, {
          labelFormat: '10x15',
        }),
        timeout: 30_000,
      });

      this.logResponse('POST', url, response.status, response.data);

      const entry = Array.isArray(response.data)
        ? response.data.find(
            (item) => this.text(item?.trackingNumber) === trackingNumber,
          ) || response.data[0]
        : response.data;
      const fileBase64 =
        this.text(entry?.fileBase64) || this.text(entry?.filebase64);
      const fileName =
        this.text(entry?.fileName) ||
        this.text(entry?.filename) ||
        `${trackingNumber}.pdf`;
      const result =
        this.text(entry?.result) || this.text(entry?.status) || 'OK';

      if (!fileBase64 || result.toUpperCase().includes('ERROR')) {
        this.logger.warn(
          `Correo Argentino PAQ.AR label lookup for ${trackingNumber} returned no usable PDF. result=${result}`,
        );
        return null;
      }

      return {
        fileBase64,
        fileName,
        mimeType: 'application/pdf',
        format: '10x15',
        source: 'correo-argentino-paqar',
      };
    } catch (error) {
      this.logAxiosError(error, 'POST', url);
      return null;
    }
  }

  private extractLabelDocument(source: unknown): LabelDocument | null {
    const record = this.findRecordWithLabel(source);
    if (!record) {
      return null;
    }

    const url =
      this.text(record.labelUrl) ||
      this.text(record.labelURL) ||
      this.text(record.fileUrl) ||
      this.text(record.url);
    const fileBase64 =
      this.text(record.fileBase64) ||
      this.text(record.base64) ||
      this.text(record.labelBase64);
    const fileName =
      this.text(record.fileName) ||
      this.text(record.filename) ||
      this.text(record.name);
    const format =
      this.text(record.labelFormat) || this.text(record.format) || null;

    if (!url && !fileBase64) {
      return null;
    }

    return {
      url: url || null,
      fileBase64: fileBase64 || null,
      fileName: fileName || null,
      mimeType: 'application/pdf',
      format,
      source: 'correo-argentino-response',
    };
  }

  private findRecordWithLabel(source: unknown): Record<string, unknown> | null {
    if (!source) return null;
    if (Array.isArray(source)) {
      for (const item of source) {
        const nested = this.findRecordWithLabel(item);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof source !== 'object') {
      return null;
    }

    const record = source as Record<string, unknown>;
    const keys = Object.keys(record).map((key) => key.toLowerCase());
    if (
      keys.some((key) =>
        ['labelurl', 'filebase64', 'labelbase64', 'filename', 'fileurl'].includes(
          key,
        ),
      )
    ) {
      return record;
    }

    for (const value of Object.values(record)) {
      const nested = this.findRecordWithLabel(value);
      if (nested) return nested;
    }

    return null;
  }

  private canUsePaqArLabels(config: RuntimeConfig) {
    return Boolean(
      config.paqarApiBaseUrl && config.paqarAgreement && config.paqarApiKey,
    );
  }

  private getQuotedDeliveryTypes(config: RuntimeConfig) {
    const raw = Array.isArray(config.metadata.deliveryTypes)
      ? config.metadata.deliveryTypes
      : [];
    const mapped = raw
      .map((value) => this.deliveryType(String(value)))
      .filter((value, index, list) => list.indexOf(value) === index);

    if (mapped.length) return mapped as Array<'D' | 'S'>;
    return this.text(config.defaultAgency)
      ? (['D', 'S'] as Array<'D' | 'S'>)
      : (['D'] as Array<'D' | 'S'>);
  }

  private deliveryType(value?: string | null) {
    return value?.trim().toUpperCase() === 'S' ? 'S' : 'D';
  }

  private externalOrderId(data: ShipmentProvisionRequest) {
    return (data.reference || `store-${data.storeId}-order-${data.orderId}`)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 60);
  }

  private splitStreet(address1: string) {
    const match = address1.trim().match(/^(.*?)(\d{1,6})(?:\s+(.*))?$/);
    return match
      ? {
          streetName: match[1].trim() || 'Sin calle',
          streetNumber: match[2],
          floor: '',
          apartment: this.text(match[3]),
        }
      : {
          streetName: address1.trim() || 'Sin calle',
          streetNumber: '0',
          floor: '',
          apartment: '',
        };
  }

  private provinceCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) return null;
    const map: Record<string, string> = {
      A: 'A',
      SALTA: 'A',
      B: 'B',
      'BUENOS AIRES': 'B',
      C: 'C',
      CABA: 'C',
      'CIUDAD AUTONOMA DE BUENOS AIRES': 'C',
      'CAPITAL FEDERAL': 'C',
      D: 'D',
      'SAN LUIS': 'D',
      E: 'E',
      'ENTRE RIOS': 'E',
      ENTRE_RIOS: 'E',
      F: 'F',
      'LA RIOJA': 'F',
      LA_RIOJA: 'F',
      G: 'G',
      'SANTIAGO DEL ESTERO': 'G',
      SANTIAGO_DEL_ESTERO: 'G',
      H: 'H',
      CHACO: 'H',
      J: 'J',
      'SAN JUAN': 'J',
      SAN_JUAN: 'J',
      K: 'K',
      CATAMARCA: 'K',
      L: 'L',
      'LA PAMPA': 'L',
      LA_PAMPA: 'L',
      M: 'M',
      MENDOZA: 'M',
      N: 'N',
      MISIONES: 'N',
      P: 'P',
      FORMOSA: 'P',
      Q: 'Q',
      NEUQUEN: 'Q',
      R: 'R',
      'RIO NEGRO': 'R',
      RIO_NEGRO: 'R',
      S: 'S',
      'SANTA FE': 'S',
      SANTA_FE: 'S',
      T: 'T',
      TUCUMAN: 'T',
      U: 'U',
      CHUBUT: 'U',
      V: 'V',
      'TIERRA DEL FUEGO': 'V',
      TIERRA_DEL_FUEGO: 'V',
      W: 'W',
      CORRIENTES: 'W',
      X: 'X',
      CORDOBA: 'X',
      Y: 'Y',
      JUJUY: 'Y',
      Z: 'Z',
      'SANTA CRUZ': 'Z',
      SANTA_CRUZ: 'Z',
    };

    return map[normalized] || normalized;
  }

  private weightToGrams(weight?: number, unitHint: 'g' | 'kg' = 'kg') {
    const safe = Math.max(Number(weight || 0), 0.001);
    if (unitHint === 'g' || safe > 25) return Math.max(Math.round(safe), 1);
    return Math.max(Math.round(safe * 1000), 1);
  }

  private dim(value?: number) {
    return Math.min(Math.max(Math.round(value ?? 10), 1), 255);
  }

  private days(min?: string | number, max?: string | number) {
    const maxDays = Number(max);
    const minDays = Number(min);
    if (Number.isFinite(maxDays) && maxDays > 0) return maxDays;
    if (Number.isFinite(minDays) && minDays > 0) return minDays;
    return 3;
  }

  private trackStatus(event?: string | null, status?: string | null) {
    const value = `${event || ''} ${status || ''}`.trim().toLowerCase();
    if (value.includes('entregado') || value.includes('entrega efectuada')) {
      return 'delivered';
    }
    if (
      value.includes('distribucion') ||
      value.includes('salio a reparto') ||
      value.includes('visita')
    ) {
      return 'out_for_delivery';
    }
    if (
      value.includes('transito') ||
      value.includes('clasificacion') ||
      value.includes('encaminado') ||
      value.includes('procesamiento')
    ) {
      return 'in_transit';
    }
    if (
      value.includes('imposicion') ||
      value.includes('admitido') ||
      value.includes('recepcionado')
    ) {
      return 'picked_up';
    }
    if (
      value.includes('devol') ||
      value.includes('retorno') ||
      value.includes('devuelto')
    ) {
      return 'returned';
    }
    if (
      value.includes('caduc') ||
      value.includes('cancel') ||
      value.includes('rechaz') ||
      value.includes('no existe')
    ) {
      return 'failed';
    }
    return 'created';
  }

  private trackDate(value?: string | null) {
    const text = this.text(value);
    if (!text) return undefined;

    const iso = Date.parse(text);
    if (!Number.isNaN(iso)) return new Date(iso);

    const [datePart, timePart = '00:00'] = text.split(' ');
    const [day, month, year] = datePart.split('-');
    return day && month && year
      ? new Date(`${year}-${month}-${day}T${timePart}:00-03:00`)
      : text;
  }

  private trackingUrl(shippingId: string, config: RuntimeConfig) {
    const base =
      this.text(config.metadata.publicTrackingBaseUrl) ||
      this.text(process.env.CORREO_ARGENTINO_PUBLIC_TRACKING_BASE_URL);
    return base
      ? `${base.replace(/\/$/, '')}/${encodeURIComponent(shippingId)}`
      : null;
  }

  private url(baseUrl: string, path: string) {
    return /^https?:\/\//i.test(path)
      ? path
      : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private miCorreoAuth(token: string) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  private paqArHeaders(
    config: RuntimeConfig,
    extra?: Record<string, string>,
  ) {
    return {
      Authorization: `Apikey ${config.paqarApiKey}`,
      agreement: config.paqarAgreement,
      'Content-Type': 'application/json',
      ...(extra ?? {}),
    };
  }

  private expiration(value?: string) {
    if (!value?.trim()) return Date.now() + 4 * 60 * 60 * 1000;
    const parsed = Date.parse(`${value.trim().replace(' ', 'T')}-03:00`);
    return Number.isNaN(parsed)
      ? Date.now() + 4 * 60 * 60 * 1000
      : parsed;
  }

  private json(value?: string) {
    if (!value?.trim()) return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private bool(value: unknown) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.trim().toLowerCase() === 'true') return true;
      if (value.trim().toLowerCase() === 'false') return false;
    }
    return undefined;
  }

  private digits(value?: string | null) {
    return (value || '').replace(/\D+/g, '');
  }

  private cut(value: string, length: number) {
    return value ? value.slice(0, length) : '';
  }

  private text(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private applyMarkup(price: number, type: string, value: number) {
    if (!value || value <= 0) return Math.round(price);
    if (type === 'fixed') return Math.round(price + value);
    return Math.round(price * (1 + value / 100));
  }

  private isDuplicateImportError(error: unknown) {
    return (
      axios.isAxiosError(error) &&
      String(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data?.code ||
          error.message ||
          '',
      )
        .toLowerCase()
        .includes('ya fue importada')
    );
  }

  private logRequest(method: string, url: string, payload?: unknown) {
    this.logger.log(
      `${method} ${url} payload=${JSON.stringify(this.sanitizeForLogs(payload))}`,
    );
  }

  private logResponse(
    method: string,
    url: string,
    status: number,
    body?: unknown,
  ) {
    this.logger.log(
      `${method} ${url} status=${status} body=${JSON.stringify(this.sanitizeForLogs(body))}`,
    );
  }

  private logAxiosError(error: unknown, method: string, url: string) {
    if (!axios.isAxiosError(error)) {
      this.logger.error(
        `${method} ${url} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return;
    }

    this.logger.error(
      `${method} ${url} failed status=${error.response?.status ?? 'unknown'} body=${JSON.stringify(
        this.sanitizeForLogs(error.response?.data),
      )}`,
    );
  }

  private sanitizeForLogs(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.sanitizeForLogs(entry));
    }

    if (!value || typeof value !== 'object') {
      if (typeof value === 'string' && value.length > 240) {
        return `${value.slice(0, 240)}...`;
      }
      return value;
    }

    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();
      if (
        ['authorization', 'token', 'password', 'secret', 'apikey', 'apiKey'].some(
          (sensitive) => lowerKey.includes(sensitive.toLowerCase()),
        )
      ) {
        sanitized[key] = '<redacted>';
        continue;
      }

      if (
        typeof entry === 'string' &&
        lowerKey.includes('base64') &&
        entry.length > 24
      ) {
        sanitized[key] = `<base64:${entry.length} chars>`;
        continue;
      }

      sanitized[key] = this.sanitizeForLogs(entry);
    }

    return sanitized;
  }

  private mask(value?: string | null) {
    const text = this.text(value);
    if (!text) return '';
    if (text.length <= 4) return `${text[0]}***`;
    return `${text.slice(0, 4)}***${text.slice(-2)}`;
  }

  private fail(error: unknown, fallback: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ServiceUnavailableException ||
      error instanceof NotImplementedException ||
      error instanceof UnauthorizedException ||
      error instanceof ForbiddenException ||
      error instanceof UnsupportedMediaTypeException ||
      error instanceof GatewayTimeoutException
    ) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      this.logAxiosError(error, error.config?.method?.toUpperCase() || 'HTTP', error.config?.url || fallback);

      const httpStatus = error.response?.status;
      const responseData = error.response?.data;
      const apiMessage =
        (typeof responseData === 'object' && responseData !== null
          ? (responseData as any)?.message ||
            (responseData as any)?.error ||
            (responseData as any)?.code
          : typeof responseData === 'string'
          ? responseData
          : null) || error.message;
      const message = `${fallback} - HTTP ${httpStatus ?? 'unknown'}: ${apiMessage}`;

      if (httpStatus === 400) {
        throw new BadRequestException({
          message,
          correoStatus: httpStatus,
          correoResponse: responseData ?? null,
        });
      }
      if (httpStatus === 401) {
        throw new UnauthorizedException({
          message,
          correoStatus: httpStatus,
          correoResponse: responseData ?? null,
        });
      }
      if (httpStatus === 403) {
        throw new ForbiddenException({
          message,
          correoStatus: httpStatus,
          correoResponse: responseData ?? null,
        });
      }
      if (httpStatus === 415) {
        throw new UnsupportedMediaTypeException({
          message,
          correoStatus: httpStatus,
          correoResponse: responseData ?? null,
        });
      }
      if (error.code === 'ECONNABORTED' || httpStatus === 408 || httpStatus === 504) {
        throw new GatewayTimeoutException({
          message,
          correoStatus: httpStatus ?? null,
          correoResponse: responseData ?? null,
        });
      }

      throw new InternalServerErrorException({
        message,
        correoStatus: httpStatus ?? null,
        correoResponse: responseData ?? null,
        requestContext: fallback,
      });
    }

    if (error instanceof Error) {
      throw new InternalServerErrorException(error.message || fallback);
    }

    throw new InternalServerErrorException(fallback);
  }
}
