import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(req.storeId, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.customersService.findAll(req.storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMe(@Req() req) {
    return this.customersService.findOneOrThrow(req.storeId, req.user.sub);
  }

  @UseGuards(AdminAuthGuard)
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.customersService.findOne(req.storeId, Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(req.storeId, req.user.sub, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(req.storeId, Number(id), dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.customersService.remove(req.storeId, Number(id));
  }
}
