import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
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
import type { Response } from 'express';
import { clearAuthCookie, setAuthCookie } from '../auth/utils/auth-cookie.util';

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(
    private readonly authService: AuthService,
    private readonly systemService: SystemService,
  ) {}

  @Post('auth/login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateSuperAdmin(
      body.email,
      body.password,
    );

    const session = await this.authService.login(user);
    setAuthCookie(res, session.access_token, 'system');

    return {
      user: session.user,
    };
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res, 'system');
    return { success: true };
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
  @Get('themes')
  listThemes() {
    return this.systemService.listThemes();
  }

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, SuperAdminAuthGuard)
  @Post('platform/deploy')
  deployPlatform() {
    return this.systemService.deployPlatform();
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
  @Get('stores/:id/provisioning-plan')
  getProvisioningPlan(@Param('id', ParseIntPipe) id: number) {
    return this.systemService.getStoreProvisioningPlan(id);
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

  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, SuperAdminAuthGuard)
  @Post('stores/:id/provision-vps')
  provisionVps(@Param('id', ParseIntPipe) id: number) {
    return this.systemService.provisionStoreOnVps(id);
  }
}
