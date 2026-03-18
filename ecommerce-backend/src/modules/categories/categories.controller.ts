import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Categories')
@UseGuards(AdminAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() req) {
    return this.service.create(dto, req.storeId);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.storeId);
  }
}
