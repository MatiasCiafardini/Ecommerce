import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

import {
  ProviderShipment,
  ProviderTrackingEvent,
  ResolvedShippingProviderConfig,
  ShippingProvider,
  ShippingProviderContext,
  ShippingRate,
  ShippingRateRequest,
  ShipmentProvisionRequest,
  ShipmentTrackingSnapshot,
} from './shipping-provider.interface';

type EnvioPackRuntimeConfig = {
  apiUrl: string;
  apiKey: string;
  secretKey: string;
  defaultOriginAddressId: string;
  ratesCostPath: string;
  ratesPriceHomePath: string;
  shipmentPath: string;
  authPath: string;
  trackingPathTemplate: string;
};

@Injectable()
export class EnvioPackProvider implements ShippingProvider {
  readonly providerCode = 'enviopack';
  private readonly accessTokenCache = new Map<
    string,
    { accessToken: string; refreshToken?: string; expiresAt: number }
  >();

  async getRates(
    data: ShippingRateRequest,
    context?: ShippingProviderContext,
  ): Promise<ShippingRate[]> {
    const config = this.getConfig(context?.config);
    const province = this.normalizeProvinceCode(data.state);

    if (!province) {
      throw new BadRequestException(
        'Shipping state/province is required to quote EnvioPack shipments',
      );
    }

    try {
      const accessToken = await this.getAccessToken(config);
      const packages = this.buildPackagesDescriptor(data.weight);

      const [sellerCostResponse, buyerPriceResponse] = await Promise.all([
        axios.get(this.buildUrl(config.apiUrl, config.ratesCostPath), {
          params: {
            access_token: accessToken,
            provincia: province,
            codigo_postal: data.postalCode,
            peso: data.weight,
            paquetes: packages,
            direccion_envio: config.defaultOriginAddressId || undefined,
            modalidad: 'D',
            despacho: 'D',
          },
        }),
        axios.get(this.buildUrl(config.apiUrl, config.ratesPriceHomePath), {
          params: {
            access_token: accessToken,
            provincia: province,
            codigo_postal: data.postalCode,
            peso: data.weight,
            paquetes: packages,
          },
        }),
      ]);

      const sellerCosts = this.extractArray(sellerCostResponse.data);
      const buyerPrices = this.extractArray(buyerPriceResponse.data);

      return sellerCosts.map((rate: any) => {
        const buyerPrice = buyerPrices.find(
          (candidate: any) =>
            candidate.modalidad === rate.modalidad &&
            candidate.servicio === rate.servicio,
        );
        const carrierId = rate?.correo?.id || 'carrier';
        const carrierName = rate?.correo?.nombre || carrierId;
        const serviceCode = rate.servicio || 'N';
        const modalityCode = rate.modalidad || 'D';
        const dispatchType = rate.despacho || 'D';
        const serviceLabel = this.describeService(
          carrierName,
          serviceCode,
          modalityCode,
        );

        return {
          provider: 'enviopack',
          method: serviceLabel,
          price: Number(buyerPrice?.valor ?? rate.valor ?? 0),
          estimatedDays: this.estimateDays(rate.horas_entrega),
          carrierId,
          carrierName,
          serviceCode,
          modalityCode,
          dispatchType,
          sellerCost: Number(rate.valor ?? 0),
        };
      });
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error fetching shipping rates from EnvioPack',
      );
    }
  }

  async createShipment(
    data: ShipmentProvisionRequest,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);

    try {
      const accessToken = await this.getAccessToken(config);
      const response = await axios.post(
        this.buildUrl(config.apiUrl, config.shipmentPath),
        {
          pedido: data.orderId,
          direccion_envio: config.defaultOriginAddressId || undefined,
          destinatario: `${data.recipient.firstName} ${data.recipient.lastName}`.trim(),
          modalidad: data.modalityCode || 'D',
          servicio: data.serviceCode || 'N',
          correo: data.carrierId,
          confirmado: true,
          observaciones: data.reference,
          paquetes: [
            {
              alto: Math.max(Math.round(data.package.height ?? 1), 1),
              ancho: Math.max(Math.round(data.package.width ?? 1), 1),
              largo: Math.max(Math.round(data.package.length ?? 1), 1),
              peso: Number((data.weight ?? 0.1).toFixed(2)),
            },
          ],
          calle: data.address.address1,
          numero: this.extractStreetNumber(data.address.address1),
          piso: null,
          depto: data.address.address2 || null,
          codigo_postal: data.address.postalCode,
          provincia: this.normalizeProvinceCode(data.address.state),
          localidad: data.address.city,
        },
        {
          params: {
            access_token: accessToken,
          },
        },
      );
      const shipment = this.normalizeShipment(response.data, data, config);
      const labelUrl = shipment.externalShipmentId
        ? this.buildUrl(
            config.apiUrl,
            `/envios/${shipment.externalShipmentId}/etiqueta?access_token=${accessToken}&tipo=pdf`,
          )
        : null;

      return {
        ...shipment,
        labelUrl,
      };
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error creating shipment in EnvioPack',
      );
    }
  }

  async getTracking(
    data: ShipmentTrackingSnapshot,
    context?: ShippingProviderContext,
  ): Promise<ProviderTrackingEvent[]> {
    const config = this.getConfig(context?.config);
    const shipmentId = data.externalShipmentId || data.trackingNumber;

    if (!shipmentId) {
      return [];
    }

    try {
      const accessToken = await this.getAccessToken(config);
      const response = await axios.get(
        this.buildUrl(
          config.apiUrl,
          config.trackingPathTemplate.replace('{shipmentId}', shipmentId),
        ),
        {
          params: {
            access_token: accessToken,
          },
        },
      );

      const shipment = response.data;
      const events = this.extractArray(shipment?.sub_condiciones);

      return events.map((event: any) => ({
        status: this.normalizeStatus(
          event?.codigo || shipment?.condicion || shipment?.estado,
        ),
        description:
          event?.nombre || event?.descripcion || 'Tracking update',
        location: shipment?.localidad || undefined,
        occurredAt:
          event?.fecha ||
          shipment?.fecha_aceptacion ||
          shipment?.fecha_solicitud ||
          undefined,
      }));
    } catch (error) {
      this.rethrowProviderError(
        error,
        'Error fetching tracking from EnvioPack',
      );
    }
  }

  async getShipmentDetail(
    shipmentId: string,
    context?: ShippingProviderContext,
  ): Promise<ProviderShipment> {
    const config = this.getConfig(context?.config);
    const accessToken = await this.getAccessToken(config);
    const response = await axios.get(
      this.buildUrl(
        config.apiUrl,
        config.trackingPathTemplate.replace('{shipmentId}', shipmentId),
      ),
      {
        params: {
          access_token: accessToken,
        },
      },
    );

    const shipment = this.normalizeShipment(
      response.data,
      {
        orderId: Number(response.data?.pedido ?? 0),
        storeId: 0,
        reference: `envio-${shipmentId}`,
        provider: this.providerCode,
        carrierId: response.data?.correo?.id ?? null,
        carrierName:
          response.data?.correo?.nombre ?? response.data?.correo ?? null,
        method: this.describeService(
          response.data?.correo?.nombre || response.data?.correo || 'Correo',
          response.data?.servicio,
          response.data?.modalidad,
        ),
        serviceCode: response.data?.servicio ?? null,
        modalityCode: response.data?.modalidad ?? null,
        dispatchType: response.data?.despacho ?? null,
        branchId: response.data?.sucursal?.id ?? null,
        weight: Number(response.data?.peso_aforado ?? 0) || undefined,
        value: Number(response.data?.costo ?? 0) || 0,
        recipient: {
          firstName: response.data?.destinatario || 'Cliente',
          lastName: '',
        },
        address: {
          address1: response.data?.calle || '',
          city: response.data?.localidad || '',
          state: response.data?.provincia || '',
          postalCode: response.data?.codigo_postal || '',
          country: 'AR',
        },
        package: {},
      },
      config,
    );

    return {
      ...shipment,
      labelUrl: shipment.externalShipmentId
        ? this.buildUrl(
            config.apiUrl,
            `/envios/${shipment.externalShipmentId}/etiqueta?access_token=${accessToken}&tipo=pdf`,
          )
        : null,
    };
  }

  async testConnection(context?: ShippingProviderContext) {
    const config = this.getConfig(context?.config);
    const accessToken = await this.getAccessToken(config);

    return {
      ok: true,
      message: 'EnvioPack credentials are valid',
      details: {
        accessTokenPreview: accessToken.slice(0, 6),
      },
    };
  }

  private getConfig(
    storeConfig?: ResolvedShippingProviderConfig | null,
  ): EnvioPackRuntimeConfig {
    const metadata = (storeConfig?.metadata ?? {}) as Record<string, unknown>;
    const apiUrl =
      this.pickString(metadata.baseUrl) ||
      process.env.ENVIOPACK_BASE_URL?.trim() ||
      process.env.ENVIOSPACK_BASE_URL?.trim() ||
      process.env.ENVIOPACK_API_URL?.trim() ||
      'https://api.enviopack.com';
    const apiKey =
      storeConfig?.apiKey?.trim() ||
      process.env.ENVIOPACK_API_KEY?.trim() ||
      process.env.ENVIOSPACK_API_KEY?.trim() ||
      process.env.ENVIOSPACK_APIKEY?.trim() ||
      '';
    const secretKey =
      storeConfig?.secretKey?.trim() ||
      storeConfig?.password?.trim() ||
      this.pickString(metadata.secretKey) ||
      process.env.ENVIOPACK_SECRET_KEY?.trim() ||
      process.env.ENVIOSPACK_SECRET_KEY?.trim() ||
      '';
    const defaultOriginAddressId =
      storeConfig?.originAddressId?.trim() ||
      this.pickString(metadata.defaultOriginAddressId) ||
      process.env.ENVIOPACK_DEFAULT_ORIGIN_ADDRESS_ID?.trim() ||
      process.env.ENVIOSPACK_DEFAULT_ORIGIN_ADDRESS_ID?.trim() ||
      '';

    const config: EnvioPackRuntimeConfig = {
      apiUrl,
      apiKey,
      secretKey,
      defaultOriginAddressId,
      ratesCostPath:
        this.pickString(metadata.ratesCostPath) ||
        process.env.ENVIOPACK_RATES_COST_PATH?.trim() ||
        '/cotizar/costo',
      ratesPriceHomePath:
        this.pickString(metadata.ratesPriceHomePath) ||
        process.env.ENVIOPACK_RATES_PRICE_HOME_PATH?.trim() ||
        '/cotizar/precio/a-domicilio',
      shipmentPath:
        this.pickString(metadata.shipmentPath) ||
        process.env.ENVIOPACK_SHIPMENTS_PATH?.trim() ||
        '/envios',
      authPath:
        this.pickString(metadata.authPath) ||
        process.env.ENVIOPACK_AUTH_PATH?.trim() ||
        '/auth',
      trackingPathTemplate:
        this.pickString(metadata.trackingPathTemplate) ||
        process.env.ENVIOPACK_TRACKING_PATH?.trim() ||
        '/envios/{shipmentId}',
    };

    if (!config.apiKey || !config.secretKey) {
      throw new ServiceUnavailableException(
        'EnvioPack requires apiKey and secretKey to operate',
      );
    }

    return config;
  }

  private buildUrl(apiUrl: string, path: string) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private async getAccessToken(config: EnvioPackRuntimeConfig) {
    const cacheKey = `${config.apiUrl}|${config.apiKey}|${config.secretKey}`;
    const cached = this.accessTokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    const response = await axios.post(
      this.buildUrl(config.apiUrl, config.authPath),
      new URLSearchParams({
        'api-key': config.apiKey,
        'secret-key': config.secretKey,
      }).toString(),
      {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const accessToken =
      response.data?.access_token || response.data?.token || null;

    if (!accessToken) {
      throw new ServiceUnavailableException(
        'EnvioPack auth response did not include an access_token',
      );
    }

    this.accessTokenCache.set(cacheKey, {
      accessToken,
      refreshToken: response.data?.refresh_token,
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    });

    return accessToken;
  }

  private extractArray(payload: any) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.results)) {
      return payload.results;
    }

    if (Array.isArray(payload?.tracking_events)) {
      return payload.tracking_events;
    }

    return [];
  }

  private normalizeShipment(
    payload: any,
    request: ShipmentProvisionRequest,
    config: EnvioPackRuntimeConfig,
  ): ProviderShipment {
    const data = payload?.data ?? payload;
    const trackingNumber =
      data?.tracking_number ??
      data?.tracking ??
      data?.trackingCode ??
      null;
    const externalShipmentId =
      data?.id ??
      data?.shipment_id ??
      data?.external_id ??
      trackingNumber ??
      null;
    const labelUrl =
      data?.label_url ??
      data?.label?.url ??
      data?.files?.label ??
      data?.files?.pdf ??
      null;
    const trackingUrl = externalShipmentId
      ? this.buildUrl(config.apiUrl, `/envios/${externalShipmentId}`)
      : null;
    const status = this.normalizeStatus(
      data?.condicion ?? data?.estado ?? data?.status,
    );

    return {
      provider: 'enviopack',
      method:
        request.method ||
        this.describeService(
          request.carrierName || data?.correo || 'Correo',
          request.serviceCode || data?.servicio,
          request.modalityCode || data?.modalidad,
        ),
      carrier: request.carrierName || data?.correo || null,
      externalShipmentId,
      trackingNumber,
      trackingUrl,
      labelUrl,
      labelFormat: 'pdf',
      status,
      cost: Number(data?.costo ?? data?.costo_envio ?? 0) || null,
      conditionCode: data?.condicion ?? data?.estado ?? null,
      payload: data,
      events: status
        ? [
            {
              status,
              description:
                'Etiqueta generada automaticamente desde EnvioPack.',
            },
          ]
        : [],
    };
  }

  private normalizeStatus(value?: string | null) {
    const normalized = value?.trim().toLowerCase().replaceAll(' ', '_');

    switch (normalized) {
      case 'p':
      case 'pending':
      case 'c':
      case 'created':
      case 'r':
      case 'picked_up':
      case 't':
      case 'in_transit':
      case 'out_for_delivery':
      case 'e':
      case 'delivered':
      case 'x':
      case 'failed':
      case 'returned':
        return this.mapStatusCode(normalized);
      case 'ready_to_ship':
      case 'ready_for_pickup':
      case 'label_created':
        return 'created';
      case 'on_the_way':
        return 'in_transit';
      default:
        return 'created';
    }
  }

  private mapStatusCode(value: string) {
    switch (value) {
      case 'p':
        return 'pending';
      case 'c':
        return 'created';
      case 'r':
        return 'picked_up';
      case 't':
        return 'in_transit';
      case 'e':
        return 'delivered';
      case 'x':
        return 'failed';
      default:
        return value;
    }
  }

  private normalizeProvinceCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase();

    if (!normalized) return null;

    const map: Record<string, string> = {
      C: 'C',
      CABA: 'C',
      'CIUDAD AUTONOMA DE BUENOS AIRES': 'C',
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
      ENTRE_RIOS: 'E',
      'ENTRE RIOS': 'E',
      'ENTRE RÍOS': 'E',
      E: 'E',
      FORMOSA: 'P',
      P: 'P',
      JUJUY: 'Y',
      Y: 'Y',
      LA_PAMPA: 'L',
      'LA PAMPA': 'L',
      L: 'L',
      LA_RIOJA: 'F',
      'LA RIOJA': 'F',
      F: 'F',
      MENDOZA: 'M',
      M: 'M',
      MISIONES: 'N',
      N: 'N',
      NEUQUEN: 'Q',
      'NEUQUÉN': 'Q',
      Q: 'Q',
      RIO_NEGRO: 'R',
      'RIO NEGRO': 'R',
      R: 'R',
      SALTA: 'A',
      A: 'A',
      SAN_JUAN: 'J',
      'SAN JUAN': 'J',
      J: 'J',
      SAN_LUIS: 'D',
      'SAN LUIS': 'D',
      D: 'D',
      SANTA_CRUZ: 'Z',
      'SANTA CRUZ': 'Z',
      Z: 'Z',
      SANTA_FE: 'S',
      'SANTA FE': 'S',
      S: 'S',
      SANTIAGO_DEL_ESTERO: 'G',
      'SANTIAGO DEL ESTERO': 'G',
      G: 'G',
      TIERRA_DEL_FUEGO: 'V',
      'TIERRA DEL FUEGO': 'V',
      V: 'V',
      TUCUMAN: 'T',
      'TUCUMÁN': 'T',
      T: 'T',
    };

    return map[normalized] || null;
  }

  private buildPackagesDescriptor(weight: number) {
    const safeWeight = Math.max(weight || 0.1, 0.1);
    const estimatedSide = Math.max(Math.round(Math.cbrt(safeWeight * 6000)), 1);

    return `${estimatedSide}x${estimatedSide}x${estimatedSide}`;
  }

  private describeService(
    carrierName: string,
    serviceCode?: string | null,
    modalityCode?: string | null,
  ) {
    const service =
      serviceCode === 'P'
        ? 'Prioritario'
        : serviceCode === 'X'
          ? 'Express'
          : serviceCode === 'R'
            ? 'Devolucion'
            : 'Estandar';
    const modality = modalityCode === 'S' ? 'Sucursal' : 'Domicilio';

    return `${carrierName} · ${modality} · ${service}`;
  }

  private estimateDays(hours?: number | string | null) {
    if (!hours) return 3;

    return Math.max(Math.ceil(Number(hours) / 24), 1);
  }

  private extractStreetNumber(address1: string) {
    const match = address1.match(/\b(\d{1,6})\b/);

    return match ? match[1] : '0';
  }

  private pickString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private rethrowProviderError(error: unknown, fallbackMessage: string): never {
    if (axios.isAxiosError(error)) {
      const providerMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;

      throw new InternalServerErrorException(providerMessage || fallbackMessage);
    }

    if (error instanceof Error) {
      throw new InternalServerErrorException(error.message || fallbackMessage);
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
