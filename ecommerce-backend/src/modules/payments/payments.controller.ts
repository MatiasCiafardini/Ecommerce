import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { privateUploadsDir } from '../../common/uploads';

const allowedTransferProofExtensions = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
]);
const allowedTransferProofMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
]);

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('store/payments/:orderId')
  createPayment(
    @Req() req,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      req.storeId,
      Number(orderId),
      dto,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('store/payments/:orderId/bank-transfer')
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: privateUploadsDir,
        filename: (_, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `transfer-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype?.toLowerCase();

        if (
          !allowedTransferProofExtensions.has(extension) ||
          !allowedTransferProofMimeTypes.has(mimeType)
        ) {
          callback(
            new BadRequestException(
              'Only PDF, PNG, JPG and JPEG transfer proofs are supported',
            ) as Error,
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  createBankTransferPayment(
    @Req() req,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
    @UploadedFile() file?: { filename: string; originalname: string },
  ) {
    return this.paymentsService.createBankTransferPayment(
      req.storeId,
      Number(orderId),
      dto,
      file,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('payments/:paymentId/proof')
  async getPaymentProof(
    @Req() req,
    @Param('paymentId') paymentId: string,
    @Res() res: Response,
  ) {
    const proof = await this.paymentsService.getPaymentProofFile(
      req.storeId,
      Number(paymentId),
      req.user,
    );

    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(proof.originalName)}"`,
    );

    return new Promise<void>((resolve, reject) => {
      res.sendFile(proof.absolutePath, (error) => {
        if (!error) {
          resolve();
          return;
        }

        reject(new NotFoundException('Payment proof file not found'));
      });
    });
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/payments/:paymentId/approve')
  approvePayment(
    @Req() req,
    @Param('paymentId') paymentId: string,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.paymentsService.approvePayment(
      req.storeId,
      Number(paymentId),
      dto,
    );
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/payments/:paymentId/reject')
  rejectPayment(
    @Req() req,
    @Param('paymentId') paymentId: string,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.paymentsService.rejectPayment(
      req.storeId,
      Number(paymentId),
      dto,
    );
  }

  @Post('payments/webhook')
  webhook(@Req() req, @Body() body: any) {
    return this.paymentsService.handleWebhook(body, req.headers, req.query);
  }
}
