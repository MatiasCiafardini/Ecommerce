import {
  BadRequestException,
  Controller,
  Post,
  Patch,
  Body,
  Param,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';

import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
import { ReviewReturnDto } from './dto/review-return.dto';
import { ReceiveReturnDto } from './dto/receive-return.dto';
import { ShipReturnDto } from './dto/ship-return.dto';
import { CreateManualReturnDto } from './dto/create-manual-return.dto';
import { UpdateManualReturnDto } from './dto/update-manual-return.dto';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { privateUploadsDir } from '../../common/uploads';

@Controller('returns')
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateReturnDto) {
    return this.returnsService.createReturn(req.storeId, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req) {
    return this.returnsService.findMine(req.storeId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/proof')
  async getProof(@Req() req, @Res() res: Response, @Param('id') id: string) {
    const absolutePath = await this.returnsService.getReturnShipmentProofFile(
      req.storeId,
      Number(id),
      req.user,
    );

    return res.sendFile(absolutePath);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/ship')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: privateUploadsDir,
        filename: (_, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `return-shipment-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.pdf', '.webp']);

        if (
          !allowedExtensions.has(extension) ||
          (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf')
        ) {
          callback(
            new BadRequestException(
              'Only PNG, JPG, JPEG, WEBP and PDF files are supported',
            ) as Error,
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  ship(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: ShipReturnDto,
    @UploadedFile() file?: { filename: string; originalname: string },
  ) {
    return this.returnsService.shipReturn(req.storeId, req.user.sub, Number(id), dto, file);
  }

  @UseGuards(AdminAuthGuard)
  @Post(':id/approve')
  approve(@Req() req, @Param('id') id: string, @Body() dto: ApproveReturnDto) {
    return this.returnsService.approveReturn(req.storeId, Number(id), dto);
  }

  @UseGuards(AdminAuthGuard)
  @Post(':id/review')
  review(@Req() req, @Param('id') id: string, @Body() dto: ReviewReturnDto) {
    return this.returnsService.reviewReturn(req.storeId, Number(id), dto);
  }

  @UseGuards(AdminAuthGuard)
  @Post(':id/receive')
  receive(@Req() req, @Param('id') id: string, @Body() dto: ReceiveReturnDto) {
    return this.returnsService.receiveReturn(req.storeId, Number(id), dto);
  }

  @UseGuards(AdminAuthGuard)
  @Post('manual')
  createManual(@Req() req, @Body() dto: CreateManualReturnDto) {
    return this.returnsService.createManualReturn(req.storeId, req.user?.sub, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get('manual')
  findManual(@Req() req, @Query('storeLocationId') storeLocationId?: string) {
    return this.returnsService.findManualReturns(
      req.storeId,
      req.user?.sub,
      parseOptionalId(storeLocationId),
    );
  }

  @UseGuards(AdminAuthGuard)
  @Patch('manual/:id')
  updateManual(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateManualReturnDto,
  ) {
    return this.returnsService.updateManualReturn(
      req.storeId,
      req.user?.sub,
      Number(id),
      dto,
    );
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.returnsService.findAll(req.storeId);
  }
}

function parseOptionalId(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
