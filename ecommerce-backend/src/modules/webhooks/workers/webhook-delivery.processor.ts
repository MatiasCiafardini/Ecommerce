import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import * as crypto from 'crypto';

import { PrismaService } from '../../../prisma/prisma.service';

@Processor('webhook-delivery')
export class WebhookDeliveryProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any>) {
    console.log('🚀 PROCESSING WEBHOOK JOB');
    const { webhookId, url, secret, event, payload } = job.data;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    let status: number | null = null;
    let body: string | null = null;
    let delivered = false;

    try {
      const res = await axios.post(url, payload, {
        headers: {
          'x-webhook-event': event,
          'x-webhook-signature': signature,
        },
        timeout: 5000,
      });

      status = res.status;
      body = JSON.stringify(res.data);
      delivered = true;
    } catch (err: any) {
      status = err?.response?.status || 500;
      body = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
    }

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        responseStatus: status,
        responseBody: body,
        attempt: job.attemptsMade,
        delivered,
      },
    });
  }
}
