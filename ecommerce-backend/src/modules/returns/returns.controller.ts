import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('returns')
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateReturnDto) {
    return this.returnsService.createReturn(req.storeId, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Post(':id/approve')
  approve(@Req() req, @Param('id') id: string, @Body() dto: ApproveReturnDto) {
    return this.returnsService.approveReturn(req.storeId, Number(id), dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.returnsService.findAll(req.storeId);
  }
}
