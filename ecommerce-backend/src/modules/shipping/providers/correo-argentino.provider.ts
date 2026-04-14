import { BadRequestException, Injectable, InternalServerErrorException, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { ProviderShipment, ProviderTrackingEvent, ResolvedShippingProviderConfig, ShipmentCancellation, ShippingAgency, ShippingAgencyLookupRequest, ShippingProvider, ShippingProviderContext, ShippingRate, ShippingRateRequest, ShipmentProvisionRequest, ShipmentTrackingSnapshot } from './shipping-provider.interface';

type RuntimeConfig = {
  mode: 'MICORREO' | 'PAQAR_API';
  apiBaseUrl: string;
  apiUsername: string;
  apiPassword: string;
  customerEmail: string;
  customerPassword: string;
  customerId: string;
  defaultAgency: string;
  productType: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  companyName: string;
  weightUnit: 'g' | 'kg';
  metadata: Record<string, unknown>;
};

@Injectable()
export class CorreoArgentinoProvider implements ShippingProvider {
  readonly providerCode = 'correo-argentino';
  private readonly tokenCache = new Map<string, { token: string; expiresAt: number }>();
  private readonly customerIdCache = new Map<string, string>();

  async getRates(data: ShippingRateRequest, context?: ShippingProviderContext): Promise<ShippingRate[]> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config);
    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const types = this.getQuotedDeliveryTypes(config);
    const responses = await Promise.all(
      types.map((deliveredType) =>
        axios.post(
          this.url(config.apiBaseUrl, '/rates'),
          {
            customerId,
            postalCodeOrigin: this.getOriginPostalCode(config),
            postalCodeDestination: data.postalCode,
            deliveredType,
            dimensions: this.buildQuoteDimensions(data, config),
          },
          this.auth(token),
        ),
      ),
    ).catch((error) => this.fail(error, 'Error fetching shipping rates from Correo Argentino MiCorreo'));

    const seen = new Set<string>();
    return responses.flatMap((response: any, index: number) =>
      (Array.isArray(response.data?.rates) ? response.data.rates : []).flatMap((rate: any) => {
        const deliveryType = this.deliveryType(rate.deliveredType || rate.deliveryType || types[index]);
        const mapped: ShippingRate = {
          provider: this.providerCode,
          method: `${this.text(rate.productName) || 'Correo Argentino'} - ${deliveryType === 'S' ? 'Sucursal' : 'Domicilio'}`,
          price: Number(rate.price ?? 0),
          estimatedDays: this.days(rate.deliveryTimeMin, rate.deliveryTimeMax),
          carrierId: this.providerCode,
          carrierName: 'Correo Argentino',
          serviceCode: this.text(rate.productType) || config.productType,
          modalityCode: deliveryType,
          dispatchType: deliveryType,
          branchId: deliveryType === 'S' ? this.text(config.defaultAgency) || null : null,
          metadata: { deliveryType, requiresBranchSelection: deliveryType === 'S' && !this.text(config.defaultAgency) },
        };
        const key = [mapped.method, mapped.serviceCode, mapped.modalityCode, mapped.branchId].join('|');
        if (seen.has(key)) return [];
        seen.add(key);
        return [mapped];
      }),
    );
  }

  async getAgencies(data: ShippingAgencyLookupRequest, context?: ShippingProviderContext): Promise<ShippingAgency[]> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config);
    const provinceCode = this.provinceCode(data.provinceCode || data.state);
    if (!provinceCode) throw new BadRequestException('Correo Argentino branch lookup requires provinceCode or state');
    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const response = await axios.get(this.url(config.apiBaseUrl, '/agencies'), {
      headers: { Authorization: `Bearer ${token}` },
      params: { customerId, provinceCode, services: this.text(data.service) || undefined },
    }).catch((error) => this.fail(error, 'Error fetching Correo Argentino agencies'));

    return (Array.isArray(response.data) ? response.data : []).map((agency: any) => ({
      code: this.text(agency.code),
      name: this.text(agency.name) || 'Sucursal Correo Argentino',
      address: [this.text(agency.location?.address?.streetName), this.text(agency.location?.address?.streetNumber), this.text(agency.location?.address?.floor), this.text(agency.location?.address?.apartment)].filter(Boolean).join(' ') || null,
      city: this.text(agency.location?.city) || null,
      state: this.text(agency.location?.provinceCode) || null,
      postalCode: this.text(agency.location?.address?.postalCode) || null,
      phone: this.text(agency.phone) || null,
      email: this.text(agency.email) || null,
      packageReception: agency.services?.packageReception ?? undefined,
      pickupAvailability: agency.services?.pickupAvailability ?? undefined,
      raw: agency,
    }));
  }

  async createShipment(data: ShipmentProvisionRequest, context?: ShippingProviderContext): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config);
    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    const extOrderId = this.externalOrderId(data);
    const payload = { customerId, extOrderId, orderNumber: String(data.orderId), sender: this.sender(config), recipient: this.recipient(data), shipping: this.shippingPayload(data, config) };

    try {
      const response = await axios.post(this.url(config.apiBaseUrl, '/shipping/import'), payload, this.auth(token));
      return {
        provider: this.providerCode,
        method: data.method,
        carrier: data.carrierName || 'Correo Argentino',
        externalShipmentId: extOrderId,
        trackingNumber: null,
        trackingUrl: this.trackingUrl(extOrderId, config),
        labelUrl: null,
        labelFormat: null,
        status: 'created',
        cost: data.value,
        payload: { importRequest: payload, importResponse: response.data },
        events: [{ status: 'created', description: 'Shipment imported successfully into Correo Argentino MiCorreo.' }],
      };
    } catch (error) {
      if (this.isDuplicateImportError(error)) {
        return {
          provider: this.providerCode,
          method: data.method,
          carrier: data.carrierName || 'Correo Argentino',
          externalShipmentId: extOrderId,
          trackingNumber: null,
          trackingUrl: this.trackingUrl(extOrderId, config),
          labelUrl: null,
          labelFormat: null,
          status: 'created',
          cost: data.value,
          payload: { duplicateImportRequest: payload },
          events: [{ status: 'created', description: 'Shipment was already imported previously in Correo Argentino MiCorreo.' }],
        };
      }
      this.fail(error, 'Error importing shipment into Correo Argentino MiCorreo');
    }
  }

  async getTracking(data: ShipmentTrackingSnapshot, context?: ShippingProviderContext): Promise<ProviderTrackingEvent[]> {
    const detail = await this.getShipmentDetailFromSnapshot(data, context);
    return detail.events ?? [];
  }

  async getShipmentDetail(shipmentId: string, context?: ShippingProviderContext): Promise<ProviderShipment> {
    return this.getShipmentDetailFromSnapshot({ externalShipmentId: shipmentId }, context);
  }

  async cancelShipment(_shipmentId: string, context?: ShippingProviderContext): Promise<ShipmentCancellation> {
    const config = this.getConfig(context?.config);
    throw new NotImplementedException(`Correo Argentino ${config.mode} shipment cancellation is not implemented.`);
  }

  async testConnection(context?: ShippingProviderContext) {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config);
    const token = await this.getAccessToken(config);
    const customerId = await this.getCustomerId(config, token);
    return { ok: true, message: 'Correo Argentino MiCorreo credentials are valid', details: { customerId, mode: config.mode, apiBaseUrl: config.apiBaseUrl } };
  }

  private async getShipmentDetailFromSnapshot(data: ShipmentTrackingSnapshot, context?: ShippingProviderContext): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);
    this.ensureMiCorreoMode(config);
    const shippingId = this.text(data.externalShipmentId) || this.text(data.trackingNumber);
    if (!shippingId) return { provider: this.providerCode, method: 'Correo Argentino', carrier: 'Correo Argentino', events: [] };
    const token = await this.getAccessToken(config);
    const response = await axios.get(this.url(config.apiBaseUrl, '/shipping/tracking'), {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      params: { shippingId },
    }).catch((error) => this.fail(error, 'Error fetching tracking from Correo Argentino MiCorreo'));
    const entry = Array.isArray(response.data) ? response.data[0] || {} : response.data || {};
    const events = Array.isArray(entry.events) ? entry.events.map((event: any) => ({
      status: this.trackStatus(event.event, event.status),
      description: [this.text(event.event), this.text(event.status), this.text(event.sign)].filter(Boolean).join(' - ') || 'Tracking update',
      location: this.text(event.branch) || undefined,
      occurredAt: this.trackDate(event.date),
    })) : [];
    const trackingNumber = this.text(entry.trackingNumber) || shippingId;
    return {
      provider: this.providerCode,
      method: 'Correo Argentino',
      carrier: 'Correo Argentino',
      externalShipmentId: shippingId,
      trackingNumber,
      trackingUrl: this.trackingUrl(trackingNumber, config),
      labelUrl: null,
      labelFormat: null,
      status: events.at(-1)?.status || 'created',
      conditionCode: events.at(-1)?.description || null,
      payload: response.data,
      events,
    };
  }

  private getConfig(storeConfig?: ResolvedShippingProviderConfig | null): RuntimeConfig {
    const metadata = (storeConfig?.metadata ?? {}) as Record<string, unknown>;
    const envMetadata = this.json(process.env.CORREO_ARGENTINO_METADATA_JSON);
    const mergedMetadata = { ...envMetadata, ...metadata };
    const testingEnabled = this.bool(envMetadata.testing) ?? this.bool(process.env.CORREO_ARGENTINO_TESTING) ?? true;
    return {
      mode: ((typeof envMetadata.mode === 'string' ? (envMetadata.mode.toUpperCase() as 'MICORREO' | 'PAQAR_API') : undefined) || ((process.env.CORREO_ARGENTINO_MODE || 'MICORREO').trim().toUpperCase() as 'MICORREO' | 'PAQAR_API')),
      apiBaseUrl: this.text(envMetadata.apiBaseUrl) || process.env.CORREO_ARGENTINO_API_BASE_URL?.trim() || (testingEnabled ? 'https://apitest.correoargentino.com.ar/micorreo/v1' : 'https://api.correoargentino.com.ar/micorreo/v1'),
      apiUsername: this.text(envMetadata.apiUsername) || process.env.CORREO_ARGENTINO_API_USERNAME?.trim() || process.env.CORREO_ARGENTINO_API_KEY?.trim() || '',
      apiPassword: this.text(envMetadata.apiPassword) || process.env.CORREO_ARGENTINO_API_PASSWORD?.trim() || process.env.CORREO_ARGENTINO_SECRET_KEY?.trim() || '',
      customerEmail: this.text(envMetadata.customerEmail) || this.text(envMetadata.email) || process.env.CORREO_ARGENTINO_EMAIL?.trim() || '',
      customerPassword: this.text(envMetadata.customerPassword) || this.text(envMetadata.password) || process.env.CORREO_ARGENTINO_PASSWORD?.trim() || '',
      customerId: this.text(envMetadata.customerId) || process.env.CORREO_ARGENTINO_CUSTOMER_ID?.trim() || '',
      defaultAgency: this.text(mergedMetadata.defaultAgency) || this.text(mergedMetadata.destinationAgency) || '',
      productType: this.text(mergedMetadata.productType) || process.env.CORREO_ARGENTINO_PRODUCT_TYPE?.trim() || 'CP',
      senderName: storeConfig?.senderName?.trim() || this.text(mergedMetadata.senderName) || this.text(mergedMetadata.businessName) || process.env.CORREO_ARGENTINO_SENDER_NAME?.trim() || '',
      senderPhone: storeConfig?.senderPhone?.trim() || this.text(mergedMetadata.senderPhone) || process.env.CORREO_ARGENTINO_SENDER_PHONE?.trim() || '',
      senderEmail: storeConfig?.senderEmail?.trim() || this.text(mergedMetadata.senderEmail) || process.env.CORREO_ARGENTINO_SENDER_EMAIL?.trim() || '',
      companyName: storeConfig?.companyName?.trim() || this.text(mergedMetadata.companyName) || process.env.CORREO_ARGENTINO_COMPANY_NAME?.trim() || '',
      weightUnit: this.text(mergedMetadata.weightUnit).toLowerCase() === 'g' ? 'g' : 'kg',
      metadata: mergedMetadata,
    };
  }

  private ensureMiCorreoMode(config: RuntimeConfig) {
    if (config.mode !== 'MICORREO') throw new NotImplementedException(`Correo Argentino ${config.mode} is not implemented yet. This provider currently supports MICORREO only.`);
  }

  private async getAccessToken(config: RuntimeConfig) {
    if (!config.apiUsername || !config.apiPassword) throw new ServiceUnavailableException('Correo Argentino MiCorreo requires global apiUsername/apiPassword from secure environment variables.');
    const cacheKey = `${config.apiBaseUrl}|${config.apiUsername}|${config.apiPassword}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const response = await axios.post(this.url(config.apiBaseUrl, '/token'), undefined, { auth: { username: config.apiUsername, password: config.apiPassword } }).catch((error) => this.fail(error, 'Error authenticating against Correo Argentino MiCorreo'));
    const token = this.text(response.data?.token);
    if (!token) throw new ServiceUnavailableException('Correo Argentino MiCorreo token response did not include a token');
    this.tokenCache.set(cacheKey, { token, expiresAt: this.expiration(response.data?.expires) });
    return token;
  }

  private async getCustomerId(config: RuntimeConfig, token: string) {
    if (config.customerId) return config.customerId;
    if (!config.customerEmail || !config.customerPassword) throw new ServiceUnavailableException('Correo Argentino MiCorreo requires customer email and password, or a preconfigured customerId');
    const cacheKey = `${config.apiBaseUrl}|${config.customerEmail}|${config.customerPassword}`;
    const cached = this.customerIdCache.get(cacheKey);
    if (cached) return cached;
    const response = await axios.post(this.url(config.apiBaseUrl, '/users/validate'), { email: config.customerEmail, password: config.customerPassword }, this.auth(token)).catch((error) => this.fail(error, 'Error validating Correo Argentino MiCorreo user'));
    const customerId = this.text(response.data?.customerId) || this.text(response.data?.id);
    if (!customerId) throw new ServiceUnavailableException('Correo Argentino MiCorreo user validation did not return customerId');
    this.customerIdCache.set(cacheKey, customerId);
    return customerId;
  }

  private getOriginPostalCode(config: RuntimeConfig) {
    const origin = config.metadata.originAddress && typeof config.metadata.originAddress === 'object' ? (config.metadata.originAddress as Record<string, unknown>) : {};
    const postalCode = this.text(origin.postalCode);
    if (!postalCode) throw new ServiceUnavailableException('Correo Argentino MiCorreo requires originAddress.postalCode in store metadata to quote shipments');
    return postalCode;
  }

  private sender(config: RuntimeConfig) {
    const origin = config.metadata.originAddress && typeof config.metadata.originAddress === 'object' ? (config.metadata.originAddress as Record<string, unknown>) : {};
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
        provinceCode: this.provinceCode(this.text(origin.provinceCode) || this.text(origin.state)) || null,
        postalCode: this.text(origin.postalCode) || null,
      },
    };
  }

  private recipient(data: ShipmentProvisionRequest) {
    const name = `${data.recipient.firstName} ${data.recipient.lastName}`.trim();
    return { name: name || 'Cliente', phone: this.digits(data.recipient.phone) || '', cellPhone: this.digits(data.recipient.phone) || '', email: data.recipient.email || 'no-reply@example.com' };
  }

  private shippingPayload(data: ShipmentProvisionRequest, config: RuntimeConfig) {
    const deliveryType = this.deliveryType(data.modalityCode || data.dispatchType || (data.method.toLowerCase().includes('sucursal') ? 'S' : 'D'));
    const address = this.splitStreet(data.address.address1);
    const provinceCode = this.provinceCode(data.address.state);
    const agency = deliveryType === 'S' ? this.text(data.branchId) || this.text(config.defaultAgency) || this.text(config.metadata.destinationAgency) : null;
    if (deliveryType === 'S' && !agency) throw new BadRequestException('Correo Argentino branch shipments require branchId or defaultAgency');
    if (deliveryType === 'D' && !provinceCode) throw new BadRequestException('Correo Argentino home delivery requires shipping state/province');
    return {
      deliveryType,
      agency,
      address: { streetName: address.streetName, streetNumber: address.streetNumber, floor: this.cut(address.floor, 3), apartment: this.cut(address.apartment, 3), city: data.address.city, provinceCode: provinceCode || 'C', postalCode: data.address.postalCode },
      productType: this.text(data.serviceCode) || config.productType || 'CP',
      weight: this.weightToGrams(data.weight, config.weightUnit),
      declaredValue: Number(data.value.toFixed ? data.value.toFixed(2) : data.value),
      height: this.dim(data.package.height),
      length: this.dim(data.package.length),
      width: this.dim(data.package.width),
    };
  }

  private buildQuoteDimensions(
    data: ShippingRateRequest,
    config: RuntimeConfig,
  ) {
    const defaults = config.metadata.defaultPackageDimensions && typeof config.metadata.defaultPackageDimensions === 'object' ? (config.metadata.defaultPackageDimensions as Record<string, unknown>) : {};
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

  private getQuotedDeliveryTypes(config: RuntimeConfig) {
    const raw = Array.isArray(config.metadata.deliveryTypes) ? config.metadata.deliveryTypes : [];
    const mapped = raw.map((value) => this.deliveryType(String(value))).filter((value, index, list) => list.indexOf(value) === index);
    if (mapped.length) return mapped as Array<'D' | 'S'>;
    return this.text(config.defaultAgency) ? (['D', 'S'] as Array<'D' | 'S'>) : (['D'] as Array<'D' | 'S'>);
  }

  private deliveryType(value?: string | null) { return value?.trim().toUpperCase() === 'S' ? 'S' : 'D'; }
  private externalOrderId(data: ShipmentProvisionRequest) { return (data.reference || `store-${data.storeId}-order-${data.orderId}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60); }
  private splitStreet(address1: string) { const m = address1.trim().match(/^(.*?)(\d{1,6})(?:\s+(.*))?$/); return m ? { streetName: m[1].trim() || 'Sin calle', streetNumber: m[2], floor: '', apartment: this.text(m[3]) } : { streetName: address1.trim() || 'Sin calle', streetNumber: '0', floor: '', apartment: '' }; }
  private provinceCode(value?: string | null) { const v = value?.trim().toUpperCase(); if (!v) return null; const map: Record<string, string> = { A:'A',SALTA:'A',B:'B','BUENOS AIRES':'B',C:'C',CABA:'C','CIUDAD AUTONOMA DE BUENOS AIRES':'C','CAPITAL FEDERAL':'C',D:'D','SAN LUIS':'D',E:'E','ENTRE RIOS':'E',ENTRE_RIOS:'E',F:'F','LA RIOJA':'F',LA_RIOJA:'F',G:'G','SANTIAGO DEL ESTERO':'G',SANTIAGO_DEL_ESTERO:'G',H:'H',CHACO:'H',J:'J','SAN JUAN':'J',SAN_JUAN:'J',K:'K',CATAMARCA:'K',L:'L','LA PAMPA':'L',LA_PAMPA:'L',M:'M',MENDOZA:'M',N:'N',MISIONES:'N',P:'P',FORMOSA:'P',Q:'Q',NEUQUEN:'Q',R:'R','RIO NEGRO':'R',RIO_NEGRO:'R',S:'S','SANTA FE':'S',SANTA_FE:'S',T:'T',TUCUMAN:'T',U:'U',CHUBUT:'U',V:'V','TIERRA DEL FUEGO':'V',TIERRA_DEL_FUEGO:'V',W:'W',CORRIENTES:'W',X:'X',CORDOBA:'X',Y:'Y',JUJUY:'Y',Z:'Z','SANTA CRUZ':'Z',SANTA_CRUZ:'Z' }; return map[v] || v; }
  private weightToGrams(weight?: number, unitHint: 'g' | 'kg' = 'kg') { const safe = Math.max(Number(weight || 0), 0.001); if (unitHint === 'g' || safe > 25) return Math.max(Math.round(safe), 1); return Math.max(Math.round(safe * 1000), 1); }
  private dim(value?: number) { return Math.min(Math.max(Math.round(value ?? 10), 1), 255); }
  private days(min?: string | number, max?: string | number) { const maxDays = Number(max); const minDays = Number(min); if (Number.isFinite(maxDays) && maxDays > 0) return maxDays; if (Number.isFinite(minDays) && minDays > 0) return minDays; return 3; }
  private trackStatus(event?: string | null, status?: string | null) { const v = `${event || ''} ${status || ''}`.trim().toLowerCase(); if (v.includes('entregado') || v.includes('entrega efectuada')) return 'delivered'; if (v.includes('distribucion') || v.includes('salio a reparto') || v.includes('visita')) return 'out_for_delivery'; if (v.includes('transito') || v.includes('clasificacion') || v.includes('encaminado') || v.includes('procesamiento')) return 'in_transit'; if (v.includes('imposicion') || v.includes('admitido') || v.includes('recepcionado')) return 'picked_up'; if (v.includes('devol') || v.includes('retorno') || v.includes('devuelto')) return 'returned'; if (v.includes('caduc') || v.includes('cancel') || v.includes('rechaz') || v.includes('no existe')) return 'failed'; return 'created'; }
  private trackDate(value?: string | null) { const text = this.text(value); if (!text) return undefined; const iso = Date.parse(text); if (!Number.isNaN(iso)) return new Date(iso); const [datePart, timePart = '00:00'] = text.split(' '); const [day, month, year] = datePart.split('-'); return day && month && year ? new Date(`${year}-${month}-${day}T${timePart}:00-03:00`) : text; }
  private trackingUrl(shippingId: string, config: RuntimeConfig) { const base = this.text(config.metadata.publicTrackingBaseUrl) || this.text(process.env.CORREO_ARGENTINO_PUBLIC_TRACKING_BASE_URL); return base ? `${base.replace(/\/$/, '')}/${encodeURIComponent(shippingId)}` : null; }
  private url(baseUrl: string, path: string) { return /^https?:\/\//i.test(path) ? path : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`; }
  private auth(token: string) { return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }; }
  private expiration(value?: string) { if (!value?.trim()) return Date.now() + 4 * 60 * 60 * 1000; const parsed = Date.parse(`${value.trim().replace(' ', 'T')}-03:00`); return Number.isNaN(parsed) ? Date.now() + 4 * 60 * 60 * 1000 : parsed; }
  private json(value?: string) { if (!value?.trim()) return {}; try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; } }
  private bool(value: unknown) { if (typeof value === 'boolean') return value; if (typeof value === 'string') { if (value.trim().toLowerCase() === 'true') return true; if (value.trim().toLowerCase() === 'false') return false; } return undefined; }
  private digits(value?: string | null) { return (value || '').replace(/\D+/g, ''); }
  private cut(value: string, length: number) { return value ? value.slice(0, length) : ''; }
  private text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : ''; }
  private isDuplicateImportError(error: unknown) { return axios.isAxiosError(error) && String(error.response?.data?.message || error.response?.data?.error || error.response?.data?.code || error.message || '').toLowerCase().includes('ya fue importada'); }
  private fail(error: unknown, fallback: string): never { if (error instanceof BadRequestException || error instanceof ServiceUnavailableException || error instanceof NotImplementedException) throw error; if (axios.isAxiosError(error)) throw new InternalServerErrorException(error.response?.data?.message || error.response?.data?.error || error.response?.data?.code || error.message || fallback); if (error instanceof Error) throw new InternalServerErrorException(error.message || fallback); throw new InternalServerErrorException(fallback); }
}
