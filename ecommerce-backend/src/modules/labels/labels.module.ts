import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { Code128BarcodeService } from './barcode/code128-barcode.service';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';
import { LabelPdfRenderer } from './pdf/label-pdf.renderer';

@Module({
  imports: [PrismaModule],
  controllers: [LabelsController],
  providers: [LabelsService, Code128BarcodeService, LabelPdfRenderer],
})
export class LabelsModule {}
