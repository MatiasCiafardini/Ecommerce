import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { EnvioPackWebhookDto } from '../dto/enviopack-webhook.dto';
import { StoreShippingProviderConfigService } from './store-shipping-provider-config.service';

@Injectable()
export class EnvioPackWebhookService {
  private readonly logger = new Logger(EnvioPackWebhookService.name);
  private readonly providerName = 'enviopack';
  private readonly webhookSecret =
    process.env.ENVIOPACK_WEBHOOK_SECRET?.trim() ||
    process.env.ENVIOSPACK_WEBHOOK_SECRET?.trim() ||
    '';

  constructor(
    private prisma: PrismaService,
    private providerConfigService: StoreShippingProviderConfigService,
    @InjectQueue('enviopack-webhooks')
    private readonly queue: Queue,
  ) {}

  async enqueue(dto: EnvioPackWebhookDto) {
    this.validateWebhook(dto);

    const payloadHash = this.computePayloadHash(dto);

    const existing = await (this.prisma as any).inboundWebhookEvent.findUnique({
      where: {
        provider_payloadHash: {
          provider: this.providerName,
          payloadHash,
        },
      },
    });

    if (existing) {
      return { received: true, duplicate: true };
    }

    const eventRecord = await (this.prisma as any).inboundWebhookEvent.create({
      data: {
        provider: this.providerName,
        event: dto.tipo,
        externalId: dto.id,
        payloadHash,
        payload: dto,
      },
    });

    await this.queue.add(
      'process-enviopack-webhook',
      {
        eventRecordId: eventRecord.id,
        payload: dto,
      },
      {
        attempts: 10,
        backoff: {
          type: 'fixed',
          delay: 120000,
        },
      },
    );

    return { received: true };
  }

  async processWebhookJob(job: {
    eventRecordId: string;
    payload: EnvioPackWebhookDto;
  }) {
    const { eventRecordId, payload } = job;

    const localShipment = await this.prisma.shipment.findFirst({
      where: {
        externalShipmentId: payload.id,
      },
      include: {
        trackingEvents: true,
      },
    });

    if (!localShipment) {
      throw new BadRequestException(
        `Shipment not found for EnvioPack id ${payload.id}`,
      );
    }

    const resolvedProvider =
      await this.providerConfigService.resolveProviderForCapability(
        localShipment.storeId,
        'track',
        {
          providerCode: localShipment.provider,
          providerConfigId: (localShipment as any).providerConfigId,
        },
      );

    if (!resolvedProvider.provider.getShipmentDetail) {
      throw new BadRequestException(
        `Provider ${resolvedProvider.provider.providerCode} does not support shipment detail lookup`,
      );
    }

    const shipment = await resolvedProvider.provider.getShipmentDetail(
      payload.id,
      resolvedProvider.context,
    );

    await this.prisma.shipment.update({
      where: { id: localShipment.id },
      data: {
        trackingNumber: shipment.trackingNumber ?? localShipment.trackingNumber,
        trackingUrl: shipment.trackingUrl ?? localShipment.trackingUrl,
        labelUrl: shipment.labelUrl ?? localShipment.labelUrl,
        labelFormat: shipment.labelFormat ?? localShipment.labelFormat,
        status: shipment.status as any,
        provider: shipment.provider,
        carrier: shipment.carrier ?? (localShipment as any).carrier ?? null,
        cost: shipment.cost ?? (localShipment as any).cost ?? null,
        conditionCode:
          shipment.conditionCode ?? (localShipment as any).conditionCode ?? null,
        providerPayload: shipment.payload as any,
      } as any,
    });

    const lastEvent = shipment.events?.at(-1);

    if (
      lastEvent &&
      !localShipment.trackingEvents.some(
        (event) =>
          event.status === (lastEvent.status as any) &&
          (event.description || null) === (lastEvent.description || null) &&
          (event.location || null) === (lastEvent.location || null),
      )
    ) {
      await this.prisma.shipmentTrackingEvent.create({
        data: {
          shipmentId: localShipment.id,
          status: lastEvent.status as any,
          description: lastEvent.description || undefined,
          location: lastEvent.location || undefined,
        },
      });

      if (lastEvent.status === 'delivered') {
        await this.prisma.order.update({
          where: { id: localShipment.orderId },
          data: { status: 'delivered' },
        });
      }
    }

    await (this.prisma as any).inboundWebhookEvent.update({
      where: { id: eventRecordId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    this.logger.log(
      `Processed EnvioPack webhook ${payload.tipo} for shipment ${payload.id}`,
    );
  }

  private validateWebhook(dto: EnvioPackWebhookDto) {
    if (!dto.id || !dto.tipo) {
      throw new BadRequestException(
        'EnvioPack webhook must include id and tipo',
      );
    }

    if (this.webhookSecret && dto.token !== this.webhookSecret) {
      throw new ServiceUnavailableException('Invalid EnvioPack webhook token');
    }
  }

  private computePayloadHash(dto: EnvioPackWebhookDto) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(dto))
      .digest('hex');
  }
}
