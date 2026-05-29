import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateCategoryDto } from './dto/update-category.dto';

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Req() req) {
    return this.service.update(Number(id), dto, req.storeId);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.storeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req, @Query('reassignTo') reassignTo?: string) {
    return this.service.remove(
      Number(id),
      req.storeId,
      reassignTo ? Number(reassignTo) : undefined,
    );
  }
}
