import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from '../auth/dto/login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminAuthGuard } from '../auth/guards/super-admin-auth.guard';
import { SystemService } from './system.service';
import { CreateSystemStoreDto } from './dto/create-system-store.dto';
import { UpdateSystemStoreDto } from './dto/update-system-store.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(
    private readonly authService: AuthService,
    private readonly systemService: SystemService,
  ) {}

  @Post('auth/login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateSuperAdmin(
      body.email,
      body.password,
    );

    return this.authService.login(user);
  }

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, SuperAdminAuthGuard)
  @Get('auth/me')
  getMe(@Req() req: any) {
    return this.authService.getCurrentAuthEntity(
      req.user.sub,
      req.user.role,
      req.user.storeId,
    );
  }

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, SuperAdminAuthGuard)
  @Get('stores')
  listStores() {
    return this.systemService.listStores();
  }

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, SuperAdminAuthGuard)
  @Get('stores/:id')
  getStore(@Param('id', ParseIntPipe) id: number) {
    return this.systemService.getStore(id);
  }

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, SuperAdminAuthGuard)
  @Post('stores')
  createStore(@Body() dto: CreateSystemStoreDto) {
    return this.systemService.createStore(dto);
  }

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, SuperAdminAuthGuard)
  @Patch('stores/:id')
  updateStore(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSystemStoreDto,
  ) {
    return this.systemService.updateStore(id, dto);
  }
}
