import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { UpdateManualShipmentDto } from '../dto/update-manual-shipment.dto';
import { ShipmentStatus } from '@prisma/client';
import {
  ProviderShipment,
  ShippingProviderContext,
  ShipmentProvisionRequest,
} from '../../shipping/providers/shipping-provider.interface';
import { StoreShippingProviderConfigService } from '../../shipping/services/store-shipping-provider-config.service';

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    private prisma: PrismaService,
    private providerConfigService: StoreShippingProviderConfigService,
  ) {}

  async createShipment(storeId: number, dto: CreateShipmentDto) {
    const order = (await this.findOrderForShipment(
      storeId,
      Number(dto.orderId),
    )) as any;

    if (order.shipment) {
      return order.shipment;
    }

    const resolvedProvider =
      await this.providerConfigService.resolveProviderForStore(storeId, {
        providerCode: dto.provider,
      });

    const providerShipment = await this.createProviderShipment(order, {
      provider: resolvedProvider.provider.providerCode,
      carrierId: dto.provider,
      carrierName: dto.provider,
      method: dto.method,
      serviceCode: order.shippingServiceCode,
      modalityCode: order.shippingModalityCode,
      dispatchType: order.shippingDispatchType,
      branchId: order.shippingBranchId,
      weight: dto.weight,
      shippingAddress: dto.shippingAddress,
      postalCode: dto.postalCode,
    }, resolvedProvider.context, resolvedProvider.provider);

    return this.persistShipment(storeId, order.id, {
      provider: resolvedProvider.provider.providerCode,
      carrier: dto.provider,
      method: dto.method,
      weight: dto.weight,
      shippingAddress: dto.shippingAddress,
      postalCode: dto.postalCode,
      providerConfigId: resolvedProvider.config?.id ?? null,
      providerShipment,
    });
  }

  async createOrderShipment(storeId: number, orderId: number) {
    const order = (await this.findOrderForShipment(storeId, orderId)) as any;

    if (order.shipment) {
      return order.shipment;
    }

    if (this.isPickupOrder(order)) {
      throw new BadRequestException(
        'Pickup orders do not require shipment generation',
      );
    }

    const shippingAddress = this.buildShippingAddress(order);
    const postalCode = order.shippingPostalCodeSnapshot?.trim();

    if (!postalCode) {
      throw new BadRequestException(
        'Shipping postal code snapshot is required before packing this order',
      );
    }

    const resolvedProvider =
      await this.providerConfigService.resolveProviderForStore(storeId, {
        providerCode: order.shippingProvider,
        providerConfigId: order.shippingProviderConfigId,
      });

    const providerShipment = await this.createProviderShipment(order, {
      provider: resolvedProvider.provider.providerCode,
      carrierId: order.shippingCarrierId || order.shippingProvider,
      carrierName: order.shippingCarrierName || order.shippingProvider,
      method: order.shippingMethod || 'standard',
      serviceCode: order.shippingServiceCode,
      modalityCode: order.shippingModalityCode,
      dispatchType: order.shippingDispatchType,
      branchId: order.shippingBranchId,
      weight: this.calculateOrderWeight(order.items),
      shippingAddress,
      postalCode,
    }, resolvedProvider.context, resolvedProvider.provider);

    return this.persistShipment(storeId, order.id, {
      provider: resolvedProvider.provider.providerCode,
      carrier: order.shippingCarrierName || order.shippingProvider || null,
      method: order.shippingMethod || 'standard',
      weight: this.calculateOrderWeight(order.items),
      shippingAddress,
      postalCode,
      providerConfigId:
        order.shippingProviderConfigId ?? resolvedProvider.config?.id ?? null,
      providerShipment,
    });
  }

  async findAll(storeId: number) {
    return this.prisma.shipment.findMany({
      where: { storeId },
      include: {
        trackingEvents: true,
        order: {
          select: {
            id: true,
            shippingMethod: true,
            shippingFirstNameSnapshot: true,
            shippingLastNameSnapshot: true,
            shippingPhoneSnapshot: true,
            shippingAddress1Snapshot: true,
            shippingAddress2Snapshot: true,
            shippingCitySnapshot: true,
            shippingStateSnapshot: true,
            shippingPostalCodeSnapshot: true,
            shippingCountrySnapshot: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(storeId: number, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        storeId,
      },
      include: {
        trackingEvents: true,
        order: {
          select: {
            id: true,
            shippingMethod: true,
            shippingFirstNameSnapshot: true,
            shippingLastNameSnapshot: true,
            shippingPhoneSnapshot: true,
            shippingAddress1Snapshot: true,
            shippingAddress2Snapshot: true,
            shippingCitySnapshot: true,
            shippingStateSnapshot: true,
            shippingPostalCodeSnapshot: true,
            shippingCountrySnapshot: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  async updateStatus(shipmentId: string, status: ShipmentStatus) {
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status },
    });
  }

  async updateManualShipment(
    storeId: number,
    shipmentId: string,
    dto: UpdateManualShipmentDto,
  ) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        storeId,
      },
      include: {
        order: true,
        trackingEvents: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const nextStatus = this.normalizeManualStatus(dto.status, shipment.status);
    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        carrier: dto.carrier === undefined ? undefined : dto.carrier || null,
        trackingNumber:
          dto.trackingNumber === undefined ? undefined : dto.trackingNumber || null,
        trackingUrl:
          dto.trackingUrl === undefined ? undefined : dto.trackingUrl || null,
        internalNotes:
          dto.internalNotes === undefined ? undefined : dto.internalNotes || null,
        status: nextStatus,
      } as any,
      include: {
        trackingEvents: true,
      },
    });

    if (
      dto.status &&
      nextStatus !== shipment.status &&
      !shipment.trackingEvents.some((event) => event.status === nextStatus)
    ) {
      await this.prisma.shipmentTrackingEvent.create({
        data: {
          shipmentId,
          status: nextStatus,
          description: dto.internalNotes || 'Manual shipment update',
          location: dto.carrier || undefined,
        },
      });
    }

    if (nextStatus === 'delivered' && shipment.order.status !== 'delivered') {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'delivered' },
      });
    }

    return this.findOne(storeId, shipmentId);
  }

  async getPrintableLabel(storeId: number, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        storeId,
      },
      include: {
        order: true,
        store: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.labelUrl) {
      return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Rotulo envio ${shipment.orderId}</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0f0f10;
      color: #f5f1ea;
      font-family: Arial, sans-serif;
      padding: 24px;
    }
    .card {
      width: min(960px, 100%);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.12);
      background: #171718;
      padding: 24px;
      box-sizing: border-box;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 28px;
    }
    p {
      margin: 0 0 16px;
      line-height: 1.7;
      color: rgba(245,241,234,0.74);
    }
    a {
      color: #f5f1ea;
    }
    iframe {
      width: 100%;
      min-height: 72vh;
      border: 0;
      border-radius: 18px;
      background: #fff;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Rotulo del envio #${shipment.orderId}</h1>
    <p>Se encontro un rotulo provisto por el carrier. Si no carga embebido, podes abrirlo directamente en una nueva pestana.</p>
    <p><a href="${this.escapeHtml(shipment.labelUrl)}" target="_blank" rel="noreferrer">Abrir rotulo del carrier</a></p>
    <iframe src="${this.escapeHtml(shipment.labelUrl)}" title="Rotulo del carrier"></iframe>
  </div>
</body>
</html>`;
    }

    const senderConfig =
      await this.providerConfigService.resolveProviderForStore(storeId, {
        providerCode: 'manual',
      });
    const senderMetadata =
      (senderConfig.config?.metadata as Record<string, unknown> | null) ?? {};
    const senderAddress =
      senderMetadata.originAddress &&
      typeof senderMetadata.originAddress === 'object'
        ? (senderMetadata.originAddress as Record<string, unknown>)
        : {};
    const senderName =
      senderConfig.config?.senderName ||
      senderConfig.config?.companyName ||
      shipment.store.name;

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta envio pedido ${shipment.orderId}</title>
  <style>
    :root {
      --ink: #111111;
      --muted: #5f5f5f;
      --line: #d9d2c6;
      --paper: #fffdf8;
      --accent: #f3eee6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: "Helvetica Neue", Arial, sans-serif;
      background: #f4efe7;
      color: var(--ink);
    }
    .sheet {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 18px 60px rgba(17,17,17,0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      padding: 28px 30px 22px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #fffdf8 0%, #f7f1e8 100%);
    }
    .eyebrow {
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: 11px;
      color: var(--muted);
    }
    .title {
      margin: 0;
      font-size: 34px;
      line-height: 0.96;
      letter-spacing: -0.04em;
    }
    .summary {
      display: grid;
      gap: 8px;
      min-width: 250px;
      padding: 18px 20px;
      border-radius: 22px;
      background: rgba(17,17,17,0.03);
      border: 1px solid rgba(17,17,17,0.08);
    }
    .summary-line, .line {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .summary-line strong, .label { font-weight: 700; }
    .content {
      display: grid;
      gap: 18px;
      padding: 24px 30px 30px;
    }
    .recipient {
      border: 2px solid var(--ink);
      border-radius: 26px;
      padding: 24px;
      background: #ffffff;
    }
    .recipient-name {
      margin: 0 0 10px;
      font-size: 30px;
      line-height: 1.05;
      letter-spacing: -0.04em;
    }
    .recipient-address {
      margin: 0;
      font-size: 18px;
      line-height: 1.55;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .box {
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 18px;
      background: var(--accent);
      min-height: 170px;
    }
    .box h2 {
      margin: 0 0 12px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .meta-card {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px;
      background: #fff;
      min-height: 88px;
    }
    .meta-card .label {
      display: block;
      margin-bottom: 8px;
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 700;
    }
    .meta-card strong {
      font-size: 18px;
      line-height: 1.3;
      display: block;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-end;
      padding: 0 30px 26px;
      color: var(--muted);
      font-size: 12px;
    }
    .tracking-box {
      min-width: 280px;
      padding: 14px 18px;
      border-radius: 18px;
      border: 1px dashed rgba(17,17,17,0.3);
      background: rgba(17,17,17,0.02);
    }
    .tracking-code {
      font-size: 20px;
      letter-spacing: 0.12em;
      font-weight: 800;
      margin: 8px 0 0;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .sheet { max-width: none; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <p class="eyebrow">Logistica manual</p>
        <h1 class="title">Etiqueta de envio</h1>
      </div>
      <div class="summary">
        <p class="summary-line"><strong>Pedido:</strong> #${shipment.orderId}</p>
        <p class="summary-line"><strong>Metodo:</strong> ${this.escapeHtml(shipment.method || shipment.order.shippingMethod || 'Envio manual')}</p>
        <p class="summary-line"><strong>Empresa:</strong> ${this.escapeHtml(shipment.carrier || 'A definir')}</p>
        <p class="summary-line"><strong>Referencia:</strong> ${this.escapeHtml(`store-${shipment.storeId}-order-${shipment.orderId}`)}</p>
      </div>
    </div>

    <div class="content">
      <div class="recipient">
        <p class="eyebrow">Destinatario</p>
        <h2 class="recipient-name">${this.escapeHtml(`${shipment.order.shippingFirstNameSnapshot || ''} ${shipment.order.shippingLastNameSnapshot || ''}`.trim() || 'Sin destinatario')}</h2>
        <p class="recipient-address">${this.escapeHtml([shipment.order.shippingAddress1Snapshot, shipment.order.shippingAddress2Snapshot].filter(Boolean).join(' '))}</p>
        <p class="recipient-address">${this.escapeHtml([shipment.order.shippingCitySnapshot, shipment.order.shippingStateSnapshot, shipment.order.shippingPostalCodeSnapshot ? `CP ${shipment.order.shippingPostalCodeSnapshot}` : null].filter(Boolean).join(' · '))}</p>
        <p class="recipient-address">${this.escapeHtml([shipment.order.shippingCountrySnapshot, shipment.order.shippingPhoneSnapshot || shipment.order.customerPhoneSnapshot].filter(Boolean).join(' · '))}</p>
      </div>

      <div class="grid">
        <div class="box">
          <h2>Remitente</h2>
          <p class="line"><span class="label">Nombre:</span> ${this.escapeHtml(senderName)}</p>
          <p class="line"><span class="label">Direccion:</span> ${this.escapeHtml(this.buildAddressLine(senderAddress))}</p>
          <p class="line"><span class="label">Ciudad:</span> ${this.escapeHtml(this.pickRecordString(senderAddress, 'city'))}</p>
          <p class="line"><span class="label">Provincia:</span> ${this.escapeHtml(this.pickRecordString(senderAddress, 'state') || this.pickRecordString(senderAddress, 'provinceCode'))}</p>
          <p class="line"><span class="label">Telefono:</span> ${this.escapeHtml(senderConfig.config?.senderPhone || '')}</p>
        </div>
        <div class="box">
          <h2>Datos operativos</h2>
          <p class="line"><span class="label">Tracking:</span> ${this.escapeHtml(shipment.trackingNumber || 'Pendiente')}</p>
          <p class="line"><span class="label">Carrier:</span> ${this.escapeHtml(shipment.carrier || 'A definir')}</p>
          <p class="line"><span class="label">Estado:</span> ${this.escapeHtml(shipment.status)}</p>
          <p class="line"><span class="label">Direccion corta:</span> ${this.escapeHtml(shipment.shippingAddress)}</p>
        </div>
      </div>

      <div class="meta">
        <div class="meta-card">
          <span class="label">Pedido</span>
          <strong>#${shipment.orderId}</strong>
        </div>
        <div class="meta-card">
          <span class="label">Metodo</span>
          <strong>${this.escapeHtml(shipment.method || shipment.order.shippingMethod || 'Envio manual')}</strong>
        </div>
        <div class="meta-card">
          <span class="label">Codigo postal</span>
          <strong>${this.escapeHtml(shipment.order.shippingPostalCodeSnapshot || shipment.postalCode || '')}</strong>
        </div>
        <div class="meta-card">
          <span class="label">Telefono</span>
          <strong>${this.escapeHtml(shipment.order.shippingPhoneSnapshot || shipment.order.customerPhoneSnapshot || '')}</strong>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        Documento interno generado desde el panel admin para impresion y pegado en paquete.
      </div>
      <div class="tracking-box">
        <span class="label">Tracking visible</span>
        <p class="tracking-code">${this.escapeHtml(shipment.trackingNumber || 'SIN TRACKING')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private async findOrderForShipment(storeId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        storeId,
      },
      include: {
        shipment: {
          include: {
            trackingEvents: true,
          },
        },
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private async createProviderShipment(
    order: Awaited<ReturnType<ShipmentService['findOrderForShipment']>>,
    options: {
      provider: string;
      carrierId?: string | null;
      carrierName?: string | null;
      method: string;
      serviceCode?: string | null;
      modalityCode?: string | null;
      dispatchType?: string | null;
      branchId?: string | null;
      weight?: number;
      shippingAddress: string;
      postalCode: string;
    },
    context: ShippingProviderContext,
    provider: {
      providerCode: string;
      createShipment?: (
        data: ShipmentProvisionRequest,
        context?: ShippingProviderContext,
      ) => Promise<ProviderShipment>;
    },
  ) {
    const shouldUseExternalProvider =
      provider.providerCode !== 'mock' &&
      typeof provider.createShipment === 'function';

    if (!shouldUseExternalProvider) {
      return this.buildLocalShipmentFallback(order.id, options, provider.providerCode);
    }

    const request = this.buildProviderRequest(order, options);

    try {
      return await provider.createShipment!(request, context);
    } catch (error) {
      if (error instanceof NotImplementedException || error instanceof Error) {
        this.logger.warn(
          `Provider ${provider.providerCode} failed or is not implemented for live shipment creation, using local fallback`,
        );

        return this.buildLocalShipmentFallback(
          order.id,
          options,
          provider.providerCode,
        );
      }

      throw error;
    }
  }

  private buildProviderRequest(
    order: Awaited<ReturnType<ShipmentService['findOrderForShipment']>>,
    options: {
      provider: string;
      carrierId?: string | null;
      carrierName?: string | null;
      method: string;
      serviceCode?: string | null;
      modalityCode?: string | null;
      dispatchType?: string | null;
      branchId?: string | null;
      weight?: number;
      shippingAddress: string;
      postalCode: string;
    },
  ): ShipmentProvisionRequest {
    const [firstName = 'Cliente', ...lastNameParts] = (
      order.shippingFirstNameSnapshot ||
      order.customerFirstNameSnapshot ||
      'Cliente'
    )
      .trim()
      .split(' ');
    const lastName =
      order.shippingLastNameSnapshot ||
      order.customerLastNameSnapshot ||
      lastNameParts.join(' ') ||
      'Storefront';

    return {
      orderId: order.id,
      storeId: order.storeId,
      reference: `store-${order.storeId}-order-${order.id}`,
      provider: options.provider,
      carrierId: options.carrierId,
      carrierName: options.carrierName,
      method: options.method,
      serviceCode: options.serviceCode,
      modalityCode: options.modalityCode,
      dispatchType: options.dispatchType,
      branchId: options.branchId,
      weight: options.weight,
      value: this.calculateDeclaredValue(
        order.items as unknown as Array<{
          quantity: number;
          price: number | string;
        }>,
      ),
      recipient: {
        firstName,
        lastName,
        email: order.customerEmailSnapshot,
        phone: order.shippingPhoneSnapshot || order.customerPhoneSnapshot,
      },
      address: {
        address1: order.shippingAddress1Snapshot || options.shippingAddress,
        address2: order.shippingAddress2Snapshot,
        city: order.shippingCitySnapshot || 'Ciudad no informada',
        state: order.shippingStateSnapshot,
        postalCode: options.postalCode,
        country: order.shippingCountrySnapshot || 'AR',
      },
      package: this.calculatePackageDimensions(order.items),
    };
  }

  private buildLocalShipmentFallback(
    orderId: number,
    options: {
      provider: string;
      carrierId?: string | null;
      carrierName?: string | null;
      method: string;
      weight?: number;
    },
    providerCode: string,
  ): ProviderShipment {
    const token = `${orderId}${Date.now().toString().slice(-6)}`;

    return {
      provider: providerCode,
      method: options.method,
      carrier: options.carrierName || options.carrierId || null,
      externalShipmentId: null,
      trackingNumber: `${options.provider.toUpperCase().slice(0, 4)}-${token}`,
      trackingUrl: null,
      labelUrl: null,
      labelFormat: null,
      status: 'created',
      events: [
        {
          status: 'created',
          description:
            providerCode === 'mock'
              ? 'Etiqueta simulada generada automaticamente para entorno de desarrollo.'
              : 'Envio creado en modo manual por falta de integracion carrier para este proveedor.',
        },
      ],
    };
  }

  private async persistShipment(
    storeId: number,
    orderId: number,
    data: {
      provider: string;
      carrier?: string | null;
      method: string;
      weight?: number;
      shippingAddress: string;
      postalCode: string;
      providerConfigId?: string | null;
      providerShipment: ProviderShipment;
    },
  ) {
    return this.prisma.shipment.create({
      data: {
        storeId,
        orderId,
        provider: data.providerShipment.provider || data.provider,
        carrier: data.providerShipment.carrier ?? data.carrier ?? null,
        method: data.providerShipment.method || data.method,
        externalShipmentId: data.providerShipment.externalShipmentId ?? null,
        trackingNumber: data.providerShipment.trackingNumber ?? null,
        trackingUrl: data.providerShipment.trackingUrl ?? null,
        labelUrl: data.providerShipment.labelUrl ?? null,
        labelFormat: data.providerShipment.labelFormat ?? null,
        cost: data.providerShipment.cost ?? null,
        conditionCode: data.providerShipment.conditionCode ?? null,
        providerPayload: data.providerShipment.payload as any,
        providerConfigId: data.providerConfigId ?? null,
        internalNotes: null,
        weight: data.weight,
        shippingAddress: data.shippingAddress,
        postalCode: data.postalCode,
        status: this.normalizeShipmentStatus(data.providerShipment.status),
        trackingEvents: data.providerShipment.events?.length
          ? {
              create: data.providerShipment.events.map((event) => ({
                status: this.normalizeShipmentStatus(event.status),
                description: event.description,
                location: event.location,
                createdAt: event.occurredAt
                  ? new Date(event.occurredAt)
                  : undefined,
              })),
            }
          : undefined,
      } as any,
      include: {
        trackingEvents: true,
      },
    });
  }

  private normalizeShipmentStatus(status?: string | null): ShipmentStatus {
    switch (status) {
      case 'pending':
      case 'created':
      case 'picked_up':
      case 'in_transit':
      case 'out_for_delivery':
      case 'delivered':
      case 'failed':
      case 'returned':
        return status;
      default:
        return ShipmentStatus.created;
    }
  }

  private normalizeManualStatus(
    status?: string | null,
    fallback: ShipmentStatus = ShipmentStatus.created,
  ): ShipmentStatus {
    const normalized = status?.trim().toLowerCase();

    switch (normalized) {
      case 'pending':
        return ShipmentStatus.pending;
      case 'preparing':
      case 'ready_to_ship':
      case 'created':
        return ShipmentStatus.created;
      case 'shipped':
      case 'picked_up':
        return ShipmentStatus.picked_up;
      case 'in_transit':
        return ShipmentStatus.in_transit;
      case 'out_for_delivery':
        return ShipmentStatus.out_for_delivery;
      case 'delivered':
        return ShipmentStatus.delivered;
      case 'returned':
        return ShipmentStatus.returned;
      case 'cancelled':
      case 'failed':
        return ShipmentStatus.failed;
      default:
        return fallback;
    }
  }

  private isPickupOrder(order: {
    shippingMethod?: string | null;
    shippingProvider?: string | null;
  }) {
    const shippingMethod = order.shippingMethod?.trim().toLowerCase() ?? '';
    const shippingProvider = order.shippingProvider?.trim().toLowerCase() ?? '';

    return (
      shippingMethod.includes('pickup') ||
      shippingMethod.includes('retiro') ||
      shippingProvider === 'store'
    );
  }

  private buildShippingAddress(order: {
    shippingAddress1Snapshot?: string | null;
    shippingAddress2Snapshot?: string | null;
    shippingCitySnapshot?: string | null;
    shippingStateSnapshot?: string | null;
    shippingCountrySnapshot?: string | null;
  }) {
    const address = [
      order.shippingAddress1Snapshot,
      order.shippingAddress2Snapshot,
      order.shippingCitySnapshot,
      order.shippingStateSnapshot,
      order.shippingCountrySnapshot,
    ]
      .filter(Boolean)
      .join(', ')
      .trim();

    if (!address) {
      throw new BadRequestException(
        'Shipping address snapshot is required before packing this order',
      );
    }

    return address;
  }

  private calculateOrderWeight(
    items: Array<{ quantity: number; variant: { weight?: number | null } }>,
  ) {
    const totalWeight = items.reduce(
      (sum, item) => sum + (item.variant.weight ?? 0) * item.quantity,
      0,
    );

    return totalWeight > 0 ? totalWeight : undefined;
  }

  private calculateDeclaredValue(
    items: Array<{ quantity: number; price: number | string }>,
  ) {
    return items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );
  }

  private calculatePackageDimensions(
    items: Array<{
      quantity: number;
      variant: {
        width?: number | null;
        height?: number | null;
        length?: number | null;
      };
    }>,
  ) {
    const widths = items
      .flatMap((item) => Array(item.quantity).fill(item.variant.width ?? 0))
      .filter((value) => value > 0);
    const heights = items
      .flatMap((item) => Array(item.quantity).fill(item.variant.height ?? 0))
      .filter((value) => value > 0);
    const lengths = items
      .flatMap((item) => Array(item.quantity).fill(item.variant.length ?? 0))
      .filter((value) => value > 0);

    return {
      width: widths.length ? Math.max(...widths) : undefined,
      height: heights.length ? heights.reduce((sum, value) => sum + value, 0) : undefined,
      length: lengths.length ? Math.max(...lengths) : undefined,
    };
  }

  private buildAddressLine(address: Record<string, unknown>) {
    return [
      this.pickRecordString(address, 'streetName'),
      this.pickRecordString(address, 'streetNumber'),
      this.pickRecordString(address, 'floor'),
      this.pickRecordString(address, 'apartment'),
    ]
      .filter(Boolean)
      .join(' ');
  }

  private pickRecordString(record: Record<string, unknown>, key: string) {
    const value = record[key];

    return typeof value === 'string' ? value : '';
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
