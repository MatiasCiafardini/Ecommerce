import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EnvioPackWebhookService } from '../services/enviopack-webhook.service';

@Processor('enviopack-webhooks')
export class EnvioPackWebhookProcessor extends WorkerHost {
  constructor(
    private readonly enviopackWebhookService: EnvioPackWebhookService,
  ) {
    super();
  }

  async process(job: Job<{ eventRecordId: string; payload: any }>) {
    await this.enviopackWebhookService.processWebhookJob(job.data);
  }
}
