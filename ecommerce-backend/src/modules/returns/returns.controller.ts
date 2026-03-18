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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('returns')
@UseGuards(JwtAuthGuard)
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateReturnDto) {
    return this.returnsService.createReturn(req.storeId, dto);
  }

  @Post(':id/approve')
  approve(@Req() req, @Param('id') id: string, @Body() dto: ApproveReturnDto) {
    return this.returnsService.approveReturn(req.storeId, Number(id), dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.returnsService.findAll(req.storeId);
  }
}
