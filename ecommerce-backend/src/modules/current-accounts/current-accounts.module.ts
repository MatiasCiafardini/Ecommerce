import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CurrentAccountsController } from './current-accounts.controller';
import { CurrentAccountsService } from './current-accounts.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurrentAccountsController],
  providers: [CurrentAccountsService],
})
export class CurrentAccountsModule {}
