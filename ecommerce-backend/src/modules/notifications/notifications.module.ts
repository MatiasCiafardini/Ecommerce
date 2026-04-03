import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminNotificationMailService } from './admin-notification-mail.service';

@Module({
  imports: [PrismaModule],
  providers: [AdminNotificationMailService],
  exports: [AdminNotificationMailService],
})
export class NotificationsModule {}
