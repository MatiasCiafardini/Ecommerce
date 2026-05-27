import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { GenerateLabelsDto } from './dto/generate-labels.dto';
import { ListLabelProductsDto } from './dto/list-label-products.dto';
import { LabelsService } from './labels.service';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Labels')
@UseGuards(AdminAuthGuard)
@Controller('admin/labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get('products')
  products(@Req() req, @Query() query: ListLabelProductsDto) {
    return this.labelsService.listProducts(req.storeId, query);
  }

  @Get('templates')
  templates() {
    return this.labelsService.getTemplates();
  }

  @Post('preview')
  preview(@Req() req, @Body() dto: GenerateLabelsDto) {
    return this.labelsService.preview(req.storeId, dto);
  }

  @Post('pdf')
  async pdf(@Req() req, @Body() dto: GenerateLabelsDto, @Res() res: Response) {
    const document = await this.labelsService.pdf(req.storeId, dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    return res.send(document.pdf);
  }
}
