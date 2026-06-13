import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CreateStoreLocationDto } from './dto/create-store-location.dto';
import { CreateStoreLocationUserDto } from './dto/create-store-location-user.dto';
import { UpdateStoreLocationDto } from './dto/update-store-location.dto';
import { UpdateStoreLocationUserDto } from './dto/update-store-location-user.dto';
import { StoreLocationsService } from './store-locations.service';

@UseGuards(AdminAuthGuard)
@Controller('store-locations')
export class StoreLocationsController {
  constructor(private readonly storeLocationsService: StoreLocationsService) {}

  @Get()
  overview(@Req() req) {
    return this.storeLocationsService.getOverview(req.storeId, req.user?.sub, req.user?.role);
  }

  @Post()
  createLocation(@Req() req, @Body() dto: CreateStoreLocationDto) {
    return this.storeLocationsService.createLocation(req.storeId, req.user?.role, dto);
  }

  @Patch(':locationId')
  updateLocation(
    @Req() req,
    @Param('locationId', ParseIntPipe) locationId: number,
    @Body() dto: UpdateStoreLocationDto,
  ) {
    return this.storeLocationsService.updateLocation(req.storeId, req.user?.role, locationId, dto);
  }

  @Post('users')
  createUser(@Req() req, @Body() dto: CreateStoreLocationUserDto) {
    return this.storeLocationsService.createUser(req.storeId, req.user?.role, dto);
  }

  @Patch('users/:userId')
  updateUser(
    @Req() req,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateStoreLocationUserDto,
  ) {
    return this.storeLocationsService.updateUser(req.storeId, req.user?.role, userId, dto);
  }
}
